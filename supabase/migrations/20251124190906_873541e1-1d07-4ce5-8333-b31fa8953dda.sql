-- Add suggestions column to dsc_classification_logs table
ALTER TABLE public.dsc_classification_logs 
ADD COLUMN IF NOT EXISTS suggestions jsonb;

-- Add comment explaining the suggestions format
COMMENT ON COLUMN public.dsc_classification_logs.suggestions IS 'Array of classification suggestions with confidence scores: [{family_id, category_id, subcategory_id, confidence, source}]';