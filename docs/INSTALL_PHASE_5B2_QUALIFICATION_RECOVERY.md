# Phase 5B.2 — Qualification Progress and Recovery Planning

## Purpose

Persist AI-qualification progress, detect 15 minutes of inactivity, mark an incomplete journey abandoned and store a deterministic recovery plan.

This phase does **not** create WhatsApp/AI-call jobs, send messages, place calls, recalculate intelligence or modify pipeline state.

## Files

- `sql/CRM_Migration_023_Qualification_Journey_Recovery.sql`
- `api/_shared/crm-abandonment-recovery-policy.js`
- `api/engagement/journey.js`
- `api/cron/crm-abandonment-plan.js`
- `api/crm/qualification-journeys.js`
- `scripts/testCrmAbandonmentRecovery.mjs`

## Installation order

1. Run migration 023 once in Supabase SQL Editor.
2. Add the four new API/shared files without replacing existing files.
3. Add the test script.
4. Do not modify the complete `vercel.json` yet. Cron scheduling will be added only after manual endpoint verification.
5. Keep WhatsApp and AI-call execution switches disabled.

## Local verification

```bash
node scripts/testCrmAbandonmentRecovery.mjs
node scripts/testCrmOmnichannelContent.mjs
npm run build
```

## Database verification

```sql
select to_regclass('public.crm_qualification_journeys') as journeys_table,
       to_regclass('public.crm_qualification_journey_events') as events_table;
```

Both values must return their table names.

## Safety behavior

- Public progress writes require the existing signed engagement-session token.
- Only recognized question keys are stored.
- Answer text is deliberately excluded from this telemetry table.
- The cron endpoint requires `CRON_SECRET`.
- The cron stores `recovery_plan` and `next_recovery_at` only.
- It always reports `communication_jobs_created: 0` and `provider_execution_requested: false`.

## Next step

After migration and local verification, add small non-blocking telemetry calls to the two existing web AI journeys. That connection will be tested before any recovery job creation is introduced.
