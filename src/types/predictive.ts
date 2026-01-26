// Predictive EDL Engine Types

export interface PredictiveHistoryEvent {
  id: string;
  project_id: string;
  user_id: string;
  edl_id?: string;
  session_id?: string;
  event_date: string;
  event_type: 'edl_entry' | 'edl_exit' | 'audit' | 'inspection' | 'maintenance';
  overall_condition_score: number;
  element_states: ElementState[];
  anomalies_detected: DetectedAnomaly[];
  tasks_generated: GeneratedTask[];
  changes_from_previous: ChangeComparison;
  degradation_rate: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ElementState {
  element: string;
  element_type: string;
  state: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number;
  photos?: string[];
  notes?: string;
}

export interface DetectedAnomaly {
  type: string;
  severity: string;
  location: string;
  description: string;
}

export interface GeneratedTask {
  title: string;
  ft_code?: string;
  ct_code?: string;
  priority: string;
}

export interface ChangeComparison {
  improved_elements: string[];
  degraded_elements: string[];
  new_anomalies: number;
  resolved_anomalies: number;
  score_change: number;
}

export interface PredictiveForecast {
  id: string;
  project_id: string;
  user_id: string;
  forecast_date: string;
  next_6months: ForecastPeriod;
  next_12months: ForecastPeriod;
  next_24months: ForecastPeriod;
  next_5years: ForecastPeriod;
  element_forecasts: ElementForecast[];
  projected_condition_score: number;
  confidence_score: number;
  ai_analysis: AIAnalysis;
  recommendations: Recommendation[];
  created_at: string;
  updated_at: string;
}

export interface ForecastPeriod {
  projected_score: number;
  expected_degradation: number;
  priority_risks: string[];
  estimated_maintenance_cost: number;
  key_actions: string[];
}

export interface ElementForecast {
  element: string;
  element_type: string;
  current_score: number;
  projected_scores: {
    '6m': number;
    '12m': number;
    '24m': number;
    '5y': number;
  };
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  wear_rate: number;
  recommended_action?: string;
}

export interface AIAnalysis {
  summary: string;
  key_findings: string[];
  risk_areas: string[];
  positive_aspects: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_cost: number;
  recommended_timeframe: string;
  impact_if_ignored: string;
}

export interface PredictiveRisk {
  id: string;
  project_id: string;
  user_id: string;
  risk_category: 'structural' | 'humidity' | 'electrical' | 'plumbing' | 'ventilation' | 'thermal';
  risk_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact_score: number;
  risk_score: number;
  detected_indicators: RiskIndicator[];
  affected_elements: string[];
  affected_zones: string[];
  estimated_occurrence: string;
  estimated_cost_if_ignored: number;
  status: 'active' | 'monitored' | 'mitigated' | 'resolved';
  mitigation_actions: MitigationAction[];
  created_at: string;
  updated_at: string;
}

export interface RiskIndicator {
  indicator: string;
  source: string;
  confidence: number;
  detected_at: string;
}

export interface MitigationAction {
  action: string;
  status: 'pending' | 'in_progress' | 'completed';
  cost: number;
  due_date?: string;
}

export interface MaintenancePlan {
  id: string;
  project_id: string;
  user_id: string;
  plan_name: string;
  plan_type: 'preventive' | 'corrective' | 'predictive';
  elements: MaintenanceElement[];
  maintenance_schedule: ScheduledMaintenance[];
  total_estimated_cost: number;
  priority_actions: PriorityAction[];
  timeline_months: number;
  ai_optimizations: AIOptimization[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceElement {
  element: string;
  element_type: string;
  current_state: string;
  recommended_actions: string[];
}

export interface ScheduledMaintenance {
  action: string;
  element: string;
  interval: string; // '3 months', '6 months', '1 year'
  next_date: string;
  estimated_cost: number;
  priority: 'low' | 'medium' | 'high';
}

export interface PriorityAction {
  action: string;
  reason: string;
  deadline: string;
  cost: number;
}

export interface AIOptimization {
  suggestion: string;
  potential_savings: number;
  implementation_effort: 'low' | 'medium' | 'high';
}

export interface WearScore {
  id: string;
  project_id: string;
  user_id: string;
  element_type: string;
  element_name?: string;
  location_id?: string;
  zone_id?: string;
  current_score: number;
  initial_score: number;
  wear_rate: number;
  material_type?: string;
  installation_date?: string;
  expected_lifespan_years?: number;
  projected_score_1year?: number;
  projected_score_2years?: number;
  projected_score_5years?: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  needs_attention: boolean;
  last_assessment_date: string;
  created_at: string;
  updated_at: string;
}

export interface LongTermScore {
  overall_score: number;
  current_state_score: number; // 40%
  repeated_anomalies_score: number; // 20%
  future_risks_score: number; // 20%
  wear_score: number; // 10%
  maintenance_score: number; // 10%
  interpretation: 'excellent' | 'very_good' | 'good' | 'fair' | 'at_risk';
  trend: 'improving' | 'stable' | 'declining';
}

export interface PredictiveAnalysisRequest {
  projectId: string;
  includeHistory?: boolean;
  includeForecast?: boolean;
  includeRisks?: boolean;
  includeMaintenancePlan?: boolean;
  forecastYears?: number;
}

export interface PredictiveAnalysisResult {
  history: PredictiveHistoryEvent[];
  forecast?: PredictiveForecast;
  risks: PredictiveRisk[];
  maintenancePlan?: MaintenancePlan;
  wearScores: WearScore[];
  longTermScore: LongTermScore;
  generatedAt: string;
}
