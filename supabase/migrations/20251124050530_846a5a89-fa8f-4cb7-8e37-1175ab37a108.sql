-- Create table for MyAladin notification preferences
CREATE TABLE IF NOT EXISTS public.myaladin_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contextual_tips_enabled BOOLEAN NOT NULL DEFAULT true,
  tip_frequency TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.myaladin_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON public.myaladin_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.myaladin_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.myaladin_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_myaladin_preferences_updated_at
  BEFORE UPDATE ON public.myaladin_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();