-- Create library_categories table
CREATE TABLE public.library_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  parent_id UUID REFERENCES public.library_categories(id),
  order_index INTEGER DEFAULT 0,
  company_access TEXT[] DEFAULT ARRAY['all']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library_documents table
CREATE TABLE public.library_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.library_categories(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT,
  content_md TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  company_access TEXT[] DEFAULT ARRAY['all']::TEXT[],
  ft_family_code TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_template BOOLEAN DEFAULT false,
  is_norm BOOLEAN DEFAULT false,
  norm_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library_favorites table
CREATE TABLE public.library_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.library_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Create library_metadata table for AI knowledge base
CREATE TABLE public.library_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.library_documents(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  embedding_vector TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_categories (public read)
CREATE POLICY "Public read access for library categories"
ON public.library_categories FOR SELECT
USING (true);

CREATE POLICY "Admin can manage library categories"
ON public.library_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for library_documents (public read with company filter)
CREATE POLICY "Public read access for library documents"
ON public.library_documents FOR SELECT
USING (true);

CREATE POLICY "Admin can manage library documents"
ON public.library_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for library_favorites
CREATE POLICY "Users can view their own favorites"
ON public.library_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
ON public.library_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.library_favorites FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for library_metadata
CREATE POLICY "Public read access for library metadata"
ON public.library_metadata FOR SELECT
USING (true);

CREATE POLICY "Admin can manage library metadata"
ON public.library_metadata FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_library_documents_category ON public.library_documents(category_id);
CREATE INDEX idx_library_documents_ft_family ON public.library_documents(ft_family_code);
CREATE INDEX idx_library_documents_tags ON public.library_documents USING GIN(tags);
CREATE INDEX idx_library_favorites_user ON public.library_favorites(user_id);
CREATE INDEX idx_library_metadata_document ON public.library_metadata(document_id);
CREATE INDEX idx_library_metadata_key ON public.library_metadata(key);

-- Triggers for updated_at
CREATE TRIGGER update_library_categories_updated_at
  BEFORE UPDATE ON public.library_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_library_documents_updated_at
  BEFORE UPDATE ON public.library_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.library_categories (name, slug, icon, description, order_index) VALUES
('EDL — Modèles & Guides', 'edl-modeles', 'FileText', 'Modèles de rapport EDL, fiches de rédaction, normes et bonnes pratiques', 1),
('Normes & DTU', 'normes-dtu', 'BookOpen', 'DTU, normes RE2020, réglementation VMC, incendie et accessibilité', 2),
('Familles de Tâches (FT)', 'familles-taches', 'Layers', 'Catégories, sous-catégories, process et matériel par famille', 3),
('Guides Chantier', 'guides-chantier', 'HardHat', 'Guides de pose, isolation, carrelage, plomberie, électricité', 4),
('Matériaux & Produits', 'materiaux-produits', 'Package', 'Fiches produits, marques recommandées, prix moyens', 5),
('Plans & Modèles', 'plans-modeles', 'Map', 'Plans d''aménagement type, fichiers DWG/PDF', 6),
('Vidéos Tutorielles', 'videos-tutorielles', 'Video', 'Tutoriels vidéo et formations', 7),
('Documents Entreprise', 'documents-entreprise', 'Building', 'Logo, CGV, modèles légaux, présentations', 8);

-- Insert sample documents
INSERT INTO public.library_documents (title, description, category_id, document_type, content_md, tags, is_template, is_norm) VALUES
('Modèle EDL Entrée Standard', 'Modèle complet pour état des lieux d''entrée', (SELECT id FROM public.library_categories WHERE slug = 'edl-modeles'), 'md', '# État des Lieux d''Entrée\n\n## Informations Générales\n- Date:\n- Adresse:\n- Type de bien:\n\n## Pièces\n\n### Entrée\n- Murs:\n- Sol:\n- Plafond:\n- Équipements:\n\n### Séjour\n...', ARRAY['edl', 'entrée', 'modèle'], true, false),
('DTU 25.41 - Placo', 'Norme DTU pour ouvrages en plaques de plâtre', (SELECT id FROM public.library_categories WHERE slug = 'normes-dtu'), 'pdf', '# DTU 25.41\n\n## Ouvrages en plaques de plâtre\n\n### Domaine d''application\nCe DTU s''applique aux ouvrages de doublage, cloisons et plafonds en plaques de plâtre.\n\n### Épaisseurs minimales\n- Cloisons: BA13 minimum\n- Doublage: selon isolation requise\n\n### Fixations\n- Entraxe des montants: 60 cm max\n- Vis: tous les 30 cm', ARRAY['dtu', 'placo', 'norme', 'cloison'], false, true),
('Guide Pose Carrelage', 'Guide complet pour la pose de carrelage', (SELECT id FROM public.library_categories WHERE slug = 'guides-chantier'), 'md', '# Guide de Pose Carrelage\n\n## Préparation du support\n1. Vérifier la planéité\n2. Nettoyer le support\n3. Appliquer le primaire si nécessaire\n\n## Pose\n1. Tracer les axes\n2. Préparer la colle\n3. Encollage simple ou double\n\n## Joints\n- Attendre 24h minimum\n- Utiliser un joint adapté', ARRAY['carrelage', 'pose', 'guide', 'sol'], false, false),
('Fiche Produit BA13', 'Caractéristiques techniques plaque BA13', (SELECT id FROM public.library_categories WHERE slug = 'materiaux-produits'), 'md', '# Plaque BA13\n\n## Caractéristiques\n- Épaisseur: 12,5 mm\n- Largeur: 120 cm\n- Longueur: 250 cm\n- Poids: ~9 kg/m²\n\n## Utilisations\n- Cloisons\n- Doublages\n- Plafonds\n\n## Marques\n- Placo\n- Knauf\n- Siniat', ARRAY['ba13', 'placo', 'matériau', 'cloison'], false, false);

-- Create storage bucket for library files
INSERT INTO storage.buckets (id, name, public) VALUES ('library', 'library', true) ON CONFLICT DO NOTHING;