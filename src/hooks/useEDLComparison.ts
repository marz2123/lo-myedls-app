import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComparisonPhoto {
  id: string;
  url: string;
  roomName: string;
  elementType: string;
  timestamp: string;
}

export interface DetectedDifference {
  id: string;
  type: 'fissure' | 'casse' | 'salissure' | 'rayure' | 'decollement' | 'moisissure' | 'jaunissement' | 'tache' | 'deformation' | 'manquant';
  severity: 'faible' | 'moyen' | 'fort';
  description: string;
  roomName: string;
  elementType: string;
  entryPhotoUrl: string;
  exitPhotoUrl: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
  approved: boolean;
}

export interface GeneratedTask {
  id: string;
  familyCode: string;
  categoryCode: string;
  subcategoryCode: string;
  title: string;
  description: string;
  quantity?: string;
  selected: boolean;
  differenceId: string;
}

export interface ComparisonResult {
  id: string;
  entrySessionId: string;
  exitSessionId: string;
  differences: DetectedDifference[];
  tasks: GeneratedTask[];
  summary: {
    totalDegradations: number;
    impactedRooms: string[];
    damageTypes: string[];
    overallSeverity: 'faible' | 'moyen' | 'fort';
    estimatedCost?: { min: number; max: number };
  };
  status: 'pending' | 'comparing' | 'completed' | 'error';
  createdAt: string;
}

const DIFFERENCE_TYPE_LABELS: Record<string, string> = {
  fissure: 'Fissure',
  casse: 'Casse',
  salissure: 'Salissure',
  rayure: 'Rayure',
  decollement: 'Décollement',
  moisissure: 'Moisissure',
  jaunissement: 'Jaunissement',
  tache: 'Tache',
  deformation: 'Déformation',
  manquant: 'Élément manquant'
};

const TASK_MAPPING: Record<string, { family: string; category: string; subcategory: string; title: string }> = {
  fissure: { family: 'FT-02', category: 'CT-PEINTURE', subcategory: 'SC-REP-FISSURE', title: 'Réparer fissure et refaire peinture' },
  casse: { family: 'FT-06', category: 'CT-MENUISERIE', subcategory: 'SC-REMPLACEMENT', title: 'Remplacer élément cassé' },
  salissure: { family: 'FT-28', category: 'CT-NETTOYAGE', subcategory: 'SC-NETT-INTENSIF', title: 'Nettoyage intensif' },
  rayure: { family: 'FT-02', category: 'CT-PEINTURE', subcategory: 'SC-RETOUCHE', title: 'Retouche peinture / vernis' },
  decollement: { family: 'FT-02', category: 'CT-PEINTURE', subcategory: 'SC-REFECTION', title: 'Refaire peinture / revêtement' },
  moisissure: { family: 'FT-28', category: 'CT-TRAITEMENT', subcategory: 'SC-ANTI-MOISISSURE', title: 'Traitement anti-moisissure' },
  jaunissement: { family: 'FT-02', category: 'CT-PEINTURE', subcategory: 'SC-REFECTION', title: 'Refaire peinture murale' },
  tache: { family: 'FT-28', category: 'CT-NETTOYAGE', subcategory: 'SC-DETACHAGE', title: 'Détachage professionnel' },
  deformation: { family: 'FT-06', category: 'CT-REPARATION', subcategory: 'SC-REDRESSAGE', title: 'Réparer / redresser élément' },
  manquant: { family: 'FT-06', category: 'CT-FOURNITURE', subcategory: 'SC-REMPLACEMENT', title: 'Fournir et poser élément manquant' }
};

export function useEDLComparison(projectId: string) {
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<ComparisonPhoto[]>([]);
  const [exitPhotos, setExitPhotos] = useState<ComparisonPhoto[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const loadEDLData = useCallback(async (entrySessionId: string, exitSessionId: string) => {
    try {
      // Load entry photos
      const { data: entryFrames } = await supabase
        .from('extracted_frames')
        .select('*')
        .eq('visit_session_id', entrySessionId);

      // Load exit photos
      const { data: exitFrames } = await supabase
        .from('extracted_frames')
        .select('*')
        .eq('visit_session_id', exitSessionId);

      const mapFramesToPhotos = (frames: any[]): ComparisonPhoto[] => 
        (frames || []).map(f => ({
          id: f.id,
          url: f.frame_url,
          roomName: f.manual_label || 'Pièce non définie',
          elementType: (f.edl_tags as any)?.element_type || 'Élément',
          timestamp: f.created_at
        }));

      setEntryPhotos(mapFramesToPhotos(entryFrames));
      setExitPhotos(mapFramesToPhotos(exitFrames));

      return { entryFrames, exitFrames };
    } catch (error) {
      console.error('Error loading EDL data:', error);
      throw error;
    }
  }, []);

  const comparePhotos = useCallback(async (
    entrySessionId: string, 
    exitSessionId: string
  ): Promise<ComparisonResult> => {
    setIsComparing(true);
    setProgress(0);

    try {
      const { entryFrames, exitFrames } = await loadEDLData(entrySessionId, exitSessionId);
      setProgress(20);

      // Call AI comparison edge function
      const { data, error } = await supabase.functions.invoke('compare-edl-photos', {
        body: {
          projectId,
          entryPhotos: entryFrames,
          exitPhotos: exitFrames
        }
      });

      if (error) throw error;
      setProgress(80);

      const differences: DetectedDifference[] = (data?.differences || []).map((d: any, idx: number) => ({
        id: `diff-${idx}`,
        type: d.type || 'salissure',
        severity: d.severity || 'moyen',
        description: d.description || DIFFERENCE_TYPE_LABELS[d.type] || 'Dégradation détectée',
        roomName: d.roomName || 'Pièce',
        elementType: d.elementType || 'Élément',
        entryPhotoUrl: d.entryPhotoUrl || '',
        exitPhotoUrl: d.exitPhotoUrl || '',
        boundingBox: d.boundingBox,
        confidence: d.confidence || 0.85,
        approved: false
      }));

      const tasks: GeneratedTask[] = differences.map((diff, idx) => {
        const mapping = TASK_MAPPING[diff.type] || TASK_MAPPING.salissure;
        return {
          id: `task-${idx}`,
          familyCode: mapping.family,
          categoryCode: mapping.category,
          subcategoryCode: mapping.subcategory,
          title: mapping.title,
          description: `${diff.description} - ${diff.roomName} (${diff.elementType})`,
          quantity: '1 unité',
          selected: true,
          differenceId: diff.id
        };
      });

      const impactedRooms = [...new Set(differences.map(d => d.roomName))];
      const damageTypes = [...new Set(differences.map(d => DIFFERENCE_TYPE_LABELS[d.type]))];
      
      const severityCounts = { faible: 0, moyen: 0, fort: 0 };
      differences.forEach(d => severityCounts[d.severity]++);
      const overallSeverity = severityCounts.fort > 0 ? 'fort' : severityCounts.moyen > 0 ? 'moyen' : 'faible';

      const result: ComparisonResult = {
        id: `comparison-${Date.now()}`,
        entrySessionId,
        exitSessionId,
        differences,
        tasks,
        summary: {
          totalDegradations: differences.length,
          impactedRooms,
          damageTypes,
          overallSeverity,
          estimatedCost: { min: differences.length * 50, max: differences.length * 200 }
        },
        status: 'completed',
        createdAt: new Date().toISOString()
      };

      setComparisonResult(result);
      setProgress(100);

      toast({
        title: "Comparaison terminée",
        description: `${differences.length} différence(s) détectée(s)`
      });

      return result;
    } catch (error) {
      console.error('Comparison error:', error);
      toast({
        title: "Erreur de comparaison",
        description: "Impossible de comparer les EDL",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsComparing(false);
    }
  }, [projectId, loadEDLData, toast]);

  const approveDifference = useCallback((differenceId: string, approved: boolean) => {
    setComparisonResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        differences: prev.differences.map(d => 
          d.id === differenceId ? { ...d, approved } : d
        )
      };
    });
  }, []);

  const toggleTask = useCallback((taskId: string, selected: boolean) => {
    setComparisonResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => 
          t.id === taskId ? { ...t, selected } : t
        )
      };
    });
  }, []);

  const approveAll = useCallback(() => {
    setComparisonResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        differences: prev.differences.map(d => ({ ...d, approved: true }))
      };
    });
  }, []);

  const saveComparison = useCallback(async () => {
    if (!comparisonResult) return;

    try {
      const approvedDifferences = comparisonResult.differences.filter(d => d.approved);
      const selectedTasks = comparisonResult.tasks.filter(t => t.selected);

      // Save anomalies
      for (const diff of approvedDifferences) {
        await supabase.from('detected_anomalies').insert({
          project_id: projectId,
          anomaly_type: diff.type,
          severity: diff.severity,
          description: diff.description,
          confidence_score: diff.confidence,
          is_confirmed: true,
          detection_metadata: {
            source: 'edl_comparison',
            entryPhotoUrl: diff.entryPhotoUrl,
            exitPhotoUrl: diff.exitPhotoUrl,
            boundingBox: diff.boundingBox
          }
        });
      }

      // Save tasks
      const { data: { user } } = await supabase.auth.getUser();
      for (const task of selectedTasks) {
        await supabase.from('extracted_tasks').insert({
          project_id: projectId,
          user_id: user?.id,
          title: task.title,
          description: task.description,
          source_type: 'comparison',
          priority: 'medium',
          analysis_metadata: {
            familyCode: task.familyCode,
            categoryCode: task.categoryCode,
            subcategoryCode: task.subcategoryCode
          }
        });
      }

      toast({
        title: "Comparaison enregistrée",
        description: `${approvedDifferences.length} anomalies et ${selectedTasks.length} tâches sauvegardées`
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la comparaison",
        variant: "destructive"
      });
    }
  }, [comparisonResult, projectId, toast]);

  return {
    isComparing,
    comparisonResult,
    entryPhotos,
    exitPhotos,
    progress,
    comparePhotos,
    approveDifference,
    toggleTask,
    approveAll,
    saveComparison
  };
}

export { DIFFERENCE_TYPE_LABELS };
