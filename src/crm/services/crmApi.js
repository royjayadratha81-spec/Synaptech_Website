// src/crm/services/crmApi.js
//
// CRM frontend API service.
//
// Uses the EXISTING Firebase Authentication session.
// This does NOT create another authentication system.
//
// This service communicates only with:
//   /api/crm/*
//
// Existing LMS, website, Supabase lead capture,
// and Admin authentication logic are untouched.

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
/**
 * Get the Firebase ID token for the currently
 * authenticated user.
 */
async function waitForFirebaseUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  return await new Promise((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;

      settled = true;
      unsubscribe();

      reject(
        new Error(
          "Firebase authentication session could not be restored. Please log in again."
        )
      );
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (settled) return;

        settled = true;
        clearTimeout(timeout);
        unsubscribe();

        if (user) {
          resolve(user);
        } else {
          reject(
            new Error(
              "You must be logged in to access CRM."
            )
          );
        }
      },
      (error) => {
        if (settled) return;

        settled = true;
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      }
    );
  });
}

async function getFirebaseToken() {
  const user = await waitForFirebaseUser();

  return await user.getIdToken();
}

/**
 * Common authenticated CRM request helper.
 */
async function crmRequest(
  endpoint,
  options = {}
) {
  const token = await getFirebaseToken();

  const headers = {
    ...(options.body
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(
    endpoint,
    {
      ...options,
      headers,
    }
  );

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        `CRM request failed (${response.status}).`
    );
  }

  return result;
}

/**
 * Fetch CRM leads.
 *
 * Supported filters:
 *
 * {
 *   status,
 *   quality_status,
 *   pipeline_id,
 *   stage_id,
 *   owner_user_id,
 *   page,
 *   limit
 * }
 */
export async function getCrmLeads(
  filters = {}
) {
  const params =
    new URLSearchParams();

  const allowedFilters = [
    "status",
    "quality_status",
    "pipeline_id",
    "stage_id",
    "owner_user_id",
    "page",
    "limit",
  ];

  allowedFilters.forEach(
    (key) => {
      const value = filters[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        params.set(
          key,
          String(value)
        );
      }
    }
  );

  const queryString =
    params.toString();

  const endpoint =
    queryString
      ? `/api/crm/leads?${queryString}`
      : "/api/crm/leads";

  return await crmRequest(
    endpoint,
    {
      method: "GET",
    }
  );
}

/**
 * Fetch one CRM lead by its CRM UUID.
 */
export async function getCrmLead(
  leadId
) {
  if (!leadId) {
    throw new Error(
      "CRM lead ID is required."
    );
  }

  return await crmRequest(
    `/api/crm/leads/${encodeURIComponent(
      leadId
    )}`,
    {
      method: "GET",
    }
  );
}

/**
 * Refresh the Firebase ID token if required.
 *
 * Useful later for long-running CRM sessions.
 */
export async function refreshCrmToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to access CRM."
    );
  }

  return await user.getIdToken(
    true
  );
}
export async function qualifyCrmLead(leadId) {
  if (!leadId) {
    throw new Error("Lead ID is required for AI qualification.");
  }

  return crmRequest("/api/crm/ai-qualify", {
    method: "POST",

    body: JSON.stringify({
      lead_id: leadId,
    }),
  });
}
export async function validateCrmLead(
  leadId
) {
  if (!leadId) {
    throw new Error(
      "Lead ID is required for validation."
    );
  }

  return await crmRequest(
    "/api/crm/validate-lead",
    {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
      }),
    }
  );
}
// ------------------------------------------------------------
// CRM AI CONVERSATION
// ------------------------------------------------------------

export async function continueCrmAiConversation(
  leadId,
  message = "",
  options = {}
) {
  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  const token = await refreshCrmToken();

  const response = await fetch(
    "/api/crm/ai-conversation",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        lead_id: leadId,
        message,
        channel: options.channel || "crm",
        consent_status:
          options.consent_status || "unknown",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "AI conversation request failed."
    );
  }

  return data;
}
// ------------------------------------------------------------
// CRM DYNAMIC LEAD SCORING
// ------------------------------------------------------------

export async function scoreCrmLead(
  leadId
) {
  if (!leadId) {
    throw new Error(
      "Lead ID is required for scoring."
    );
  }

  const token =
    await refreshCrmToken();

  const response =
    await fetch(
      "/api/crm/score-lead",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          lead_id: leadId,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Dynamic lead scoring failed."
    );
  }

  return data;
}
// ------------------------------------------------------------
// CRM LEAD SCORE LIST
// ------------------------------------------------------------

export async function getCrmLeadScores() {
  return await crmRequest(
    "/api/crm/lead-scores",
    {
      method: "GET",
    }
  );
}
// ------------------------------------------------------------
// CRM SALES-READY QUALIFICATION
// ------------------------------------------------------------

export async function evaluateCrmQualification(
  leadId
) {
  if (!leadId) {
    throw new Error(
      "Lead ID is required for qualification evaluation."
    );
  }

  return await crmRequest(
    "/api/crm/evaluate-qualification",
    {
      method: "POST",

      body: JSON.stringify({
        lead_id: leadId,
      }),
    }
  );
}
// ------------------------------------------------------------
// CRM QUALIFICATION STATE LIST
// ------------------------------------------------------------

export async function getCrmQualificationStates() {
  return await crmRequest(
    "/api/crm/qualification-states",
    {
      method: "GET",
    }
  );
}
// ------------------------------------------------------------
// CRM OPPORTUNITY CREATION
// ------------------------------------------------------------

export async function createCrmOpportunity(
  leadId,
  payload = {}
) {
  if (!leadId) {
    throw new Error(
      "Lead ID is required to create an opportunity."
    );
  }

  return await crmRequest(
    "/api/crm/create-opportunity",
    {
      method: "POST",

      body: JSON.stringify({
        lead_id: leadId,
        ...payload,
      }),
    }
  );
}
// ------------------------------------------------------------
// CRM OPPORTUNITY LIST
// ------------------------------------------------------------

export async function getCrmOpportunities() {
  return await crmRequest(
    "/api/crm/opportunities",
    {
      method: "GET",
    }
  );
}
// ------------------------------------------------------------
// CRM OPPORTUNITY STAGE UPDATE
// ------------------------------------------------------------

export async function updateCrmOpportunityStage(
  opportunityId,
  stageId
) {
  if (!opportunityId) {
    throw new Error(
      "Opportunity ID is required."
    );
  }

  if (!stageId) {
    throw new Error(
      "Destination stage ID is required."
    );
  }

  return await crmRequest(
    "/api/crm/update-opportunity-stage",
    {
      method: "POST",

      body: JSON.stringify({
        opportunity_id:
          opportunityId,

        stage_id:
          stageId,
      }),
    }
  );
}

export async function getCrmAiConversationTranscript(leadId) {
  if (!leadId) throw new Error("Lead ID is required.");
  return await crmRequest(`/api/crm/ai-conversation-transcript?lead_id=${encodeURIComponent(leadId)}`);
}

// ------------------------------------------------------------
// CRM MANUAL HUMAN-CALL ACTIVITIES
// ------------------------------------------------------------

export async function getCrmActivities(filters = {}) {
  const params = new URLSearchParams();
  if (filters.lead_id) params.set("lead_id", filters.lead_id);
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return await crmRequest(
    query ? `/api/crm/activities?${query}` : "/api/crm/activities",
    { method: "GET" }
  );
}

export async function createCrmHumanCall(leadId, payload = {}) {
  if (!leadId) throw new Error("Lead ID is required to record a call.");

  return await crmRequest("/api/crm/activities", {
    method: "POST",
    body: JSON.stringify({ lead_id: leadId, ...payload }),
  });
}

// ------------------------------------------------------------
// CRM FOLLOW-UP TASKS
// ------------------------------------------------------------

export async function getCrmFollowUps(filters = {}) {
  const params = new URLSearchParams();
  ["lead_id", "status", "channel", "limit"].forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, String(filters[key]));
    }
  });

  const query = params.toString();
  return await crmRequest(
    query ? `/api/crm/follow-ups?${query}` : "/api/crm/follow-ups",
    { method: "GET" }
  );
}

export async function updateCrmFollowUp(jobId, action, payload = {}) {
  if (!jobId) throw new Error("Follow-up job ID is required.");
  if (!action) throw new Error("Follow-up action is required.");

  return await crmRequest("/api/crm/follow-ups", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, action, ...payload }),
  });
}

// ------------------------------------------------------------
// CRM EXPLICIT WORK-ORDER / CLOSE WON
// ------------------------------------------------------------

export async function closeCrmOpportunityWon(opportunityId, payload = {}) {
  if (!opportunityId) throw new Error("Opportunity ID is required.");

  return await crmRequest("/api/crm/close-opportunity-won", {
    method: "POST",
    body: JSON.stringify({ opportunity_id: opportunityId, ...payload }),
  });
}

// ------------------------------------------------------------
// CRM POST-SALE / CUSTOMER SUCCESS
// ------------------------------------------------------------

export async function getCrmPostSale() {
  return crmRequest("/api/crm/post-sale", { method: "GET" });
}

export async function updateCrmPostSale(action, payload = {}) {
  if (!action) throw new Error("Post-sale action is required.");
  return crmRequest("/api/crm/post-sale", {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
}

// ------------------------------------------------------------
// CRM TENANT METERING CONNECTIONS
// ------------------------------------------------------------

export async function getCrmMeteringConnections() {
  return crmRequest("/api/crm/metering-connections", { method: "GET" });
}

export async function provisionCrmMeteringConnection(payload = {}) {
  if (!payload.customer_project_id) {
    throw new Error("Customer project is required.");
  }
  return crmRequest("/api/crm/metering-connections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ------------------------------------------------------------
// CRM PROVIDER-NEUTRAL WHATSAPP / AI-CALL ORCHESTRATION
// ------------------------------------------------------------

export async function getCrmCommunications(filters = {}) {
  const params = new URLSearchParams();
  ["lead_id", "channel", "status", "limit"].forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      params.set(key, String(filters[key]));
    }
  });
  const query = params.toString();
  return crmRequest(query ? `/api/crm/communications?${query}` : "/api/crm/communications", {
    method: "GET",
  });
}

export async function previewCrmCommunication(leadId, channel, payload = {}) {
  if (!leadId) throw new Error("Lead ID is required.");
  if (!channel) throw new Error("Communication channel is required.");
  return crmRequest("/api/crm/communications", {
    method: "POST",
    body: JSON.stringify({ action: "preview", lead_id: leadId, channel, ...payload }),
  });
}

export async function queueCrmCommunication(leadId, channel, payload = {}) {
  if (!leadId) throw new Error("Lead ID is required.");
  if (!channel) throw new Error("Communication channel is required.");
  return crmRequest("/api/crm/communications", {
    method: "POST",
    body: JSON.stringify({ action: "queue", lead_id: leadId, channel, ...payload }),
  });
}

export async function updateCrmCommunication(jobId, action, payload = {}) {
  if (!jobId) throw new Error("Communication job ID is required.");
  return crmRequest("/api/crm/communications", {
    method: "POST",
    body: JSON.stringify({ action, job_id: jobId, ...payload }),
  });
}

export async function getCrmCommunicationSettings() {
  return crmRequest("/api/crm/communication-settings", { method: "GET" });
}

export async function saveCrmCommunicationSettings(payload = {}) {
  return crmRequest("/api/crm/communication-settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
