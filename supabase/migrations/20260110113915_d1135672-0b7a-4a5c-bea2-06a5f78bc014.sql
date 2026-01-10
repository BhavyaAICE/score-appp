
/*
  # Backend Scoring Engine & Event Lifecycle Migration (Fixed)
  
  Integrates with existing app_role enum and schema.
  Properly handles existing triggers before modifying columns.
*/

-- =============================================
-- SECTION 1: DROP EXISTING TRIGGERS THAT DEPEND ON STATUS
-- =============================================

DROP TRIGGER IF EXISTS enforce_event_immutability ON events;
DROP TRIGGER IF EXISTS validate_event_transition_trigger ON events;

-- =============================================
-- SECTION 2: EVENT STATUS ENUM
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('draft', 'live_judging', 'locked', 'published');
  END IF;
END $$;

-- Update events table to use enum if currently text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE events ADD COLUMN status_new event_status DEFAULT 'draft';
    UPDATE events SET status_new = status::event_status WHERE status IS NOT NULL;
    ALTER TABLE events DROP COLUMN status;
    ALTER TABLE events RENAME COLUMN status_new TO status;
  END IF;
END $$;

-- =============================================
-- SECTION 3: JUDGE ASSIGNMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, judge_id, team_id)
);

ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage judge assignments for their events' AND tablename = 'judge_assignments'
  ) THEN
    CREATE POLICY "Users can manage judge assignments for their events"
      ON judge_assignments FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = judge_assignments.round_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = judge_assignments.round_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 4: RAW EVALUATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS raw_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_draft BOOLEAN DEFAULT true,
  ip_address INET,
  user_agent TEXT,
  UNIQUE(round_id, team_id, judge_id)
);

ALTER TABLE raw_evaluations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage raw evaluations for their events' AND tablename = 'raw_evaluations'
  ) THEN
    CREATE POLICY "Users can manage raw evaluations for their events"
      ON raw_evaluations FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = raw_evaluations.round_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = raw_evaluations.round_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 5: COMPUTED RESULTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS computed_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  judge_id UUID,
  
  raw_total NUMERIC(10, 4),
  normalized_z NUMERIC(10, 6),
  aggregated_z NUMERIC(10, 6),
  weighted_z_scores JSONB,
  
  rank INTEGER,
  percentile NUMERIC(5, 2),
  is_tied BOOLEAN DEFAULT false,
  tie_breaker_data JSONB,
  
  judge_mean NUMERIC(10, 4),
  judge_std NUMERIC(10, 4),
  
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  computed_by UUID,
  computation_version INTEGER DEFAULT 1,
  
  UNIQUE(round_id, team_id, judge_id, computation_version)
);

ALTER TABLE computed_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage computed results for their events' AND tablename = 'computed_results'
  ) THEN
    CREATE POLICY "Users can manage computed results for their events"
      ON computed_results FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = computed_results.round_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM rounds r
        JOIN events e ON e.id = r.event_id
        WHERE r.id = computed_results.round_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 6: SCORING AUDIT LOG
-- =============================================

CREATE TABLE IF NOT EXISTS scoring_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  error_message TEXT,
  user_id UUID,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scoring_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage scoring audit logs for their events' AND tablename = 'scoring_audit_log'
  ) THEN
    CREATE POLICY "Users can manage scoring audit logs for their events"
      ON scoring_audit_log FOR ALL
      TO authenticated
      USING (
        round_id IS NULL OR EXISTS (
          SELECT 1 FROM rounds r
          JOIN events e ON e.id = r.event_id
          WHERE r.id = scoring_audit_log.round_id AND e.created_by = auth.uid()
        )
      )
      WITH CHECK (
        round_id IS NULL OR EXISTS (
          SELECT 1 FROM rounds r
          JOIN events e ON e.id = r.event_id
          WHERE r.id = scoring_audit_log.round_id AND e.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- =============================================
-- SECTION 7: EVENT STATE TRANSITIONS
-- =============================================

CREATE TABLE IF NOT EXISTS event_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transitioned_by UUID NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_state_transitions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage event state transitions for their events' AND tablename = 'event_state_transitions'
  ) THEN
    CREATE POLICY "Users can manage event state transitions for their events"
      ON event_state_transitions FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_state_transitions.event_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_state_transitions.event_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 8: SCORE OVERRIDES
-- =============================================

CREATE TABLE IF NOT EXISTS score_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES raw_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES round_criteria(id),
  previous_score NUMERIC(10, 2),
  new_score NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('score_correction', 'disqualification', 'reinstatement', 'technical_error', 'other')),
  overridden_by UUID NOT NULL,
  overridden_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

ALTER TABLE score_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage score overrides for their events' AND tablename = 'score_overrides'
  ) THEN
    CREATE POLICY "Users can manage score overrides for their events"
      ON score_overrides FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM raw_evaluations re
        JOIN rounds r ON r.id = re.round_id
        JOIN events e ON e.id = r.event_id
        WHERE re.id = score_overrides.evaluation_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM raw_evaluations re
        JOIN rounds r ON r.id = re.round_id
        JOIN events e ON e.id = r.event_id
        WHERE re.id = score_overrides.evaluation_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 9: EVENT NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_id UUID,
  recipient_email TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage event notifications for their events' AND tablename = 'event_notifications'
  ) THEN
    CREATE POLICY "Users can manage event notifications for their events"
      ON event_notifications FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_notifications.event_id AND e.created_by = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_notifications.event_id AND e.created_by = auth.uid()
      ));
  END IF;
END $$;

-- =============================================
-- SECTION 10: INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_judge_assignments_round ON judge_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_raw_evaluations_round ON raw_evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_raw_evaluations_judge ON raw_evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_raw_evaluations_team ON raw_evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_computed_results_round ON computed_results(round_id);
CREATE INDEX IF NOT EXISTS idx_computed_results_team ON computed_results(team_id);
CREATE INDEX IF NOT EXISTS idx_scoring_audit_round ON scoring_audit_log(round_id);
CREATE INDEX IF NOT EXISTS idx_event_state_transitions_event ON event_state_transitions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event ON event_notifications(event_id);

-- =============================================
-- SECTION 11: VALIDATION FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION validate_raw_scores(
  p_round_id UUID,
  p_scores JSONB
) RETURNS JSONB AS $$
DECLARE
  v_criteria RECORD;
  v_score NUMERIC;
  v_errors JSONB := '[]'::JSONB;
  v_criterion_id TEXT;
BEGIN
  FOR v_criteria IN 
    SELECT id::TEXT, name, max_marks
    FROM round_criteria 
    WHERE round_id = p_round_id
  LOOP
    v_criterion_id := v_criteria.id;
    
    IF NOT (p_scores ? v_criterion_id) THEN
      v_errors := v_errors || jsonb_build_object(
        'criterion', v_criteria.name,
        'error', 'Missing score'
      );
      CONTINUE;
    END IF;
    
    v_score := (p_scores ->> v_criterion_id)::NUMERIC;
    
    IF v_score IS NULL THEN
      v_errors := v_errors || jsonb_build_object(
        'criterion', v_criteria.name,
        'error', 'Invalid score format'
      );
      CONTINUE;
    END IF;
    
    IF v_score < 0 OR v_score > v_criteria.max_marks THEN
      v_errors := v_errors || jsonb_build_object(
        'criterion', v_criteria.name,
        'error', format('Score %s out of range (0-%s)', v_score, v_criteria.max_marks)
      );
    END IF;
  END LOOP;
  
  RETURN v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION reject_precalculated_values(
  p_scores JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_key TEXT;
  v_forbidden_keys TEXT[] := ARRAY['z_score', 'normalized', 'weighted', 'final', 'rank', 'percentile', 'aggregated'];
BEGIN
  FOR v_key IN SELECT jsonb_object_keys(p_scores)
  LOOP
    IF v_key = ANY(v_forbidden_keys) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- SECTION 12: GET EVENT STATE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_event_state(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
BEGIN
  SELECT 
    e.*,
    (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id) as team_count,
    (SELECT COUNT(*) FROM rounds r WHERE r.event_id = e.id) as round_count,
    (SELECT COUNT(DISTINCT ja.judge_id) FROM judge_assignments ja 
     JOIN rounds r ON r.id = ja.round_id WHERE r.event_id = e.id) as judge_count,
    (SELECT COUNT(*) FROM raw_evaluations re 
     JOIN rounds r ON r.id = re.round_id 
     WHERE r.event_id = e.id AND re.is_draft = false) as submitted_evaluations,
    (SELECT COUNT(*) FROM computed_results cr
     JOIN rounds r ON r.id = cr.round_id
     WHERE r.event_id = e.id) as computed_results_count
  INTO v_event
  FROM events e
  WHERE e.id = p_event_id;
  
  IF v_event IS NULL THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;
  
  RETURN jsonb_build_object(
    'id', v_event.id,
    'name', v_event.name,
    'status', v_event.status,
    'created_at', v_event.created_at,
    'locked_at', v_event.locked_at,
    'locked_by', v_event.locked_by,
    'published_at', v_event.published_at,
    'published_by', v_event.published_by,
    'can_modify', v_event.status NOT IN ('locked', 'published'),
    'can_submit_scores', v_event.status = 'live_judging',
    'can_compute_results', v_event.status IN ('live_judging', 'locked'),
    'can_publish', v_event.status = 'locked',
    'stats', jsonb_build_object(
      'teams', v_event.team_count,
      'rounds', v_event.round_count,
      'judges', v_event.judge_count,
      'submitted_evaluations', v_event.submitted_evaluations,
      'computed_results', v_event.computed_results_count
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- SECTION 13: TRANSITION EVENT STATUS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION transition_event_status(
  p_event_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_valid_transitions JSONB := '{
    "draft": ["live_judging"],
    "live_judging": ["locked"],
    "locked": ["published"],
    "published": []
  }'::JSONB;
  v_allowed JSONB;
  v_result RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT status INTO v_current_status FROM events WHERE id = p_event_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  -- Validate transition
  v_allowed := v_valid_transitions -> v_current_status;
  IF v_allowed IS NULL OR NOT (v_allowed ? p_new_status) THEN
    RETURN jsonb_build_object('success', false, 'error', format('Invalid transition from %s to %s', v_current_status, p_new_status));
  END IF;
  
  -- Check if user owns the event or is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND created_by = v_user_id
  ) AND NOT public.has_role(v_user_id, 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  UPDATE events
  SET 
    status = p_new_status,
    locked_by = CASE WHEN p_new_status = 'locked' THEN v_user_id ELSE locked_by END,
    locked_at = CASE WHEN p_new_status = 'locked' THEN NOW() ELSE locked_at END,
    published_by = CASE WHEN p_new_status = 'published' THEN v_user_id ELSE published_by END,
    published_at = CASE WHEN p_new_status = 'published' THEN NOW() ELSE published_at END,
    updated_at = NOW()
  WHERE id = p_event_id
  RETURNING * INTO v_result;
  
  -- Log the transition
  INSERT INTO event_state_transitions (event_id, from_status, to_status, transitioned_by, reason)
  VALUES (p_event_id, v_current_status, p_new_status, v_user_id, p_reason);
  
  -- Create audit log
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, reason)
  VALUES (
    v_user_id,
    'status_change',
    'events',
    p_event_id,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status),
    p_reason
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'event_id', p_event_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
