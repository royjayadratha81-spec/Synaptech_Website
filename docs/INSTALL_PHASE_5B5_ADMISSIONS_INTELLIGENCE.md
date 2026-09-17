# Phase 5B.5 — Admissions Intelligence and Brochure

## Scope and safety

This phase is additive. It does not replace Firebase, Supabase, LMS/Admin, existing lead storage, authentication, or CRM interfaces. It does not send WhatsApp messages or place AI calls. The shared CRM qualification and scoring engines remain authoritative, and automated channels cannot directly mark a lead Sales Ready, Pipeline, or Won.

No SQL migration or environment-variable change is required for this phase.

## Included behaviour

- Admissions questions now use explicit course choices and no longer ask a routine weekday/weekend question.
- Fees, durations, payment plans, mode policy, schedule policy, placement support, decision authority, and brochure information come from one provider-neutral catalogue.
- The chatbot API additively returns `question_key` and `answer_options`; existing response fields remain unchanged.
- Ask Aira displays selectable answer options and presents the optimized brochure when qualification is complete or a human handoff is requested.
- Decision authority, payment preference, timeline, and course interest are included in the admissions qualification gate. Final CRM stages still depend on the existing scoring and human-review rules.

## Install

Copy the package contents into the project root, preserving all folders. When Windows asks, merge folders and replace only files from this package. Do not replace unrelated files.

## Verify in Command Prompt

From the project root, run:

```cmd
node scripts\testCrmAdmissionsJourney.mjs
node scripts\testCrmJourneyTelemetry.mjs
node scripts\testCrmAbandonmentRecovery.mjs
node scripts\testCrmOmnichannelContent.mjs
npm run build
npx vercel dev
```

The Vercel development server normally opens at `http://localhost:3000`.

## Browser acceptance test

Use an incognito window or a new test lead and confirm:

1. Course choices show Data Analytics, Data Science, and Data Science with Gen AI & Agentic AI.
2. The bot does not repeat course or qualification questions after an answer is recorded.
3. It does not ask whether the student wants weekday classes. Weekend is standard; weekday classes are conditional on management approval and availability.
4. Online, offline, and hybrid have the same fee.
5. Direct fee questions receive the exact catalogue figures.
6. Fast track is offered only for Data Science with Gen AI & Agentic AI.
7. Payment preference, decision authority, authority confirmation, and placement-support requirement are collected.
8. Placement assistance is described without guaranteeing employment.
9. The final screen offers the Synaptech brochure for viewing/downloading.
10. Existing contact capture and CRM lead creation still work.

## Optional Supabase verification

After completing a test conversation, run:

```sql
select
  session_id,
  business_unit,
  status,
  answered_question_count,
  completion_percent,
  next_question_key,
  whatsapp_consent_snapshot,
  ai_call_consent_snapshot,
  callback_requested,
  last_activity_at
from public.crm_qualification_journeys
order by created_at desc
limit 10;
```

No provider execution should occur. WhatsApp and AI calling remain disabled until their providers are configured and separately approved.
