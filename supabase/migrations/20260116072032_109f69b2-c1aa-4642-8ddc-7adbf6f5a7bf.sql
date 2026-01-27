-- Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS public.accept_invitation(text);

-- =========================================
-- Enhanced accept_invitation function with audit logging
-- =========================================

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id uuid;
  v_user_email text;
  v_event_id text;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
  FOR UPDATE;
  
  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already ' || v_invitation.status);
  END IF;
  
  IF v_invitation.expires_at < now() THEN
    UPDATE invitations SET status = 'expired', updated_at = now() WHERE id = v_invitation.id;
    RETURN json_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_user_id,
    updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Link user to organization
  UPDATE user_profiles
  SET organization_id = v_invitation.organization_id
  WHERE id = v_user_id AND organization_id IS NULL;
  
  -- Create user role if not exists
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, v_invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Grant access to specified events
  IF v_invitation.event_ids IS NOT NULL AND array_length(v_invitation.event_ids, 1) > 0 THEN
    FOREACH v_event_id IN ARRAY v_invitation.event_ids
    LOOP
      INSERT INTO event_access (
        user_id,
        event_id,
        organization_id,
        role,
        granted_by,
        invitation_id
      )
      VALUES (
        v_user_id,
        v_event_id::uuid,
        v_invitation.organization_id,
        v_invitation.role,
        v_invitation.invited_by,
        v_invitation.id
      )
      ON CONFLICT DO NOTHING;
      
      -- Audit log for each event access grant
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, reason)
      VALUES (
        v_invitation.invited_by,
        'access_grant',
        'event_access',
        v_event_id,
        jsonb_build_object(
          'user_id', v_user_id,
          'user_email', v_user_email,
          'role', v_invitation.role,
          'invitation_id', v_invitation.id
        ),
        'Granted via invitation acceptance'
      );
    END LOOP;
  END IF;
  
  -- Audit log for invitation acceptance
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, reason)
  VALUES (
    v_user_id,
    'invitation_accept',
    'invitations',
    v_invitation.id::text,
    jsonb_build_object(
      'organization_id', v_invitation.organization_id,
      'role', v_invitation.role,
      'event_count', COALESCE(array_length(v_invitation.event_ids, 1), 0)
    ),
    'User accepted invitation'
  );
  
  RETURN json_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role,
    'event_count', COALESCE(array_length(v_invitation.event_ids, 1), 0)
  );
END;
$$;

-- =========================================
-- Grant access directly (for Grant Access UI)
-- =========================================

CREATE OR REPLACE FUNCTION public.grant_event_access(
  p_user_email text,
  p_event_id uuid,
  p_role app_role,
  p_organization_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_granter_id uuid;
  v_target_user_id uuid;
  v_access_id uuid;
BEGIN
  -- Get current user (granter)
  v_granter_id := auth.uid();
  IF v_granter_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Find target user by email
  SELECT id INTO v_target_user_id
  FROM user_profiles
  WHERE lower(email) = lower(p_user_email);
  
  IF v_target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found with that email');
  END IF;
  
  -- Check if access already exists
  SELECT id INTO v_access_id
  FROM event_access
  WHERE user_id = v_target_user_id AND event_id = p_event_id;
  
  IF v_access_id IS NOT NULL THEN
    -- Update existing access
    UPDATE event_access
    SET role = p_role, granted_by = v_granter_id
    WHERE id = v_access_id;
    
    -- Audit log
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, reason)
    VALUES (
      v_granter_id,
      'access_update',
      'event_access',
      p_event_id::text,
      jsonb_build_object('user_email', p_user_email),
      jsonb_build_object('user_email', p_user_email, 'role', p_role),
      'Role updated for existing access'
    );
    
    RETURN json_build_object('success', true, 'message', 'Access updated');
  ELSE
    -- Create new access
    INSERT INTO event_access (user_id, event_id, organization_id, role, granted_by)
    VALUES (v_target_user_id, p_event_id, p_organization_id, p_role, v_granter_id)
    RETURNING id INTO v_access_id;
    
    -- Link user to org if not linked
    UPDATE user_profiles
    SET organization_id = p_organization_id
    WHERE id = v_target_user_id AND organization_id IS NULL;
    
    -- Audit log
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, reason)
    VALUES (
      v_granter_id,
      'access_grant',
      'event_access',
      p_event_id::text,
      jsonb_build_object('user_id', v_target_user_id, 'user_email', p_user_email, 'role', p_role),
      'Direct access grant'
    );
    
    RETURN json_build_object('success', true, 'message', 'Access granted', 'access_id', v_access_id);
  END IF;
END;
$$;

-- =========================================
-- Revoke access function with audit logging
-- =========================================

CREATE OR REPLACE FUNCTION public.revoke_event_access(p_access_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoker_id uuid;
  v_access RECORD;
  v_user_email text;
BEGIN
  -- Get current user (revoker)
  v_revoker_id := auth.uid();
  IF v_revoker_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get access record
  SELECT ea.*, up.email as user_email INTO v_access
  FROM event_access ea
  JOIN user_profiles up ON up.id = ea.user_id
  WHERE ea.id = p_access_id;
  
  IF v_access IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Access record not found');
  END IF;
  
  -- Delete the access
  DELETE FROM event_access WHERE id = p_access_id;
  
  -- Audit log
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, reason)
  VALUES (
    v_revoker_id,
    'access_revoke',
    'event_access',
    v_access.event_id::text,
    jsonb_build_object(
      'user_id', v_access.user_id,
      'user_email', v_access.user_email,
      'role', v_access.role
    ),
    'Access revoked by admin'
  );
  
  RETURN json_build_object('success', true, 'message', 'Access revoked');
END;
$$;