-- ============================================================
-- UP: dedicated `workflows` schema — form_templates/form_fields/form_submissions
-- ============================================================
-- Dev: TypeORM synchronize:true auto-creates/alters these. Run manually in
-- production. Run AFTER 20260720_move_agents_to_workflows_schema.sql so the
-- schema already exists (CREATE SCHEMA IF NOT EXISTS below is a no-op then).

CREATE SCHEMA IF NOT EXISTS workflows;

CREATE TABLE workflows.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  submit_action VARCHAR(30) NOT NULL DEFAULT 'create_contact',
  target_entity_type VARCHAR(20),
  success_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_form_templates_business_id ON workflows.form_templates (business_id);
CREATE UNIQUE INDEX "UQ_business_form_slug" ON workflows.form_templates (business_id, slug) WHERE deleted_at IS NULL;

CREATE TABLE workflows.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id UUID NOT NULL REFERENCES workflows.form_templates(id) ON DELETE CASCADE,
  field_key VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL,
  maps_to VARCHAR,
  placeholder VARCHAR,
  validation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_form_fields_form_template_id ON workflows.form_fields (form_template_id);
CREATE UNIQUE INDEX "UQ_form_template_field_key" ON workflows.form_fields (form_template_id, field_key) WHERE deleted_at IS NULL;

CREATE TABLE workflows.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_template_id UUID NOT NULL REFERENCES workflows.form_templates(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES crm.companies(id) ON DELETE SET NULL,
  source_channel VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_submissions_business_id ON workflows.form_submissions (business_id);
CREATE INDEX idx_form_submissions_form_template_id ON workflows.form_submissions (form_template_id);

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS workflows.form_submissions;
-- DROP TABLE IF EXISTS workflows.form_fields;
-- DROP TABLE IF EXISTS workflows.form_templates;
-- ============================================================
