// Single Vercel Serverless Function router.
// Keeps all existing /api/* URLs unchanged while staying within Hobby plan limits.

import aiChat from "../server/api-handlers/ai-chat.js";
import chat from "../server/api-handlers/chat.js";
import lead from "../server/api-handlers/lead.js";

import activities from "../server/api-handlers/crm/activities.js";
import aiConversationTranscript from "../server/api-handlers/crm/ai-conversation-transcript.js";
import aiConversation from "../server/api-handlers/crm/ai-conversation.js";
import aiQualify from "../server/api-handlers/crm/ai-qualify.js";
import closeOpportunityWon from "../server/api-handlers/crm/close-opportunity-won.js";
import communicationSettings from "../server/api-handlers/crm/communication-settings.js";
import communications from "../server/api-handlers/crm/communications.js";
import createOpportunity from "../server/api-handlers/crm/create-opportunity.js";
import evaluateQualification from "../server/api-handlers/crm/evaluate-qualification.js";
import followUps from "../server/api-handlers/crm/follow-ups.js";
import leadScores from "../server/api-handlers/crm/lead-scores.js";
import leads from "../server/api-handlers/crm/leads.js";
import leadById from "../server/api-handlers/crm/leads/[id].js";
import meteringConnections from "../server/api-handlers/crm/metering-connections.js";
import meteringIngest from "../server/api-handlers/crm/metering-ingest.js";
import opportunities from "../server/api-handlers/crm/opportunities.js";
import postSale from "../server/api-handlers/crm/post-sale.js";
import qualificationJourneys from "../server/api-handlers/crm/qualification-journeys.js";
import qualificationStates from "../server/api-handlers/crm/qualification-states.js";
import scoreLead from "../server/api-handlers/crm/score-lead.js";
import updateOpportunityStage from "../server/api-handlers/crm/update-opportunity-stage.js";
import validateLead from "../server/api-handlers/crm/validate-lead.js";

import crmAbandonmentPlan from "../server/api-handlers/cron/crm-abandonment-plan.js";
import crmUsageEvaluate from "../server/api-handlers/cron/crm-usage-evaluate.js";
import lmsUsageReport from "../server/api-handlers/cron/lms-usage-report.js";

import admissionsMessage from "../server/api-handlers/engagement/admissions/message.js";
import admissionsStart from "../server/api-handlers/engagement/admissions/start.js";
import businessEvent from "../server/api-handlers/engagement/business/event.js";
import businessFollowupTest from "../server/api-handlers/engagement/business/followup-test.js";
import businessMessage from "../server/api-handlers/engagement/business/message.js";
import businessStart from "../server/api-handlers/engagement/business/start.js";
import engagementJourney from "../server/api-handlers/engagement/journey.js";

const routes = new Map([
  ["ai-chat", aiChat],
  ["chat", chat],
  ["lead", lead],
  ["crm/activities", activities],
  ["crm/ai-conversation-transcript", aiConversationTranscript],
  ["crm/ai-conversation", aiConversation],
  ["crm/ai-qualify", aiQualify],
  ["crm/close-opportunity-won", closeOpportunityWon],
  ["crm/communication-settings", communicationSettings],
  ["crm/communications", communications],
  ["crm/create-opportunity", createOpportunity],
  ["crm/evaluate-qualification", evaluateQualification],
  ["crm/follow-ups", followUps],
  ["crm/lead-scores", leadScores],
  ["crm/leads", leads],
  ["crm/metering-connections", meteringConnections],
  ["crm/metering-ingest", meteringIngest],
  ["crm/opportunities", opportunities],
  ["crm/post-sale", postSale],
  ["crm/qualification-journeys", qualificationJourneys],
  ["crm/qualification-states", qualificationStates],
  ["crm/score-lead", scoreLead],
  ["crm/update-opportunity-stage", updateOpportunityStage],
  ["crm/validate-lead", validateLead],
  ["cron/crm-abandonment-plan", crmAbandonmentPlan],
  ["cron/crm-usage-evaluate", crmUsageEvaluate],
  ["cron/lms-usage-report", lmsUsageReport],
  ["engagement/admissions/message", admissionsMessage],
  ["engagement/admissions/start", admissionsStart],
  ["engagement/business/event", businessEvent],
  ["engagement/business/followup-test", businessFollowupTest],
  ["engagement/business/message", businessMessage],
  ["engagement/business/start", businessStart],
  ["engagement/journey", engagementJourney],
]);

function routeParts(req) {
  const value = req.query?.path;
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") return value.split("/").filter(Boolean);
  return [];
}

export default async function handler(req, res) {
  const parts = routeParts(req);
  const key = parts.join("/");

  // Preserve the former dynamic endpoint /api/crm/leads/[id].
  if (parts.length === 3 && parts[0] === "crm" && parts[1] === "leads") {
    req.query = { ...req.query, id: parts[2] };
    return leadById(req, res);
  }

  const target = routes.get(key);
  if (!target) {
    return res.status(404).json({ error: "API route not found", route: key });
  }

  return target(req, res);
}
