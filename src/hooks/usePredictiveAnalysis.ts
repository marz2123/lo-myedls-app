import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DelayPrediction {
  area: string;
  estimatedDelayDays: number;
  causes: string;
  suggestedMitigation: string;
}

export interface WorkloadAnalysis {
  resource: string;
  status: 'overloaded' | 'balanced' | 'underused';
  taskCount: number;
  details: string;
}

export interface BudgetCriticalItem {
  label: string;
  reason: string;
  recommendedAction: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

export interface PurchaseSuggestion {
  label: string;
  quantityEstimate: number | string;
  unit: string;
  timeFrame: string;
  family: string;
}

export interface ActionPlanDay {
  day: number;
  focus: string;
  suggestedTasks: string[];
  priority: 'critical' | 'high' | 'normal';
}

export interface PredictiveAnalysisResult {
  delays: DelayPrediction[];
  workload: WorkloadAnalysis[];
  budgetCriticalItems: BudgetCriticalItem[];
  purchaseSuggestions: PurchaseSuggestion[];
  actionPlan7Days: ActionPlanDay[];
  summary: string;
  riskScore: number;
  generatedAt: string;
}

export interface PredictiveAnalysisMeta {
  tasksAnalyzed: number;
  problemsAnalyzed: number;
  risksAnalyzed: number;
}

export const usePredictiveAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PredictiveAnalysisResult | null>(null);
  const [meta, setMeta] = useState<PredictiveAnalysisMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  const runAnalysis = useCallback(async (projectId: string) => {
    if (!projectId) {
      setError('Project ID is required');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Check cache first
      const { data: cached } = await supabase
        .from('cache_predictions')
        .select('*')
        .eq('cache_key', `predictive_${projectId}`)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && cached.prediction_data) {
        const cachedAnalysis = cached.prediction_data as unknown as PredictiveAnalysisResult;
        setAnalysis(cachedAnalysis);
        setLastAnalyzedAt(new Date(cached.created_at));
        setIsAnalyzing(false);
        return cachedAnalysis;
      }

      // Run fresh analysis
      const { data, error: fnError } = await supabase.functions.invoke('predictive-analysis', {
        body: { projectId }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      setMeta(data.meta);
      setLastAnalyzedAt(new Date());
      
      toast.success('Analyse prédictive terminée', {
        description: `${data.meta?.tasksAnalyzed || 0} tâches analysées`
      });

      return data.analysis as PredictiveAnalysisResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'analyse';
      setError(message);
      toast.error('Erreur d\'analyse prédictive', { description: message });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setMeta(null);
    setError(null);
    setLastAnalyzedAt(null);
  }, []);

  // Get quick stats from analysis
  const getQuickStats = useCallback(() => {
    if (!analysis) return null;

    return {
      totalDelayDays: analysis.delays.reduce((sum, d) => sum + d.estimatedDelayDays, 0),
      overloadedResources: analysis.workload.filter(w => w.status === 'overloaded').length,
      criticalBudgetItems: analysis.budgetCriticalItems.filter(b => b.estimatedImpact === 'high').length,
      purchaseItemsCount: analysis.purchaseSuggestions.length,
      riskLevel: analysis.riskScore > 70 ? 'high' : analysis.riskScore > 40 ? 'medium' : 'low',
      riskScore: analysis.riskScore
    };
  }, [analysis]);

  // Answer specific questions about the analysis
  const answerQuestion = useCallback((question: string): string | null => {
    if (!analysis) return null;

    const q = question.toLowerCase();

    if (q.includes('retard') || q.includes('delay')) {
      if (analysis.delays.length === 0) {
        return 'Aucun retard significatif détecté actuellement.';
      }
      const totalDelay = analysis.delays.reduce((sum, d) => sum + d.estimatedDelayDays, 0);
      const mainAreas = analysis.delays.slice(0, 2).map(d => d.area).join(', ');
      return `Risque de retard: environ ${totalDelay} jours, principalement sur ${mainAreas}.`;
    }

    if (q.includes('surcharg') || q.includes('workload') || q.includes('charge')) {
      const overloaded = analysis.workload.filter(w => w.status === 'overloaded');
      if (overloaded.length === 0) {
        return 'Charge de travail équilibrée, aucune surcharge détectée.';
      }
      return overloaded.map(w => `${w.resource}: ${w.taskCount} tâches, ${w.details}`).join('\n');
    }

    if (q.includes('coût') || q.includes('budget') || q.includes('cher')) {
      if (analysis.budgetCriticalItems.length === 0) {
        return 'Pas d\'éléments budget critiques identifiés.';
      }
      return `Éléments potentiellement coûteux:\n${analysis.budgetCriticalItems.slice(0, 3).map(b => `• ${b.label}: ${b.reason}`).join('\n')}`;
    }

    if (q.includes('achat') || q.includes('acheter') || q.includes('matéri')) {
      if (analysis.purchaseSuggestions.length === 0) {
        return 'Pas de recommandations d\'achats pour le moment.';
      }
      return `Achats recommandés (${analysis.purchaseSuggestions[0]?.timeFrame}):\n${analysis.purchaseSuggestions.slice(0, 5).map(p => `• ${p.label}: ${p.quantityEstimate} ${p.unit}`).join('\n')}`;
    }

    if (q.includes('plan') || q.includes('action') || q.includes('priorit')) {
      if (analysis.actionPlan7Days.length === 0) {
        return 'Pas de plan d\'action généré.';
      }
      return analysis.actionPlan7Days.slice(0, 3).map(d => `Jour ${d.day}: ${d.focus} (${d.priority})`).join('\n');
    }

    if (q.includes('risque') || q.includes('danger')) {
      const level = analysis.riskScore > 70 ? 'élevé' : analysis.riskScore > 40 ? 'modéré' : 'faible';
      return `Score de risque: ${analysis.riskScore}/100 (${level}). ${analysis.summary}`;
    }

    return analysis.summary;
  }, [analysis]);

  return {
    isAnalyzing,
    analysis,
    meta,
    error,
    lastAnalyzedAt,
    runAnalysis,
    clearAnalysis,
    getQuickStats,
    answerQuestion
  };
};
