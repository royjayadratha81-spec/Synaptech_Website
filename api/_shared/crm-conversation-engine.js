// api/_shared/crm-conversation-engine.js
//
// Shared server-side CRM conversation intelligence.
//
// PURPOSE:
// Give trusted server-side endpoints one controlled access
// point to the existing CRM AI Discovery engine.
//
// IMPORTANT:
// - Server-side only.
// - Does NOT expose Firebase/Admin authentication.
// - Does NOT expose CRM IDs to website visitors.
// - Does NOT modify LMS/Admin logic.
// - Does NOT replace api/crm/ai-conversation.js.
// - Does NOT duplicate the AI qualification engine.

export {
  CONVERSATION_VERSION,
  inferBusinessUnit,
  buildLeadSnapshot,
  runConversationAi,
  normalizeAiResult,
} from "../crm/ai-conversation.js";