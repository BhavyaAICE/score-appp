
/*
  # Fix security warnings - add search_path to existing functions
*/

-- Fix pre-existing functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.check_max_criteria_per_round()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM round_criteria WHERE round_id = NEW.round_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 criteria allowed per round';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_evaluation_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_draft = false AND NEW.is_draft = false THEN
    RAISE EXCEPTION 'Cannot edit submitted evaluation. Create new version instead.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_created_by_for_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_locked_event_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('locked', 'published') THEN
    RAISE EXCEPTION 'Cannot modify event after it has been locked or published';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_locked_score_modification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  event_current_status TEXT;
BEGIN
  SELECT e.status INTO event_current_status 
  FROM events e
  JOIN rounds r ON r.event_id = e.id
  WHERE r.id = COALESCE(NEW.round_id, OLD.round_id);
  
  IF event_current_status IN ('locked', 'published') THEN
    RAISE EXCEPTION 'Cannot modify scores after event has been locked';
  END IF;
  RETURN NEW;
END;
$$;
