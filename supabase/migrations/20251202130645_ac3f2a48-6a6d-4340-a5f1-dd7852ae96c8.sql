-- =============================================
-- DSC (Data Source Chantier) - Structure FT/CT/SC/T
-- =============================================

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
  -- Champs métiers enrichis MyEDLS
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
CREATE POLICY "Lecture publique ft_familles" ON public.ft_familles FOR SELECT USING (true);
CREATE POLICY "Lecture publique ct_categories" ON public.ct_categories FOR SELECT USING (true);
CREATE POLICY "Lecture publique sc_sous_categories" ON public.sc_sous_categories FOR SELECT USING (true);
CREATE POLICY "Lecture publique t_taches" ON public.t_taches FOR SELECT USING (true);

-- Policies - modification admin uniquement
CREATE POLICY "Admin peut modifier ft_familles" ON public.ft_familles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin peut modifier ct_categories" ON public.ct_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin peut modifier sc_sous_categories" ON public.sc_sous_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin peut modifier t_taches" ON public.t_taches FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_ft_familles_updated_at BEFORE UPDATE ON public.ft_familles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ct_categories_updated_at BEFORE UPDATE ON public.ct_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sc_sous_categories_updated_at BEFORE UPDATE ON public.sc_sous_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_t_taches_updated_at BEFORE UPDATE ON public.t_taches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();