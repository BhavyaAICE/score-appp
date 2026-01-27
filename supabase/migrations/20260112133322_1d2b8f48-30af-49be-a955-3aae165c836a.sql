-- Create a security definer function to get the current user's email
-- This avoids directly querying auth.users which causes permission denied errors
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the problematic policy that queries auth.users directly
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.invitations;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can view invitations sent to their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (email = public.get_auth_email());