import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QualityScore {
  id: string;
  project_id: string;
  overall_score: number;
  completeness_score: number;
  ai_coherence_score: number;
  technical_coherence_score: number;
  entry_exit_coherence_score: number;
  writing_quality_score: number;
  photo_quality_score: number;
  status: 'excellent' | 'very_good' | 'average' | 'needs_review' | 'pending';
  last_analyzed_at: string | null;
  analysis_metadata: any;
}

export interface QualityMetric {
  id: string;
  quality_score_id: string;
  metric_type: 'room' | 'element';
  name: string;
  score: number;
  photos_valid_percent: number;
  descriptions_valid_percent: number;
  anomalies_validated_percent: number;
  tasks_correct_percent: number;
  items_completed_percent: number;
  issues: any[];
}

export interface QualityRecommendation {
  id: string;
  recommendation_type: 'correction' | 'reformulation' | 'missing_task' | 'missing_photo' | 'coherence' | 'description' | 'rescan';
  severity: 'critical' | 'important' | 'minor';
  title: string;
  description: string | null;
  affected_item_id: string | null;
  affected_item_type: string | null;
  action_data: any;
  is_applied: boolean;
}

export interface SystemicError {
  id: string;
  user_id: string;
  project_id: string | null;
  error_pattern: string;
  occurrence_count: number;
  severity: 'critical' | 'important' | 'minor';
  description: string;
  examples: any[];
  first_detected_at: string;
  last_detected_at: string;
}

interface UseEdlQualityResult {
  qualityScore: QualityScore | null;
  metrics: QualityMetric[];
  recommendations: QualityRecommendation[];
  systemicErrors: SystemicError[];
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  analyzeEDL: () => Promise<void>;
  applyRecommendation: (id: string) => Promise<void>;
  dismissRecommendation: (id: string) => Promise<void>;
}

// Scoring weights
const WEIGHTS = {
  completeness: 0.25,
  ai_coherence: 0.25,
  technical_coherence: 0.20,
  entry_exit_coherence: 0.10,
  writing_quality: 0.10,
  photo_quality: 0.10
};

export function useEdlQuality(projectId: string | undefined): UseEdlQualityResult {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);
  const [recommendations, setRecommendations] = useState<QualityRecommendation[]>([]);
  const [systemicErrors, setSystemicErrors] = useState<SystemicError[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQualityData = useCallback(async () => {
    if (!projectId || !userId) return;

    setLoading(true);
    try {
      // Fetch quality score
      const { data: scoreData } = await supabase
        .from('edl_quality_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (scoreData) {
        setQualityScore(scoreData as unknown as QualityScore);

        // Fetch metrics
        const { data: metricsData } = await supabase
          .from('edl_quality_metrics')
          .select('*')
          .eq('quality_score_id', scoreData.id);

        setMetrics((metricsData || []) as unknown as QualityMetric[]);

        // Fetch recommendations
        const { data: recsData } = await supabase
          .from('edl_quality_recommendations')
          .select('*')
          .eq('quality_score_id', scoreData.id)
          .eq('is_applied', false)
          .order('severity', { ascending: true });

        setRecommendations((recsData || []) as unknown as QualityRecommendation[]);
      }

      // Fetch systemic errors
      const { data: errorsData } = await supabase
        .from('edl_systemic_errors')
        .select('*')
        .eq('user_id', userId)
        .order('occurrence_count', { ascending: false });

      setSystemicErrors((errorsData || []) as unknown as SystemicError[]);
    } catch (err) {
      console.error('Error fetching quality data:', err);
      setError('Failed to load quality data');
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData]);

  const analyzeEDL = useCallback(async () => {
    if (!projectId || !userId) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Fetch project data for analysis
      const [
        { data: sequences },
        { data: frames },
        { data: anomalies },
        { data: tasks },
        { data: locations }
      ] = await Promise.all([
        supabase.from('visit_sequences').select('*').eq('project_id', projectId),
        supabase.from('extracted_frames').select('*, visit_sessions!inner(project_id)').eq('visit_sessions.project_id', projectId),
        supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
        supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
        supabase.from('property_locations').select('*').eq('project_id', projectId)
      ]);

      // Calculate scores
      const completenessScore = calculateCompleteness(locations || [], sequences || [], frames || []);
      const aiCoherenceScore = calculateAICoherence(anomalies || [], tasks || []);
      const technicalScore = calculateTechnicalCoherence(sequences || [], anomalies || []);
      const writingScore = calculateWritingQuality(sequences || [], tasks || []);
      const photoScore = calculatePhotoQuality(frames || []);

      const overallScore = Math.round(
        completenessScore * WEIGHTS.completeness +
        aiCoherenceScore * WEIGHTS.ai_coherence +
        technicalScore * WEIGHTS.technical_coherence +
        50 * WEIGHTS.entry_exit_coherence + // Placeholder for entry/exit
        writingScore * WEIGHTS.writing_quality +
        photoScore * WEIGHTS.photo_quality
      );

      const status = getStatusFromScore(overallScore);

      // Insert or update quality score
      const { data: scoreData, error: scoreError } = await supabase
        .from('edl_quality_scores')
        .upsert({
          project_id: projectId,
          user_id: userId,
          overall_score: overallScore,
          completeness_score: completenessScore,
          ai_coherence_score: aiCoherenceScore,
          technical_coherence_score: technicalScore,
          entry_exit_coherence_score: 50,
          writing_quality_score: writingScore,
          photo_quality_score: photoScore,
          status,
          last_analyzed_at: new Date().toISOString(),
          analysis_metadata: {
            sequences_count: sequences?.length || 0,
            frames_count: frames?.length || 0,
            anomalies_count: anomalies?.length || 0,
            tasks_count: tasks?.length || 0
          }
        }, { onConflict: 'project_id' })
        .select()
        .single();

      if (scoreError) throw scoreError;

      // Generate room metrics
      const roomMetrics = generateRoomMetrics(locations || [], sequences || [], frames || [], anomalies || [], tasks || []);
      
      // Delete old metrics and insert new
      await supabase.from('edl_quality_metrics').delete().eq('quality_score_id', scoreData.id);
      
      if (roomMetrics.length > 0) {
        await supabase.from('edl_quality_metrics').insert(
          roomMetrics.map(m => ({
            ...m,
            quality_score_id: scoreData.id,
            project_id: projectId
          }))
        );
      }

      // Generate recommendations
      const newRecs = generateRecommendations(sequences || [], frames || [], anomalies || [], tasks || [], locations || []);
      
      await supabase.from('edl_quality_recommendations').delete().eq('quality_score_id', scoreData.id);
      
      if (newRecs.length > 0) {
        await supabase.from('edl_quality_recommendations').insert(
          newRecs.map(r => ({
            ...r,
            quality_score_id: scoreData.id,
            project_id: projectId
          }))
        );
      }

      // Detect systemic errors
      await detectSystemicErrors(userId, projectId, sequences || [], frames || [], anomalies || [], tasks || []);

      // Refresh data
      await fetchQualityData();
    } catch (err) {
      console.error('Error analyzing EDL:', err);
      setError('Failed to analyze EDL quality');
    } finally {
      setAnalyzing(false);
    }
  }, [projectId, userId, fetchQualityData]);

  const applyRecommendation = useCallback(async (id: string) => {
    try {
      await supabase
        .from('edl_quality_recommendations')
        .update({ is_applied: true, applied_at: new Date().toISOString() })
        .eq('id', id);
      
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error applying recommendation:', err);
    }
  }, []);

  const dismissRecommendation = useCallback(async (id: string) => {
    try {
      await supabase
        .from('edl_quality_recommendations')
        .update({ is_applied: true })
        .eq('id', id);
      
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error dismissing recommendation:', err);
    }
  }, []);

  return {
    qualityScore,
    metrics,
    recommendations,
    systemicErrors,
    loading,
    analyzing,
    error,
    analyzeEDL,
    applyRecommendation,
    dismissRecommendation
  };
}

// Helper functions for scoring
function calculateCompleteness(locations: any[], sequences: any[], frames: any[]): number {
  if (locations.length === 0) return 0;
  
  const locationsWithData = locations.filter(loc => 
    sequences.some(seq => seq.location_id === loc.id) ||
    frames.some(frame => frame.location_id === loc.id)
  );
  
  return Math.round((locationsWithData.length / locations.length) * 100);
}

function calculateAICoherence(anomalies: any[], tasks: any[]): number {
  if (anomalies.length === 0) return 100;
  
  const anomaliesWithTasks = anomalies.filter(a => 
    tasks.some(t => t.frame_id === a.frame_id || t.visit_session_id === a.visit_session_id)
  );
  
  return Math.round((anomaliesWithTasks.length / anomalies.length) * 100);
}

function calculateTechnicalCoherence(sequences: any[], anomalies: any[]): number {
  const badStateWithoutAnomalies = sequences.filter(seq => {
    const hasAnomalies = anomalies.some(a => a.visit_session_id === seq.id);
    return (seq.detected_condition === 'mauvais' || seq.user_condition === 'mauvais') && !hasAnomalies;
  });
  
  if (sequences.length === 0) return 100;
  return Math.round(((sequences.length - badStateWithoutAnomalies.length) / sequences.length) * 100);
}

function calculateWritingQuality(sequences: any[], tasks: any[]): number {
  const allDescriptions = [
    ...sequences.map(s => s.description).filter(Boolean),
    ...tasks.map(t => t.description).filter(Boolean)
  ];
  
  if (allDescriptions.length === 0) return 100;
  
  const goodDescriptions = allDescriptions.filter(d => d.length >= 20);
  return Math.round((goodDescriptions.length / allDescriptions.length) * 100);
}

function calculatePhotoQuality(frames: any[]): number {
  if (frames.length === 0) return 50;
  
  const validFrames = frames.filter(f => f.is_key_frame && f.analysis_result);
  return Math.round((validFrames.length / frames.length) * 100);
}

function getStatusFromScore(score: number): 'excellent' | 'very_good' | 'average' | 'needs_review' | 'pending' {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'very_good';
  if (score >= 60) return 'average';
  return 'needs_review';
}

function generateRoomMetrics(locations: any[], sequences: any[], frames: any[], anomalies: any[], tasks: any[]): Omit<QualityMetric, 'id' | 'quality_score_id'>[] {
  return locations.slice(0, 10).map(loc => {
    const locSequences = sequences.filter(s => s.location_id === loc.id);
    const locFrames = frames.filter(f => f.location_id === loc.id);
    const locAnomalies = anomalies.filter(a => 
      locFrames.some(f => f.id === a.frame_id) ||
      locSequences.some(s => s.id === a.visit_session_id)
    );
    const locTasks = tasks.filter(t => t.location === loc.name);

    const photosValid = locFrames.length > 0 ? 
      Math.round((locFrames.filter(f => f.is_key_frame).length / locFrames.length) * 100) : 0;
    
    const descriptionsValid = locSequences.length > 0 ?
      Math.round((locSequences.filter(s => s.description?.length >= 10).length / locSequences.length) * 100) : 0;
    
    const anomaliesValidated = locAnomalies.length > 0 ?
      Math.round((locAnomalies.filter(a => a.is_confirmed).length / locAnomalies.length) * 100) : 100;
    
    const tasksCorrect = locTasks.length > 0 ?
      Math.round((locTasks.filter(t => t.family_id && t.category_id).length / locTasks.length) * 100) : 100;

    const itemsCompleted = Math.min(100, (locSequences.length + locFrames.length) * 10);

    const score = Math.round((photosValid + descriptionsValid + anomaliesValidated + tasksCorrect + itemsCompleted) / 5);

    const issues: any[] = [];
    if (photosValid < 50) issues.push({ type: 'photos', message: 'Photos insuffisantes ou de mauvaise qualité' });
    if (descriptionsValid < 50) issues.push({ type: 'descriptions', message: 'Descriptions trop courtes' });
    if (anomaliesValidated < 50) issues.push({ type: 'anomalies', message: 'Anomalies non validées' });

    return {
      metric_type: 'room' as const,
      name: loc.name,
      score,
      photos_valid_percent: photosValid,
      descriptions_valid_percent: descriptionsValid,
      anomalies_validated_percent: anomaliesValidated,
      tasks_correct_percent: tasksCorrect,
      items_completed_percent: itemsCompleted,
      issues
    };
  });
}

function generateRecommendations(sequences: any[], frames: any[], anomalies: any[], tasks: any[], locations: any[]): Omit<QualityRecommendation, 'id' | 'quality_score_id'>[] {
  const recs: Omit<QualityRecommendation, 'id' | 'quality_score_id'>[] = [];

  // Check for missing photos
  locations.forEach(loc => {
    const hasPhotos = frames.some(f => f.location_id === loc.id);
    if (!hasPhotos) {
      recs.push({
        recommendation_type: 'missing_photo',
        severity: 'important',
        title: `Photos manquantes: ${loc.name}`,
        description: `Aucune photo n'a été capturée pour ${loc.name}. Ajoutez des photos pour documenter l'état.`,
        affected_item_id: loc.id,
        affected_item_type: 'location',
        action_data: { action: 'add_photos', location_id: loc.id },
        is_applied: false
      });
    }
  });

  // Check for anomalies without tasks
  anomalies.forEach(anomaly => {
    const hasTask = tasks.some(t => 
      t.frame_id === anomaly.frame_id || 
      t.description?.includes(anomaly.description?.slice(0, 20))
    );
    if (!hasTask && anomaly.severity !== 'low') {
      recs.push({
        recommendation_type: 'missing_task',
        severity: anomaly.severity === 'critical' ? 'critical' : 'important',
        title: `Tâche manquante pour anomalie`,
        description: `L'anomalie "${anomaly.anomaly_type}" n'a pas de tâche associée. Créez une tâche pour cette anomalie.`,
        affected_item_id: anomaly.id,
        affected_item_type: 'anomaly',
        action_data: { action: 'create_task', anomaly_id: anomaly.id },
        is_applied: false
      });
    }
  });

  // Check for short descriptions
  const shortDescriptions = tasks.filter(t => t.description && t.description.length < 20);
  if (shortDescriptions.length > 0) {
    recs.push({
      recommendation_type: 'description',
      severity: 'minor',
      title: `${shortDescriptions.length} descriptions trop courtes`,
      description: `Certaines tâches ont des descriptions trop courtes. Enrichissez-les pour plus de clarté.`,
      affected_item_id: null,
      affected_item_type: 'tasks',
      action_data: { action: 'improve_descriptions', task_ids: shortDescriptions.map(t => t.id) },
      is_applied: false
    });
  }

  return recs.slice(0, 10);
}

async function detectSystemicErrors(userId: string, projectId: string, sequences: any[], frames: any[], anomalies: any[], tasks: any[]) {
  const errors: Omit<SystemicError, 'id'>[] = [];

  // Pattern: Missing ceiling photos
  const ceilingMentions = sequences.filter(s => 
    s.description?.toLowerCase().includes('plafond')
  );
  const ceilingPhotos = frames.filter(f => 
    f.detected_elements?.some((e: any) => e.toLowerCase?.().includes('plafond'))
  );
  if (ceilingMentions.length > ceilingPhotos.length * 2) {
    errors.push({
      user_id: userId,
      project_id: projectId,
      error_pattern: 'missing_ceiling_photos',
      occurrence_count: ceilingMentions.length - ceilingPhotos.length,
      severity: 'important',
      description: 'Photos de plafonds souvent manquantes',
      examples: [],
      first_detected_at: new Date().toISOString(),
      last_detected_at: new Date().toISOString()
    });
  }

  // Pattern: Anomalies without tasks
  const orphanAnomalies = anomalies.filter(a => 
    !tasks.some(t => t.frame_id === a.frame_id)
  );
  if (orphanAnomalies.length > anomalies.length * 0.2) {
    errors.push({
      user_id: userId,
      project_id: projectId,
      error_pattern: 'anomalies_without_tasks',
      occurrence_count: orphanAnomalies.length,
      severity: 'critical',
      description: `${Math.round((orphanAnomalies.length / anomalies.length) * 100)}% des anomalies ne sont pas associées à des tâches`,
      examples: orphanAnomalies.slice(0, 3).map(a => ({ id: a.id, type: a.anomaly_type })),
      first_detected_at: new Date().toISOString(),
      last_detected_at: new Date().toISOString()
    });
  }

  // Insert errors
  for (const error of errors) {
    await supabase.from('edl_systemic_errors').upsert(
      error,
      { onConflict: 'user_id,error_pattern' }
    );
  }
}
