-- Create company enum for multi-company architecture
CREATE TYPE public.company_type AS ENUM ('archi_home', 'bati_home', 'deco_home', 'opti_home');

-- Create EDL type enum
CREATE TYPE public.edl_type AS ENUM ('entree', 'sortie', 'technique', 'comparatif');

-- Create EDL status enum
CREATE TYPE public.edl_status AS ENUM ('draft', 'in_progress', 'completed', 'signed');

-- Create sync status enum
CREATE TYPE public.sync_status AS ENUM ('pending', 'syncing', 'synced', 'failed');

-- Create sites table (properties/buildings)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company company_type DEFAULT 'bati_home',
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  building_type TEXT, -- immeuble, maison, appartement, parking, cave, local
  building_identifier TEXT, -- lot number, apartment number, etc.
  surface_m2 NUMERIC,
  rooms_count INTEGER,
  floors_count INTEGER,
  units_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  myhome_project_id TEXT, -- external MyHome project ID
  myhome_sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create edls table (EDL sessions linked to sites)
CREATE TABLE public.edls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  visit_session_id UUID REFERENCES public.visit_sessions(id),
  edl_type edl_type NOT NULL DEFAULT 'entree',
  status edl_status NOT NULL DEFAULT 'draft',
  score INTEGER, -- EDL completion score 0-100
  anomalies_count INTEGER DEFAULT 0,
  tasks_count INTEGER DEFAULT 0,
  photos_count INTEGER DEFAULT 0,
  company company_type,
  assigned_to UUID,
  signed_at TIMESTAMPTZ,
  signed_by JSONB, -- array of signers
  sync_state sync_status DEFAULT 'pending',
  myhome_edl_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sync_logs table
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edl_id UUID REFERENCES public.edls(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- dpgf, planning, tasks, documents, notice
  status sync_status NOT NULL DEFAULT 'pending',
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_access table for multi-user access
CREATE TABLE public.project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- admin, expert_edl, technicien, architecte, bet, asl, locataire, bailleur
  permissions JSONB DEFAULT '{"read": true, "write": false, "sign": false, "export": false}'::jsonb,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sites
CREATE POLICY "Users can view their own sites" ON public.sites
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.project_access WHERE site_id = sites.id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create sites" ON public.sites
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sites" ON public.sites
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sites" ON public.sites
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for edls
CREATE POLICY "Users can view EDLs for accessible sites" ON public.edls
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.project_access WHERE site_id = edls.site_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create EDLs" ON public.edls
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their EDLs" ON public.edls
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their EDLs" ON public.edls
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for sync_logs
CREATE POLICY "Users can view sync logs for their EDLs" ON public.sync_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.edls WHERE edls.id = sync_logs.edl_id AND edls.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.sites WHERE sites.id = sync_logs.site_id AND sites.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sync logs" ON public.sync_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for project_access
CREATE POLICY "Users can view their access" ON public.project_access
  FOR SELECT USING (user_id = auth.uid() OR granted_by = auth.uid());

CREATE POLICY "Site owners can manage access" ON public.project_access
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sites WHERE sites.id = project_access.site_id AND sites.user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_sites_user_id ON public.sites(user_id);
CREATE INDEX idx_sites_project_id ON public.sites(project_id);
CREATE INDEX idx_sites_company ON public.sites(company);
CREATE INDEX idx_edls_site_id ON public.edls(site_id);
CREATE INDEX idx_edls_user_id ON public.edls(user_id);
CREATE INDEX idx_edls_status ON public.edls(status);
CREATE INDEX idx_sync_logs_edl_id ON public.sync_logs(edl_id);
CREATE INDEX idx_project_access_site_id ON public.project_access(site_id);
CREATE INDEX idx_project_access_user_id ON public.project_access(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_edls_updated_at BEFORE UPDATE ON public.edls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();