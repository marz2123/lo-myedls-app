-- Add pieces_json column to property_locations for storing room/piece definitions
ALTER TABLE public.property_locations 
ADD COLUMN IF NOT EXISTS pieces_json TEXT;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.property_locations.pieces_json IS 'JSON array storing room/piece definitions for apartments (e.g., bedroom, bathroom, kitchen)';