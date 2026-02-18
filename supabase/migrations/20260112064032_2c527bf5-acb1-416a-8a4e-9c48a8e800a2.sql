-- =====================================================
-- PART 2: Create tables, indexes, RLS, and functions
-- =====================================================

-- 1. Add owner_id column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Create invitations table for invitation-based access
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  event_ids UUID[] DEFAULT '{}',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create event_access table for tracking who has access to which events
CREATE TABLE IF NOT EXISTS public.event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL DEFAULT 'viewer',
  invitation_id UUID REFERENCES public.invitations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- 4. Add organization_id to events table if not exists
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_organization ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_event_access_user ON public.event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_event ON public.event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_organization ON public.event_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_organization ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for invitations table
CREATE POLICY "Organization owners can manage invitations"
ON public.invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = invitations.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'co_admin')
  )
);

CREATE POLICY "Users can view invitations sent to their email"
ON public.invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 8. RLS Policies for event_access table
CREATE POLICY "Organization owners and co-admins can manage event access"
ON public.event_access
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = event_access.organization_id
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'co_admin')
  )
);

CREATE POLICY "Users can view their own event access"
ON public.event_access
FOR SELECT
USING (user_id = auth.uid());

-- 9. Function to create organization on user signup
CREATE OR REPLACE FUNCTION public.create_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  -- Get user name or email
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  
  -- Create a personal organization for the user
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    user_name || '''s Organization',
    lower(replace(user_name, ' ', '-')) || '-' || substr(NEW.id::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;
  
  -- Update user profile with organization
  UPDATE public.user_profiles
  SET organization_id = new_org_id
  WHERE id = NEW.id;
  
  -- Update user role to super_admin for their own organization
  UPDATE public.user_roles
  SET role = 'super_admin'
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Create trigger to auto-create organization on signup (runs after handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_organization();

-- 11. Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Verify email matches
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation was sent to a different email');
  END IF;
  
  -- Update invitation status
  UPDATE public.invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_user_id,
    updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Grant access to each event in the invitation
  FOREACH v_event_id IN ARRAY v_invitation.event_ids
  LOOP
    INSERT INTO public.event_access (user_id, event_id, organization_id, granted_by, role, invitation_id)
    VALUES (v_user_id, v_event_id, v_invitation.organization_id, v_invitation.invited_by, v_invitation.role, v_invitation.id)
    ON CONFLICT (user_id, event_id) DO UPDATE SET
      role = EXCLUDED.role,
      invitation_id = EXCLUDED.invitation_id;
  END LOOP;
  
  -- Update user role if needed (don't downgrade)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id 
    AND role IN ('super_admin', 'co_admin')
  ) THEN
    UPDATE public.user_roles
    SET role = v_invitation.role
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role,
    'event_count', array_length(v_invitation.event_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Function to get user's shared events
CREATE OR REPLACE FUNCTION public.get_user_shared_events(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  organization_name TEXT,
  shared_by_email TEXT,
  shared_by_name TEXT,
  role app_role,
  granted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    o.name as organization_name,
    up.email as shared_by_email,
    up.full_name as shared_by_name,
    ea.role,
    ea.created_at as granted_at
  FROM public.event_access ea
  JOIN public.events e ON e.id = ea.event_id
  JOIN public.organizations o ON o.id = ea.organization_id
  LEFT JOIN public.user_profiles up ON up.id = ea.granted_by
  WHERE ea.user_id = COALESCE(p_user_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Function to get role permissions for display
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role app_role)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'super_admin' THEN jsonb_build_object(
      'create_events', true,
      'invite_users', true,
      'manage_all_events', true,
      'view_results', true,
      'export_data', true,
      'score_teams', false,
      'manage_users', true,
      'delete_events', true
    )
    WHEN 'co_admin' THEN jsonb_build_object(
      'create_events', true,
      'invite_users', true,
      'manage_all_events', true,
      'view_results', true,
      'export_data', true,
      'score_teams', false,
      'manage_users', true,
      'delete_events', false
    )
    WHEN 'event_admin' THEN jsonb_build_object(
      'create_events', false,
      'invite_users', false,
      'manage_all_events', false,
      'view_results', true,
      'export_data', true,
      'score_teams', false,
      'manage_users', false,
      'delete_events', false
    )
    WHEN 'judge' THEN jsonb_build_object(
      'create_events', false,
      'invite_users', false,
      'manage_all_events', false,
      'view_results', false,
      'export_data', false,
      'score_teams', true,
      'manage_users', false,
      'delete_events', false
    )
    ELSE jsonb_build_object(
      'create_events', false,
      'invite_users', false,
      'manage_all_events', false,
      'view_results', true,
      'export_data', false,
      'score_teams', false,
      'manage_users', false,
      'delete_events', false
    )
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;