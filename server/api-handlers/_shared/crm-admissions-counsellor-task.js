import { createHash } from "node:crypto";

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function admissionsCounsellorTaskId(
  organizationId,
  leadId,
  conversationId
) {
  const hex = createHash("sha256")
    .update(
      JSON.stringify([
        "admissions-counsellor-v1",
        organizationId,
        leadId,
        conversationId,
      ])
    )
    .digest("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export function planAdmissionsCounsellorTask({
  organizationId,
  leadId,
  conversation,
  qualification,
  profile = {},
  now = new Date().toISOString(),
}) {
  if (
    conversation?.business_unit !== "admissions" ||
    !conversation?.id ||
    !organizationId ||
    !leadId
  ) {
    return null;
  }

  const handoffChoice = clean(
    profile.human_handoff,
    100
  );

  const savedHandoff = clean(
    qualification?.handoff_intent,
    50
  ).toLowerCase();

  // Respect a student's refusal or preference
  // to continue digitally.
  if (
    /^(continue digitally|not required now)$/i.test(
      handoffChoice
    ) ||
    savedHandoff === "declined"
  ) {
    return null;
  }

  const customerAcceptedHumanContact =
    /^(speak now|schedule a call)$/i.test(
      handoffChoice
    ) ||
    ["requested", "accepted"].includes(
      savedHandoff
    );

  if (!customerAcceptedHumanContact) {
    return null;
  }

  // An invalid/unverified lead must not create
  // an active human-call task.
  if (
    qualification?.validation_state !== "valid"
  ) {
    return null;
  }

  const preferredWindow = clean(
    profile.preferred_callback_time,
    200
  );

  const reason = [
    "Admissions counsellor: review Aira answers and confirm fee acceptance, decision-maker approval and joining timeline.",
    preferredWindow
      ? `Student's preferred callback window: ${preferredWindow}. Confirm the appointment before calling.`
      : "Confirm a suitable callback time with the student before calling.",
  ].join(" ");

  return {
    id: admissionsCounsellorTaskId(
      organizationId,
      leadId,
      conversation.id
    ),

    organization_id: organizationId,
    lead_id: leadId,
    conversation_id: conversation.id,

    business_unit: "admissions",
    channel: "human_call",
    job_type: "qualification",
    status: "scheduled",
    priority: 85,

    reason,
    scheduled_at: now,

    context_snapshot: {
      source:
        "aira_admissions_counsellor_v1",

      preferred_callback_time:
        preferredWindow || null,

      scheduling_note:
        "Task is ready for scheduling; scheduled_at is not a student-confirmed appointment.",

      course_interest:
        profile.course_interest || null,

      fee_readiness:
        profile.fee_readiness || null,

      decision_authority_status:
        profile.decision_authority_status ||
        null,

      joining_timeline:
        profile.joining_timeline || null,

      qualification_stage:
        qualification?.qualification_stage ||
        null,
    },
  };
}

export async function ensureAdmissionsCounsellorTask({
  supabase,
  ...context
}) {
  const planned =
    planAdmissionsCounsellorTask(context);

  if (!planned) {
    return null;
  }

  const findExisting = () =>
    supabase
      .from("crm_follow_up_jobs")
      .select(
        "id,status,channel,job_type,scheduled_at,reason"
      )
      .eq(
        "organization_id",
        context.organizationId
      )
      .eq("lead_id", context.leadId)
      .eq("id", planned.id)
      .maybeSingle();

  const existing = await findExisting();

  if (existing.error) {
    throw existing.error;
  }

  // This prevents duplicate tasks and does not
  // reopen completed or cancelled tasks.
  if (existing.data) {
    return existing.data;
  }

  const inserted = await supabase
    .from("crm_follow_up_jobs")
    .insert(planned)
    .select(
      "id,status,channel,job_type,scheduled_at,reason"
    )
    .single();

  // Handles two simultaneous requests safely.
  if (inserted.error?.code === "23505") {
    const concurrent = await findExisting();

    if (concurrent.error) {
      throw concurrent.error;
    }

    if (concurrent.data) {
      return concurrent.data;
    }
  }

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data;
}