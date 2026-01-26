import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InconsistencyItem {
  id: string;
  analysis_id: string;
  project_id: string;
  inconsistency_type: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  location_context?: Record<string, any>;
  affected_item_id?: string;
  affected_item_type?: string;
  photo_url?: string;
  original_text?: string;
  suggested_correction?: string;
  auto_correctable: boolean;
  is_corrected: boolean;
  is_dismissed: boolean;
  confidence_score: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DeepAnalysisResult {
  id: string;
  project_id: string;
  user_id: string;
  session_id?: string;
  overall_score: number;
  photo_description_score?: number;
  entry_exit_score?: number;
  state_anomaly_score?: number;
  writing_quality_score?: number;
  photo_coverage_score?: number;
  analysis_summary?: string;
  total_inconsistencies: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  auto_corrections_available: number;
  auto_corrections_applied: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

interface UseDeepConsistencyOptions {
  projectId: string;
  sessionId?: string;
}

export const useDeepConsistency = ({ projectId, sessionId }: UseDeepConsistencyOptions) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DeepAnalysisResult | null>(null);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Start deep analysis
  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-edl-consistency', {
        body: {
          projectId,
          sessionId,
          includePhotos: true,
          includeDescriptions: true,
          includeAnomalies: true,
          includeTasks: true,
          includeEntryExit: true,
        },
      });

      if (fnError) throw fnError;

      if (data?.analysisId) {
        await fetchAnalysisResult(data.analysisId);
        toast.success(`Analyse terminée: Score ${data.overallScore}/100`);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analyse échouée';
      setError(message);
      toast.error(`Erreur: ${message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, sessionId]);

  // Fetch analysis result
  const fetchAnalysisResult = useCallback(async (analysisId?: string) => {
    try {
      let query = supabase
        .from('deep_analysis_results')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (analysisId) {
        query = query.eq('id', analysisId);
      }

      const { data, error: fetchError } = await query.limit(1).single();

      if (fetchError) {
        if (fetchError.code !== 'PGRST116') throw fetchError;
        return null;
      }

      setAnalysisResult(data as DeepAnalysisResult);

      // Fetch inconsistencies
      if (data) {
        const { data: items, error: itemsError } = await supabase
          .from('inconsistency_items')
          .select('*')
          .eq('analysis_id', data.id)
          .order('severity', { ascending: true })
          .order('created_at', { ascending: false });

        if (!itemsError && items) {
          setInconsistencies(items as InconsistencyItem[]);
        }
      }

      return data;
    } catch (err) {
      console.error('Error fetching analysis:', err);
      return null;
    }
  }, [projectId]);

  // Apply auto-correction to an item
  const applyCorrection = useCallback(async (itemId: string, correction: string) => {
    try {
      const item = inconsistencies.find(i => i.id === itemId);
      if (!item) return false;

      // Apply correction based on item type
      if (item.affected_item_type === 'sequence' && item.affected_item_id) {
        await supabase
          .from('visit_sequences')
          .update({ description: correction })
          .eq('id', item.affected_item_id);
      } else if (item.affected_item_type === 'task' && item.affected_item_id) {
        await supabase
          .from('extracted_tasks')
          .update({ description: correction })
          .eq('id', item.affected_item_id);
      } else if (item.affected_item_type === 'anomaly' && item.affected_item_id) {
        await supabase
          .from('detected_anomalies')
          .update({ description: correction })
          .eq('id', item.affected_item_id);
      }

      // Mark as corrected
      await supabase
        .from('inconsistency_items')
        .update({ 
          is_corrected: true, 
          corrected_at: new Date().toISOString() 
        })
        .eq('id', itemId);

      setInconsistencies(prev => 
        prev.map(i => i.id === itemId ? { ...i, is_corrected: true } : i)
      );

      // Update analysis stats
      if (analysisResult) {
        await supabase
          .from('deep_analysis_results')
          .update({ 
            auto_corrections_applied: (analysisResult.auto_corrections_applied || 0) + 1 
          })
          .eq('id', analysisResult.id);
      }

      toast.success('Correction appliquée');
      return true;
    } catch (err) {
      toast.error('Erreur lors de la correction');
      return false;
    }
  }, [inconsistencies, analysisResult]);

  // Apply all auto-corrections
  const applyAllCorrections = useCallback(async () => {
    const correctable = inconsistencies.filter(i => i.auto_correctable && !i.is_corrected && i.suggested_correction);
    let successCount = 0;

    for (const item of correctable) {
      if (item.suggested_correction) {
        const success = await applyCorrection(item.id, item.suggested_correction);
        if (success) successCount++;
      }
    }

    toast.success(`${successCount} corrections appliquées`);
    return successCount;
  }, [inconsistencies, applyCorrection]);

  // Dismiss an inconsistency
  const dismissInconsistency = useCallback(async (itemId: string) => {
    try {
      await supabase
        .from('inconsistency_items')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', itemId);

      setInconsistencies(prev => 
        prev.map(i => i.id === itemId ? { ...i, is_dismissed: true } : i)
      );

      toast.success('Incohérence ignorée');
      return true;
    } catch (err) {
      toast.error('Erreur');
      return false;
    }
  }, []);

  // Get score color
  const getScoreColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  }, []);

  // Get score badge variant
  const getScoreBadgeVariant = useCallback((score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 60) return 'outline';
    return 'destructive';
  }, []);

  // Get severity icon
  const getSeverityIcon = useCallback((severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟠';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }, []);

  // Get category label
  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      'photo_analysis': 'Analyse Photo',
      'semantic_analysis': 'Analyse Sémantique',
      'state_coherence': 'Cohérence État',
      'entry_exit': 'Entrée/Sortie',
      'writing_quality': 'Qualité Rédaction',
      'coverage': 'Couverture',
      'legal': 'Risque Juridique',
      'ai_detection': 'Détection IA',
    };
    return labels[category] || category;
  }, []);

  // Get type label
  const getTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      'photo_description_mismatch': 'Photo ↔ Description',
      'state_anomaly_conflict': 'État ↔ Anomalie',
      'entry_exit_contradiction': 'Entrée ↔ Sortie',
      'writing_error': 'Erreur de rédaction',
      'forbidden_term': 'Terme interdit',
      'missing_photo': 'Photo manquante',
      'duplicate_photo': 'Photo en double',
      'blurry_photo': 'Photo floue',
      'wrong_room_photo': 'Mauvaise pièce',
      'vague_description': 'Description vague',
      'incomplete_item': 'Élément incomplet',
      'ai_error': 'Erreur IA',
      'topological_error': 'Erreur topologique',
      'missing_angle': 'Angle manquant',
      'legal_risk': 'Risque juridique',
    };
    return labels[type] || type;
  }, []);

  return {
    isAnalyzing,
    analysisResult,
    inconsistencies,
    error,
    startAnalysis,
    fetchAnalysisResult,
    applyCorrection,
    applyAllCorrections,
    dismissInconsistency,
    getScoreColor,
    getScoreBadgeVariant,
    getSeverityIcon,
    getCategoryLabel,
    getTypeLabel,
    // Stats
    pendingCount: inconsistencies.filter(i => !i.is_corrected && !i.is_dismissed).length,
    criticalCount: inconsistencies.filter(i => i.severity === 'critical' && !i.is_corrected && !i.is_dismissed).length,
    autoCorrectableCount: inconsistencies.filter(i => i.auto_correctable && !i.is_corrected).length,
  };
};
