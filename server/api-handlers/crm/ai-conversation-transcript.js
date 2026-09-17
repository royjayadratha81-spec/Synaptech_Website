import { authenticateCrmRequest, sendCrmError } from "./_auth.js";

function clean(value, max = 100) {
  return String(value ?? "").trim().slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { organization, supabase } = await authenticateCrmRequest(req);
    const leadId = clean(req.query?.lead_id || req.query?.leadId);
    if (!leadId) return res.status(400).json({ error: "lead_id is required." });

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id,organization_id,metadata")
      .eq("organization_id", organization.id)
      .eq("id", leadId)
      .maybeSingle();
    if (leadError) throw leadError;
    if (!lead) return res.status(404).json({ error: "CRM lead not found." });

    const { data: rows, error: conversationError } = await supabase
      .from("crm_ai_conversations")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("lead_id", lead.id)
      .eq("channel", "crm")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (conversationError) throw conversationError;

    const conversation = rows?.[0] || null;
    if (!conversation) {
      return res.status(200).json({ success: true, conversation: null, messages: [] });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("crm_ai_messages")
      .select("id,role,channel,message_text,created_at,extracted_facts")
      .eq("organization_id", organization.id)
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (messagesError) throw messagesError;

    return res.status(200).json({
      success: true,
      read_only: true,
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("CRM AI transcript lookup failed:", error);
    return sendCrmError(res, error);
  }
}
