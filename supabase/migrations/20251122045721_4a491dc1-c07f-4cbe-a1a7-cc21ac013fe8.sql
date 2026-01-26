-- Create taxonomy tables for hierarchical task classification

-- Families (Familles)
CREATE TABLE public.task_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories (Catégories)
CREATE TABLE public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.task_families(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sub-categories (Sous-catégories)
CREATE TABLE public.task_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.task_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extracted tasks with taxonomy classification
CREATE TABLE public.extracted_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  family_id UUID REFERENCES public.task_families(id),
  category_id UUID REFERENCES public.task_categories(id),
  subcategory_id UUID REFERENCES public.task_subcategories(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  work_type TEXT CHECK (work_type IN ('renovation', 'new_build')),
  area TEXT,
  source_type TEXT CHECK (source_type IN ('image', 'video', 'text')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_tasks ENABLE ROW LEVEL SECURITY;

-- Public read policies for taxonomy (everyone can view the classification system)
CREATE POLICY "Taxonomy families are viewable by everyone"
  ON public.task_families FOR SELECT
  USING (true);

CREATE POLICY "Taxonomy categories are viewable by everyone"
  ON public.task_categories FOR SELECT
  USING (true);

CREATE POLICY "Taxonomy subcategories are viewable by everyone"
  ON public.task_subcategories FOR SELECT
  USING (true);

-- Public access for extracted tasks (adjust later for user-specific data)
CREATE POLICY "Extracted tasks are viewable by everyone"
  ON public.extracted_tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert extracted tasks"
  ON public.extracted_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update extracted tasks"
  ON public.extracted_tasks FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete extracted tasks"
  ON public.extracted_tasks FOR DELETE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_categories_family ON public.task_categories(family_id);
CREATE INDEX idx_subcategories_category ON public.task_subcategories(category_id);
CREATE INDEX idx_extracted_tasks_family ON public.extracted_tasks(family_id);
CREATE INDEX idx_extracted_tasks_category ON public.extracted_tasks(category_id);
CREATE INDEX idx_extracted_tasks_subcategory ON public.extracted_tasks(subcategory_id);
CREATE INDEX idx_extracted_tasks_created ON public.extracted_tasks(created_at DESC);