function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function relatedRow(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function normalizeEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return email || null;
}

function normalizePhone(value) {
  let digits = clean(value, 80).replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits || null;
}

function normalizeDeliveryMode(value) {
  const mode = clean(value, 80).toLowerCase();

  if (mode.includes("hybrid")) return "hybrid";
  if (mode.includes("offline") || mode.includes("classroom")) return "offline";
  if (mode.includes("online")) return "online";
  return "undecided";
}

function normalizeContactChannel(value) {
  const channel = clean(value, 80).toLowerCase();

  if (channel.includes("whatsapp")) return "whatsapp";
  if (channel.includes("email")) return "email";
  if (channel.includes("in_person") || channel.includes("in person")) {
    return "in_person";
  }
  if (channel.includes("phone") || channel.includes("call")) return "phone";
  return null;
}

function candidateIdentityKey({ email, phone, leadId }) {
  if (email && phone) return `email_phone:${email}|${phone}`;

  // Deliberately avoid merging people using only one weak identifier.
  // The CRM lead ID still makes endpoint retries idempotent.
  return `crm_lead:${leadId}`;
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function findCandidateByIdentity({
  supabase,
  organizationId,
  identityKey,
}) {
  const { data, error } = await supabase
    .from("admissions_candidates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("identity_key", identityKey)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findApplicationByOpportunity({
  supabase,
  organizationId,
  opportunityId,
}) {
  const { data, error } = await supabase
    .from("admissions_applications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("crm_opportunity_id", opportunityId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function ensureHandoffEvent({
  supabase,
  organizationId,
  application,
  opportunity,
  workOrder,
  crmUser,
  now,
}) {
  const idempotencyKey = `crm_won_admissions:${opportunity.id}`;

  const { data: existing, error: existingError } = await supabase
    .from("admissions_application_events")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("admissions_application_events")
    .insert({
      organization_id: organizationId,
      application_id: application.id,
      event_type: "crm_won_handoff_created",
      from_status: null,
      to_status: application.status,
      actor_type: "integration",
      note: "CRM opportunity closed as won and entered the Finance admission queue.",
      payload: {
        crm_lead_id: opportunity.lead_id,
        crm_opportunity_id: opportunity.id,
        crm_work_order_id: workOrder?.id || null,
        work_order_number: workOrder?.work_order_number || null,
        recorded_by_crm_user_id: crmUser?.id || null,
        recorded_by_name: crmUser?.full_name || crmUser?.email || null,
      },
      idempotency_key: idempotencyKey,
      created_at: now,
    })
    .select("id")
    .single();

  if (error && !isUniqueViolation(error)) throw error;
  if (!error) return data;

  const { data: concurrentEvent, error: concurrentError } = await supabase
    .from("admissions_application_events")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .single();

  if (concurrentError) throw concurrentError;
  return concurrentEvent;
}

export async function handoffWonAdmissionToAdmissions({
  supabase,
  organization,
  opportunity,
  workOrder,
  crmUser,
  now = new Date().toISOString(),
}) {
  if (opportunity?.business_unit !== "admissions") {
    return {
      status: "not_applicable",
      reason: "The won opportunity is not an admissions opportunity.",
    };
  }

  const crmOrganizationId = organization?.id;
  if (!crmOrganizationId || !opportunity?.id || !opportunity?.lead_id) {
    throw new Error("Admissions handoff is missing its organization, opportunity or lead context.");
  }

  // CRM rows belong to crm_organizations, while Admissions rows belong to
  // platform_organizations. Resolve the explicit tenant mapping before any
  // Admissions lookup or insert; the two UUIDs are intentionally different.
  const { data: platformOrganization, error: platformOrganizationError } =
    await supabase
      .from("platform_organizations")
      .select("id,name,slug,status,crm_organization_id")
      .eq("crm_organization_id", crmOrganizationId)
      .eq("status", "active")
      .maybeSingle();

  if (platformOrganizationError) throw platformOrganizationError;
  if (!platformOrganization) {
    throw new Error(
      "No active platform organization is mapped to this CRM organization."
    );
  }

  const organizationId = platformOrganization.id;

  const { data: lead, error: leadError } = await supabase
    .from("crm_leads")
    .select(`
      id,
      organization_id,
      contact_id,
      company_id,
      title,
      requirement,
      source,
      medium,
      campaign,
      landing_page,
      source_snapshot,
      metadata,
      contact:crm_contacts(
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        whatsapp_number,
        city,
        state,
        country
      ),
      company:crm_companies(
        id,
        name,
        email,
        phone,
        city,
        state,
        country
      )
    `)
    .eq("organization_id", crmOrganizationId)
    .eq("id", opportunity.lead_id)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) throw new Error("The won CRM lead could not be loaded for Admissions handoff.");

  const { data: conversationRows, error: conversationError } = await supabase
    .from("crm_ai_conversations")
    .select("id,extracted_profile,updated_at")
    .eq("organization_id", crmOrganizationId)
    .eq("lead_id", lead.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (conversationError) throw conversationError;

  const conversation = conversationRows?.[0] || null;
  const profile = objectOrEmpty(conversation?.extracted_profile);
  const contact = relatedRow(lead.contact);
  const company = relatedRow(lead.company);

  const fullName = clean(
    contact?.full_name ||
      [contact?.first_name, contact?.last_name].filter(Boolean).join(" ") ||
      lead.title ||
      `CRM Candidate ${String(lead.id).slice(0, 8)}`,
    300
  );

  const email = normalizeEmail(contact?.email || company?.email);
  const phone = normalizePhone(
    contact?.phone || contact?.whatsapp_number || company?.phone
  );
  const identityKey = candidateIdentityKey({
    email,
    phone,
    leadId: lead.id,
  });

  let candidate = await findCandidateByIdentity({
    supabase,
    organizationId,
    identityKey,
  });
  let candidateCreated = false;

  if (!candidate) {
    const sourceChannel = clean(lead.source, 120).toLowerCase() || "crm";
    const sourceDetail = [lead.medium, lead.campaign]
      .map((value) => clean(value, 160))
      .filter(Boolean)
      .join(" / ") || null;

    const { data, error } = await supabase
      .from("admissions_candidates")
      .insert({
        organization_id: organizationId,
        full_name: fullName,
        email,
        email_normalized: email,
        phone: clean(contact?.phone || contact?.whatsapp_number || company?.phone, 80) || null,
        phone_normalized: phone,
        city: clean(contact?.city || profile.location || company?.city, 160) || null,
        guardian_name: clean(profile.guardian_name, 300) || null,
        guardian_email: normalizeEmail(profile.guardian_email),
        guardian_phone: clean(profile.guardian_phone, 80) || null,
        preferred_contact_channel: normalizeContactChannel(
          profile.preferred_contact_channel || profile.handoff_channel
        ),
        source_channel: sourceChannel,
        source_detail: sourceDetail,
        identity_key: identityKey,
        status: "active",
        metadata: {
          origin: "crm_won_handoff",
          crm_lead_id: lead.id,
          crm_contact_id: contact?.id || null,
          crm_company_id: company?.id || null,
          landing_page: lead.landing_page || null,
          source_snapshot: objectOrEmpty(lead.source_snapshot),
          crm_user: {
            id: crmUser?.id || null,
            full_name: crmUser?.full_name || null,
            email: crmUser?.email || null,
          },
        },
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error && !isUniqueViolation(error)) throw error;

    if (error) {
      candidate = await findCandidateByIdentity({
        supabase,
        organizationId,
        identityKey,
      });
      if (!candidate) throw error;
    } else {
      candidate = data;
      candidateCreated = true;
    }
  }

  let application = await findApplicationByOpportunity({
    supabase,
    organizationId,
    opportunityId: opportunity.id,
  });
  let applicationCreated = false;

  if (!application) {
    const programmeName = clean(
      workOrder?.package_name ||
        profile.course_interest ||
        profile.program_interest ||
        lead.requirement ||
        lead.title,
      300
    ) || null;

    const { data, error } = await supabase
      .from("admissions_applications")
      .insert({
        organization_id: organizationId,
        candidate_id: candidate.id,
        intake_route: "crm_won",
        lead_source: clean(lead.source, 160) || "crm",
        crm_lead_id: String(lead.id),
        crm_opportunity_id: String(opportunity.id),
        programme_code: clean(
          profile.programme_code || profile.program_code || profile.course_code,
          120
        ) || null,
        programme_name: programmeName,
        delivery_mode: normalizeDeliveryMode(
          profile.preferred_mode || profile.learning_mode
        ),
        academic_session: clean(profile.academic_session, 120) || null,
        batch_preference: clean(
          profile.batch_preference || profile.schedule_preference || profile.class_preference,
          200
        ) || null,
        status: "finance_pending",
        decision_status: "pending",
        decision_notes: null,
        finance_verification_required: true,
        submitted_at: now,
        reviewed_at: null,
        metadata: {
          origin: "crm_won_handoff",
          crm_ai_conversation_id: conversation?.id || null,
          crm_work_order_id: workOrder?.id || null,
          work_order_number: workOrder?.work_order_number || null,
          work_order_date: workOrder?.work_order_date || null,
          final_value: workOrder?.final_value ?? opportunity.estimated_value ?? null,
          currency: workOrder?.currency || opportunity.currency || "INR",
          payment_terms: workOrder?.payment_terms || null,
          expected_start_date: workOrder?.expected_start_date || null,
          recorded_by_crm_user_id: crmUser?.id || null,
          recorded_by_name: crmUser?.full_name || crmUser?.email || null,
        },
        version: 1,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error && !isUniqueViolation(error)) throw error;

    if (error) {
      application = await findApplicationByOpportunity({
        supabase,
        organizationId,
        opportunityId: opportunity.id,
      });
      if (!application) throw error;
    } else {
      application = data;
      applicationCreated = true;
    }
  }

  await ensureHandoffEvent({
    supabase,
    organizationId,
    application,
    opportunity,
    workOrder,
    crmUser,
    now,
  });

  return {
    status: applicationCreated ? "created" : "already_exists",
    candidate_created: candidateCreated,
    application_created: applicationCreated,
    candidate: {
      id: candidate.id,
      candidate_number: candidate.candidate_number,
    },
    application: {
      id: application.id,
      application_number: application.application_number,
      status: application.status,
    },
  };
}
