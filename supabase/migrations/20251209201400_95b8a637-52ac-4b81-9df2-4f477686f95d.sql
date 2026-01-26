
-- Table for storing European compliance audit results
CREATE TABLE public.edl_compliance_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  country TEXT NOT NULL DEFAULT 'FR',
  region TEXT,
  compliance_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'compliant', 'partial', 'non_compliant')),
  issues JSONB DEFAULT '[]'::jsonb,
  corrections JSONB DEFAULT '[]'::jsonb,
  applied_norms JSONB DEFAULT '[]'::jsonb,
  forbidden_terms_detected JSONB DEFAULT '[]'::jsonb,
  missing_requirements JSONB DEFAULT '[]'::jsonb,
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  audited_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for European certificates
CREATE TABLE public.edl_certificates_eu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  compliance_result_id UUID REFERENCES public.edl_compliance_results(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  region TEXT,
  certificate_number TEXT NOT NULL,
  pdf_url TEXT,
  hash TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_email TEXT,
  jurisdiction TEXT,
  norms_applied JSONB DEFAULT '[]'::jsonb,
  compliance_score NUMERIC NOT NULL,
  requirements_met JSONB DEFAULT '[]'::jsonb,
  requirements_corrected JSONB DEFAULT '[]'::jsonb,
  signature_data JSONB,
  is_valid BOOLEAN DEFAULT true,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for EDL translations
CREATE TABLE public.edl_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  source_language TEXT NOT NULL DEFAULT 'fr',
  target_language TEXT NOT NULL,
  translation_type TEXT NOT NULL CHECK (translation_type IN ('full', 'summary', 'tasks', 'anomalies', 'descriptions')),
  original_content JSONB NOT NULL,
  translated_content JSONB NOT NULL,
  pdf_url TEXT,
  quality_score NUMERIC,
  is_certified BOOLEAN DEFAULT false,
  translated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  translator_model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for European country norms configuration
CREATE TABLE public.eu_country_norms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  country_name_local TEXT,
  flag_emoji TEXT,
  default_language TEXT NOT NULL,
  supported_languages JSONB DEFAULT '[]'::jsonb,
  legal_references JSONB DEFAULT '[]'::jsonb,
  required_sections JSONB DEFAULT '[]'::jsonb,
  forbidden_terms JSONB DEFAULT '[]'::jsonb,
  required_photos JSONB DEFAULT '[]'::jsonb,
  document_format JSONB DEFAULT '{}'::jsonb,
  regional_variations JSONB DEFAULT '[]'::jsonb,
  signature_requirements JSONB DEFAULT '{}'::jsonb,
  registration_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edl_compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_certificates_eu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edl_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eu_country_norms ENABLE ROW LEVEL SECURITY;

-- RLS policies for edl_compliance_results
CREATE POLICY "Users can manage their compliance results"
ON public.edl_compliance_results FOR ALL
USING (user_id = auth.uid());

-- RLS policies for edl_certificates_eu
CREATE POLICY "Users can manage their certificates"
ON public.edl_certificates_eu FOR ALL
USING (user_id = auth.uid());

-- RLS policies for edl_translations
CREATE POLICY "Users can manage their translations"
ON public.edl_translations FOR ALL
USING (user_id = auth.uid());

-- RLS policies for eu_country_norms (public read)
CREATE POLICY "Anyone can view country norms"
ON public.eu_country_norms FOR SELECT
USING (true);

CREATE POLICY "Admins can manage country norms"
ON public.eu_country_norms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_compliance_edl ON public.edl_compliance_results(edl_id);
CREATE INDEX idx_compliance_project ON public.edl_compliance_results(project_id);
CREATE INDEX idx_compliance_country ON public.edl_compliance_results(country);
CREATE INDEX idx_certificates_edl ON public.edl_certificates_eu(edl_id);
CREATE INDEX idx_translations_edl ON public.edl_translations(edl_id);
CREATE INDEX idx_translations_language ON public.edl_translations(target_language);

-- Insert default European country norms
INSERT INTO public.eu_country_norms (country_code, country_name, country_name_local, flag_emoji, default_language, supported_languages, legal_references, required_sections, forbidden_terms, required_photos, registration_required) VALUES
('FR', 'France', 'France', '🇫🇷', 'fr', '["fr", "en"]', 
  '[{"code": "CC1730", "name": "Code civil art. 1730-1731"}, {"code": "ALUR", "name": "Loi ALUR"}, {"code": "DEC2016", "name": "Décret 2016"}]',
  '[{"id": "general_info", "required": true}, {"id": "rooms", "required": true}, {"id": "equipment", "required": true}, {"id": "meters", "required": true}, {"id": "keys", "required": true}]',
  '[{"term": "responsabilité", "severity": "high"}, {"term": "faute", "severity": "high"}, {"term": "préjudice", "severity": "high"}, {"term": "intention", "severity": "medium"}]',
  '[{"type": "meters", "required": true}, {"type": "keys", "required": true}, {"type": "equipment", "required": true}]',
  false),

('BE', 'Belgium', 'Belgique / België', '🇧🇪', 'fr', '["fr", "nl", "en", "de"]',
  '[{"code": "BELAW", "name": "Réglement bail belge"}, {"code": "BEREG", "name": "Enregistrement obligatoire"}]',
  '[{"id": "registration_number", "required": true}, {"id": "general_info", "required": true}, {"id": "rooms", "required": true}]',
  '[{"term": "responsabilité", "severity": "high"}, {"term": "faute", "severity": "high"}]',
  '[{"type": "meters", "required": true}, {"type": "facade", "required": true}]',
  true),

('LU', 'Luxembourg', 'Luxembourg', '🇱🇺', 'fr', '["fr", "de", "en", "lb"]',
  '[{"code": "LUBAIL", "name": "Règlement bail habitation"}]',
  '[{"id": "detailed_visual", "required": true}, {"id": "general_info", "required": true}]',
  '[{"term": "responsabilité", "severity": "high"}]',
  '[{"type": "all_rooms", "required": true}]',
  false),

('CH', 'Switzerland', 'Suisse / Schweiz', '🇨🇭', 'fr', '["fr", "de", "it", "en"]',
  '[{"code": "CHPPE", "name": "Normes PPE"}, {"code": "CHBAIL", "name": "Code des obligations"}]',
  '[{"id": "smoke_detectors", "required": true}, {"id": "technical_installations", "required": true}]',
  '[{"term": "responsabilité", "severity": "high"}]',
  '[{"type": "technical_installations", "required": true}, {"type": "smoke_detectors", "required": true}]',
  false),

('ES', 'Spain', 'España', '🇪🇸', 'es', '["es", "ca", "en"]',
  '[{"code": "ESINV", "name": "Inventario estado vivienda"}]',
  '[{"id": "inventory", "required": true}, {"id": "general_info", "required": true}]',
  '[{"term": "culpa", "severity": "high"}]',
  '[{"type": "inventory_items", "required": true}]',
  false),

('PT', 'Portugal', 'Portugal', '🇵🇹', 'pt', '["pt", "en"]',
  '[{"code": "PTREL", "name": "Relatório de estado"}]',
  '[{"id": "contract_annex", "required": true}, {"id": "general_info", "required": true}]',
  '[{"term": "responsabilidade", "severity": "high"}]',
  '[{"type": "general", "required": true}]',
  false),

('IT', 'Italy', 'Italia', '🇮🇹', 'it', '["it", "en"]',
  '[{"code": "ITVER", "name": "Verbale di Consegna"}, {"code": "ITCOND", "name": "Normativa condominiale"}]',
  '[{"id": "keys_inventory", "required": true}, {"id": "general_info", "required": true}]',
  '[{"term": "responsabilità", "severity": "high"}]',
  '[{"type": "keys", "required": true}]',
  false),

('DE', 'Germany', 'Deutschland', '🇩🇪', 'de', '["de", "en"]',
  '[{"code": "DEUPRO", "name": "Übergabeprotokoll"}]',
  '[{"id": "electrical_check", "required": true}, {"id": "plumbing_check", "required": true}, {"id": "general_info", "required": true}]',
  '[{"term": "Schuld", "severity": "high"}, {"term": "Haftung", "severity": "medium"}]',
  '[{"type": "electrical", "required": true}, {"type": "plumbing", "required": true}]',
  false),

('NL', 'Netherlands', 'Nederland', '🇳🇱', 'nl', '["nl", "en"]',
  '[{"code": "NLHUUR", "name": "Huurrecht"}]',
  '[{"id": "general_info", "required": true}, {"id": "inventory", "required": true}]',
  '[{"term": "aansprakelijkheid", "severity": "high"}]',
  '[{"type": "general", "required": true}]',
  false);

-- Trigger for updated_at
CREATE TRIGGER update_edl_compliance_results_updated_at
BEFORE UPDATE ON public.edl_compliance_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eu_country_norms_updated_at
BEFORE UPDATE ON public.eu_country_norms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
