-- Create analytics_events table for tracking user events and metrics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('user', 'project', 'reportage', 'report', 'ai', 'export', 'template', 'error')),
  action TEXT NOT NULL,
  label TEXT,
  value NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON public.analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_category ON public.analytics_events(user_id, category);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own analytics events'
  ) THEN
    CREATE POLICY "Users can view their own analytics events"
      ON public.analytics_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own analytics events'
  ) THEN
    CREATE POLICY "Users can insert their own analytics events"
      ON public.analytics_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own analytics events'
  ) THEN
    CREATE POLICY "Users can update their own analytics events"
      ON public.analytics_events
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Users cannot delete their own events (for data integrity)
-- Only admins can delete via service role
