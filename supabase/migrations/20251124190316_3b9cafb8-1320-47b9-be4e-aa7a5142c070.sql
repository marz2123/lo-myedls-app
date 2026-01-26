-- Create table to store manual classification corrections for learning
CREATE TABLE IF NOT EXISTS public.dsc_learning_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Task information
  task_id UUID REFERENCES public.extracted_tasks(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  
  -- Original AI classification
  original_family_id UUID REFERENCES public.task_families(id),
  original_category_id UUID REFERENCES public.task_categories(id),
  original_subcategory_id UUID REFERENCES public.task_subcategories(id),
  
  -- Corrected classification
  corrected_family_id UUID NOT NULL REFERENCES public.task_families(id),
  corrected_category_id UUID NOT NULL REFERENCES public.task_categories(id),
  corrected_subcategory_id UUID NOT NULL REFERENCES public.task_subcategories(id),
  
  -- Learning metadata
  correction_type TEXT NOT NULL CHECK (correction_type IN ('manual', 'validated')),
  corrected_by UUID NOT NULL,
  keywords_extracted JSONB, -- Extracted keywords from task that led to this classification
  confidence_score NUMERIC DEFAULT 0, -- How many times this pattern was validated
  
  -- Indexes for fast lookup
  CONSTRAINT unique_task_correction UNIQUE (task_id)
);

-- Enable RLS
ALTER TABLE public.dsc_learning_corrections ENABLE ROW LEVEL SECURITY;

-- Admins can view all corrections
CREATE POLICY "Admins can view all corrections"
  ON public.dsc_learning_corrections
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert corrections
CREATE POLICY "Admins can insert corrections"
  ON public.dsc_learning_corrections
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update corrections
CREATE POLICY "Admins can update corrections"
  ON public.dsc_learning_corrections
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_learning_corrections_family ON public.dsc_learning_corrections(corrected_family_id);
CREATE INDEX idx_learning_corrections_category ON public.dsc_learning_corrections(corrected_category_id);
CREATE INDEX idx_learning_corrections_subcategory ON public.dsc_learning_corrections(corrected_subcategory_id);
CREATE INDEX idx_learning_corrections_keywords ON public.dsc_learning_corrections USING GIN(keywords_extracted);

-- Create view to analyze learning patterns
CREATE OR REPLACE VIEW public.dsc_learning_patterns AS
SELECT 
  f.code as family_code,
  f.name as family_name,
  c.code as category_code,
  c.name as category_name,
  sc.code as subcategory_code,
  sc.name as subcategory_name,
  lc.keywords_extracted,
  COUNT(*) as correction_count,
  AVG(lc.confidence_score) as avg_confidence
FROM public.dsc_learning_corrections lc
JOIN public.task_families f ON lc.corrected_family_id = f.id
JOIN public.task_categories c ON lc.corrected_category_id = c.id
JOIN public.task_subcategories sc ON lc.corrected_subcategory_id = sc.id
GROUP BY f.code, f.name, c.code, c.name, sc.code, sc.name, lc.keywords_extracted
HAVING COUNT(*) >= 2  -- Only show patterns that appeared at least twice
ORDER BY correction_count DESC, avg_confidence DESC;