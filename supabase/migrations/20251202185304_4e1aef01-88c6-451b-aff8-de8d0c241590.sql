-- Add technical_characteristics JSONB column to property_composition table
ALTER TABLE public.property_composition 
ADD COLUMN IF NOT EXISTS technical_characteristics JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.property_composition.technical_characteristics IS 'Technical characteristics of the building: arrivals, evacuations, collective equipment, perimeter & dimensions';