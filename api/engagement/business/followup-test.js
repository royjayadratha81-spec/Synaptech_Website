import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import {
  getNextCrmFollowUp,
  processCrmFollowUpAnswer,
} from "../../_shared/crm-followup-orchestrator.js";

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
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  );
}

function verifySessionToken(token) {
  if (!token || !SESSION_SECRET) {
    throw new Error(
      "Engagement session unavailable."
    );
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "Invalid engagement session."
    );
  }

  const [
    payloadPart,
    signaturePart,
  ] = parts;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET
      )
      .update(payloadPart)
      .digest();

  const actualSignature =
    decodeBase64Url(
      signaturePart
    );

  if (
    expectedSignature.length !==
      actualSignature.length ||
    !crypto.timingSafeEqual(
      expectedSignature,
      actualSignature
    )
  ) {
    throw new Error(
      "Invalid engagement session."
    );
  }

  const payload =
    JSON.parse(
      decodeBase64Url(
        payloadPart
      ).toString("utf8")
    );

  if (
    !payload?.lid ||
    !payload?.oid ||
    !payload?.exp
  ) {
    throw new Error(
      "Invalid engagement session."
    );
  }

  const nowSeconds =
    Math.floor(
      Date.now() / 1000
    );

  if (
    nowSeconds >
    payload.exp
  ) {
    throw new Error(
      "Engagement session expired."
    );
  }

  return payload;
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "POST"
  ) {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed.",
      });
  }

  try {
    const body =
      typeof req.body ===
      "string"
        ? JSON.parse(
            req.body
          )
        : req.body || {};

    const {
      session_token,
      action = "next",
      question_key,
      answer,
      channel = null,
      metadata = {},
    } = body;

    if (!session_token) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "Session token is required.",
        });
    }

    const session =
      verifySessionToken(
        session_token
      );

    const {
      data: lead,
      error: leadError,
    } = await supabase
      .from("crm_leads")
      .select(
        "id,organization_id"
      )
      .eq(
        "id",
        session.lid
      )
      .eq(
        "organization_id",
        session.oid
      )
      .maybeSingle();

    if (leadError) {
      throw leadError;
    }

    if (!lead) {
      return res
        .status(404)
        .json({
          success: false,
          error:
            "CRM lead not found.",
        });
    }

    if (
      action === "next"
    ) {
      const result =
        await getNextCrmFollowUp({
          supabase,

          organizationId:
            lead.organization_id,

          leadId:
            lead.id,

          requestedChannel:
            channel,
        });

      return res
        .status(200)
        .json({
          success: true,
          mode: "next",
          result,
        });
    }

    if (
      action === "answer"
    ) {
      if (
        !question_key ||
        !answer
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "question_key and answer are required.",
          });
      }

      const result =
        await processCrmFollowUpAnswer({
          supabase,

          organizationId:
            lead.organization_id,

          leadId:
            lead.id,

          questionKey:
            question_key,

          answer,

          channel:
            channel ||
            "whatsapp",

          metadata,
        });

      return res
        .status(200)
        .json({
          success: true,
          mode: "answer",
          result,
        });
    }

    return res
      .status(400)
      .json({
        success: false,
        error:
          "Unsupported action.",
      });
  } catch (error) {
    console.error(
      "Business follow-up test error:",
      error
    );

    const message =
      String(
        error?.message ||
        ""
      );

    const unauthorized =
      message.includes(
        "Invalid engagement session"
      ) ||
      message.includes(
        "Engagement session expired"
      );

    return res
      .status(
        unauthorized
          ? 401
          : 500
      )
      .json({
        success: false,

        error:
          unauthorized
            ? "Invalid or expired engagement session."
            : "Unable to process CRM follow-up.",
      });
  }
}