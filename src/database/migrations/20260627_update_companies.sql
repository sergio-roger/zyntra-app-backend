-- Update crm_sector_types to crm_industries if they exist in schema crm
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'crm_sector_types') THEN
    ALTER TABLE crm.crm_sector_types RENAME TO crm_industries;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'sector_types') THEN
    ALTER TABLE crm.sector_types RENAME TO industries;
  END IF;
END $$;

-- Update foreign key column name in crm.companies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'companies' AND column_name = 'sector_type_id') THEN
    ALTER TABLE crm.companies RENAME COLUMN sector_type_id TO industry_id;
  END IF;
END $$;

-- Add new columns to crm.companies
ALTER TABLE crm.companies ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE crm.companies ADD COLUMN IF NOT EXISTS tax_type varchar;
ALTER TABLE crm.companies ADD COLUMN IF NOT EXISTS employee_range varchar;

-- Drop old column if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'crm' AND table_name = 'companies' AND column_name = 'num_employees') THEN
    ALTER TABLE crm.companies DROP COLUMN num_employees;
  END IF;
END $$;

-- Add foreign key constraint for owner_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'crm' AND constraint_name = 'fk_company_owner') THEN
    ALTER TABLE crm.companies
    ADD CONSTRAINT fk_company_owner
    FOREIGN KEY (owner_id)
    REFERENCES security.users (id)
    ON DELETE SET NULL;
  END IF;
END $$;
