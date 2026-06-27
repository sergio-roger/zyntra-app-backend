-- ============================================================
-- Migration: 20260626_add_empresas
-- Adds sector_tipos, empresas tables and empresa_id to contacts
-- ============================================================

-- ─── sector_tipos ─────────────────────────────────────────────────────────────

CREATE TABLE crm.sector_tipos (
  id            UUID          NOT NULL DEFAULT gen_random_uuid(),
  business_id   UUID          NOT NULL,
  name          VARCHAR       NOT NULL,
  description   TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMP,
  CONSTRAINT pk_sector_tipos PRIMARY KEY (id),
  CONSTRAINT fk_sector_tipos_business FOREIGN KEY (business_id)
    REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX idx_sector_tipos_business_id ON crm.sector_tipos(business_id);

CREATE UNIQUE INDEX "UQ_business_sector_name"
  ON crm.sector_tipos(business_id, name)
  WHERE deleted_at IS NULL;

-- ─── empresas ─────────────────────────────────────────────────────────────────

CREATE TABLE crm.empresas (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  business_id         UUID        NOT NULL,
  name                VARCHAR     NOT NULL,
  identificacion      VARCHAR,
  website             VARCHAR,
  num_empleados       INTEGER,
  descripcion         TEXT,
  sector_tipo_id      UUID,
  lifecycle_stage_id  UUID,
  custom_fields       JSONB,
  created_at          TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMP,
  CONSTRAINT pk_empresas PRIMARY KEY (id),
  CONSTRAINT fk_empresas_business FOREIGN KEY (business_id)
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_empresas_sector_tipo FOREIGN KEY (sector_tipo_id)
    REFERENCES crm.sector_tipos(id) ON DELETE SET NULL,
  CONSTRAINT fk_empresas_lifecycle_stage FOREIGN KEY (lifecycle_stage_id)
    REFERENCES public.lifecycle_stages(id) ON DELETE SET NULL
);

CREATE INDEX idx_empresas_business_id ON crm.empresas(business_id);
CREATE INDEX idx_empresas_sector_tipo_id ON crm.empresas(sector_tipo_id);

CREATE UNIQUE INDEX "UQ_business_empresa_name"
  ON crm.empresas(business_id, name)
  WHERE deleted_at IS NULL;

-- ─── empresa_tags (junction) ───────────────────────────────────────────────────

CREATE TABLE crm.empresa_tags (
  empresa_id  UUID  NOT NULL,
  tag_id      UUID  NOT NULL,
  CONSTRAINT pk_empresa_tags PRIMARY KEY (empresa_id, tag_id),
  CONSTRAINT fk_empresa_tags_empresa FOREIGN KEY (empresa_id)
    REFERENCES crm.empresas(id) ON DELETE CASCADE,
  CONSTRAINT fk_empresa_tags_tag FOREIGN KEY (tag_id)
    REFERENCES crm.tags(id) ON DELETE CASCADE
);

-- ─── empresa_id en contacts ───────────────────────────────────────────────────

ALTER TABLE crm.contacts
  ADD COLUMN IF NOT EXISTS empresa_id UUID;

ALTER TABLE crm.contacts
  ADD CONSTRAINT fk_contacts_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES crm.empresas(id)
    ON DELETE SET NULL;

CREATE INDEX idx_contacts_empresa_id ON crm.contacts(empresa_id);
