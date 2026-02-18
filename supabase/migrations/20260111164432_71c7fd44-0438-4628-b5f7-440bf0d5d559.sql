-- =====================================================
-- PART 1: Add co_admin to app_role enum (must be committed first)
-- =====================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'co_admin' AFTER 'super_admin';