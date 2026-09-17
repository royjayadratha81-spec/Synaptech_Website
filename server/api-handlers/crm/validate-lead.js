// api/crm/validate-lead.js
//
// Synaptech CRM - Lead Validation Engine V1
//
// PURPOSE
// ------------------------------------------------------------
// Validate a CRM lead BEFORE expensive AI qualification.
//
// This endpoint:
// - uses existing Firebase CRM authentication
// - respects CRM organization isolation
// - checks contact plausibility
// - detects test/spam-like signals
// - checks possible/exact duplicates
// - calculates information completeness
// - provisionally classifies Admissions vs Business Solutions
// - stores explainable validation evidence
//
// IMPORTANT
// ------------------------------------------------------------
// Does NOT modify:
// - synaptech_leads
// - existing website lead capture
// - LMS
// - Admin
// - existing chatbot APIs
// - ai-qualify.js
//
// V1 is intentionally deterministic.
// AI conversational validation comes in a later layer.

import {
  authenticateCrmRequest,
  sendCrmError,
} from "./_auth.js";

const VALIDATION_VERSION = "v1";

// ------------------------------------------------------------
// GENERAL HELPERS
// ------------------------------------------------------------

function cleanText(value, maxLength = 2000) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    Math.max(Math.round(number), min),
    max
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

// ------------------------------------------------------------
// EMAIL
// ------------------------------------------------------------

function validateEmail(email) {
  const value = normalizeText(email);

  if (!value) {
    return {
      status: "missing",
      suspicious: false,
      disposable: false,
    };
  }

  const basicEmailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  if (!basicEmailRegex.test(value)) {
    return {
      status: "invalid_format",
      suspicious: true,
      disposable: false,
    };
  }

  const domain =
    value.split("@")[1] || "";

  // Small conservative V1 list.
  // This is NOT intended to be a complete disposable-email database.
  const disposableDomains = [
    "mailinator.com",
    "guerrillamail.com",
    "10minutemail.com",
    "tempmail.com",
    "temp-mail.org",
    "yopmail.com",
    "trashmail.com",
    "fakeinbox.com",
  ];

  const disposable =
    disposableDomains.includes(domain);

  return {
    status: "valid_format",
    suspicious: disposable,
    disposable,
  };
}

// ------------------------------------------------------------
// PHONE
// ------------------------------------------------------------

function normalizePhone(phone) {
  return cleanText(phone, 100)
    .replace(/[^\d+]/g, "");
}

function validatePhone(phone) {
  const value = normalizePhone(phone);

  if (!value) {
    return {
      status: "missing",
      normalized: "",
    };
  }

  const digits =
    value.replace(/\D/g, "");

  /*
    Conservative international plausibility check.

    We are not claiming carrier ownership or live-number
    verification here. That would require a dedicated
    verification provider later.
  */

  if (
    digits.length < 8 ||
    digits.length > 15
  ) {
    return {
      status: "invalid",
      normalized: digits,
    };
  }

  if (/^(\d)\1+$/.test(digits)) {
    return {
      status: "invalid",
      normalized: digits,
    };
  }

  return {
    status: "plausible",
    normalized: digits,
  };
}

// ------------------------------------------------------------
// TEST / SPAM SIGNALS
// ------------------------------------------------------------

const TEST_TERMS = [
  "test",
  "testing",
  "dummy",
  "sample",
  "demo test",
  "asdf",
  "qwerty",
  "xyz test",
  "trial test",
];

const SUSPICIOUS_NAME_TERMS = [
  "test",
  "testing",
  "dummy",
  "asdf",
  "qwerty",
  "fake",
  "unknown",
  "na",
  "n/a",
  "none",
];

function containsTestSignal(...values) {
  const text = values
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (!text) {
    return false;
  }

  return TEST_TERMS.some(
    (term) =>
      text === term ||
      text.includes(term)
  );
}

function suspiciousName(name) {
  const value = normalizeText(name);

  if (!value) {
    return false;
  }

  if (
    SUSPICIOUS_NAME_TERMS.includes(value)
  ) {
    return true;
  }

  if (
    value.length === 1 ||
    /^[^a-z0-9]+$/i.test(value)
  ) {
    return true;
  }

  // Obvious keyboard/gibberish-like repeated characters.
  if (/^(.)\1{3,}$/i.test(value)) {
    return true;
  }

  return false;
}

function suspiciousRequirement(requirement) {
  const value =
    normalizeText(requirement);

  if (!value) {
    return false;
  }

  if (
    containsTestSignal(value)
  ) {
    return true;
  }

  if (
    value.length <= 3 ||
    /^(.)\1{3,}$/i.test(value)
  ) {
    return true;
  }

  return false;
}

// ------------------------------------------------------------
// BUSINESS UNIT CLASSIFICATION
// ------------------------------------------------------------

const BUSINESS_TERMS = [
  "lms",
  "learning management system",
  "crm",
  "customer relationship management",
  "erp",
  "hrms",
  "website",
  "web development",
  "software",
  "application",
  "mobile app",
  "portal",
  "business management",
  "institution management",
  "school management",
  "college management",
  "custom software",
  "automation",
  "dashboard",
];

const ADMISSIONS_TERMS = [
  "admission",
  "course",
  "data science",
  "data analytics",
  "data analyst",
  "generative ai",
  "agentic ai",
  "python",
  "machine learning",
  "student",
  "training",
  "certification",
  "internship",
  "placement",
  "fees",
  "fee",
  "batch",
  "classes",
  "counselling",
];

function classifyBusinessUnit(lead) {
  const explicitBusinessUnit = normalizeText(
    lead?.metadata?.business_unit || lead?.source_snapshot?.business_unit
  ).replace(/[\s-]+/g, "_");

  if (["admissions", "business_solutions"].includes(explicitBusinessUnit)) {
    return { businessUnit: explicitBusinessUnit, confidence: 100 };
  }

  const text = [
    lead?.title,
    lead?.requirement,
    lead?.source,
    lead?.medium,
    lead?.campaign,
    lead?.landing_page,
    lead?.company?.name,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  let businessHits = 0;
  let admissionHits = 0;

  BUSINESS_TERMS.forEach((term) => {
    if (text.includes(term)) {
      businessHits += 1;
    }
  });

  ADMISSIONS_TERMS.forEach((term) => {
    if (text.includes(term)) {
      admissionHits += 1;
    }
  });

  if (
    businessHits === 0 &&
    admissionHits === 0
  ) {
    return {
      businessUnit: "unclassified",
      confidence: 0,
    };
  }

  if (businessHits > admissionHits) {
    return {
      businessUnit:
        "business_solutions",
      confidence: clamp(
        55 +
          (businessHits -
            admissionHits) *
            10
      ),
    };
  }

  if (admissionHits > businessHits) {
    return {
      businessUnit: "admissions",
      confidence: clamp(
        55 +
          (admissionHits -
            businessHits) *
            10
      ),
    };
  }

  return {
    businessUnit: "unclassified",
    confidence: 30,
  };
}

// ------------------------------------------------------------
// COMPLETENESS
// ------------------------------------------------------------

function calculateCompleteness(lead) {
  /*
    Weights total 100.

    These measure information availability,
    not commercial qualification.
  */

  const checks = [
    {
      value:
        lead?.contact?.full_name,
      weight: 15,
    },
    {
      value: lead?.contact?.email,
      weight: 20,
    },
    {
      value: lead?.contact?.phone,
      weight: 20,
    },
    {
      value: lead?.requirement,
      weight: 20,
    },
    {
      value: lead?.company?.name,
      weight: 10,
    },
    {
      value: lead?.source,
      weight: 5,
    },
    {
      value: lead?.campaign,
      weight: 5,
    },
    {
      value: lead?.medium,
      weight: 5,
    },
  ];

  return checks.reduce(
    (score, check) =>
      score +
      (cleanText(check.value)
        ? check.weight
        : 0),
    0
  );
}

// ------------------------------------------------------------
// DUPLICATE DETECTION
// ------------------------------------------------------------

async function detectDuplicates({
  supabase,
  organizationId,
  lead,
}) {
  const email =
    normalizeText(
      lead?.contact?.email
    );

  const phone =
    normalizePhone(
      lead?.contact?.phone
    ).replace(/\D/g, "");

  /*
    crm_leads stores contact linkage rather than duplicating
    every contact field, so we inspect other organization
    leads with their related contacts.

    This remains organization-scoped.
  */

  const {
    data: candidates,
    error,
  } = await supabase
    .from("crm_leads")
    .select(`
      id,
      contact_id,
      created_at,
      contact:crm_contacts (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq(
      "organization_id",
      organizationId
    )
    .neq("id", lead.id)
    .limit(500);

  if (error) {
    throw error;
  }

  const possible = [];
  const exact = [];

  for (const candidate of
    candidates || []) {
    const candidateEmail =
      normalizeText(
        candidate?.contact?.email
      );

    const candidatePhone =
      normalizePhone(
        candidate?.contact?.phone
      ).replace(/\D/g, "");

    const sameEmail =
      Boolean(email) &&
      Boolean(candidateEmail) &&
      email === candidateEmail;

    const samePhone =
      Boolean(phone) &&
      Boolean(candidatePhone) &&
      phone === candidatePhone;

    if (sameEmail && samePhone) {
      exact.push(candidate.id);
      continue;
    }

    if (sameEmail || samePhone) {
      possible.push(candidate.id);
    }
  }

  if (exact.length) {
    return {
      status: "exact",
      leadIds: unique(exact),
    };
  }

  if (possible.length) {
    return {
      status: "possible",
      leadIds: unique(possible),
    };
  }

  return {
    status: "none",
    leadIds: [],
  };
}

// ------------------------------------------------------------
// VALIDATION SCORING
// ------------------------------------------------------------

function buildValidation({
  lead,
  emailResult,
  phoneResult,
  duplicateResult,
  completenessScore,
  classification,
}) {
  const positiveSignals = [];
  const warningSignals = [];
  const blockingSignals = [];

  let score = 50;
  let spamScore = 0;

  const name =
    lead?.contact?.full_name || "";

  const requirement =
    lead?.requirement ||
    lead?.title ||
    "";

  const testSignal =
    containsTestSignal(
      name,
      requirement
    );

  const suspiciousNameSignal =
    suspiciousName(name);

  const suspiciousRequirementSignal =
    suspiciousRequirement(
      requirement
    );

  // EMAIL
  if (
    emailResult.status ===
    "valid_format"
  ) {
    score += 12;

    positiveSignals.push(
      "Email format is valid."
    );
  }

  if (
    emailResult.status ===
    "invalid_format"
  ) {
    score -= 25;
    spamScore += 20;

    blockingSignals.push(
      "Email format is invalid."
    );
  }

  if (
    emailResult.status === "missing"
  ) {
    score -= 10;

    warningSignals.push(
      "Email address is missing."
    );
  }

  if (emailResult.disposable) {
    score -= 20;
    spamScore += 30;

    warningSignals.push(
      "Disposable or temporary email domain detected."
    );
  }

  // PHONE
  if (
    phoneResult.status ===
    "plausible"
  ) {
    score += 12;

    positiveSignals.push(
      "Phone number has a plausible structure."
    );
  }

  if (
    phoneResult.status === "invalid"
  ) {
    score -= 20;
    spamScore += 20;

    blockingSignals.push(
      "Phone number structure appears invalid."
    );
  }

  if (
    phoneResult.status === "missing"
  ) {
    score -= 10;

    warningSignals.push(
      "Phone number is missing."
    );
  }

  // REQUIREMENT
  if (
    cleanText(requirement).length >=
    10
  ) {
    score += 8;

    positiveSignals.push(
      "Lead supplied requirement information."
    );
  } else {
    score -= 8;

    warningSignals.push(
      "Requirement information is very limited."
    );
  }

  // TEST / SPAM
  if (testSignal) {
    score -= 25;
    spamScore += 35;

    warningSignals.push(
      "Test-like language detected."
    );
  }

  if (suspiciousNameSignal) {
    score -= 15;
    spamScore += 20;

    warningSignals.push(
      "Contact name contains a suspicious or low-information pattern."
    );
  }

  if (
    suspiciousRequirementSignal
  ) {
    score -= 15;
    spamScore += 20;

    warningSignals.push(
      "Requirement contains a suspicious or test-like pattern."
    );
  }

  // DUPLICATES
  if (
    duplicateResult.status ===
    "exact"
  ) {
    score -= 20;

    warningSignals.push(
      "Exact duplicate contact detected in CRM."
    );
  }

  if (
    duplicateResult.status ===
    "possible"
  ) {
    score -= 8;

    warningSignals.push(
      "Possible duplicate contact detected in CRM."
    );
  }

  if (
    duplicateResult.status ===
    "none"
  ) {
    positiveSignals.push(
      "No matching duplicate contact detected."
    );
  }

  // COMPLETENESS
  if (completenessScore >= 70) {
    score += 8;

    positiveSignals.push(
      "Lead record has strong information completeness."
    );
  } else if (
    completenessScore < 40
  ) {
    score -= 10;

    warningSignals.push(
      "Lead record has low information completeness."
    );
  }

  // SOURCE
  if (cleanText(lead?.source)) {
    positiveSignals.push(
      `Lead source is available: ${cleanText(
        lead.source,
        100
      )}.`
    );
  } else {
    warningSignals.push(
      "Lead source is unavailable."
    );
  }

  score = clamp(score);
  spamScore = clamp(spamScore);

  let validationStatus =
    "needs_review";

  /*
    Strong invalid signals should quarantine,
    but we deliberately avoid automatically deleting anything.
  */

  if (
    emailResult.status ===
      "invalid_format" &&
    phoneResult.status === "invalid"
  ) {
    validationStatus =
      "suspected_invalid";
  } else if (
    spamScore >= 65
  ) {
    validationStatus =
      "suspected_invalid";
  } else if (
    score >= 70 &&
    spamScore < 30 &&
    duplicateResult.status !==
      "exact"
  ) {
    validationStatus = "valid";
  }

  /*
    Confidence here means confidence in the
    validation assessment, not lead quality.
  */

  let confidence = 55;

  if (
    emailResult.status !== "missing"
  ) {
    confidence += 10;
  }

  if (
    phoneResult.status !== "missing"
  ) {
    confidence += 10;
  }

  if (
    cleanText(requirement)
  ) {
    confidence += 10;
  }

  if (
    duplicateResult.status !==
    "none"
  ) {
    confidence += 5;
  }

  if (testSignal) {
    confidence += 5;
  }

  confidence = clamp(confidence);

  let recommendedAction;

  if (
    validationStatus ===
    "suspected_invalid"
  ) {
    recommendedAction =
      "Quarantine for review before AI qualification or sales follow-up.";
  } else if (
    validationStatus ===
    "needs_review"
  ) {
    recommendedAction =
      "Verify missing or suspicious information before treating this as a qualified opportunity.";
  } else {
    recommendedAction =
      "Lead passed initial validation and can proceed to qualification.";
  }

  return {
    validationStatus,
    validationScore: score,
    validationConfidence:
      confidence,
    spamScore,
    testSignal,
    suspiciousNameSignal,
    suspiciousRequirementSignal,
    positiveSignals:
      unique(positiveSignals),
    warningSignals:
      unique(warningSignals),
    blockingSignals:
      unique(blockingSignals),
    validationReason:
      validationStatus === "valid"
        ? "Initial deterministic validation passed."
        : validationStatus ===
          "suspected_invalid"
        ? "Strong invalid, spam, or test-like signals were detected."
        : "The lead requires additional verification before full qualification.",
    recommendedAction,
    classification,
  };
}

// ------------------------------------------------------------
// FETCH LEAD
// ------------------------------------------------------------

async function fetchLead({
  supabase,
  organizationId,
  leadId,
}) {
  const {
    data,
    error,
  } = await supabase
    .from("crm_leads")
    .select(`
      id,
      organization_id,
      company_id,
      contact_id,
      source_lead_id,
      source_table,
      title,
      requirement,
      source,
      medium,
      campaign,
      landing_page,
      metadata,
      source_snapshot,
      status,
      quality_status,
      lead_score,
      estimated_value,
      created_at,
      company:crm_companies (
        id,
        name
      ),
      contact:crm_contacts (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq(
      "organization_id",
      organizationId
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// ------------------------------------------------------------
// HANDLER
// ------------------------------------------------------------

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      "POST"
    );

    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const authContext =
      await authenticateCrmRequest(
        req
      );

    /*
      _auth.js already provides the authenticated
      organization context and server Supabase client.
    */

    const {
      supabase,
      organization,
    } = authContext;

    const organizationId =
      organization?.id;

    if (!organizationId) {
      return res.status(403).json({
        error:
          "CRM organization context is unavailable.",
      });
    }

    const body =
      getRequestBody(req);

    const leadId =
      cleanText(
        body?.lead_id,
        100
      );

    if (!leadId) {
      return res.status(400).json({
        error:
          "lead_id is required.",
      });
    }

    const lead =
      await fetchLead({
        supabase,
        organizationId,
        leadId,
      });

    if (!lead) {
      return res.status(404).json({
        error:
          "CRM lead was not found.",
      });
    }

    const emailResult =
      validateEmail(
        lead?.contact?.email
      );

    const phoneResult =
      validatePhone(
        lead?.contact?.phone
      );

    const completenessScore =
      calculateCompleteness(
        lead
      );

    const classification =
      classifyBusinessUnit(
        lead
      );

    const duplicateResult =
      await detectDuplicates({
        supabase,
        organizationId,
        lead,
      });

    const validation =
      buildValidation({
        lead,
        emailResult,
        phoneResult,
        duplicateResult,
        completenessScore,
        classification,
      });

    const record = {
      organization_id:
        organizationId,

      lead_id: lead.id,

      validation_version:
        VALIDATION_VERSION,

      validation_status:
        validation.validationStatus,

      validation_score:
        validation.validationScore,

      validation_confidence:
        validation.validationConfidence,

      email_status:
        emailResult.status,

      phone_status:
        phoneResult.status,

      duplicate_status:
        duplicateResult.status,

      duplicate_lead_ids:
        duplicateResult.leadIds,

      spam_score:
        validation.spamScore,

      completeness_score:
        completenessScore,

      test_signal:
        validation.testSignal,

      disposable_email_signal:
        emailResult.disposable,

      suspicious_name_signal:
        validation.suspiciousNameSignal,

      suspicious_requirement_signal:
        validation.suspiciousRequirementSignal,

      business_unit:
        classification.businessUnit,

      business_unit_confidence:
        classification.confidence,

      positive_signals:
        validation.positiveSignals,

      warning_signals:
        validation.warningSignals,

      blocking_signals:
        validation.blockingSignals,

      validation_reason:
        validation.validationReason,

      recommended_action:
        validation.recommendedAction,

      source:
        cleanText(
          lead?.source,
          200
        ) || null,

      medium:
        cleanText(
          lead?.medium,
          200
        ) || null,

      campaign:
        cleanText(
          lead?.campaign,
          500
        ) || null,

      landing_page:
        cleanText(
          lead?.landing_page,
          1000
        ) || null,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: savedValidation,
      error: saveError,
    } = await supabase
      .from(
        "crm_lead_validations"
      )
      .upsert(record, {
        onConflict:
          "lead_id,validation_version",
      })
      .select("*")
      .single();

    if (saveError) {
      throw saveError;
    }

    /*
      Update only CRM lead quality metadata.

      This does NOT alter the original synaptech_leads row.
    */

    const qualityStatus =
      validation.validationStatus ===
      "valid"
        ? "valid"
        : validation.validationStatus ===
          "suspected_invalid"
        ? "invalid"
        : "unreviewed";

    const {
      error: leadUpdateError,
    } = await supabase
      .from("crm_leads")
      .update({
        quality_status:
          qualityStatus,
      })
      .eq(
        "organization_id",
        organizationId
      )
      .eq("id", lead.id);

    if (leadUpdateError) {
      throw leadUpdateError;
    }

    return res.status(200).json({
      success: true,
      lead_id: lead.id,
      validation:
        savedValidation,
    });
  } catch (error) {
    console.error(
      "CRM lead validation error:",
      error
    );

    return sendCrmError(
      res,
      error
    );
  }
}
