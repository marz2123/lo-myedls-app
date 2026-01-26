-- Migration: Ajout de due_date et assigned_to aux tâches
-- Date: 8 janvier 2026

-- Ajouter la colonne due_date à extracted_tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extracted_tasks' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.extracted_tasks 
    ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    
    COMMENT ON COLUMN public.extracted_tasks.due_date IS 'Date d''échéance de la tâche';
  END IF;
END $$;

-- Ajouter la colonne assigned_to à extracted_tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extracted_tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.extracted_tasks 
    ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.extracted_tasks.assigned_to IS 'Utilisateur assigné à la tâche';
    
    -- Index pour améliorer les performances des requêtes
    CREATE INDEX IF NOT EXISTS idx_extracted_tasks_assigned_to 
    ON public.extracted_tasks(assigned_to);
    
    CREATE INDEX IF NOT EXISTS idx_extracted_tasks_due_date 
    ON public.extracted_tasks(due_date);
  END IF;
END $$;

-- Même chose pour problem_tasks si elle existe
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'problem_tasks') THEN
    -- Ajouter due_date
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'problem_tasks' AND column_name = 'due_date'
    ) THEN
      ALTER TABLE public.problem_tasks 
      ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Ajouter assigned_to
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'problem_tasks' AND column_name = 'assigned_to'
    ) THEN
      ALTER TABLE public.problem_tasks 
      ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
      
      CREATE INDEX IF NOT EXISTS idx_problem_tasks_assigned_to 
      ON public.problem_tasks(assigned_to);
      
      CREATE INDEX IF NOT EXISTS idx_problem_tasks_due_date 
      ON public.problem_tasks(due_date);
    END IF;
  END IF;
END $$;

