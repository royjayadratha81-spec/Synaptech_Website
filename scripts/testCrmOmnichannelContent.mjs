import assert from "node:assert/strict";

import {
  BUSINESS_UNITS,
  CHANNEL_SCRIPTS,
  OMNICHANNEL_CONTENT_VERSION,
  getBusinessUnit,
  getChannelScript,
  getQuestion,
  getQuestionSet,
  listBusinessUnitOptions,
  normalizeBusinessUnit,
  validateContentRegistry,
} from "../api/_shared/crm-omnichannel-content-registry.js";

const validation = validateContentRegistry();
assert.equal(validation.valid, true, validation.errors.join("\n"));
assert.equal(validation.version, OMNICHANNEL_CONTENT_VERSION);
assert.equal(validation.business_units, 2);

assert.equal(normalizeBusinessUnit("1"), "admissions");
assert.equal(normalizeBusinessUnit("Synaptech Education"), "admissions");
assert.equal(normalizeBusinessUnit("2"), "business_solutions");
assert.equal(normalizeBusinessUnit("Synaptech Solutions"), "business_solutions");
assert.equal(normalizeBusinessUnit("unknown"), null);

assert.equal(getBusinessUnit("admissions"), BUSINESS_UNITS.admissions);
assert.equal(getQuestionSet("admissions")?.business_unit, "admissions");
assert.equal(getQuestionSet("business solutions")?.business_unit, "business_solutions");
assert.equal(getQuestion("admissions", "whatsapp_consent")?.answer_type, "explicit_consent");
assert.equal(getQuestion("business_solutions", "ai_call_consent")?.answer_type, "explicit_consent");
assert.equal(getQuestion("admissions", "does_not_exist"), null);

assert.equal(listBusinessUnitOptions().length, 2);
assert.match(CHANNEL_SCRIPTS.business_unit_selector.whatsapp, /Reply 1 or 2/);
assert.match(getChannelScript("admissions", "abandonment_whatsapp"), /CONTINUE/);
assert.match(getChannelScript("business_solutions", "welcome_ai_call"), /AI-assisted advisor/);

console.log(JSON.stringify(validation, null, 2));

