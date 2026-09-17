# Visual-only Homepage Repair

This package corrects the public Synaptech Education homepage presentation and PDF asset references. It does not contain CRM APIs, SQL, Firebase configuration, Supabase configuration, LMS/Admin pages, authentication or scoring engines.

## Corrections

- Programme cards use the original PDFs from `src/assets/modules` through Vite imports.
- Aira's brochure uses the PDF from `src/assets/modules` through a Vite import.
- Aira input fields have explicit dark text, visible placeholders and a red caret.
- Synaptech Education branding is substantially larger in the header.
- IIT Roorkee branding is enlarged and displayed on a high-contrast panel.
- Navigation labels and buttons are larger and have premium pill styling.
- Hero typography and calls to action are larger.
- The cleaned AI hero video and matching poster are included.
- Programme and technology-card copy is more readable.

## Install

Extract this ZIP into the root of the existing `Synaptech_website` project and replace matching files. Do not delete the project and do not copy the ZIP into `src`.

The previously created `public/modules` folder is not used by this repair. It may remain in the project without affecting the site.

## Verify in Windows Command Prompt

```cmd
node scripts\testHomepageExperience.mjs
npm run build
npx vercel dev
```

After Vercel starts, open the homepage in a new Incognito window and press `Ctrl+F5`. Open each programme from the programme cards; the address will now contain a generated `/assets/...pdf` filename rather than `/modules/...`.
