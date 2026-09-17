# Phase 5B.4 — Synaptech Education Admissions AI Journey

## Purpose

Connect the existing website Ask Aira lead form to a separate, signed Admissions AI Discovery journey and the Phase 5B.2 progress tables.

The flow covers programme interest, education and career background, preferred learning mode and schedule, start timeline, career goal, prior experience, counselling need, callback preference, explicit WhatsApp consent, explicit AI-call consent and human-counsellor handoff.

## New files

- `api/engagement/admissions/start.js`
- `api/engagement/admissions/message.js`
- `scripts/testCrmAdmissionsJourney.mjs`
- `docs/INSTALL_PHASE_5B4_ADMISSIONS_AI_JOURNEY.md`

## Updated files to replace

- `api/engagement/business/start.js`
- `api/engagement/business/message.js`
- `api/crm/ai-conversation.js`
- `api/_shared/crm-qualification-journey-progress.js`
- `src/utils/crmJourneyTelemetry.js`
- `src/LeadChatbot.jsx`

The Business Solutions path remains supported by the same signed bridge and is selected only by its signed session business unit.

## Installation

1. Stop `npx vercel dev` with `Ctrl+C` and confirm `Y` if CMD asks.
2. Copy all supplied files into the matching folders.
3. Replace only the six files listed under **Updated files to replace**.
4. No SQL migration is required. Migration 023 already contains the journey tables.
5. Do not change `vercel.json`.
6. Keep WhatsApp and AI-call queue switches disabled.

## CMD verification

```cmd
node scripts\testCrmAdmissionsJourney.mjs
node scripts\testCrmJourneyTelemetry.mjs
node scripts\testCrmAbandonmentRecovery.mjs
node scripts\testCrmOmnichannelContent.mjs
npm run build
npx vercel dev
```

## Browser verification

1. Open the main Synaptech Education website where Ask Aira appears.
2. Open Ask Aira and submit a new test candidate profile.
3. Confirm the new **Admission guidance** screen opens.
4. Answer at least three questions and confirm Aira continues one question at a time.
5. Confirm **View course information** returns safely to the existing FAQ screen.
6. Use **Continue admission guidance** to resume the qualification.
7. Confirm the CRM still opens normally.

Run this read-only SQL after the browser test:

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

The newest Ask Aira journey must show `business_unit = 'admissions'`. Business Solutions rows must remain `business_solutions`.

## Safety guarantees

- Existing Ask Aira profile capture and FAQ features remain available.
- Existing Business Solutions form and chatbot remain intact.
- Signed sessions enforce the business unit server-side.
- Only question keys, progress and explicit consent booleans enter the journey table; answer text is excluded.
- Shared scoring and qualification engines remain authoritative.
- No provider job, WhatsApp message, AI call, Sales Ready action, pipeline movement or Won action is initiated here.

