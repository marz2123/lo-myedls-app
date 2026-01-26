-- Add endroit_name column to visit_sequences
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS endroit_name TEXT;