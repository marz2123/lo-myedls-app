-- Add EDL tags JSONB column to visit_sequences for auto-tagging
ALTER TABLE public.visit_sequences
ADD COLUMN IF NOT EXISTS edl_tags JSONB DEFAULT NULL;

-- Add EDL tags to extracted_frames as well
ALTER TABLE public.extracted_frames
ADD COLUMN IF NOT EXISTS edl_tags JSONB DEFAULT NULL;

COMMENT ON COLUMN public.visit_sequences.edl_tags IS 'AI-inferred EDL tags: element_type, state, material, source';
COMMENT ON COLUMN public.extracted_frames.edl_tags IS 'AI-inferred EDL tags: element_type, state, material, source';