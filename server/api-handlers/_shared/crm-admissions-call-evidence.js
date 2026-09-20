export const ADMISSIONS_CALL_EVIDENCE_VERSION = 1;

export const ADMISSIONS_CALL_FIELDS = Object.freeze({
  fee_readiness: Object.freeze([
    "Accepted",
    "Needs discussion",
    "Not affordable",
    "Unknown",
  ]),

  decision_authority: Object.freeze([
    "Student",
    "Parent or guardian",
    "Student and parent together",
    "Another person",
    "Unknown",
  ]),

  decision_authority_status: Object.freeze([
    "Yes",
    "Pending discussion",
    "No",
    "Unknown",
  ]),

  joining_timeline: Object.freeze([
    "Within 30 days",
    "Within 60 days",
    "Within 90 days",
    "Later",
    "Unknown",
  ]),

  payment_preference: Object.freeze([
    "One-time payment",
    "No-cost EMI",
    "Needs discussion",
    "Unknown",
  ]),

  laptop_readiness: Object.freeze([
    "Yes",
    "I can arrange",
    "I need advice",
    "Unknown",
  ]),

  handoff_intent: Object.freeze([
    "accepted",
    "declined",
    "undecided",
  ]),
});

const CONNECTED_CALL_OUTCOMES = new Set([
  "positive",
  "positive_discussion",
  "neutral",
  "neutral_discussion",
  "callback_requested",
  "connected",
  "completed",
]);

const CONTACT_BLOCKING_OUTCOMES = new Set([
  "not_interested",
  "wrong_number",
  "do_not_call",
]);

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function canonicalValue(field, value) {
  const allowedValues = ADMISSIONS_CALL_FIELDS[field] || [];
  const requestedValue = normalize(value);

  return (
    allowedValues.find(
      (allowedValue) => normalize(allowedValue) === requestedValue
    ) || null
  );
}

function isAdmissions(businessUnit) {
  return normalize(businessUnit) === "admissions";
}

function isUnknownValue(value) {
  const normalized = normalize(value);

  return normalized === "unknown" || normalized === "undecided";
}

/**
 * Validates only the structured admissions answers.
 *
 * It does not calculate a score and does not modify any CRM record.
 */
export function validateAdmissionsCallEvidence(input, outcome) {
  if (input == null) {
    return {
      valid: true,
      evidence: {},
      errors: [],
    };
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      evidence: {},
      errors: ["Admissions call evidence must be an object."],
    };
  }

  const evidence = {};
  const errors = [];

  for (const [field, rawValue] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(ADMISSIONS_CALL_FIELDS, field)) {
      if (String(rawValue ?? "").trim()) {
        errors.push(`Unsupported admissions evidence field: ${field}.`);
      }

      continue;
    }

    if (!String(rawValue ?? "").trim()) {
      continue;
    }

    const canonical = canonicalValue(field, rawValue);

    if (!canonical) {
      errors.push(
        `Invalid value supplied for admissions evidence field: ${field}.`
      );
      continue;
    }

    evidence[field] = canonical;
  }

  if (
    Object.keys(evidence).length > 0 &&
    !CONNECTED_CALL_OUTCOMES.has(normalize(outcome))
  ) {
    errors.push(
      "Structured qualification answers can only be saved for a connected call outcome."
    );
  }

  return {
    valid: errors.length === 0,
    evidence,
    errors,
  };
}

/**
 * Applies trusted, structured human-call evidence to an admissions profile.
 *
 * Important:
 * - Business Solutions profiles are returned unchanged.
 * - Admissions profiles without structured call evidence are returned unchanged.
 * - No score or threshold is changed here.
 */
export function applyAdmissionsCallEvidence(
  businessUnit,
  profileInput,
  engagementEvents
) {
  const originalProfile = safeObject(profileInput);

  if (!isAdmissions(businessUnit)) {
    return originalProfile;
  }

  const events = Array.isArray(engagementEvents) ? engagementEvents : [];

  const structuredCallEvents = events
    .filter((event) => {
      const eventType = normalize(event?.event_type || event?.type);
      const metadata = safeObject(event?.metadata);

      return (
        eventType === "human_call_logged" &&
        Number(metadata.admissions_evidence_version) ===
          ADMISSIONS_CALL_EVIDENCE_VERSION &&
        Boolean(metadata.recorded_by_user_id)
      );
    })
    .sort((left, right) => {
      const leftTime = new Date(
        left?.occurred_at || left?.created_at || 0
      ).getTime();

      const rightTime = new Date(
        right?.occurred_at || right?.created_at || 0
      ).getTime();

      return leftTime - rightTime;
    });

  if (structuredCallEvents.length === 0) {
    return originalProfile;
  }

  const profile = {
    ...originalProfile,
  };

  const existingProvenance = safeObject(
    originalProfile._admissions_call_evidence
  );

  const provenance = {
    ...existingProvenance,
  };

  for (const event of structuredCallEvents) {
    const metadata = safeObject(event?.metadata);
    const evidence = safeObject(metadata.admissions_evidence);

    const occurredAt =
      event?.occurred_at ||
      event?.created_at ||
      metadata.occurred_at ||
      null;

    const outcome = normalize(
      metadata.call_outcome ||
        metadata.outcome ||
        event?.outcome
    );

    if (CONTACT_BLOCKING_OUTCOMES.has(outcome)) {
      profile._admissions_contact_blocked = {
        outcome,
        occurred_at: occurredAt,
        recorded_by_user_id: metadata.recorded_by_user_id,
      };
    } else if (CONNECTED_CALL_OUTCOMES.has(outcome)) {
      delete profile._admissions_contact_blocked;
    }

    for (const field of Object.keys(ADMISSIONS_CALL_FIELDS)) {
      if (!Object.prototype.hasOwnProperty.call(evidence, field)) {
        continue;
      }

      const value = canonicalValue(field, evidence[field]);

      if (!value) {
        continue;
      }

      provenance[field] = {
        value,
        occurred_at: occurredAt,
        recorded_by_user_id: metadata.recorded_by_user_id,
        recorded_by_name: metadata.recorded_by_name || null,
        contact_person: metadata.contact_person || null,
      };

      if (field === "handoff_intent") {
        if (value === "accepted") {
          profile.handoff_intent = "accepted";
          profile.human_handoff = "Schedule a counsellor call";
        } else if (value === "declined") {
          profile.handoff_intent = "declined";
          profile.human_handoff = "Continue digitally";
        } else {
          delete profile.handoff_intent;
          delete profile.human_handoff;
        }

        continue;
      }

      if (isUnknownValue(value)) {
        delete profile[field];
      } else {
        profile[field] = value;
      }
    }
  }

  profile._admissions_call_evidence = provenance;

  return profile;
}

/**
 * Returns a blocking reason only when structured human-call evidence
 * contains a definite negative or unresolved commercial answer.
 */
export function admissionsCommercialBlock(profileInput) {
  const profile = safeObject(profileInput);
  const evidence = safeObject(profile._admissions_call_evidence);

  if (profile._admissions_contact_blocked) {
    return {
      code: "human_contact_blocked",
      message:
        "The latest human-call outcome does not permit sales-ready routing.",
    };
  }

  const feeReadiness = normalize(evidence.fee_readiness?.value);

  if (
    feeReadiness === "needs_discussion" ||
    feeReadiness === "not_affordable" ||
    feeReadiness === "unknown"
  ) {
    return {
      code: "fee_acceptance_unconfirmed",
      message:
        "Course-fee acceptance has not yet been confirmed by the prospect.",
    };
  }

  const decisionStatus = normalize(
    evidence.decision_authority_status?.value
  );

  if (
    decisionStatus === "pending_discussion" ||
    decisionStatus === "no" ||
    decisionStatus === "unknown"
  ) {
    return {
      code: "decision_approval_unconfirmed",
      message:
        "Final admission approval from the decision-maker is not confirmed.",
    };
  }

  const handoffIntent = normalize(evidence.handoff_intent?.value);

  if (handoffIntent === "declined" || handoffIntent === "undecided") {
    return {
      code: "human_handoff_unconfirmed",
      message:
        "The prospect has not confirmed continued human counselling.",
    };
  }

  return null;
}