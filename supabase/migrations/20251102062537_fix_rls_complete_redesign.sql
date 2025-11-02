/*
  # Complete RLS Redesign for Events

  ## The Core Problem
  RLS policies are evaluated BEFORE triggers fire. So when we check created_by = auth.uid()
  in WITH CHECK, the created_by is still NULL (because trigger hasn't run yet), causing the check to fail.

  ## Solution
  Use a different approach:
  1. For INSERT: Allow WITH CHECK = true (no restrictions in policy)
  2. Trigger automatically sets created_by to auth.uid()
  3. For SELECT/UPDATE/DELETE: Check created_by = auth.uid()
  
  This works because:
  - INSERT doesn't need to check created_by (trigger will set it)
  - Other operations can check created_by (it's already set by trigger or admin)
*/

-- First, disable RLS temporarily to fix the policies
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Drop all event policies
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;

-- Drop old trigger
DROP TRIGGER IF EXISTS set_created_by_trigger ON events;
DROP FUNCTION IF EXISTS set_created_by_for_events();

-- Create new trigger function - simpler, just sets the value
CREATE OR REPLACE FUNCTION set_created_by_for_events()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER set_created_by_trigger
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by_for_events();

-- Now re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create new policies - INSERT has NO restrictions since trigger will set created_by
CREATE POLICY "Authenticated users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT - only own events
CREATE POLICY "Users can view their own events"
  ON events FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- UPDATE - only own events, and created_by cannot change
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE - only own events
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
