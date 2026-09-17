# Phase 5B.5 Hotfix — Aira Loading, Brochure and Form Handoffs

This hotfix is additive and preserves the existing Firebase, Supabase, CRM, LMS/Admin and AI qualification interfaces.

## Fixes

- Aira immediately disables the first Continue button and displays a spinner plus processing message.
- The non-essential tracking request no longer delays the visible processing state.
- `/brochures/Brochure_Synaptech.pdf` is excluded from the React SPA rewrite and is served as a static PDF.
- The homepage contact form now opens the admissions Aira journey using the details already entered.
- Successful student registration preserves its existing Firebase write and then continues into admissions Aira. Aira performs the existing additive CRM/Supabase lead bridge.
- The Education Solutions form continues to use its separate business-solutions AI flow.

Internal LMS/Admin forms are intentionally not connected to Aira because they are operational forms, not public lead forms.

## Verify in Windows Command Prompt

```cmd
node scripts\testCrmAdmissionsJourney.mjs
npm run build
npx vercel dev
```

Then verify:

1. Submit Ask Aira's candidate form and confirm the spinner appears immediately.
2. Open `http://localhost:3000/brochures/Brochure_Synaptech.pdf` and confirm the PDF viewer loads.
3. Submit the homepage Contact form and confirm Aira opens and begins admissions guidance.
4. Complete a new student registration and confirm the homepage opens with Aira continuing the admissions questions.
