/*
  # Backend-Only Scoring Engine Migration
  
  ## Overview
  This migration creates:
  1. Tables for raw score submissions
  2. Tables for computed results
  3. PostgreSQL functions for all scoring computations
  4. Protected RPC endpoints
  5. Validation and audit logging
  
  ## Security
  - All computation happens server-side only
  - Raw scores validated before storage
  - Pre-calculated values rejected
  - Full audit trail for all computations
*/

-- =============================================
-- SECTION 1: RAW SCORE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS raw_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES user_profiles(id),
  scores JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_draft BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  UNIQUE(round_id, team_id, judge_id)
);

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
  computed_by UUID REFERENCES user_profiles(id),
  computation_version INTEGER DEFAULT 1,
  
  UNIQUE(round_id, team_id, judge_id, computation_version)
);

CREATE TABLE IF NOT EXISTS scoring_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  error_message TEXT,
  user_id UUID REFERENCES user_profiles(id),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECTION 2: VALIDATION FUNCTIONS
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
    SELECT id::TEXT, name, max_marks, min_marks 
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
    
    IF v_score < COALESCE(v_criteria.min_marks, 0) OR v_score > v_criteria.max_marks THEN
      v_errors := v_errors || jsonb_build_object(
        'criterion', v_criteria.name,
        'error', format('Score %s out of range (%s-%s)', v_score, COALESCE(v_criteria.min_marks, 0), v_criteria.max_marks)
      );
    END IF;
  END LOOP;
  
  RETURN v_errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 3: SCORE SUBMISSION ENDPOINT
-- =============================================

CREATE OR REPLACE FUNCTION submit_raw_scores(
  p_round_id UUID,
  p_team_id UUID,
  p_scores JSONB,
  p_is_draft BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_event_status event_status;
  v_validation_errors JSONB;
  v_result RECORD;
  v_can_submit BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT e.status INTO v_event_status
  FROM rounds r
  JOIN events e ON r.event_id = e.id
  WHERE r.id = p_round_id;
  
  IF v_event_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;
  
  IF v_event_status != 'live_judging' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event is not open for judging');
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM judge_assignments
    WHERE round_id = p_round_id AND judge_id = v_user_id AND team_id = p_team_id
  ) INTO v_can_submit;
  
  IF NOT v_can_submit THEN
    SELECT has_permission(v_user_id, 'scores', 'submit') INTO v_can_submit;
  END IF;
  
  IF NOT v_can_submit THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to submit scores for this team');
  END IF;
  
  IF NOT reject_precalculated_values(p_scores) THEN
    INSERT INTO scoring_audit_log (round_id, action, details, error_message, user_id)
    VALUES (p_round_id, 'REJECTED_PRECALCULATED', p_scores, 'Attempted to submit pre-calculated values', v_user_id);
    
    RETURN jsonb_build_object('success', false, 'error', 'Pre-calculated values not allowed. Submit raw scores only.');
  END IF;
  
  v_validation_errors := validate_raw_scores(p_round_id, p_scores);
  
  IF jsonb_array_length(v_validation_errors) > 0 THEN
    INSERT INTO scoring_audit_log (round_id, action, details, error_message, user_id)
    VALUES (p_round_id, 'VALIDATION_FAILED', p_scores, v_validation_errors::TEXT, v_user_id);
    
    RETURN jsonb_build_object('success', false, 'error', 'Validation failed', 'details', v_validation_errors);
  END IF;
  
  INSERT INTO raw_evaluations (round_id, team_id, judge_id, scores, is_draft)
  VALUES (p_round_id, p_team_id, v_user_id, p_scores, p_is_draft)
  ON CONFLICT (round_id, team_id, judge_id) 
  DO UPDATE SET 
    scores = EXCLUDED.scores,
    is_draft = EXCLUDED.is_draft,
    submitted_at = NOW()
  RETURNING * INTO v_result;
  
  INSERT INTO scoring_audit_log (round_id, action, details, user_id)
  VALUES (p_round_id, 'SCORE_SUBMITTED', jsonb_build_object(
    'evaluation_id', v_result.id,
    'team_id', p_team_id,
    'is_draft', p_is_draft,
    'criteria_count', (SELECT COUNT(*) FROM jsonb_object_keys(p_scores))
  ), v_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'evaluation_id', v_result.id,
    'is_draft', p_is_draft
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 4: COMPUTATION FUNCTIONS (USP FORMULAS)
-- =============================================

CREATE OR REPLACE FUNCTION compute_judge_statistics(
  p_round_id UUID,
  p_judge_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_criteria RECORD;
  v_stats JSONB := '{}'::JSONB;
  v_criterion_stats JSONB;
  v_scores NUMERIC[];
  v_mean NUMERIC;
  v_variance NUMERIC;
  v_std_dev NUMERIC;
  v_n INTEGER;
BEGIN
  FOR v_criteria IN 
    SELECT id::TEXT as criterion_id, weight 
    FROM round_criteria 
    WHERE round_id = p_round_id
    ORDER BY display_order
  LOOP
    SELECT ARRAY_AGG((scores ->> v_criteria.criterion_id)::NUMERIC)
    INTO v_scores
    FROM raw_evaluations
    WHERE round_id = p_round_id 
      AND judge_id = p_judge_id 
      AND is_draft = false;
    
    v_n := COALESCE(array_length(v_scores, 1), 0);
    
    IF v_n > 0 THEN
      SELECT AVG(s) INTO v_mean FROM unnest(v_scores) AS s;
      
      SELECT SUM(POWER(s - v_mean, 2)) / v_n INTO v_variance 
      FROM unnest(v_scores) AS s;
      
      v_std_dev := SQRT(v_variance);
      
      v_stats := v_stats || jsonb_build_object(
        v_criteria.criterion_id, jsonb_build_object(
          'mean', v_mean,
          'std_dev', v_std_dev,
          'n', v_n,
          'weight', v_criteria.weight
        )
      );
    END IF;
  END LOOP;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION normalize_evaluation(
  p_evaluation_id UUID,
  p_judge_stats JSONB
) RETURNS JSONB AS $$
DECLARE
  v_eval RECORD;
  v_criteria RECORD;
  v_raw_score NUMERIC;
  v_mean NUMERIC;
  v_std_dev NUMERIC;
  v_z_score NUMERIC;
  v_weight NUMERIC;
  v_total_weight NUMERIC := 0;
  v_weighted_z NUMERIC;
  v_total_weighted_z NUMERIC := 0;
  v_z_scores JSONB := '{}'::JSONB;
  v_weighted_z_scores JSONB := '{}'::JSONB;
  v_raw_total NUMERIC := 0;
BEGIN
  SELECT * INTO v_eval FROM raw_evaluations WHERE id = p_evaluation_id;
  
  IF v_eval IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT SUM(weight) INTO v_total_weight
  FROM round_criteria WHERE round_id = v_eval.round_id;
  
  FOR v_criteria IN 
    SELECT id::TEXT as criterion_id, weight, max_marks 
    FROM round_criteria 
    WHERE round_id = v_eval.round_id
    ORDER BY display_order
  LOOP
    v_raw_score := (v_eval.scores ->> v_criteria.criterion_id)::NUMERIC;
    
    v_raw_total := v_raw_total + (v_raw_score / v_criteria.max_marks * 100) * (v_criteria.weight / v_total_weight);
    
    v_mean := (p_judge_stats -> v_criteria.criterion_id ->> 'mean')::NUMERIC;
    v_std_dev := (p_judge_stats -> v_criteria.criterion_id ->> 'std_dev')::NUMERIC;
    v_weight := v_criteria.weight / v_total_weight;
    
    IF v_std_dev IS NULL OR v_std_dev = 0 OR (p_judge_stats -> v_criteria.criterion_id ->> 'n')::INTEGER = 1 THEN
      v_z_score := 0;
    ELSE
      v_z_score := (v_raw_score - v_mean) / v_std_dev;
    END IF;
    
    v_weighted_z := v_weight * v_z_score;
    v_total_weighted_z := v_total_weighted_z + v_weighted_z;
    
    v_z_scores := v_z_scores || jsonb_build_object(v_criteria.criterion_id, v_z_score);
    v_weighted_z_scores := v_weighted_z_scores || jsonb_build_object(v_criteria.criterion_id, v_weighted_z);
  END LOOP;
  
  RETURN jsonb_build_object(
    'evaluation_id', p_evaluation_id,
    'team_id', v_eval.team_id,
    'judge_id', v_eval.judge_id,
    'raw_total', v_raw_total,
    'z_scores', v_z_scores,
    'weighted_z_scores', v_weighted_z_scores,
    'final_z', v_total_weighted_z
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION compute_round_scores(
  p_round_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_can_compute BOOLEAN;
  v_event_status event_status;
  v_judge RECORD;
  v_eval RECORD;
  v_judge_stats JSONB;
  v_normalized JSONB;
  v_all_normalized JSONB[] := ARRAY[]::JSONB[];
  v_team_results JSONB;
  v_computation_version INTEGER;
  v_start_time TIMESTAMPTZ;
  v_criteria JSONB;
BEGIN
  v_user_id := auth.uid();
  v_start_time := NOW();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  SELECT has_permission(v_user_id, 'results', 'compute') INTO v_can_compute;
  
  IF NOT v_can_compute THEN
    INSERT INTO scoring_audit_log (round_id, action, error_message, user_id)
    VALUES (p_round_id, 'COMPUTE_DENIED', 'Permission denied', v_user_id);
    
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  SELECT e.status INTO v_event_status
  FROM rounds r
  JOIN events e ON r.event_id = e.id
  WHERE r.id = p_round_id;
  
  IF v_event_status IN ('locked', 'published') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot recompute scores for locked or published events');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM raw_evaluations 
    WHERE round_id = p_round_id AND is_draft = false
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No submitted evaluations found');
  END IF;
  
  SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'weight', weight, 'max_marks', max_marks))
  INTO v_criteria
  FROM round_criteria WHERE round_id = p_round_id;
  
  FOR v_judge IN 
    SELECT DISTINCT judge_id FROM raw_evaluations 
    WHERE round_id = p_round_id AND is_draft = false
  LOOP
    v_judge_stats := compute_judge_statistics(p_round_id, v_judge.judge_id);
    
    FOR v_eval IN 
      SELECT id FROM raw_evaluations 
      WHERE round_id = p_round_id 
        AND judge_id = v_judge.judge_id 
        AND is_draft = false
    LOOP
      v_normalized := normalize_evaluation(v_eval.id, v_judge_stats);
      
      IF v_normalized IS NOT NULL THEN
        v_normalized := v_normalized || jsonb_build_object(
          'judge_mean', (
            SELECT AVG((v_judge_stats -> key ->> 'mean')::NUMERIC)
            FROM jsonb_object_keys(v_judge_stats) AS key
          ),
          'judge_std', (
            SELECT AVG((v_judge_stats -> key ->> 'std_dev')::NUMERIC)
            FROM jsonb_object_keys(v_judge_stats) AS key
          )
        );
        v_all_normalized := array_append(v_all_normalized, v_normalized);
      END IF;
    END LOOP;
  END LOOP;
  
  v_team_results := aggregate_and_rank_teams(v_all_normalized, v_criteria);
  
  SELECT COALESCE(MAX(computation_version), 0) + 1 
  INTO v_computation_version
  FROM computed_results WHERE round_id = p_round_id;
  
  PERFORM save_computed_results(p_round_id, v_team_results, v_user_id, v_computation_version);
  
  INSERT INTO scoring_audit_log (round_id, action, details, user_id)
  VALUES (p_round_id, 'SCORES_COMPUTED', jsonb_build_object(
    'evaluation_count', array_length(v_all_normalized, 1),
    'team_count', jsonb_array_length(v_team_results),
    'computation_version', v_computation_version,
    'duration_ms', EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))
  ), v_user_id);
  
  INSERT INTO computation_logs (round_id, computation_type, input_data, output_data, formula_used, computed_by)
  VALUES (
    p_round_id, 
    'Z_SCORE_NORMALIZATION',
    jsonb_build_object(
      'evaluation_count', array_length(v_all_normalized, 1),
      'criteria', v_criteria
    ),
    jsonb_build_object(
      'team_count', jsonb_array_length(v_team_results),
      'version', v_computation_version
    ),
    'USP Z-Score: Z=(X-μ)/σ, Zw=w×Z, Final=ΣZw',
    v_user_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'team_count', jsonb_array_length(v_team_results),
    'computation_version', v_computation_version,
    'results', v_team_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION aggregate_and_rank_teams(
  p_normalized_evals JSONB[],
  p_criteria JSONB
) RETURNS JSONB AS $$
DECLARE
  v_team_map JSONB := '{}'::JSONB;
  v_eval JSONB;
  v_team_id TEXT;
  v_team_data JSONB;
  v_results JSONB[] := ARRAY[]::JSONB[];
  v_team RECORD;
  v_aggregated_z NUMERIC;
  v_avg_z_scores JSONB;
  v_avg_raw_total NUMERIC;
  v_median_raw_total NUMERIC;
  v_judge_count INTEGER;
  v_ranked JSONB[] := ARRAY[]::JSONB[];
  v_current_rank INTEGER := 1;
  v_result JSONB;
  v_total_teams INTEGER;
  v_criterion JSONB;
  v_criterion_id TEXT;
  v_sorted_criteria JSONB[];
  v_raw_totals NUMERIC[];
  v_mid_idx INTEGER;
BEGIN
  FOREACH v_eval IN ARRAY p_normalized_evals
  LOOP
    v_team_id := v_eval ->> 'team_id';
    
    IF v_team_map ? v_team_id THEN
      v_team_data := v_team_map -> v_team_id;
      v_team_data := jsonb_set(
        v_team_data, 
        '{evaluations}', 
        (v_team_data -> 'evaluations') || jsonb_build_array(v_eval)
      );
      v_team_map := jsonb_set(v_team_map, ARRAY[v_team_id], v_team_data);
    ELSE
      v_team_map := jsonb_set(
        v_team_map, 
        ARRAY[v_team_id], 
        jsonb_build_object('team_id', v_team_id, 'evaluations', jsonb_build_array(v_eval))
      );
    END IF;
  END LOOP;
  
  SELECT array_agg(c ORDER BY (c ->> 'weight')::NUMERIC DESC)
  INTO v_sorted_criteria
  FROM jsonb_array_elements(p_criteria) AS c;
  
  FOR v_team IN SELECT key, value FROM jsonb_each(v_team_map)
  LOOP
    v_judge_count := jsonb_array_length(v_team.value -> 'evaluations');
    
    SELECT AVG((e ->> 'final_z')::NUMERIC) INTO v_aggregated_z
    FROM jsonb_array_elements(v_team.value -> 'evaluations') AS e;
    
    SELECT AVG((e ->> 'raw_total')::NUMERIC) INTO v_avg_raw_total
    FROM jsonb_array_elements(v_team.value -> 'evaluations') AS e;
    
    SELECT array_agg((e ->> 'raw_total')::NUMERIC ORDER BY (e ->> 'raw_total')::NUMERIC)
    INTO v_raw_totals
    FROM jsonb_array_elements(v_team.value -> 'evaluations') AS e;
    
    v_mid_idx := (array_length(v_raw_totals, 1) + 1) / 2;
    IF array_length(v_raw_totals, 1) % 2 = 0 THEN
      v_median_raw_total := (v_raw_totals[v_mid_idx] + v_raw_totals[v_mid_idx + 1]) / 2.0;
    ELSE
      v_median_raw_total := v_raw_totals[v_mid_idx];
    END IF;
    
    v_avg_z_scores := '{}'::JSONB;
    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
      v_criterion_id := v_criterion ->> 'id';
      DECLARE
        v_crit_avg NUMERIC;
      BEGIN
        SELECT AVG((e -> 'z_scores' ->> v_criterion_id)::NUMERIC) INTO v_crit_avg
        FROM jsonb_array_elements(v_team.value -> 'evaluations') AS e;
        v_avg_z_scores := v_avg_z_scores || jsonb_build_object(v_criterion_id, v_crit_avg);
      END;
    END LOOP;
    
    v_results := array_append(v_results, jsonb_build_object(
      'team_id', v_team.key,
      'aggregated_z', v_aggregated_z,
      'avg_z_scores', v_avg_z_scores,
      'avg_raw_total', v_avg_raw_total,
      'median_raw_total', v_median_raw_total,
      'judge_count', v_judge_count,
      'evaluations', v_team.value -> 'evaluations'
    ));
  END LOOP;
  
  WITH sorted_teams AS (
    SELECT 
      elem,
      ROW_NUMBER() OVER (
        ORDER BY 
          (elem ->> 'aggregated_z')::NUMERIC DESC,
          (SELECT MAX((elem -> 'avg_z_scores' ->> (c ->> 'id'))::NUMERIC)
           FROM unnest(v_sorted_criteria) AS c LIMIT 1) DESC,
          (elem ->> 'avg_raw_total')::NUMERIC DESC,
          (elem ->> 'median_raw_total')::NUMERIC DESC,
          (elem ->> 'judge_count')::INTEGER DESC
      ) AS sort_order
    FROM unnest(v_results) AS elem
  )
  SELECT array_agg(elem ORDER BY sort_order)
  INTO v_ranked
  FROM sorted_teams;
  
  v_total_teams := COALESCE(array_length(v_ranked, 1), 0);
  
  IF v_total_teams = 0 THEN
    RETURN '[]'::JSONB;
  END IF;
  
  FOR i IN 1..v_total_teams
  LOOP
    v_result := v_ranked[i];
    v_aggregated_z := (v_result ->> 'aggregated_z')::NUMERIC;
    
    DECLARE
      v_is_tied BOOLEAN := false;
      v_actual_rank INTEGER := v_current_rank;
      v_prev_result JSONB;
      v_prev_agg NUMERIC;
      v_prev_avg NUMERIC;
      v_prev_med NUMERIC;
      v_prev_jc INTEGER;
      v_curr_avg NUMERIC;
      v_curr_med NUMERIC;
      v_curr_jc INTEGER;
    BEGIN
      IF i > 1 THEN
        v_prev_result := v_ranked[i - 1];
        v_prev_agg := (v_prev_result ->> 'aggregated_z')::NUMERIC;
        v_prev_avg := (v_prev_result ->> 'avg_raw_total')::NUMERIC;
        v_prev_med := (v_prev_result ->> 'median_raw_total')::NUMERIC;
        v_prev_jc := (v_prev_result ->> 'judge_count')::INTEGER;
        v_curr_avg := (v_result ->> 'avg_raw_total')::NUMERIC;
        v_curr_med := (v_result ->> 'median_raw_total')::NUMERIC;
        v_curr_jc := (v_result ->> 'judge_count')::INTEGER;
        
        IF ABS(v_aggregated_z - v_prev_agg) < 0.0001 
           AND ABS(v_curr_avg - v_prev_avg) < 0.0001
           AND ABS(v_curr_med - v_prev_med) < 0.0001
           AND v_curr_jc = v_prev_jc THEN
          v_is_tied := true;
          v_actual_rank := (v_prev_result ->> 'rank')::INTEGER;
        END IF;
      END IF;
      
      v_result := v_result || jsonb_build_object(
        'rank', v_actual_rank,
        'is_tied', v_is_tied,
        'percentile', CASE WHEN v_total_teams > 1 
          THEN ((v_total_teams - v_current_rank)::NUMERIC / (v_total_teams - 1)::NUMERIC) * 100 
          ELSE 100 
        END
      );
    END;
    
    v_ranked[i] := v_result;
    v_current_rank := v_current_rank + 1;
  END LOOP;
  
  RETURN to_jsonb(v_ranked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION save_computed_results(
  p_round_id UUID,
  p_team_results JSONB,
  p_computed_by UUID,
  p_version INTEGER
) RETURNS VOID AS $$
DECLARE
  v_team JSONB;
  v_eval JSONB;
BEGIN
  FOR v_team IN SELECT * FROM jsonb_array_elements(p_team_results)
  LOOP
    FOR v_eval IN SELECT * FROM jsonb_array_elements(v_team -> 'evaluations')
    LOOP
      INSERT INTO computed_results (
        round_id, team_id, judge_id,
        raw_total, normalized_z, aggregated_z, weighted_z_scores,
        rank, percentile, is_tied, tie_breaker_data,
        judge_mean, judge_std,
        computed_by, computation_version
      ) VALUES (
        p_round_id,
        (v_team ->> 'team_id')::UUID,
        (v_eval ->> 'judge_id')::UUID,
        (v_eval ->> 'raw_total')::NUMERIC,
        (v_eval ->> 'final_z')::NUMERIC,
        (v_team ->> 'aggregated_z')::NUMERIC,
        v_eval -> 'weighted_z_scores',
        (v_team ->> 'rank')::INTEGER,
        (v_team ->> 'percentile')::NUMERIC,
        (v_team ->> 'is_tied')::BOOLEAN,
        jsonb_build_object(
          'avg_z_scores', v_team -> 'avg_z_scores',
          'avg_raw_total', v_team ->> 'avg_raw_total',
          'median_raw_total', v_team ->> 'median_raw_total',
          'judge_count', v_team ->> 'judge_count'
        ),
        (v_eval ->> 'judge_mean')::NUMERIC,
        (v_eval ->> 'judge_std')::NUMERIC,
        p_computed_by,
        p_version
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 5: READ-ONLY RESULTS ENDPOINT
-- =============================================

CREATE OR REPLACE FUNCTION get_round_results(
  p_round_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_can_view BOOLEAN;
  v_results JSONB;
BEGIN
  v_user_id := auth.uid();
  
  SELECT has_permission(v_user_id, 'results', 'read') INTO v_can_view;
  
  IF NOT v_can_view THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'team_id', team_id,
      'rank', rank,
      'percentile', percentile,
      'aggregated_z', aggregated_z,
      'is_tied', is_tied,
      'judge_count', (tie_breaker_data ->> 'judge_count')::INTEGER
    ) ORDER BY rank
  ) INTO v_results
  FROM computed_results
  WHERE round_id = p_round_id
    AND computation_version = (
      SELECT MAX(computation_version) FROM computed_results WHERE round_id = p_round_id
    )
  GROUP BY team_id, rank, percentile, aggregated_z, is_tied, tie_breaker_data;
  
  RETURN jsonb_build_object('success', true, 'results', COALESCE(v_results, '[]'::JSONB));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SECTION 6: ROW LEVEL SECURITY
-- =============================================

ALTER TABLE raw_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE computed_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judges can view own evaluations"
  ON raw_evaluations FOR SELECT
  TO authenticated
  USING (judge_id = auth.uid());

CREATE POLICY "Admins can view all evaluations"
  ON raw_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'event_admin')
    )
  );

CREATE POLICY "Only system can insert evaluations"
  ON raw_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (judge_id = auth.uid());

CREATE POLICY "Admins can view computed results"
  ON computed_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('super_admin', 'event_admin')
    )
  );

CREATE POLICY "Published results viewable by all"
  ON computed_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = computed_results.round_id AND e.status = 'published'
    )
  );

CREATE POLICY "Admins can view scoring audit logs"
  ON scoring_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =============================================
-- SECTION 7: INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_raw_evaluations_round ON raw_evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_raw_evaluations_judge ON raw_evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_raw_evaluations_team ON raw_evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_computed_results_round ON computed_results(round_id);
CREATE INDEX IF NOT EXISTS idx_computed_results_version ON computed_results(round_id, computation_version);
CREATE INDEX IF NOT EXISTS idx_scoring_audit_round ON scoring_audit_log(round_id);
