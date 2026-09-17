import React, { useEffect, useState } from "react";
import {
  FiArrowRight,
  FiMessageCircle,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiZap,
} from "react-icons/fi";

import {
  continueCrmAiConversation,
  getCrmAiConversationTranscript,
  scoreCrmLead,
} from "../services/crmApi";

export default function CrmAiConversationPanel({
  lead,
  onScoreUpdated,
}) {
  const [conversation, setConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [readOnlyTranscript, setReadOnlyTranscript] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);

  const isAdmissionsLead =
    lead?.metadata?.business_unit === "admissions" ||
    lead?.business_unit === "admissions";

  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setMessages([]);
    setReadOnlyTranscript(false);
    setManualFallback(false);
    setError("");

    if (!lead?.id) return () => { cancelled = true; };

    setTranscriptLoading(true);
    getCrmAiConversationTranscript(lead.id)
      .then((response) => {
        if (cancelled || !response?.conversation) return;
        setConversation(response.conversation);
        setMessages((response.messages || []).map((message) => ({
          id: message.id,
          role: message.role,
          text: message.message_text,
        })));
        setReadOnlyTranscript(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Unable to load the Aira transcript.");
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });

    return () => { cancelled = true; };
  }, [lead?.id]);

  async function startConversation() {
    if (!lead?.id) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setManualFallback(true);
      setReadOnlyTranscript(false);

      const response =
        await continueCrmAiConversation(
          lead.id,
          "",
          {
            channel: "crm",
            consent_status:
              "not_required",
          }
        );

      setConversation(
        response?.conversation ||
          null
      );

      const aiMessage =
        response?.message;

      if (aiMessage?.message_text) {
        setMessages([
          {
            id:
              aiMessage.id ||
              `assistant-${Date.now()}`,
            role: "assistant",
            text:
              aiMessage.message_text,
          },
        ]);
      }
      // ------------------------------------------------------------
// AUTOMATIC DYNAMIC RESCORING
// ------------------------------------------------------------
//
// The AI conversation has already been saved and its
// extracted facts are available to the scoring engine.
//
// Scoring failure must NOT break the working conversation.

try {
  const scoreResponse =
    await scoreCrmLead(
      lead.id
    );

  if (
    typeof onScoreUpdated ===
    "function"
  ) {
    onScoreUpdated(
      scoreResponse
    );
  }
} catch (scoreError) {
  console.error(
    "Automatic CRM rescoring failed:",
    scoreError
  );
}
    } catch (err) {
      console.error(
        "AI conversation start failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to start AI conversation."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const message =
      input.trim();

    if (
      !message ||
      !lead?.id ||
      loading
    ) {
      return;
    }

    const customerMessage = {
      id:
        `customer-${Date.now()}`,
      role: "customer",
      text: message,
    };

    setMessages(
      (current) => [
        ...current,
        customerMessage,
      ]
    );

    setInput("");
    setLoading(true);
    setError("");

    try {
      const response =
        await continueCrmAiConversation(
          lead.id,
          message,
          {
            channel: "crm",
            consent_status:
              "not_required",
          }
        );

      setConversation(
        response?.conversation ||
          conversation
      );

      const aiMessage =
        response?.message;

      if (aiMessage?.message_text) {
        setMessages(
          (current) => [
            ...current,
            {
              id:
                aiMessage.id ||
                `assistant-${Date.now()}`,
              role:
                "assistant",
              text:
                aiMessage.message_text,
            },
          ]
        );
      }
    } catch (err) {
      console.error(
        "AI conversation failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to continue AI conversation."
      );
    } finally {
      setLoading(false);
    }
  }

  const businessUnit =
    conversation?.business_unit ===
    "business_solutions"
      ? "Business Solutions"
      : conversation?.business_unit ===
        "admissions"
      ? "Admissions"
      : "Unclassified";

  if (!conversation) {
    return (
      <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6 shadow-[0_20px_60px_rgba(79,70,229,0.10)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg">
                <FiMessageCircle />
              </span>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  AI Discovery
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {isAdmissionsLead ? "Aira Qualification Journey" : "Interactive Qualification"}
                </h3>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              {isAdmissionsLead
                ? "Website Aira answers will appear here as a read-only qualification journey. Use the live-call fallback only when a counsellor is speaking to the customer and must continue an abandoned journey."
                : "Start a guided AI discovery conversation. The AI will use known CRM facts, ask only the highest-value missing question, and progressively qualify the lead."}
            </p>
          </div>

          <button
            type="button"
            onClick={
              startConversation
            }
            disabled={loading || transcriptLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-violet-700 disabled:opacity-60"
          >
            {loading || transcriptLoading ? (
              <>
                <FiRefreshCw className="animate-spin" />
                {transcriptLoading ? "Loading Aira journey..." : "Starting..."}
              </>
            ) : (
              <>
                <FiZap />
                {isAdmissionsLead ? "Continue during live call" : "Start AI Discovery"}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-violet-200 bg-white shadow-[0_24px_70px_rgba(79,70,229,0.10)]">
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-950 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
              AI Discovery
            </p>

            <h3 className="mt-1 text-2xl font-black">
              {readOnlyTranscript ? "Website Aira Qualification" : "Interactive Qualification"}
            </h3>

            <p className="mt-2 text-sm text-white/75">
              {businessUnit}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">
              Status
            </p>

            <p className="mt-1 text-sm font-black">
              {conversation?.status ||
                "active"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
          {messages.map(
            (message) => {
              const isCustomer =
                message.role ===
                "customer";

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isCustomer
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-6 ${
                      isCustomer
                        ? "bg-slate-950 text-white"
                        : "border border-violet-100 bg-violet-50 text-slate-800"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] opacity-60">
                      {isCustomer ? (
                        <FiUser />
                      ) : (
                        <FiZap />
                      )}

                      {isCustomer
                        ? "Customer"
                        : "AI"}
                    </div>

                    {message.text}
                  </div>
                </div>
              );
            }
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-[20px] border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <FiRefreshCw className="animate-spin" />
                  AI is analysing the next best question...
                </div>
              </div>
            </div>
          )}
        </div>

        {readOnlyTranscript && !manualFallback && (
          <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800">Read-only customer journey</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">These messages came from the customer-facing Aira journey. CRM users cannot alter or impersonate the customer's replies.</p>
            {conversation?.status !== "qualified" && (
              <button
                type="button"
                onClick={() => { setManualFallback(true); setReadOnlyTranscript(false); }}
                className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-700"
              >
                Continue qualification during a live call
              </button>
            )}
          </div>
        )}

        {(!readOnlyTranscript || manualFallback) && <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder="Enter only the customer's spoken reply during this live call..."
              className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            />

            <button
              type="button"
              onClick={
                sendMessage
              }
              disabled={
                loading ||
                !input.trim()
              }
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiSend />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Enter = send · Shift+Enter = new line
            </p>

            {conversation
              ?.human_handoff_required && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                Human handoff recommended
                <FiArrowRight />
              </span>
            )}
          </div>
        </div>}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
