-- ==============================================================================
-- UP: Drop standard unique constraint on channels and replace with partial unique index
-- ==============================================================================
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS uq_channel_per_business_type_name;
DROP INDEX IF EXISTS uq_channel_per_business_type_name;

CREATE UNIQUE INDEX uq_channel_per_business_type_name 
ON public.channels (business_id, channel_type_id, name) 
WHERE deleted_at IS NULL;
