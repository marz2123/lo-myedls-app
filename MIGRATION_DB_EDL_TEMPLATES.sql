-- Migration: Table edl_templates pour les templates personnalisés de rapports
-- Date: 8 janvier 2026

-- Créer la table edl_templates
CREATE TABLE IF NOT EXISTS public.edl_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_edl_templates_user_id ON public.edl_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_edl_templates_is_default ON public.edl_templates(is_default);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_edl_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_edl_templates_updated_at_trigger ON public.edl_templates;
CREATE TRIGGER update_edl_templates_updated_at_trigger
  BEFORE UPDATE ON public.edl_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_edl_templates_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.edl_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres templates et les templates par défaut
DROP POLICY IF EXISTS "Users can view their own templates and default templates" ON public.edl_templates;
CREATE POLICY "Users can view their own templates and default templates"
  ON public.edl_templates
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_default = true
  );

-- Policy: Les utilisateurs peuvent créer leurs propres templates
DROP POLICY IF EXISTS "Users can create their own templates" ON public.edl_templates;
CREATE POLICY "Users can create their own templates"
  ON public.edl_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres templates
DROP POLICY IF EXISTS "Users can update their own templates" ON public.edl_templates;
CREATE POLICY "Users can update their own templates"
  ON public.edl_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres templates
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.edl_templates;
CREATE POLICY "Users can delete their own templates"
  ON public.edl_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE public.edl_templates IS 'Templates personnalisés pour les rapports EDL';
COMMENT ON COLUMN public.edl_templates.template_data IS 'Structure JSON du template (cover, buildingDescription, regulatory, etc.)';
COMMENT ON COLUMN public.edl_templates.is_default IS 'Indique si le template est un template par défaut partagé';

