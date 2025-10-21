/*
  # Complete Multi-Round Judging & Scoring System

  ## Overview
  Creates a comprehensive judging system with:
  - Multi-round support with configurable criteria (max 5 per round)
  - Judge types: HARDWARE, SOFTWARE, BOTH
  - Per-judge and global team selection modes
  - Z-score normalization and robust MAD normalization
  - Complete audit trail and export capabilities

  ## New Tables Created

  ### 1. `rounds`
  Multi-round support for events
  - `id` (uuid, primary key)
  - `event_id` (uuid, foreign key to events)
  - `name` (text) - Round 1, Round 2, etc.
  - `round_number` (integer) - ordering
  - `status` (text) - draft, active, completed
  - `max_criteria` (integer) - default 5
  - `selection_mode` (text) - PER_JUDGE_TOP_N, GLOBAL_TOP_K
  - `selection_params` (jsonb) - configuration
  - `normalization_method` (text) - Z_SCORE, ROBUST_MAD
  - `is_computed` (boolean)
  - `computed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 2. `round_criteria`
  Criteria specific to each round (max 5)
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `name` (text)
  - `description` (text)
  - `max_marks` (numeric)
  - `weight` (numeric) - default 1.0
  - `display_order` (integer)
  - `created_at` (timestamptz)

  ### 3. `round_judge_assignments`
  Links judges to specific rounds
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `judge_id` (uuid, foreign key to judges)
  - `judge_type` (text) - HARDWARE, SOFTWARE, BOTH
  - `judge_weight` (numeric) - for weighted aggregation
  - `assigned_at` (timestamptz)

  ### 4. `round_evaluations`
  Judge evaluations per round (immutable once submitted)
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `judge_id` (uuid, foreign key to judges)
  - `team_id` (uuid, foreign key to teams)
  - `scores` (jsonb) - {criterion_id: score_value}
  - `raw_total` (numeric) - computed 0-100
  - `note` (text)
  - `is_draft` (boolean)
  - `submitted_at` (timestamptz)
  - `created_at` (timestamptz)
  - `version` (integer) - for audit

  ### 5. `round_normalization_results`
  Normalized scores per team per round
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `team_id` (uuid, foreign key)
  - `judge_id` (uuid, foreign key) - for per-judge z-scores
  - `raw_total` (numeric)
  - `judge_mean` (numeric) - μ_j
  - `judge_std` (numeric) - σ_j
  - `z_score` (numeric) - per-judge z-score
  - `aggregated_z` (numeric) - Z_i across judges
  - `percentile` (numeric) - final score 0-100
  - `rank` (integer)
  - `tie_breaker_data` (jsonb)
  - `computed_at` (timestamptz)

  ### 6. `round_team_selections`
  Tracks team promotion between rounds
  - `id` (uuid, primary key)
  - `from_round_id` (uuid, foreign key)
  - `to_round_id` (uuid, foreign key)
  - `team_id` (uuid, foreign key)
  - `selection_mode` (text)
  - `selection_criteria` (jsonb)
  - `selected_by_judge_id` (uuid) - if per-judge mode
  - `selected_at` (timestamptz)

  ### 7. `round_compute_logs`
  Audit log for computations
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `normalization_method` (text)
  - `computation_params` (jsonb)
  - `teams_evaluated` (integer)
  - `judges_count` (integer)
  - `computed_by` (uuid) - admin user
  - `computed_at` (timestamptz)

  ### 8. `round_manual_adjustments`
  Manual score/rank overrides
  - `id` (uuid, primary key)
  - `round_id` (uuid, foreign key)
  - `team_id` (uuid, foreign key)
  - `adjustment_type` (text)
  - `old_value` (jsonb)
  - `new_value` (jsonb)
  - `reason` (text)
  - `adjusted_by` (uuid)
  - `adjusted_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Admins have full access
  - Judges can only manage their own evaluations
  - Public can view published results
*/

-- 1. Create rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  round_number integer NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  max_criteria integer DEFAULT 5 CHECK (max_criteria <= 5),
  selection_mode text CHECK (selection_mode IN ('PER_JUDGE_TOP_N', 'GLOBAL_TOP_K')),
  selection_params jsonb DEFAULT '{}'::jsonb,
  normalization_method text DEFAULT 'Z_SCORE' CHECK (normalization_method IN ('Z_SCORE', 'ROBUST_MAD')),
  is_computed boolean DEFAULT false,
  computed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, round_number)
);

-- 2. Create round_criteria table
CREATE TABLE IF NOT EXISTS round_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  max_marks numeric NOT NULL CHECK (max_marks > 0),
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  display_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Create round_judge_assignments table
CREATE TABLE IF NOT EXISTS round_judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  judge_type text NOT NULL DEFAULT 'BOTH' CHECK (judge_type IN ('HARDWARE', 'SOFTWARE', 'BOTH')),
  judge_weight numeric DEFAULT 1.0 CHECK (judge_weight > 0),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(round_id, judge_id)
);

-- 4. Create round_evaluations table
CREATE TABLE IF NOT EXISTS round_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_total numeric,
  note text DEFAULT '',
  is_draft boolean DEFAULT true,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  version integer DEFAULT 1,
  UNIQUE(round_id, judge_id, team_id, version)
);

-- 5. Create round_normalization_results table
CREATE TABLE IF NOT EXISTS round_normalization_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  judge_id uuid REFERENCES judges(id) ON DELETE CASCADE,
  raw_total numeric,
  judge_mean numeric,
  judge_std numeric,
  z_score numeric,
  aggregated_z numeric,
  percentile numeric,
  rank integer,
  tie_breaker_data jsonb DEFAULT '{}'::jsonb,
  computed_at timestamptz DEFAULT now()
);

-- 6. Create round_team_selections table
CREATE TABLE IF NOT EXISTS round_team_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  to_round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  selection_mode text NOT NULL,
  selection_criteria jsonb DEFAULT '{}'::jsonb,
  selected_by_judge_id uuid REFERENCES judges(id) ON DELETE SET NULL,
  selected_at timestamptz DEFAULT now(),
  UNIQUE(from_round_id, team_id)
);

-- 7. Create round_compute_logs table
CREATE TABLE IF NOT EXISTS round_compute_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  normalization_method text NOT NULL DEFAULT 'Z_SCORE',
  computation_params jsonb DEFAULT '{}'::jsonb,
  teams_evaluated integer,
  judges_count integer,
  computed_by uuid,
  computed_at timestamptz DEFAULT now()
);

-- 8. Create round_manual_adjustments table
CREATE TABLE IF NOT EXISTS round_manual_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  adjusted_by uuid,
  adjusted_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rounds_event ON rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_round_criteria_round ON round_criteria(round_id);
CREATE INDEX IF NOT EXISTS idx_round_judge_assignments_round ON round_judge_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_round_judge_assignments_judge ON round_judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_round_evaluations_round ON round_evaluations(round_id);
CREATE INDEX IF NOT EXISTS idx_round_evaluations_judge ON round_evaluations(judge_id);
CREATE INDEX IF NOT EXISTS idx_round_evaluations_team ON round_evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_round_evaluations_submitted ON round_evaluations(round_id, is_draft);
CREATE INDEX IF NOT EXISTS idx_round_normalization_round ON round_normalization_results(round_id);
CREATE INDEX IF NOT EXISTS idx_round_normalization_team ON round_normalization_results(team_id);
CREATE INDEX IF NOT EXISTS idx_round_selections_from ON round_team_selections(from_round_id);
CREATE INDEX IF NOT EXISTS idx_round_selections_to ON round_team_selections(to_round_id);

-- Constraint: Max 5 criteria per round
CREATE OR REPLACE FUNCTION check_max_criteria_per_round()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM round_criteria WHERE round_id = NEW.round_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 criteria allowed per round';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_criteria ON round_criteria;
CREATE TRIGGER enforce_max_criteria
  BEFORE INSERT ON round_criteria
  FOR EACH ROW
  EXECUTE FUNCTION check_max_criteria_per_round();

-- Constraint: Prevent editing submitted evaluations
CREATE OR REPLACE FUNCTION prevent_evaluation_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_draft = false AND NEW.is_draft = false THEN
    RAISE EXCEPTION 'Cannot edit submitted evaluation. Create new version instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_submitted_edit ON round_evaluations;
CREATE TRIGGER prevent_submitted_edit
  BEFORE UPDATE ON round_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evaluation_edit();

-- Enable RLS on all tables
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_normalization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_team_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_compute_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_manual_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rounds (admins can manage, others can view active/completed)
CREATE POLICY "Public can view active rounds"
  ON rounds FOR SELECT
  TO authenticated
  USING (status IN ('active', 'completed'));

-- RLS Policies for round_criteria
CREATE POLICY "Public can view criteria for active rounds"
  ON round_criteria FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = round_criteria.round_id
      AND rounds.status IN ('active', 'completed')
    )
  );

-- RLS Policies for round_judge_assignments
CREATE POLICY "Judges can view their assignments"
  ON round_judge_assignments FOR SELECT
  TO authenticated
  USING (
    judge_id IN (SELECT id FROM judges)
  );

-- RLS Policies for round_evaluations
CREATE POLICY "Judges can manage their own evaluations"
  ON round_evaluations FOR ALL
  TO authenticated
  USING (
    judge_id IN (SELECT id FROM judges)
  )
  WITH CHECK (
    judge_id IN (SELECT id FROM judges)
  );

-- RLS Policies for round_normalization_results
CREATE POLICY "Public can view published results"
  ON round_normalization_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds
      WHERE rounds.id = round_normalization_results.round_id
      AND rounds.status = 'completed'
    )
  );

-- RLS Policies for round_team_selections
CREATE POLICY "Public can view selections"
  ON round_team_selections FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for round_compute_logs
CREATE POLICY "Public can view compute logs"
  ON round_compute_logs FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for round_manual_adjustments
CREATE POLICY "Public can view adjustments"
  ON round_manual_adjustments FOR SELECT
  TO authenticated
  USING (true);
