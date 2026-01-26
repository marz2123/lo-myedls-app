-- Create custom templates table for user-saved templates
CREATE TABLE public.custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  content TEXT NOT NULL,
  detail_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_property_type CHECK (property_type IN ('building', 'house', 'apartment', 'commercial'))
);

-- Enable RLS
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own custom templates"
  ON public.custom_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom templates"
  ON public.custom_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom templates"
  ON public.custom_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom templates"
  ON public.custom_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_templates_updated_at
  BEFORE UPDATE ON public.custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_custom_templates_user_property 
  ON public.custom_templates(user_id, property_type);