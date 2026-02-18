/*
  # Event Lifecycle & Lock System Migration
  
  ## Overview
  This migration implements:
  1. Immutable event lifecycle with database-level constraints
  2. One score per judge per team per category enforcement
  3. Admin override logging with full audit trail
  4. State change notification triggers
  
  ## Lifecycle States
  Draft → Live Judging → Locked → Published
*/

-- =============================================
-- SECTION 1: ENHANCED LIFECYCLE CONSTRAINTS
-- =============================================

CREATE TABLE IF NOT EXISTS event_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status,
  to_status event_status NOT NULL,
  transitioned_by UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION validate_event_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_transitions JSONB := '{
    "null": ["draft"],
    "draft": ["live_judging"],
    "live_judging": ["locked"],
    "locked": ["published"],
    "published": []
  }'::JSONB;
  v_allowed JSONB;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  v_old_status := COALESCE(OLD.status::TEXT, 'null');
  v_new_status := NEW.status::TEXT;
  
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;
  
  v_allowed := v_valid_transitions -> v_old_status;
  
  IF v_allowed IS NULL OR NOT (v_allowed ? v_new_status) THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_old_status, v_new_status;
  END IF;
  
  IF NEW.status = 'locked' THEN
    NEW.locked_at := NOW();
  END IF;
  
  IF NEW.status = 'published' THEN
    NEW.published_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_event_transition_trigger ON events;
CREATE TRIGGER validate_event_transition_trigger
  BEFORE UPDATE OF status ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_transition();

CREATE OR REPLACE FUNCTION prevent_locked_event_data_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_event_status event_status;
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    IF OLD.status IN ('locked', 'published') AND NEW.status = OLD.status THEN
      IF ROW(NEW.name, NEW.description, NEW.event_date, NEW.organization_id) IS DISTINCT FROM 
         ROW(OLD.name, OLD.description, OLD.event_date, OLD.organization_id) THEN
        RAISE EXCEPTION 'Cannot modify locked or published event data';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_TABLE_NAME = 'teams' THEN
    SELECT e.status INTO v_event_status
    FROM events e WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
  ELSIF TG_TABLE_NAME = 'rounds' THEN
    SELECT e.status INTO v_event_status
    FROM events e WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
  ELSIF TG_TABLE_NAME = 'round_criteria' THEN
    SELECT e.status INTO v_event_status
    FROM events e
    JOIN rounds r ON r.event_id = e.id
    WHERE r.id = COALESCE(NEW.round_id, OLD.round_id);
  ELSIF TG_TABLE_NAME = 'raw_evaluations' THEN
    SELECT e.status INTO v_event_status
    FROM events e
    JOIN rounds r ON r.event_id = e.id
    WHERE r.id = COALESCE(NEW.round_id, OLD.round_id);
  END IF;
  
  IF v_event_status IN ('locked', 'published') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete data from locked or published event';
    ELSIF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Cannot modify data in locked or published event';
    ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'raw_evaluations' THEN
      RAISE EXCEPTION 'Cannot submit new evaluations to locked or published event';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_locked_teams_modification ON teams;
CREATE TRIGGER prevent_locked_teams_modification
  BEFORE INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_event_data_modification();

DROP TRIGGER IF EXISTS prevent_locked_rounds_modification ON rounds;
CREATE TRIGGER prevent_locked_rounds_modification
  BEFORE INSERT OR UPDATE OR DELETE ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_event_data_modification();

DROP TRIGGER IF EXISTS prevent_locked_criteria_modification ON round_criteria;
CREATE TRIGGER prevent_locked_criteria_modification
  BEFORE INSERT OR UPDATE OR DELETE ON round_criteria
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_event_data_modification();

DROP TRIGGER IF EXISTS prevent_locked_evaluations_modification ON raw_evaluations;
CREATE TRIGGER prevent_locked_evaluations_modification
  BEFORE INSERT OR UPDATE OR DELETE ON raw_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_event_data_modification();

-- =============================================
-- SECTION 2: ONE SCORE PER JUDGE PER TEAM PER CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES raw_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES round_criteria(id) ON DELETE CASCADE,
  score NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evaluation_id, criterion_id)
);

CREATE OR REPLACE FUNCTION enforce_single_score_per_criterion()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_existing_count
  FROM evaluation_scores es
  JOIN raw_evaluations re ON es.evaluation_id = re.id
  WHERE re.judge_id = (SELECT judge_id FROM raw_evaluations WHERE id = NEW.evaluation_id)
    AND re.team_id = (SELECT team_id FROM raw_evaluations WHERE id = NEW.evaluation_id)
    AND re.round_id = (SELECT round_id FROM raw_evaluations WHERE id = NEW.evaluation_id)
    AND es.criterion_id = NEW.criterion_id
    AND es.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Judge has already submitted a score for this team and criterion';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_score_trigger ON evaluation_scores;
CREATE TRIGGER enforce_single_score_trigger
  BEFORE INSERT OR UPDATE ON evaluation_scores
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_score_per_criterion();

-- =============================================
-- SECTION 3: ENHANCED ADMIN OVERRIDE LOGGING
-- =============================================

CREATE TABLE IF NOT EXISTS score_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES raw_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES round_criteria(id),
  previous_score NUMERIC(10, 2),
  new_score NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('score_correction', 'disqualification', 'reinstatement', 'technical_error', 'other')),
  overridden_by UUID NOT NULL REFERENCES user_profiles(id),
  overridden_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION log_score_override(
  p_evaluation_id UUID,
  p_criterion_id UUID,
  p_new_score NUMERIC,
  p_reason TEXT,
  p_override_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_can_override BOOLEAN;
  v_previous_score NUMERIC;
  v_override_id UUID;
  v_event_status event_status;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT has_permission(v_user_id, 'scores', 'override') INTO v_can_override;
  
  IF NOT v_can_override THEN
    INSERT INTO scoring_audit_log (action, details, error_message, user_id)
    VALUES ('OVERRIDE_DENIED', jsonb_build_object('evaluation_id', p_evaluation_id), 'Permission denied', v_user_id);
    
    RAISE EXCEPTION 'Permission denied: Cannot override scores';
  END IF;
  
  SELECT e.status INTO v_event_status
  FROM events e
  JOIN rounds r ON r.event_id = e.id
  JOIN raw_evaluations re ON re.round_id = r.id
  WHERE re.id = p_evaluation_id;
  
  IF v_event_status = 'published' THEN
    RAISE EXCEPTION 'Cannot override scores for published events';
  END IF;
  
  IF p_criterion_id IS NOT NULL THEN
    SELECT (scores ->> p_criterion_id::TEXT)::NUMERIC INTO v_previous_score
    FROM raw_evaluations WHERE id = p_evaluation_id;
  ELSE
    SELECT (
      SELECT SUM(value::NUMERIC) FROM jsonb_each_text(scores)
    ) INTO v_previous_score
    FROM raw_evaluations WHERE id = p_evaluation_id;
  END IF;
  
  INSERT INTO score_overrides (
    evaluation_id, criterion_id, previous_score, new_score,
    reason, override_type, overridden_by
  ) VALUES (
    p_evaluation_id, p_criterion_id, v_previous_score, p_new_score,
    p_reason, p_override_type, v_user_id
  ) RETURNING id INTO v_override_id;
  
  IF p_criterion_id IS NOT NULL THEN
    UPDATE raw_evaluations
    SET scores = jsonb_set(scores, ARRAY[p_criterion_id::TEXT], to_jsonb(p_new_score))
    WHERE id = p_evaluation_id;
  END IF;
  
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, reason)
  VALUES (
    v_user_id,
    'score_override',
    'raw_evaluations',
    p_evaluation_id,
    jsonb_build_object('score', v_previous_score, 'criterion_id', p_criterion_id),
    jsonb_build_object('score', p_new_score, 'criterion_id', p_criterion_id),
    p_reason
  );
  
  INSERT INTO scoring_audit_log (action, details, user_id)
  VALUES ('SCORE_OVERRIDE', jsonb_build_object(
    'override_id', v_override_id,
    'evaluation_id', p_evaluation_id,
    'criterion_id', p_criterion_id,
    'previous_score', v_previous_score,
    'new_score', p_new_score,
    'reason', p_reason,
    'type', p_override_type
  ), v_user_id);
  
  RETURN v_override_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 4: STATE CHANGE NOTIFICATION SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_id UUID REFERENCES user_profiles(id),
  recipient_email TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION notify_event_state_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
  v_event_name TEXT;
  v_subject TEXT;
  v_body TEXT;
  v_recipient RECORD;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  
  v_old_status := COALESCE(OLD.status::TEXT, 'none');
  v_new_status := NEW.status::TEXT;
  v_event_name := NEW.name;
  
  INSERT INTO event_state_transitions (event_id, from_status, to_status, transitioned_by, metadata)
  VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    COALESCE(NEW.locked_by, NEW.published_by, auth.uid()),
    jsonb_build_object('timestamp', NOW())
  );
  
  CASE v_new_status
    WHEN 'live_judging' THEN
      v_subject := 'Judging Now Open: ' || v_event_name;
      v_body := 'The event "' || v_event_name || '" is now open for judging. Please login to submit your evaluations.';
    WHEN 'locked' THEN
      v_subject := 'Judging Closed: ' || v_event_name;
      v_body := 'Judging for "' || v_event_name || '" has been closed. Results are being computed.';
    WHEN 'published' THEN
      v_subject := 'Results Published: ' || v_event_name;
      v_body := 'The results for "' || v_event_name || '" have been published. View the final rankings now.';
    ELSE
      v_subject := 'Event Update: ' || v_event_name;
      v_body := 'The event "' || v_event_name || '" status has changed to ' || v_new_status || '.';
  END CASE;
  
  FOR v_recipient IN
    SELECT DISTINCT u.id, u.email
    FROM user_profiles u
    WHERE u.role IN ('super_admin', 'event_admin')
       OR EXISTS (
         SELECT 1 FROM event_admin_assignments eaa 
         WHERE eaa.event_id = NEW.id AND eaa.user_id = u.id
       )
       OR (v_new_status = 'live_judging' AND EXISTS (
         SELECT 1 FROM judge_assignments ja
         JOIN rounds r ON r.id = ja.round_id
         WHERE r.event_id = NEW.id AND ja.judge_id = u.id
       ))
  LOOP
    INSERT INTO event_notifications (
      event_id, notification_type, recipient_id, recipient_email,
      subject, body, status
    ) VALUES (
      NEW.id, 'state_change', v_recipient.id, v_recipient.email,
      v_subject, v_body, 'pending'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS event_state_change_notification_trigger ON events;
CREATE TRIGGER event_state_change_notification_trigger
  AFTER UPDATE OF status ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_state_change();

-- =============================================
-- SECTION 5: REAL-TIME EVENT STATE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_event_state(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_stats JSONB;
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
     WHERE r.event_id = e.id) as computed_results
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
      'computed_results', v_event.computed_results
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transition_event_status(
  p_event_id UUID,
  p_new_status event_status,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_can_transition BOOLEAN;
  v_current_status event_status;
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
  
  IF p_new_status IN ('locked', 'published') THEN
    SELECT has_permission(v_user_id, 'events', CASE WHEN p_new_status = 'locked' THEN 'lock' ELSE 'publish' END) 
    INTO v_can_transition;
  ELSE
    SELECT has_permission(v_user_id, 'events', 'update') INTO v_can_transition;
  END IF;
  
  IF NOT v_can_transition THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  UPDATE events
  SET 
    status = p_new_status,
    locked_by = CASE WHEN p_new_status = 'locked' THEN v_user_id ELSE locked_by END,
    published_by = CASE WHEN p_new_status = 'published' THEN v_user_id ELSE published_by END,
    updated_at = NOW()
  WHERE id = p_event_id
  RETURNING * INTO v_result;
  
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
    'event', get_event_state(p_event_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 6: INDEXES AND RLS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_event_state_transitions_event ON event_state_transitions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_state_transitions_created ON event_state_transitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_overrides_evaluation ON score_overrides(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_score_overrides_overridden_at ON score_overrides(overridden_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event ON event_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_status ON event_notifications(status);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation ON evaluation_scores(evaluation_id);

ALTER TABLE event_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view event transitions"
  ON event_state_transitions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'event_admin')
    )
  );

CREATE POLICY "Admins can view score overrides"
  ON score_overrides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'event_admin')
    )
  );

CREATE POLICY "Users can view own notifications"
  ON event_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
  ON event_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Judges can view own evaluation scores"
  ON evaluation_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM raw_evaluations re
      WHERE re.id = evaluation_scores.evaluation_id AND re.judge_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all evaluation scores"
  ON evaluation_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'event_admin')
    )
  );
