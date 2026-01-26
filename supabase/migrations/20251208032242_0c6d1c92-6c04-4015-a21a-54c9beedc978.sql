-- Add confidence columns to visit_sequences for room and zone assignment
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS location_confidence numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS zone_confidence numeric DEFAULT NULL;

-- Add comment to explain these columns
COMMENT ON COLUMN public.visit_sequences.location_confidence IS 'AI confidence score (0-1) for auto-assigned room/location';
COMMENT ON COLUMN public.visit_sequences.zone_confidence IS 'AI confidence score (0-1) for auto-assigned zone';

-- Add similar columns to extracted_frames for photo location assignment
ALTER TABLE public.extracted_frames 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.property_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.location_zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS location_confidence numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS zone_confidence numeric DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.extracted_frames.location_id IS 'Assigned room/location for this frame';
COMMENT ON COLUMN public.extracted_frames.zone_id IS 'Assigned zone for this frame';
COMMENT ON COLUMN public.extracted_frames.location_confidence IS 'AI confidence score (0-1) for auto-assigned room/location';
COMMENT ON COLUMN public.extracted_frames.zone_confidence IS 'AI confidence score (0-1) for auto-assigned zone';