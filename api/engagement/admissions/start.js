// Admissions-specific public entry point. The shared engagement bridge keeps
// signing, CRM linkage and organization isolation in one audited code path.

import startEngagement from "../business/start.js";

export default async function handler(req, res) {
  req.body = {
    ...(req.body || {}),
    business_unit: "admissions",
  };
  return startEngagement(req, res);
}

