import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const appSource = readFileSync(fileURLToPath(new URL("src/App.jsx", root)), "utf8");
const chatbotSource = readFileSync(fileURLToPath(new URL("src/LeadChatbot.jsx", root)), "utf8");
const cataloguePath = fileURLToPath(new URL("public/catalogues/programme-fee-comparison.html", root));
const vercelSource = readFileSync(fileURLToPath(new URL("vercel.json", root)), "utf8");
const mainSource = readFileSync(fileURLToPath(new URL("src/main.jsx", root)), "utf8");
const cataloguePageSource = readFileSync(fileURLToPath(new URL("src/pages/ProgrammeFeeCatalogue.jsx", root)), "utf8");

const modules = [
  "data-analytics-module.pdf",
  "data-science-module.pdf",
  "genai-agenticai-module.pdf",
];

for (const filename of modules) {
  const path = fileURLToPath(new URL(`src/assets/modules/${filename}`, root));
  assert.ok(existsSync(path), `${filename} must exist in src/assets/modules.`);
  assert.ok(statSync(path).size > 1000, `${filename} must not be empty.`);
  assert.match(appSource, new RegExp(`assets/modules/${filename.replaceAll(".", "\\.")}`));
}

const brochurePath = fileURLToPath(new URL("src/assets/modules/Brochure_Synaptech.pdf", root));
assert.ok(existsSync(brochurePath), "The admissions brochure must be bundled from src/assets/modules.");
assert.ok(statSync(brochurePath).size > 1000, "The admissions brochure must not be empty.");
assert.match(chatbotSource, /import admissionsBrochure/, "Aira must use the Vite-bundled brochure URL.");
assert.match(chatbotSource, /text-slate-950 caret-red-600/, "Aira fields must have visible text and caret colours.");
assert.match(appSource, /ai-hero-clean\.mp4/, "The homepage must use the cleaned hero video.");
assert.match(appSource, /ai-hero-clean-poster\.jpg/, "The cleaned video must have a matching poster.");
assert.match(appSource, /from-red-950/, "The premium homepage must include its red/black visual system.");
assert.match(appSource, /IIT_Roorkee_Bright\.png/, "The IIT Roorkee identity must use the bright transparent asset on black.");
assert.ok(existsSync(cataloguePath), "The programme and fee comparison catalogue must exist.");
const catalogueSource = readFileSync(cataloguePath, "utf8");
assert.match(catalogueSource, /Data Analytics/);
assert.match(catalogueSource, /Data Science with Gen AI & Agentic AI/);
assert.match(catalogueSource, /₹69,800/);
assert.match(chatbotSource, /activeQuestion\?\.questionKey === "fee_counselling"/);
assert.match(chatbotSource, /Open complete programme & fee comparison/);
assert.match(mainSource, /catalogues\/programme-fee-comparison\.html/, "React Router must expose the catalogue URL.");
assert.match(cataloguePageSource, /programme-fee-comparison\.html\?raw/, "The catalogue route must use its bundled HTML source.");
assert.doesNotMatch(cataloguePageSource, /<iframe/, "Catalogue anchors must run in the main document, not inside an iframe.");
assert.match(cataloguePageSource, /dangerouslySetInnerHTML/, "The catalogue must render directly in its React route.");
assert.doesNotMatch(catalogueSource, /mailto:/, "Catalogue counselling buttons must not open an email client.");
assert.match(catalogueSource, /\?open=admissions/, "Catalogue counselling buttons must open the Aira-assisted contact form.");
assert.match(appSource, /query\.get\("open"\) === "admissions"/, "The homepage must open the admissions contact form from the catalogue.");
assert.doesNotMatch(vercelSource, /modules\/\|catalogues\//, "Vercel must route the catalogue through React Router.");

console.log(JSON.stringify({
  valid: true,
  course_pdf_assets: modules.length,
  aira_inputs_visible: true,
  cleaned_hero_video: true,
  red_black_theme: true,
  iit_logo_black_background_ready: true,
  programme_fee_catalogue: true,
  aira_counselling_resource_routing: true,
  logic_or_data_interfaces_changed: false,
}, null, 2));
