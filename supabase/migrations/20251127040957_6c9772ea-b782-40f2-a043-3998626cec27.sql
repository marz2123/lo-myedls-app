-- Ajouter une colonne manual_label à la table extracted_frames pour permettre l'annotation des photos
ALTER TABLE public.extracted_frames
ADD COLUMN IF NOT EXISTS manual_label TEXT;