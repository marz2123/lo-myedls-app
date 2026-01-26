-- Create edl_events table for timeline tracking
CREATE TABLE public.edl_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  room_name TEXT,
  element_name TEXT,
  related_photo_url TEXT,
  related_anomaly_id UUID,
  related_task_id UUID,
  severity TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view events for their projects"
ON public.edl_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_events.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create events for their projects"
ON public.edl_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_events.project_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete events for their projects"
ON public.edl_events
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = edl_events.project_id AND p.user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_edl_events_project_id ON public.edl_events(project_id);
CREATE INDEX idx_edl_events_created_at ON public.edl_events(created_at DESC);
CREATE INDEX idx_edl_events_event_type ON public.edl_events(event_type);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.edl_events;