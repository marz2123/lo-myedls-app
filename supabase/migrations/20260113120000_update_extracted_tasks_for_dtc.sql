-- Align extracted_tasks with the DTC taxonomy (FT/CT/SC/T)
-- 1) Drop legacy FK constraints pointing to old DSC tables
ALTER TABLE public.extracted_tasks DROP CONSTRAINT IF EXISTS extracted_tasks_family_id_fkey;
ALTER TABLE public.extracted_tasks DROP CONSTRAINT IF EXISTS extracted_tasks_category_id_fkey;
ALTER TABLE public.extracted_tasks DROP CONSTRAINT IF EXISTS extracted_tasks_subcategory_id_fkey;

-- 2) Add task_id column for T-level linkage (nullable)
ALTER TABLE public.extracted_tasks
  ADD COLUMN IF NOT EXISTS task_id uuid;

-- 3) Keep columns nullable to avoid blocking legacy data; we will re-link to DTC
--    tables in a later migration once all code paths are migrated.
CREATE INDEX IF NOT EXISTS idx_extracted_tasks_task_id ON public.extracted_tasks(task_id);

