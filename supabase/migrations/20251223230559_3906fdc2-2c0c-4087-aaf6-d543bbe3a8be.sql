-- Ajouter la colonne capture_mode pour distinguer les types de capture
ALTER TABLE public.visit_sequences 
ADD COLUMN IF NOT EXISTS capture_mode text DEFAULT 'step_by_step';

-- Mettre à jour les séquences existantes qui ont une vidéo comme "freeform" si elles ont été créées récemment
-- (Pas de mise à jour automatique pour les anciennes car on ne peut pas les distinguer)