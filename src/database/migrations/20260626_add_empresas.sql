-- ============================================================
-- Migration: 20260626_add_empresas
-- Adds sector_types, companies tables and company_id to contacts
-- ============================================================

-- ─── sector_types ─────────────────────────────────────────────────────────────

CREATE TABLE crm.sector_types (
  id            UUID          NOT NULL DEFAULT gen_random_uuid(),
  business_id   UUID          NOT NULL,
  name          VARCHAR       NOT NULL,
  description   TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP,
  CONSTRAINT pk_sector_types PRIMARY KEY (id),
  CONSTRAINT fk_sector_types_business FOREIGN KEY (business_id)
    REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_sector_types_business_id ON crm.sector_types(business_id);

CREATE UNIQUE INDEX "UQ_business_sector_name"
  ON crm.sector_types(business_id, name)
  WHERE deleted_at IS NULL;

-- ─── companies ─────────────────────────────────────────────────────────────────

CREATE TABLE crm.companies (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL,
  name                VARCHAR     NOT NULL,
  identification      VARCHAR,
  website             VARCHAR,
  num_employees       INTEGER,
  description         TEXT,
  sector_type_id      UUID,
  lifecycle_stage_id  UUID,
  custom_fields       JSONB,
  created_at          TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMP,
  CONSTRAINT pk_companies PRIMARY KEY (id),
  CONSTRAINT fk_companies_business FOREIGN KEY (business_id)
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_companies_sector_type FOREIGN KEY (sector_type_id)
    REFERENCES crm.sector_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_companies_lifecycle_stage FOREIGN KEY (lifecycle_stage_id)
    REFERENCES public.lifecycle_stages(id) ON DELETE SET NULL
);

CREATE INDEX idx_companies_business_id ON crm.companies(business_id);
CREATE INDEX idx_companies_sector_type_id ON crm.companies(sector_type_id);

CREATE UNIQUE INDEX "UQ_business_company_name"
  ON crm.companies(business_id, name)
  WHERE deleted_at IS NULL;

-- ─── company_tags (junction) ───────────────────────────────────────────────────

CREATE TABLE crm.company_tags (
  company_id  UUID  NOT NULL,
  tag_id      UUID  NOT NULL,
  CONSTRAINT pk_company_tags PRIMARY KEY (company_id, tag_id),
  CONSTRAINT fk_company_tags_company FOREIGN KEY (company_id)
    REFERENCES crm.companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_company_tags_tag FOREIGN KEY (tag_id)
    REFERENCES crm.tags(id) ON DELETE CASCADE
);

-- ─── company_id en contacts ───────────────────────────────────────────────────

ALTER TABLE crm.contacts
  ADD COLUMN IF NOT EXISTS company_id UUID;

ALTER TABLE crm.contacts
  ADD CONSTRAINT fk_contacts_company
    FOREIGN KEY (company_id)
    REFERENCES crm.companies(id)
    ON DELETE SET NULL;

CREATE INDEX idx_contacts_company_id ON crm.contacts(company_id);
