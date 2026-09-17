# Phase 5B.1 — Omnichannel Content Foundation

## Added files

- `api/_shared/crm-omnichannel-content-registry.js`
- `scripts/testCrmOmnichannelContent.mjs`

## What this phase adds

- Versioned selection between Synaptech Education admissions and Synaptech Solutions.
- Separate qualification-question sets for both business units.
- Explicit WhatsApp and AI-call consent questions.
- Provider-neutral WhatsApp and AI-call welcome/recovery wording.
- Pure lookup helpers and registry validation.

## What this phase does not do

- It does not enable WhatsApp or AI-call queues.
- It does not contact any lead.
- It does not change existing lead capture, scoring, qualification, Sales Ready, opportunity, pipeline, LMS, Firebase, Supabase or Meta Pixel logic.
- It does not store the dedicated provider phone number in browser code.

## Verification

From the project folder run:

```bash
node scripts/testCrmOmnichannelContent.mjs
npm run build
```

The content test must return `"valid": true`. The existing application build must remain successful.

## Next additive phase

Add persisted qualification-progress/abandonment events and a server-side recovery scheduler. Provider execution remains disabled.

