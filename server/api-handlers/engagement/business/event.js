import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { scoreCrmLead } from "../../_shared/crm-scoring-engine.js";
import { evaluateAndStoreCrmQualification } from "../../_shared/crm-qualification-engine.js";

const SESSION_SECRET =
  process.env.ENGAGEMENT_SESSION_SECRET;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function decodeBase64Url(value) {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
}

function verifySessionToken(token) {
  if (!token || !SESSION_SECRET) {
    throw new Error("Engagement session unavailable.");
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error("Invalid engagement session.");
  }

  const [payloadPart, signaturePart] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadPart)
    .digest();

  const actualSignature =
    decodeBase64Url(signaturePart);

  if (
    expectedSignature.length !==
      actualSignature.length ||
    !crypto.timingSafeEqual(
      expectedSignature,
      actualSignature
    )
  ) {
    throw new Error("Invalid engagement session.");
  }

  const payload = JSON.parse(
    decodeBase64Url(payloadPart).toString("utf8")
  );

  if (
  !payload?.lid ||
  !payload?.oid ||
  !payload?.exp
) {
  throw new Error("Invalid engagement session.");
}

  const nowSeconds =
  Math.floor(Date.now() / 1000);

if (nowSeconds > payload.exp) {
  throw new Error("Engagement session expired.");
}

  return payload;
}

const ALLOWED_EVENTS = new Set([
  "demo_offered",
  "demo_accepted",
  "demo_video_started",
  "demo_video_25",
  "demo_video_50",
  "demo_video_75",
  "demo_video_completed",
  "demo_video_closed",
  "live_demo_offered",
  "live_demo_requested",
  "live_demo_declined",

  // Reserved for later AI-funnel phases
  "ai_followup_sent",
  "ai_followup_replied",
  "ai_call_started",
  "ai_call_connected",
  "ai_call_completed",
  "ai_callback_requested",
  "human_call_completed",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const {
      session_token,
      event_type,
      event_value = null,
      metadata = {},
    } = body;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        error: "Session token is required.",
      });
    }

    if (!ALLOWED_EVENTS.has(event_type)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported engagement event.",
      });
    }

    const session =
      verifySessionToken(session_token);

    const { data: lead, error: leadError } =
      await supabase
        .from("crm_leads")
        .select(
          "id, organization_id"
        )
        .eq("id", session.lid)
.eq(
  "organization_id",
  session.oid
)
        .maybeSingle();

    if (leadError) {
      throw leadError;
    }

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "CRM lead not found.",
      });
    }

    const {
      data: event,
      error: eventError,
    } = await supabase
      .from("crm_engagement_events")
      .insert([
        {
          organization_id:
            lead.organization_id,

          lead_id:
            lead.id,

          conversation_id: null,

          event_type,

          channel:
            "web",

          event_value,

          metadata:
            metadata &&
            typeof metadata === "object"
              ? metadata
              : {},
        },
      ])
      .select(
        "id,event_type,occurred_at"
      )
      .single();

    if (eventError) {
      throw eventError;
    }
// ----------------------------------------------------------
// AUTOMATIC CRM RESCORING
// ----------------------------------------------------------
//
// Behavioral evidence has already been safely recorded.
// Scoring failure must NOT undo or block the customer event.

let scoringResult = null;
let scoringError = null;

try {
  scoringResult = await scoreCrmLead({
    supabase,
    organizationId: lead.organization_id,
    leadId: lead.id,
  });
} catch (error) {
  scoringError =
    error?.message ||
    "Automatic lead scoring failed.";

  console.error(
    "Automatic engagement rescore failed:",
    event_type,
    scoringError
  );
}
// ----------------------------------------------------------
// AUTOMATIC QUALIFICATION REEVALUATION
// ----------------------------------------------------------
//
// Qualification runs only after the latest behavioral
// evidence has been recorded and scoring has been attempted.
//
// Qualification failure must NOT undo the customer event.

let qualificationResult = null;
let qualificationError = null;

try {
  qualificationResult =
    await evaluateAndStoreCrmQualification({
      supabase,
      organizationId:
        lead.organization_id,
      leadId:
        lead.id,
    });
} catch (error) {
  qualificationError =
    error?.message ||
    "Automatic qualification evaluation failed.";

  console.error(
    "Automatic engagement qualification failed:",
    event_type,
    qualificationError
  );
}

    return res.status(200).json({
  success: true,

  event,

  scoring: scoringResult
    ? {
        recalculated: true,

        overall_score:
          scoringResult.score
            ?.overall_score ?? null,

        routing_band:
          scoringResult.score
            ?.routing_band ?? null,

        recommended_route:
          scoringResult.score
            ?.recommended_route ?? null,
      }
    : {
        recalculated: false,
        error: scoringError,
      },

  qualification: qualificationResult
    ? {
        reevaluated: true,

        sales_ready:
          qualificationResult
            .qualification
            ?.sales_ready ?? false,

        sales_ready_status:
          qualificationResult
            .qualification
            ?.sales_ready_status ?? null,

        qualification_stage:
          qualificationResult
            .qualification
            ?.qualification_stage ?? null,

        recommended_route:
          qualificationResult
            .qualification
            ?.recommended_route ?? null,

        recommended_next_action:
          qualificationResult
            .qualification
            ?.recommended_next_action ?? null,
      }
    : {
        reevaluated: false,
        error:
          qualificationError,
      },
});
  } catch (error) {
    console.error(
      "Business engagement event error:",
      error
    );

    const message =
      String(error?.message || "");

    const unauthorized =
      message.includes(
        "Invalid engagement session"
      ) ||
      message.includes(
        "Engagement session expired"
      );

    return res
      .status(
        unauthorized ? 401 : 500
      )
      .json({
        success: false,
        error:
          unauthorized
            ? "Invalid or expired engagement session."
            : "Unable to record engagement event.",
      });
  }
}