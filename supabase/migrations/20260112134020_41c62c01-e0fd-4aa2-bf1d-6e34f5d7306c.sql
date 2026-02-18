-- Fix "permission denied for table users" by removing any dependency on auth.users in RLS helpers.
-- Supabase exposes the user's email in the JWT; use that instead.

CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(auth.jwt() ->> 'email')
$$;

-- Recreate policy to be case-insensitive and rely on JWT email
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.invitations;

CREATE POLICY "Users can view invitations sent to their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (lower(email) = public.get_auth_email());