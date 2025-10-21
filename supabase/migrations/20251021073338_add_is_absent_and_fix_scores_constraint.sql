/*
  # Fix Teams and Scores Tables

  1. Changes to teams table
    - Add `is_absent` column (boolean, default false) to track team absence status
    
  2. Changes to scores table
    - Drop the existing check constraint that limits scores to 0-10
    - Add new check constraint that only enforces non-negative scores
    - This allows scores to match the max_score value of each criterion

  3. Notes
    - Using IF NOT EXISTS pattern to safely add the column
    - The new constraint allows flexible scoring based on criterion max_score values
*/

-- Add is_absent column to teams table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'is_absent'
  ) THEN
    ALTER TABLE teams ADD COLUMN is_absent boolean DEFAULT false;
  END IF;
END $$;

-- Drop the old constraint on scores table that limits to 0-10
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scores_score_check'
  ) THEN
    ALTER TABLE scores DROP CONSTRAINT scores_score_check;
  END IF;
END $$;

-- Add new constraint that only enforces non-negative scores
ALTER TABLE scores ADD CONSTRAINT scores_score_check CHECK (score >= 0);