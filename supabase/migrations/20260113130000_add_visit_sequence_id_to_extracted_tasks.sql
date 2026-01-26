-- Ajouter visit_sequence_id à extracted_tasks pour lier directement les tâches aux séquences
-- Structure alignée avec lo-myhome

-- 1) Ajouter la colonne visit_sequence_id
ALTER TABLE public.extracted_tasks
ADD COLUMN IF NOT EXISTS visit_sequence_id UUID REFERENCES public.visit_sequences(id) ON DELETE SET NULL;

-- 2) Créer l'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_visit_sequence_id ON public.extracted_tasks(visit_sequence_id);

-- 3) Ajouter source_type 'sequence' si pas déjà présent dans la constraint
-- Note: La constraint existe déjà mais on veut s'assurer que 'sequence' est inclus
DO $$ 
BEGIN
  -- Supprimer l'ancienne constraint si elle existe
  ALTER TABLE public.extracted_tasks DROP CONSTRAINT IF EXISTS extracted_tasks_source_type_check;
  
  -- Recréer avec toutes les valeurs possibles
  ALTER TABLE public.extracted_tasks 
  ADD CONSTRAINT extracted_tasks_source_type_check 
  CHECK (source_type IN ('image', 'video', 'text', 'document', 'pdf', 'sequence', 'photo', 'document_prediction', 'ai_analysis'));
EXCEPTION
  WHEN others THEN
    -- Ignorer si l'opération échoue (constraint déjà correcte)
    NULL;
END $$;
