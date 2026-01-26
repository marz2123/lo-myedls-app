-- Add enrichment_data column to persist API results
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS enrichment_data jsonb DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.projects.enrichment_data IS 'Stores cached API enrichment data (geo, cadastre, risques, etc.) to avoid redundant API calls';
