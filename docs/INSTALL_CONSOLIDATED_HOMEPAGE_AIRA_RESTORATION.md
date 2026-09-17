# Consolidated Homepage and Aira Restoration

Use this package instead of the earlier homepage, brochure or Aira hotfix packages. It contains the compatible versions together so they are not applied out of sequence.

## What this restores

- Opens all three programme PDFs directly from **Explore Programmes**.
- Opens the Synaptech brochure directly instead of passing the PDF URL to React Router.
- Uses the cleaned AI hero video and its matching poster image.
- Applies the premium black, graphite and red homepage design.
- Shows an immediate processing state while Aira is preparing the next response.
- Keeps each admissions question paired with its own answer choices and prevents completed questions from repeating.
- Preserves the Business Solutions journey and the existing CRM, Firebase, Supabase, LMS/Admin, authentication and database interfaces.
- Continues the Aira admissions handoff from the homepage contact form and enrolment registration flow.

## Install

Extract the ZIP directly into the root of the existing `Synaptech_website` project and allow Windows to replace files with matching names. Do not delete the project or copy the ZIP into `src`.

## Verify in Windows Command Prompt

```cmd
node scripts\testHomepageExperience.mjs
node scripts\testCrmAdmissionsJourney.mjs
node scripts\testCrmJourneyTelemetry.mjs
node scripts\testCrmAbandonmentRecovery.mjs
node scripts\testCrmOmnichannelContent.mjs
npm run build
npx vercel dev
```

No SQL migration is required for this correction.

After Vercel starts, hard-refresh with `Ctrl+F5` and test these addresses:

```text
http://localhost:3000/modules/data-analytics-module.pdf
http://localhost:3000/modules/data-science-module.pdf
http://localhost:3000/modules/genai-agenticai-module.pdf
http://localhost:3000/brochures/Brochure_Synaptech.pdf
```

For a clean Aira journey test, use an Incognito window and a new email address and phone number so an earlier incomplete session is not resumed.
