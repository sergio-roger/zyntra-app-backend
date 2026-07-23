-- Migration: Create security.business_profiles (1:1 brand/context profile per business)
-- Dev: TypeORM synchronize:true auto-creates this table. Run manually in production.

CREATE TABLE IF NOT EXISTS security.business_profiles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID NOT NULL UNIQUE REFERENCES security.businesses(id) ON DELETE CASCADE,

  industry_id            UUID REFERENCES crm.industries(id) ON DELETE SET NULL,
  niche_detail           VARCHAR(150) NOT NULL DEFAULT '',
  value_proposition      VARCHAR(600) NOT NULL DEFAULT '',
  mission                VARCHAR(600),
  competitors            JSONB NOT NULL DEFAULT '[]',

  target_audience        VARCHAR(800) NOT NULL DEFAULT '',
  audience_age_range     VARCHAR(20),
  business_model         VARCHAR(20) NOT NULL DEFAULT 'b2c'
                            CHECK (business_model IN ('b2b','b2c','b2b2c')),
  geographic_scope       VARCHAR(20) NOT NULL DEFAULT 'local'
                            CHECK (geographic_scope IN ('local','national','international')),
  country                VARCHAR(100),
  city                   VARCHAR(100),

  tone                   VARCHAR(30) NOT NULL DEFAULT 'friendly'
                            CHECK (tone IN ('friendly','professional','playful','formal','bold','luxury','minimalist')),
  brand_voice_notes      VARCHAR(500),
  locale                 VARCHAR(10) NOT NULL DEFAULT 'es',
  brand_colors           JSONB,

  primary_goal           VARCHAR(30) NOT NULL DEFAULT 'leads'
                            CHECK (primary_goal IN ('leads','sales','awareness','retention','support')),
  monthly_budget_range   VARCHAR(30)
                            CHECK (monthly_budget_range IS NULL OR monthly_budget_range IN
                              ('under_500','from_500_to_1000','from_1000_to_5000','from_5000_to_10000','over_10000')),
  active_channels        TEXT[] NOT NULL DEFAULT '{}',
  team_size              INT CHECK (team_size IS NULL OR (team_size BETWEEN 1 AND 100000)),

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
