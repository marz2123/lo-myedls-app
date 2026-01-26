-- Create edl_templates table
CREATE TABLE public.edl_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_type TEXT NOT NULL DEFAULT 'user' CHECK (owner_type IN ('user', 'company', 'myhome')),
  owner_id UUID,
  company TEXT,
  template_type TEXT NOT NULL DEFAULT 'standard' CHECK (template_type IN ('standard', 'entree', 'sortie', 'technique', 'audit', 'commercial')),
  property_type TEXT CHECK (property_type IN ('studio', 't1', 't2', 't3', 't4', 't5', 'maison', 'immeuble', 'commerce', 'local_pro')),
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  rooms_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  elements_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ft_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  norms_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklists JSONB NOT NULL DEFAULT '[]'::jsonb,
  preloaded_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_photos_required INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create edl_template_rules table
CREATE TABLE public.edl_template_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.edl_templates(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('description', 'anomaly_detection', 'task_generation', 'completeness', 'photo_required', 'conditional')),
  rule_name TEXT NOT NULL,
  rule_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create edl_template_usage table
CREATE TABLE public.edl_template_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.edl_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  edl_id UUID,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auto_applied BOOLEAN DEFAULT false,
  ai_confidence NUMERIC,
  feedback TEXT CHECK (feedback IN ('positive', 'negative', 'neutral'))
);

-- Enable RLS
ALTER TABLE public.edl_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_template_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_template_usage ENABLE ROW LEVEL SECURITY;

-- Policies for edl_templates
CREATE POLICY "Users can view public templates or their own" ON public.edl_templates
  FOR SELECT USING (is_public = true OR owner_id = auth.uid() OR owner_type = 'myhome');

CREATE POLICY "Users can create their own templates" ON public.edl_templates
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND owner_type = 'user');

CREATE POLICY "Users can update their own templates" ON public.edl_templates
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own templates" ON public.edl_templates
  FOR DELETE USING (owner_id = auth.uid());

-- Policies for edl_template_rules
CREATE POLICY "Users can view rules for accessible templates" ON public.edl_template_rules
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.edl_templates t 
    WHERE t.id = template_id AND (t.is_public = true OR t.owner_id = auth.uid() OR t.owner_type = 'myhome')
  ));

CREATE POLICY "Users can manage rules for their templates" ON public.edl_template_rules
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.edl_templates t 
    WHERE t.id = template_id AND t.owner_id = auth.uid()
  ));

-- Policies for edl_template_usage
CREATE POLICY "Users can view their own usage" ON public.edl_template_usage
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create usage records" ON public.edl_template_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own usage" ON public.edl_template_usage
  FOR UPDATE USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_edl_templates_owner ON public.edl_templates(owner_id);
CREATE INDEX idx_edl_templates_type ON public.edl_templates(template_type, property_type);
CREATE INDEX idx_edl_templates_public ON public.edl_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_edl_template_rules_template ON public.edl_template_rules(template_id);
CREATE INDEX idx_edl_template_usage_template ON public.edl_template_usage(template_id);
CREATE INDEX idx_edl_template_usage_user ON public.edl_template_usage(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_edl_templates_updated_at
  BEFORE UPDATE ON public.edl_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default MyHome templates
INSERT INTO public.edl_templates (name, description, owner_type, company, template_type, property_type, is_public, is_featured, rooms_config, elements_config, ai_rules, min_photos_required) VALUES
('Studio Standard', 'Template pour studio avec pièce principale, cuisine et salle de bain', 'myhome', 'MyHome', 'standard', 'studio', true, true, 
  '[{"name": "Entrée", "type": "entree"}, {"name": "Pièce principale", "type": "sejour"}, {"name": "Coin cuisine", "type": "cuisine"}, {"name": "Salle de bain", "type": "sdb"}]'::jsonb,
  '{"entree": ["murs", "sol", "plafond", "porte", "interphone"], "sejour": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage"], "cuisine": ["murs", "sol", "plafond", "evier", "plaques", "hotte", "prises"], "sdb": ["murs", "sol", "plafond", "douche", "lavabo", "wc", "vmc"]}'::jsonb,
  '{"min_description_length": 20, "detect_humidity": true, "detect_cracks": true, "auto_classify_tasks": true}'::jsonb, 15),

('Appartement T2', 'Template T2 standard avec séjour, chambre, cuisine et salle de bain', 'myhome', 'MyHome', 'standard', 't2', true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Chambre", "type": "chambre"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC", "type": "wc"}]'::jsonb,
  '{"entree": ["murs", "sol", "plafond", "porte", "interphone", "placard"], "sejour": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage"], "chambre": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "placard"], "cuisine": ["murs", "sol", "plafond", "evier", "plaques", "four", "hotte", "prises", "placards"], "sdb": ["murs", "sol", "plafond", "baignoire", "lavabo", "robinetterie", "vmc"], "wc": ["murs", "sol", "plafond", "cuvette", "abattant"]}'::jsonb,
  '{"min_description_length": 25, "detect_humidity": true, "detect_cracks": true, "auto_classify_tasks": true}'::jsonb, 25),

('Appartement T3', 'Template T3 avec séjour, 2 chambres, cuisine et salle de bain', 'myhome', 'MyHome', 'standard', 't3', true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Chambre 1", "type": "chambre"}, {"name": "Chambre 2", "type": "chambre"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC", "type": "wc"}]'::jsonb,
  '{"entree": ["murs", "sol", "plafond", "porte", "interphone", "placard"], "sejour": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "balcon"], "chambre": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "placard"], "cuisine": ["murs", "sol", "plafond", "evier", "plaques", "four", "hotte", "prises", "placards"], "sdb": ["murs", "sol", "plafond", "baignoire", "lavabo", "robinetterie", "vmc", "seche_serviettes"], "wc": ["murs", "sol", "plafond", "cuvette", "abattant"]}'::jsonb,
  '{"min_description_length": 25, "detect_humidity": true, "detect_cracks": true, "auto_classify_tasks": true}'::jsonb, 35),

('Appartement T4', 'Template T4 avec séjour, 3 chambres, cuisine et 2 salles de bain', 'myhome', 'MyHome', 'standard', 't4', true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Chambre 1", "type": "chambre"}, {"name": "Chambre 2", "type": "chambre"}, {"name": "Chambre 3", "type": "chambre"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Salle de bain 1", "type": "sdb"}, {"name": "Salle de bain 2", "type": "sdb"}, {"name": "WC", "type": "wc"}]'::jsonb,
  '{"entree": ["murs", "sol", "plafond", "porte", "interphone", "placard"], "sejour": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "balcon"], "chambre": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "placard"], "cuisine": ["murs", "sol", "plafond", "evier", "plaques", "four", "hotte", "prises", "placards", "lave_vaisselle"], "sdb": ["murs", "sol", "plafond", "baignoire", "douche", "lavabo", "robinetterie", "vmc", "seche_serviettes"], "wc": ["murs", "sol", "plafond", "cuvette", "abattant"]}'::jsonb,
  '{"min_description_length": 25, "detect_humidity": true, "detect_cracks": true, "auto_classify_tasks": true}'::jsonb, 50),

('Maison Individuelle', 'Template complet pour maison avec jardin et garage', 'myhome', 'MyHome', 'standard', 'maison', true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Salle à manger", "type": "sam"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Chambre 1", "type": "chambre"}, {"name": "Chambre 2", "type": "chambre"}, {"name": "Chambre 3", "type": "chambre"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC RDC", "type": "wc"}, {"name": "WC Étage", "type": "wc"}, {"name": "Garage", "type": "garage"}, {"name": "Jardin", "type": "exterieur"}, {"name": "Terrasse", "type": "terrasse"}]'::jsonb,
  '{"entree": ["murs", "sol", "plafond", "porte", "escalier"], "sejour": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "cheminee"], "cuisine": ["murs", "sol", "plafond", "evier", "plaques", "four", "hotte", "prises", "placards"], "chambre": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "placard"], "sdb": ["murs", "sol", "plafond", "baignoire", "douche", "lavabo", "vmc"], "wc": ["murs", "sol", "plafond", "cuvette"], "garage": ["murs", "sol", "plafond", "porte_garage", "prises"], "exterieur": ["clotures", "portail", "allee", "pelouse", "arbres"], "terrasse": ["sol", "garde_corps"]}'::jsonb,
  '{"min_description_length": 30, "detect_humidity": true, "detect_cracks": true, "detect_exterior_damage": true, "auto_classify_tasks": true}'::jsonb, 60),

('EDL Entrée Standard', 'Template optimisé pour état des lieux d''entrée', 'myhome', 'MyHome', 'entree', null, true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Chambre", "type": "chambre"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC", "type": "wc"}]'::jsonb,
  '{"all": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "menuiseries"]}'::jsonb,
  '{"strict_description": true, "photo_each_element": true, "detect_preexisting_damage": true}'::jsonb, 30),

('EDL Sortie Standard', 'Template optimisé pour état des lieux de sortie avec comparaison', 'myhome', 'MyHome', 'sortie', null, true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Chambre", "type": "chambre"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC", "type": "wc"}]'::jsonb,
  '{"all": ["murs", "sol", "plafond", "fenetres", "prises", "chauffage", "menuiseries"]}'::jsonb,
  '{"compare_with_entry": true, "detect_new_damage": true, "calculate_depreciation": true, "auto_generate_retention": true}'::jsonb, 30),

('Audit Technique', 'Template pour audit technique complet', 'myhome', 'MyHome', 'technique', null, true, false,
  '[{"name": "Toiture", "type": "toiture"}, {"name": "Façades", "type": "facade"}, {"name": "Parties communes", "type": "parties_communes"}, {"name": "Réseaux", "type": "reseaux"}, {"name": "Chaufferie", "type": "chaufferie"}]'::jsonb,
  '{"toiture": ["couverture", "charpente", "zinguerie", "isolation"], "facade": ["enduit", "joints", "fenetres", "volets"], "parties_communes": ["escalier", "ascenseur", "halls", "caves"], "reseaux": ["electricite", "plomberie", "gaz", "vmc"], "chaufferie": ["chaudiere", "tuyauterie", "compteurs"]}'::jsonb,
  '{"technical_vocabulary": true, "norms_compliance": true, "priority_classification": true}'::jsonb, 50),

('Local Commercial', 'Template pour locaux commerciaux et professionnels', 'myhome', 'MyHome', 'commercial', 'commerce', true, false,
  '[{"name": "Vitrine", "type": "vitrine"}, {"name": "Espace de vente", "type": "vente"}, {"name": "Réserve", "type": "reserve"}, {"name": "Bureau", "type": "bureau"}, {"name": "Sanitaires", "type": "sanitaires"}, {"name": "Local technique", "type": "technique"}]'::jsonb,
  '{"vitrine": ["vitrines", "enseigne", "store", "porte_entree"], "vente": ["murs", "sol", "plafond", "eclairage", "prises", "climatisation"], "reserve": ["murs", "sol", "plafond", "rayonnages"], "bureau": ["murs", "sol", "plafond", "prises", "reseau"], "sanitaires": ["murs", "sol", "plafond", "wc", "lavabo", "vmc"], "technique": ["tableau_electrique", "compteurs", "vmc"]}'::jsonb,
  '{"erp_compliance": true, "accessibility_check": true, "safety_equipment": true}'::jsonb, 40);

-- Insert Archi Home template
INSERT INTO public.edl_templates (name, description, owner_type, company, template_type, property_type, is_public, is_featured, rooms_config, elements_config, ai_rules, min_photos_required) VALUES
('Modèle Archi Home 2025', 'Template officiel Archi Home avec normes architecturales', 'company', 'Archi Home', 'standard', null, true, true,
  '[{"name": "Entrée", "type": "entree"}, {"name": "Séjour", "type": "sejour"}, {"name": "Cuisine", "type": "cuisine"}, {"name": "Chambres", "type": "chambre"}, {"name": "Salle de bain", "type": "sdb"}, {"name": "WC", "type": "wc"}, {"name": "Extérieurs", "type": "exterieur"}]'::jsonb,
  '{"all": ["murs", "sol", "plafond", "menuiseries", "electricite", "plomberie", "chauffage", "ventilation"]}'::jsonb,
  '{"architectural_standards": true, "material_quality_check": true, "design_coherence": true, "renovation_potential": true}'::jsonb, 40),

('Modèle Bati Home 2025', 'Template officiel Bati Home orienté chantier', 'company', 'Bati Home', 'technique', null, true, true,
  '[{"name": "Gros œuvre", "type": "gros_oeuvre"}, {"name": "Second œuvre", "type": "second_oeuvre"}, {"name": "Finitions", "type": "finitions"}, {"name": "Réseaux", "type": "reseaux"}, {"name": "Extérieurs", "type": "exterieur"}]'::jsonb,
  '{"gros_oeuvre": ["fondations", "murs_porteurs", "dalles", "charpente", "toiture"], "second_oeuvre": ["cloisons", "isolation", "menuiseries", "plomberie", "electricite"], "finitions": ["peinture", "revetements", "faience", "parquet"], "reseaux": ["eau", "electricite", "gaz", "vmc", "chauffage"]}'::jsonb,
  '{"construction_norms": true, "dtu_compliance": true, "workmanship_quality": true, "safety_check": true}'::jsonb, 60);