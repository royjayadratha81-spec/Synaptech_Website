begin;

-- A CRM opportunity may create only one admission application.
-- PostgreSQL still permits multiple NULL crm_opportunity_id values
-- for website, walk-in, LMS-only and other intake routes.
create unique index if not exists
  admissions_applications_org_crm_opportunity_uq
on public.admissions_applications (
  organization_id,
  crm_opportunity_id
);

comment on index
  public.admissions_applications_org_crm_opportunity_uq
is
  'Prevents duplicate admission applications when the same CRM won opportunity is processed more than once.';

commit;