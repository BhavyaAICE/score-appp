-- Create venues table for event venues
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view venues"
  ON public.venues
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert venues"
  ON public.venues
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update venues"
  ON public.venues
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete venues"
  ON public.venues
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_venues_event_id ON public.venues(event_id);