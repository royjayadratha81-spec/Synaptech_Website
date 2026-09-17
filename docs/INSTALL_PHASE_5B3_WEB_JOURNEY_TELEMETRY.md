# Phase 5B.3 — Web AI Journey Telemetry

## Purpose

Connect the two existing signed Business Solutions AI journeys to the Phase 5B.2 qualification-progress endpoint:

1. Education Solutions enquiry-form AI Discovery.
2. Education Solutions floating AI chatbot.

The integration is deliberately non-blocking. If telemetry fails, existing lead capture and AI conversations continue normally.

## Files

- `api/_shared/crm-qualification-journey-progress.js` — new
- `src/utils/crmJourneyTelemetry.js` — new
- `api/engagement/business/message.js` — replace with the supplied updated file
- `src/pages/EducationSolutions.jsx` — replace with the supplied updated file
- `scripts/testCrmJourneyTelemetry.mjs` — new

## Installation

1. Copy the files into the matching project folders.
2. No SQL migration is required; Migration 023 already created the required tables.
3. Do not change `vercel.json`.
4. Keep WhatsApp and AI-call execution switches disabled.

## CMD verification

```cmd
node scripts\testCrmJourneyTelemetry.mjs
node scripts\testCrmAbandonmentRecovery.mjs
node scripts\testCrmOmnichannelContent.mjs
npm run build
npx vercel dev
```

## Browser verification

Test each route separately on the Education Solutions landing page:

1. Submit the main enquiry form and answer one AI Discovery question.
2. Start a separate enquiry in the floating AI chatbot and answer one question.
3. Confirm both interfaces continue normally even if telemetry is unavailable.

Then run this read-only SQL in Supabase:

```sql
select
  session_id,
  business_unit,
  status,
  answered_question_count,
  completion_percent,
  next_question_key,
  last_activity_at
from public.crm_qualification_journeys
order by created_at desc
limit 10;
```

Two separate recent session rows should appear after both tests. The stored evidence contains question keys and progress only—not visitor answer text.

## Safety guarantees

- Existing `synaptech_leads` capture remains authoritative and unchanged.
- Existing CRM lead linking, conversation storage, AI scoring and qualification remain unchanged.
- Telemetry is fire-and-forget and cannot block the visitor journey.
- No WhatsApp message, AI call, communication job, score recalculation or pipeline movement is requested by this phase.

