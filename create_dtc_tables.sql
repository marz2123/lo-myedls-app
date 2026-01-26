-- =============================================
-- Création des tables DTC (DSC) dans Supabase
-- =============================================
-- À exécuter dans le SQL Editor de Supabase Dashboard

-- Vérifier si la fonction update_updated_at_column existe, sinon la créer
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Table ft_familles (Familles de tâches - FT)
CREATE TABLE IF NOT EXISTS public.ft_familles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ft_code TEXT NOT NULL UNIQUE,
  ft_label TEXT NOT NULL,
  ft_description TEXT,
  commentaire_type_equipe TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Table ct_categories (Catégories - CT)
CREATE TABLE IF NOT EXISTS public.ct_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ct_code TEXT NOT NULL UNIQUE,
  ft_code TEXT NOT NULL REFERENCES public.ft_familles(ft_code) ON DELETE CASCADE,
  ct_label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Table sc_sous_categories (Sous-catégories - SC)
CREATE TABLE IF NOT EXISTS public.sc_sous_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sc_code TEXT NOT NULL UNIQUE,
  ct_code TEXT NOT NULL REFERENCES public.ct_categories(ct_code) ON DELETE CASCADE,
  ft_code TEXT NOT NULL REFERENCES public.ft_familles(ft_code) ON DELETE CASCADE,
  sc_label TEXT NOT NULL,
  zone_type TEXT,
  contexte JSONB DEFAULT '[]'::jsonb,
  corps_metier TEXT,
  phase_chantier TEXT,
  pieces_typiques JSONB DEFAULT '[]'::jsonb,
  keywords_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) Table t_taches (Tâches - T)
CREATE TABLE IF NOT EXISTS public.t_taches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  t_code TEXT NOT NULL UNIQUE,
  sc_code TEXT NOT NULL REFERENCES public.sc_sous_categories(sc_code) ON DELETE CASCADE,
  ct_code TEXT NOT NULL REFERENCES public.ct_categories(ct_code) ON DELETE CASCADE,
  ft_code TEXT NOT NULL REFERENCES public.ft_familles(ft_code) ON DELETE CASCADE,
  t_label TEXT NOT NULL,
  description_detaillee TEXT,
  unite TEXT,
  rendement_h_par_unite NUMERIC,
  commentaire_type_equipe TEXT,
  controle_qualite TEXT,
  normes_references TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ft_familles_ft_code ON public.ft_familles(ft_code);
CREATE INDEX IF NOT EXISTS idx_ct_categories_ct_code ON public.ct_categories(ct_code);
CREATE INDEX IF NOT EXISTS idx_ct_categories_ft_code ON public.ct_categories(ft_code);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_sc_code ON public.sc_sous_categories(sc_code);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_ct_code ON public.sc_sous_categories(ct_code);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_ft_code ON public.sc_sous_categories(ft_code);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_zone_type ON public.sc_sous_categories(zone_type);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_corps_metier ON public.sc_sous_categories(corps_metier);
CREATE INDEX IF NOT EXISTS idx_sc_sous_categories_phase_chantier ON public.sc_sous_categories(phase_chantier);
CREATE INDEX IF NOT EXISTS idx_t_taches_t_code ON public.t_taches(t_code);
CREATE INDEX IF NOT EXISTS idx_t_taches_sc_code ON public.t_taches(sc_code);
CREATE INDEX IF NOT EXISTS idx_t_taches_ct_code ON public.t_taches(ct_code);
CREATE INDEX IF NOT EXISTS idx_t_taches_ft_code ON public.t_taches(ft_code);

-- Index full-text pour recherche sémantique
CREATE INDEX IF NOT EXISTS idx_t_taches_label_gin ON public.t_taches USING gin(to_tsvector('french', t_label));
CREATE INDEX IF NOT EXISTS idx_t_taches_description_gin ON public.t_taches USING gin(to_tsvector('french', COALESCE(description_detaillee, '')));
CREATE INDEX IF NOT EXISTS idx_sc_keywords_gin ON public.sc_sous_categories USING gin(to_tsvector('french', COALESCE(keywords_ia, '')));

-- RLS
ALTER TABLE public.ft_familles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_sous_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t_taches ENABLE ROW LEVEL SECURITY;

-- Policies - lecture publique (données référentielles)
DROP POLICY IF EXISTS "Lecture publique ft_familles" ON public.ft_familles;
CREATE POLICY "Lecture publique ft_familles" ON public.ft_familles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique ct_categories" ON public.ct_categories;
CREATE POLICY "Lecture publique ct_categories" ON public.ct_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique sc_sous_categories" ON public.sc_sous_categories;
CREATE POLICY "Lecture publique sc_sous_categories" ON public.sc_sous_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique t_taches" ON public.t_taches;
CREATE POLICY "Lecture publique t_taches" ON public.t_taches FOR SELECT USING (true);

-- Triggers updated_at
DROP TRIGGER IF EXISTS update_ft_familles_updated_at ON public.ft_familles;
CREATE TRIGGER update_ft_familles_updated_at BEFORE UPDATE ON public.ft_familles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ct_categories_updated_at ON public.ct_categories;
CREATE TRIGGER update_ct_categories_updated_at BEFORE UPDATE ON public.ct_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sc_sous_categories_updated_at ON public.sc_sous_categories;
CREATE TRIGGER update_sc_sous_categories_updated_at BEFORE UPDATE ON public.sc_sous_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_t_taches_updated_at ON public.t_taches;
CREATE TRIGGER update_t_taches_updated_at BEFORE UPDATE ON public.t_taches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vérification : Afficher les tables créées
SELECT 
  'Tables créées avec succès!' as message,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ft_familles') as ft_familles_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ct_categories') as ct_categories_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sc_sous_categories') as sc_sous_categories_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_taches') as t_taches_exists;
