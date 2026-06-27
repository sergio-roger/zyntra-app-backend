-- Update crm_sector_types to crm_industries
ALTER TABLE crm_sector_types RENAME TO crm_industries;

-- Update foreign key column name in crm_companies
ALTER TABLE crm_companies RENAME COLUMN sector_type_id TO industry_id;

-- Add new columns to crm_companies
ALTER TABLE crm_companies ADD COLUMN owner_id uuid;
ALTER TABLE crm_companies ADD COLUMN tax_type varchar;
ALTER TABLE crm_companies ADD COLUMN employee_range varchar;
ALTER TABLE crm_companies DROP COLUMN num_employees;

-- Add foreign key constraint for owner_id
ALTER TABLE crm_companies
ADD CONSTRAINT fk_company_owner
FOREIGN KEY (owner_id)
REFERENCES crm_users (id)
ON DELETE SET NULL;
