/*
  # RBAC & Enterprise Features Migration
  
  ## Overview
  This migration adds:
  1. Role-Based Access Control (RBAC) system
  2. Event lifecycle states with constraints
  3. Audit logging system
  4. White-label branding tables
  5. Enhanced security features
  
  ## Roles
  - super_admin: Full system control
  - event_admin: Manages assigned events only
  - judge: Submits evaluations only
  - viewer: Read-only access to results
*/

-- =============================================
-- SECTION 1: RBAC SYSTEM
-- =============================================

-- Roles enum
CREATE TYPE user_role AS ENUM ('super_admin', 'event_admin', 'judge', 'viewer');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  organization_id UUID,
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table (for white-label and multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_enterprise BOOLEAN DEFAULT false,
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization reference after organizations table exists
ALTER TABLE user_profiles 
  ADD CONSTRAINT fk_user_profiles_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Permission matrix table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, resource, action)
);

-- Event admin assignments (which events can an event_admin manage)
CREATE TABLE IF NOT EXISTS event_admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  UNIQUE(user_id, event_id)
);

-- =============================================
-- SECTION 2: EVENT LIFECYCLE SYSTEM
-- =============================================

-- Event status enum
CREATE TYPE event_status AS ENUM ('draft', 'live_judging', 'locked', 'published');

-- Add status column to events if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'status'
  ) THEN
    ALTER TABLE events ADD COLUMN status event_status DEFAULT 'draft';
  END IF;
END $$;

-- Add lifecycle columns to events
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES user_profiles(id);

-- Function to prevent modifications after locking
CREATE OR REPLACE FUNCTION prevent_locked_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('locked', 'published') THEN
    RAISE EXCEPTION 'Cannot modify event after it has been locked or published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for event immutability
DROP TRIGGER IF EXISTS enforce_event_immutability ON events;
CREATE TRIGGER enforce_event_immutability
  BEFORE UPDATE ON events
  FOR EACH ROW
  WHEN (OLD.status IN ('locked', 'published') AND NEW.status = OLD.status)
  EXECUTE FUNCTION prevent_locked_event_modification();

-- Function to prevent score modifications after event is locked
CREATE OR REPLACE FUNCTION prevent_locked_score_modification()
RETURNS TRIGGER AS $$
DECLARE
  event_current_status event_status;
BEGIN
  SELECT status INTO event_current_status 
  FROM events e
  JOIN rounds r ON r.event_id = e.id
  WHERE r.id = COALESCE(NEW.round_id, OLD.round_id);
  
  IF event_current_status IN ('locked', 'published') THEN
    RAISE EXCEPTION 'Cannot modify scores after event has been locked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SECTION 3: AUDIT LOGGING SYSTEM
-- =============================================

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computation logs (for scoring audit trail)
CREATE TABLE IF NOT EXISTS computation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  computation_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  formula_used TEXT,
  computed_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin override logs
CREATE TABLE IF NOT EXISTS admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECTION 4: WHITE-LABEL BRANDING
-- =============================================

-- Branding settings table
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1e40af',
  accent_color TEXT DEFAULT '#3b82f6',
  font_family TEXT DEFAULT 'Inter',
  custom_css TEXT,
  hide_powered_by BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECTION 5: SESSION & SECURITY
-- =============================================

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action)
);

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECTION 6: INSERT DEFAULT PERMISSIONS
-- =============================================

INSERT INTO permissions (role, resource, action, allowed) VALUES
-- Super Admin - Full access
('super_admin', 'events', 'create', true),
('super_admin', 'events', 'read', true),
('super_admin', 'events', 'update', true),
('super_admin', 'events', 'delete', true),
('super_admin', 'events', 'lock', true),
('super_admin', 'events', 'publish', true),
('super_admin', 'users', 'create', true),
('super_admin', 'users', 'read', true),
('super_admin', 'users', 'update', true),
('super_admin', 'users', 'delete', true),
('super_admin', 'scores', 'read', true),
('super_admin', 'scores', 'override', true),
('super_admin', 'results', 'compute', true),
('super_admin', 'results', 'read', true),
('super_admin', 'results', 'export', true),
('super_admin', 'audit', 'read', true),
('super_admin', 'branding', 'update', true),
('super_admin', 'settings', 'update', true),

-- Event Admin - Manages assigned events
('event_admin', 'events', 'create', true),
('event_admin', 'events', 'read', true),
('event_admin', 'events', 'update', true),
('event_admin', 'events', 'delete', false),
('event_admin', 'events', 'lock', true),
('event_admin', 'events', 'publish', true),
('event_admin', 'users', 'create', false),
('event_admin', 'users', 'read', true),
('event_admin', 'users', 'update', false),
('event_admin', 'users', 'delete', false),
('event_admin', 'scores', 'read', true),
('event_admin', 'scores', 'override', false),
('event_admin', 'results', 'compute', true),
('event_admin', 'results', 'read', true),
('event_admin', 'results', 'export', true),
('event_admin', 'audit', 'read', true),
('event_admin', 'branding', 'update', false),
('event_admin', 'settings', 'update', false),

-- Judge - Submit evaluations only
('judge', 'events', 'create', false),
('judge', 'events', 'read', true),
('judge', 'events', 'update', false),
('judge', 'events', 'delete', false),
('judge', 'events', 'lock', false),
('judge', 'events', 'publish', false),
('judge', 'users', 'create', false),
('judge', 'users', 'read', false),
('judge', 'users', 'update', false),
('judge', 'users', 'delete', false),
('judge', 'scores', 'read', true),
('judge', 'scores', 'submit', true),
('judge', 'scores', 'override', false),
('judge', 'results', 'compute', false),
('judge', 'results', 'read', true),
('judge', 'results', 'export', false),
('judge', 'audit', 'read', false),
('judge', 'branding', 'update', false),
('judge', 'settings', 'update', false),

-- Viewer - Read-only access
('viewer', 'events', 'create', false),
('viewer', 'events', 'read', true),
('viewer', 'events', 'update', false),
('viewer', 'events', 'delete', false),
('viewer', 'events', 'lock', false),
('viewer', 'events', 'publish', false),
('viewer', 'users', 'create', false),
('viewer', 'users', 'read', false),
('viewer', 'users', 'update', false),
('viewer', 'users', 'delete', false),
('viewer', 'scores', 'read', true),
('viewer', 'scores', 'submit', false),
('viewer', 'scores', 'override', false),
('viewer', 'results', 'compute', false),
('viewer', 'results', 'read', true),
('viewer', 'results', 'export', false),
('viewer', 'audit', 'read', false),
('viewer', 'branding', 'update', false),
('viewer', 'settings', 'update', false)
ON CONFLICT (role, resource, action) DO NOTHING;

-- =============================================
-- SECTION 7: ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE computation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Permissions are read-only for all authenticated users
CREATE POLICY "Authenticated users can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- Audit logs - only super admins and event admins for their events
CREATE POLICY "Super admins can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Refresh tokens - users can only see their own
CREATE POLICY "Users can manage own refresh tokens"
  ON refresh_tokens FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- SECTION 8: INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_admin_assignments_user ON event_admin_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_admin_assignments_event ON event_admin_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_computation_logs_round ON computation_logs(round_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);

-- =============================================
-- SECTION 9: HELPER FUNCTIONS
-- =============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
  v_allowed BOOLEAN;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT allowed INTO v_allowed 
  FROM permissions 
  WHERE role = v_role AND resource = p_resource AND action = p_action;
  
  RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if event admin can access event
CREATE OR REPLACE FUNCTION can_access_event(
  p_user_id UUID,
  p_event_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE id = p_user_id;
  
  IF v_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  IF v_role = 'event_admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM event_admin_assignments 
      WHERE user_id = p_user_id AND event_id = p_event_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, reason)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_old_value, p_new_value, p_reason)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
