-- =========================================
-- Secure Organizations Table RLS
-- Users should only see organizations they:
-- 1. Own (owner_id = auth.uid())
-- 2. Are linked to via user_profiles
-- 3. Have event access in
-- =========================================

-- Drop existing permissive policies on organizations
DROP POLICY IF EXISTS "Organizations are viewable by members" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public read access" ON public.organizations;

-- Create a security definer function to check org access
CREATE OR REPLACE FUNCTION public.can_access_organization(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User owns this org
    SELECT 1 FROM public.organizations WHERE id = p_org_id AND owner_id = auth.uid()
    UNION ALL
    -- User is linked to this org via profile
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND organization_id = p_org_id
    UNION ALL
    -- User has event access in this org
    SELECT 1 FROM public.event_access WHERE user_id = auth.uid() AND organization_id = p_org_id
  );
$$;

-- Create restrictive RLS policy for SELECT
CREATE POLICY "Users can only view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.can_access_organization(id));

-- Keep existing INSERT/UPDATE policies or create new ones
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());