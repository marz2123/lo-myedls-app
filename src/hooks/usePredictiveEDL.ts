import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  PredictiveHistoryEvent,
  PredictiveForecast,
  PredictiveRisk,
  MaintenancePlan,
  WearScore,
  LongTermScore,
  PredictiveAnalysisResult
} from '@/types/predictive';

export const usePredictiveEDL = (projectId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<PredictiveHistoryEvent[]>([]);
  const [forecast, setForecast] = useState<PredictiveForecast | null>(null);
  const [risks, setRisks] = useState<PredictiveRisk[]>([]);
  const [maintenancePlan, setMaintenancePlan] = useState<MaintenancePlan | null>(null);
  const [wearScores, setWearScores] = useState<WearScore[]>([]);
  const [longTermScore, setLongTermScore] = useState<LongTermScore | null>(null);

  // Load existing predictive data
  const loadPredictiveData = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Load history
      const { data: historyData } = await supabase
        .from('predictive_history')
        .select('*')
        .eq('project_id', projectId)
        .order('event_date', { ascending: false });

      if (historyData) {
        setHistory(historyData as unknown as PredictiveHistoryEvent[]);
      }

      // Load latest forecast
      const { data: forecastData } = await supabase
        .from('predictive_forecast')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (forecastData) {
        setForecast(forecastData as unknown as PredictiveForecast);
      }

      // Load active risks
      const { data: risksData } = await supabase
        .from('predictive_risks')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['active', 'monitored'])
        .order('risk_score', { ascending: false });

      if (risksData) {
        setRisks(risksData as unknown as PredictiveRisk[]);
      }

      // Load active maintenance plan
      const { data: planData } = await supabase
        .from('predictive_maintenance_plans')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planData) {
        setMaintenancePlan(planData as unknown as MaintenancePlan);
      }

      // Load wear scores
      const { data: wearData } = await supabase
        .from('predictive_wear_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('current_score', { ascending: true });

      if (wearData) {
        setWearScores(wearData as unknown as WearScore[]);
      }

      // Calculate long-term score
      calculateLongTermScore(
        historyData as unknown as PredictiveHistoryEvent[] || [],
        risksData as unknown as PredictiveRisk[] || [],
        wearData as unknown as WearScore[] || []
      );

    } catch (error) {
      console.error('Error loading predictive data:', error);
      toast.error('Erreur lors du chargement des données prédictives');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Calculate long-term score
  const calculateLongTermScore = (
    historyData: PredictiveHistoryEvent[],
    risksData: PredictiveRisk[],
    wearData: WearScore[]
  ) => {
    // Current state score (40%)
    const latestEvent = historyData[0];
    const currentStateScore = latestEvent?.overall_condition_score || 70;

    // Repeated anomalies score (20%) - fewer repeated = higher score
    const repeatedAnomalies = historyData.reduce((acc, event) => 
      acc + (event.anomalies_detected?.length || 0), 0);
    const repeatedAnomaliesScore = Math.max(0, 100 - (repeatedAnomalies * 5));

    // Future risks score (20%) - fewer high risks = higher score
    const highRisks = risksData.filter(r => r.severity === 'high' || r.severity === 'critical').length;
    const futureRisksScore = Math.max(0, 100 - (highRisks * 15));

    // Wear score (10%)
    const avgWear = wearData.length > 0
      ? wearData.reduce((acc, w) => acc + w.current_score, 0) / wearData.length
      : 80;
    const wearScore = avgWear;

    // Maintenance score (10%) - based on whether maintenance is up to date
    const maintenanceScore = 75; // Default, could be calculated from maintenance history

    // Overall weighted score
    const overallScore = 
      (currentStateScore * 0.4) +
      (repeatedAnomaliesScore * 0.2) +
      (futureRisksScore * 0.2) +
      (wearScore * 0.1) +
      (maintenanceScore * 0.1);

    // Determine interpretation
    let interpretation: LongTermScore['interpretation'];
    if (overallScore >= 90) interpretation = 'excellent';
    else if (overallScore >= 80) interpretation = 'very_good';
    else if (overallScore >= 70) interpretation = 'good';
    else if (overallScore >= 60) interpretation = 'fair';
    else interpretation = 'at_risk';

    // Determine trend from history
    let trend: LongTermScore['trend'] = 'stable';
    if (historyData.length >= 2) {
      const recentScore = historyData[0]?.overall_condition_score || 0;
      const previousScore = historyData[1]?.overall_condition_score || 0;
      if (recentScore > previousScore + 5) trend = 'improving';
      else if (recentScore < previousScore - 5) trend = 'declining';
    }

    setLongTermScore({
      overall_score: Math.round(overallScore),
      current_state_score: Math.round(currentStateScore),
      repeated_anomalies_score: Math.round(repeatedAnomaliesScore),
      future_risks_score: Math.round(futureRisksScore),
      wear_score: Math.round(wearScore),
      maintenance_score: Math.round(maintenanceScore),
      interpretation,
      trend
    });
  };

  // Run full predictive analysis
  const runPredictiveAnalysis = useCallback(async () => {
    if (!projectId) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-analysis', {
        body: { 
          projectId,
          mode: 'full',
          includeHistory: true,
          includeForecast: true,
          includeRisks: true,
          includeMaintenancePlan: true
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Analyse prédictive terminée');
        await loadPredictiveData();
        return data.analysis as PredictiveAnalysisResult;
      }
    } catch (error) {
      console.error('Error running predictive analysis:', error);
      toast.error('Erreur lors de l\'analyse prédictive');
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, loadPredictiveData]);

  // Add history event
  const addHistoryEvent = useCallback(async (
    eventType: PredictiveHistoryEvent['event_type'],
    data: Partial<PredictiveHistoryEvent>
  ) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const insertData = {
      project_id: projectId,
      user_id: userData.user.id,
      event_type: eventType,
      overall_condition_score: data.overall_condition_score || 0,
      element_states: JSON.stringify(data.element_states || []),
      anomalies_detected: JSON.stringify(data.anomalies_detected || []),
      tasks_generated: JSON.stringify(data.tasks_generated || []),
      changes_from_previous: JSON.stringify(data.changes_from_previous || {}),
      degradation_rate: data.degradation_rate || 0,
      metadata: JSON.stringify(data.metadata || {})
    };

    const { error } = await supabase
      .from('predictive_history')
      .insert(insertData as any);

    if (error) {
      console.error('Error adding history event:', error);
      throw error;
    }

    await loadPredictiveData();
  }, [projectId, loadPredictiveData]);

  // Get risk summary
  const getRiskSummary = useCallback(() => {
    const critical = risks.filter(r => r.severity === 'critical').length;
    const high = risks.filter(r => r.severity === 'high').length;
    const medium = risks.filter(r => r.severity === 'medium').length;
    const low = risks.filter(r => r.severity === 'low').length;

    return { critical, high, medium, low, total: risks.length };
  }, [risks]);

  // Get wear summary by element type
  const getWearSummary = useCallback(() => {
    const byType: Record<string, { count: number; avgScore: number }> = {};
    
    wearScores.forEach(ws => {
      if (!byType[ws.element_type]) {
        byType[ws.element_type] = { count: 0, avgScore: 0 };
      }
      byType[ws.element_type].count++;
      byType[ws.element_type].avgScore += ws.current_score;
    });

    Object.keys(byType).forEach(key => {
      byType[key].avgScore = Math.round(byType[key].avgScore / byType[key].count);
    });

    return byType;
  }, [wearScores]);

  return {
    isLoading,
    isAnalyzing,
    history,
    forecast,
    risks,
    maintenancePlan,
    wearScores,
    longTermScore,
    loadPredictiveData,
    runPredictiveAnalysis,
    addHistoryEvent,
    getRiskSummary,
    getWearSummary
  };
};
