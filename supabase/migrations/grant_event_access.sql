-- Create grant_event_access function for GrantAccessModal
-- This function allows admins to grant users access to specific events

CREATE OR REPLACE FUNCTION grant_event_access(
    p_user_email TEXT,
    p_role TEXT,
    p_event_ids UUID[],
    p_granted_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_profile_id UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = p_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found with email: %', p_user_email;
    END IF;

    -- Get or create user profile
    SELECT id INTO v_user_profile_id
    FROM user_profiles
    WHERE user_id = v_user_id;

    IF v_user_profile_id IS NULL THEN
        -- Create user profile if doesn't exist
        INSERT INTO user_profiles (user_id, role, created_at, updated_at)
        VALUES (v_user_id, COALESCE(p_role, 'user'), NOW(), NOW())
        RETURNING id INTO v_user_profile_id;
    ELSE
        -- Update existing profile role if provided
        IF p_role IS NOT NULL THEN
            UPDATE user_profiles 
            SET role = p_role, updated_at = NOW()
            WHERE id = v_user_profile_id;
        END IF;
    END IF;

    -- Grant access to each event
    IF p_event_ids IS NOT NULL AND array_length(p_event_ids, 1) > 0 THEN
        INSERT INTO event_access (user_id, event_id, role, granted_by, created_at)
        SELECT v_user_id, event_id, COALESCE(p_role, 'judge'), p_granted_by, NOW()
        FROM unnest(p_event_ids) AS event_id
        ON CONFLICT (user_id, event_id) DO NOTHING;
    END IF;
END;
$$;

-- Create event_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'judge',
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Enable RLS on event_access
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage event access
CREATE POLICY "Admins can manage event access"
ON event_access FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'organization_admin')
    )
);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION grant_event_access TO authenticated;
GRANT EXECUTE ON FUNCTION grant_event_access TO service_role;
