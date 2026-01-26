
-- Predictive EDL Engine Tables

-- 1. Predictive History (Timeline of property changes)
CREATE TABLE public.predictive_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.visit_sessions(id) ON DELETE SET NULL,
  
  -- Timeline data
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL, -- 'edl_entry', 'edl_exit', 'audit', 'inspection', 'maintenance'
  
  -- State snapshot
  overall_condition_score NUMERIC DEFAULT 0,
  element_states JSONB DEFAULT '[]'::jsonb, -- [{element, state, score, photos}]
  anomalies_detected JSONB DEFAULT '[]'::jsonb,
  tasks_generated JSONB DEFAULT '[]'::jsonb,
  
  -- Comparison with previous
  changes_from_previous JSONB DEFAULT '{}'::jsonb,
  degradation_rate NUMERIC DEFAULT 0, -- % degradation since last event
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Predictive Forecast (Future projections)
CREATE TABLE public.predictive_forecast (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Forecast periods
  forecast_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_6months JSONB DEFAULT '{}'::jsonb,
  next_12months JSONB DEFAULT '{}'::jsonb,
  next_24months JSONB DEFAULT '{}'::jsonb,
  next_5years JSONB DEFAULT '{}'::jsonb,
  
  -- Element-level forecasts
  element_forecasts JSONB DEFAULT '[]'::jsonb, -- [{element, current_score, projected_scores, risk_level}]
  
  -- Overall projections
  projected_condition_score NUMERIC DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0,
  
  -- AI analysis
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Predictive Risks (Risk detection and tracking)
CREATE TABLE public.predictive_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Risk identification
  risk_category TEXT NOT NULL, -- 'structural', 'humidity', 'electrical', 'plumbing', 'ventilation', 'thermal'
  risk_type TEXT NOT NULL, -- 'fissure', 'infiltration', 'short_circuit', 'leak', 'mold', etc.
  
  -- Risk assessment
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  probability NUMERIC DEFAULT 0, -- 0-100%
  impact_score NUMERIC DEFAULT 0, -- 0-100
  risk_score NUMERIC DEFAULT 0, -- Combined score
  
  -- Detection
  detected_indicators JSONB DEFAULT '[]'::jsonb, -- What triggered this risk
  affected_elements JSONB DEFAULT '[]'::jsonb, -- Which elements are at risk
  affected_zones JSONB DEFAULT '[]'::jsonb, -- Which zones
  
  -- Projection
  estimated_occurrence TEXT, -- '3-6 months', '6-12 months', '1-2 years'
  estimated_cost_if_ignored NUMERIC DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'monitored', 'mitigated', 'resolved'
  mitigation_actions JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Predictive Maintenance Plans
CREATE TABLE public.predictive_maintenance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Plan details
  plan_name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'preventive', -- 'preventive', 'corrective', 'predictive'
  
  -- Elements covered
  elements JSONB DEFAULT '[]'::jsonb, -- [{element, current_state, recommended_actions}]
  
  -- Schedule
  maintenance_schedule JSONB DEFAULT '[]'::jsonb, -- [{action, interval, next_date, estimated_cost}]
  
  -- Summary
  total_estimated_cost NUMERIC DEFAULT 0,
  priority_actions JSONB DEFAULT '[]'::jsonb,
  timeline_months INTEGER DEFAULT 12,
  
  -- AI recommendations
  ai_optimizations JSONB DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Wear Scoring (Element-level wear tracking)
CREATE TABLE public.predictive_wear_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Element identification
  element_type TEXT NOT NULL, -- 'sol', 'mur', 'plafond', 'menuiserie', 'sanitaire', etc.
  element_name TEXT,
  location_id UUID,
  zone_id UUID,
  
  -- Wear assessment
  current_score NUMERIC DEFAULT 100, -- 0-100 (100 = new)
  initial_score NUMERIC DEFAULT 100,
  wear_rate NUMERIC DEFAULT 0, -- % per year
  
  -- Material info
  material_type TEXT,
  installation_date DATE,
  expected_lifespan_years INTEGER,
  
  -- Projections
  projected_score_1year NUMERIC,
  projected_score_2years NUMERIC,
  projected_score_5years NUMERIC,
  
  -- Status
  status TEXT DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor', 'critical'
  needs_attention BOOLEAN DEFAULT false,
  
  last_assessment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.predictive_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_wear_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their predictive history"
ON public.predictive_history FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their predictive forecasts"
ON public.predictive_forecast FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their predictive risks"
ON public.predictive_risks FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their maintenance plans"
ON public.predictive_maintenance_plans FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their wear scores"
ON public.predictive_wear_scores FOR ALL
USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_predictive_history_project ON public.predictive_history(project_id);
CREATE INDEX idx_predictive_history_date ON public.predictive_history(event_date DESC);
CREATE INDEX idx_predictive_forecast_project ON public.predictive_forecast(project_id);
CREATE INDEX idx_predictive_risks_project ON public.predictive_risks(project_id);
CREATE INDEX idx_predictive_risks_severity ON public.predictive_risks(severity);
CREATE INDEX idx_predictive_maintenance_project ON public.predictive_maintenance_plans(project_id);
CREATE INDEX idx_predictive_wear_project ON public.predictive_wear_scores(project_id);
CREATE INDEX idx_predictive_wear_element ON public.predictive_wear_scores(element_type);
