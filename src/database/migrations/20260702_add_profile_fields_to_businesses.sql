-- Migration: Add self-service profile fields to public.businesses (My Account feature)

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS job_title VARCHAR;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_account_activated BOOLEAN DEFAULT true;
