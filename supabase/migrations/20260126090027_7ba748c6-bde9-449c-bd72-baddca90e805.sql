-- Enable Realtime for round_evaluations table to support Live Leaderboard
-- This allows the frontend to subscribe to INSERT, UPDATE, DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE round_evaluations;

-- Also enable for raw_evaluations if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE raw_evaluations;