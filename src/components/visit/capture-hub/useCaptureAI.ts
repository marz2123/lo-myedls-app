import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DetectedElement {
  name: string;
  etat: 'bon' | 'moyen' | 'mauvais' | 'absent';
  ft_code: string;
  ft_label: string;
  description: string;
  defauts?: string[];
}

export interface DetectedAnomaly {
  type: string;
  severity: 'légère' | 'moyenne' | 'grave';
  location: string;
  ft_code: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  ft_code: string;
  ft_label: string;
  priority: 'low' | 'medium' | 'high';
  estimated_cost?: string;
}

export interface CaptureAnalysis {
  room_type: string;
  elements: DetectedElement[];
  materials: string[];
  pathologies: DetectedAnomaly[];
  general_state: 'bon' | 'moyen' | 'mauvais';
  technical_elements?: Array<{
    type: string;
    label: string;
    confidence: number;
    state: string;
    reading?: string;
  }>;
  confidence_score: number;
  generated_description: string;
  generated_tasks: GeneratedTask[];
}

export interface CaptureResult {
  photoUrl: string;
  analysis: CaptureAnalysis;
  timestamp: Date;
  saved: boolean;
}

export function useCaptureAI(projectId?: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<CaptureResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);

  const createDraftResult = useCallback((photoDataUrl: string): CaptureResult => {
    const draftAnalysis: CaptureAnalysis = {
      room_type: 'Pièce à préciser',
      elements: [],
      materials: [],
      pathologies: [],
      general_state: 'moyen',
      technical_elements: [],
      confidence_score: 0,
      generated_description: '',
      generated_tasks: [],
    };

    const draft: CaptureResult = {
      photoUrl: photoDataUrl,
      analysis: draftAnalysis,
      timestamp: new Date(),
      saved: false,
    };

    setLastResult(draft);
    setError(null);
    setIsAnalyzing(false);

    return draft;
  }, []);

  const analyzePhoto = useCallback(async (
    photoDataUrl: string,
    context?: { room?: string; previousElements?: string[] }
  ): Promise<CaptureResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    // Add timeout to prevent infinite waiting
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Analyse timeout - veuillez réessayer')), 30000);
    });

    try {
      // Call analyze-video-frame edge function with timeout
      const apiCall = supabase.functions.invoke('analyze-video-frame', {
        body: {
          imageUrl: photoDataUrl,
          previousContext: context?.room || 'Début de capture',
          timestamp: Date.now() / 1000,
        },
      });

      const { data: analysisData, error: analysisError } = await Promise.race([apiCall, timeout]);

      if (analysisError) {
        throw new Error(analysisError.message || "Erreur d'analyse IA");
      }

      if (!analysisData) {
        throw new Error('Aucune donnée retournée');
      }

      const analysis = analysisData?.analysis || {};

      // Generate description from analysis
      const generatedDescription = generateDescription(analysis);

      // Generate tasks from pathologies
      const generatedTasks = generateTasks(analysis);

      const captureAnalysis: CaptureAnalysis = {
        room_type: analysis.room_type || 'Pièce non identifiée',
        elements: analysis.elements || [],
        materials: analysis.materials || [],
        pathologies: analysis.pathologies || [],
        general_state: analysis.general_state || 'moyen',
        technical_elements: analysis.technical_elements || [],
        confidence_score: analysis.confidence_score || 0.5,
        generated_description: generatedDescription,
        generated_tasks: generatedTasks,
      };

      const result: CaptureResult = {
        photoUrl: photoDataUrl,
        analysis: captureAnalysis,
        timestamp: new Date(),
        saved: false,
      };

      setLastResult(result);
      setIsAnalyzing(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur d'analyse";
      setError(errorMessage);
      console.error('[CaptureAI] Error:', err);
      setIsAnalyzing(false);
      return null;
    }
  }, []);

  const saveToEDL = useCallback(async (
    result: CaptureResult,
    edits?: Partial<CaptureAnalysis>
  ): Promise<boolean> => {
    if (!projectId) {
      setError('Aucun projet sélectionné');
      return false;
    }

    try {
      const finalAnalysis = edits ? { ...result.analysis, ...edits } : result.analysis;

      // Upload photo to storage
      const photoBlob = await fetch(result.photoUrl).then((r) => r.blob());
      const fileName = `capture_${Date.now()}.jpg`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('visit-frames')
        .upload(filePath, photoBlob, { contentType: 'image/jpeg' });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from('visit-frames').getPublicUrl(filePath);

      // Save to extracted_frames table
      const { error: insertError } = await supabase.from('extracted_frames').insert({
        visit_session_id: projectId, // Will be updated with actual session
        frame_url: urlData.publicUrl,
        timestamp_seconds: Date.now() / 1000,
        analysis_result: finalAnalysis as any,
        detected_elements: finalAnalysis.elements as any,
        detected_materials: finalAnalysis.materials as any,
        detected_pathologies: finalAnalysis.pathologies as any,
        edl_tags: {
          room_type: finalAnalysis.room_type,
          general_state: finalAnalysis.general_state,
          element_type: finalAnalysis.elements[0]?.name || null,
        },
        is_key_frame: (finalAnalysis.technical_elements?.length || 0) > 0,
      });

      if (insertError) {
        console.error('[CaptureAI] Insert error:', insertError);
      }

      // Save generated tasks
      for (const task of finalAnalysis.generated_tasks) {
        await supabase.from('extracted_tasks').insert({
          project_id: projectId,
          title: task.title,
          description: task.description,
          source_type: 'photo',
          image_url: urlData.publicUrl,
          priority: task.priority,
        });
      }

      setLastResult((prev) => (prev ? { ...prev, saved: true } : null));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMessage);
      return false;
    }
  }, [projectId]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    lastResult,
    error,
    analyzePhoto,
    createDraftResult,
    saveToEDL,
    clearResult,
    livePreviewEnabled,
    setLivePreviewEnabled,
  };
}

// Helper functions
function generateDescription(analysis: any): string {
  const parts: string[] = [];
  
  if (analysis.room_type) {
    parts.push(`${analysis.room_type}`);
  }
  
  if (analysis.general_state) {
    const stateLabels: Record<string, string> = {
      bon: 'en bon état général',
      moyen: 'en état moyen',
      mauvais: 'en mauvais état'
    };
    parts.push(stateLabels[analysis.general_state] || '');
  }

  if (analysis.elements?.length > 0) {
    const elementNames = analysis.elements.slice(0, 3).map((e: any) => e.name);
    parts.push(`Éléments observés : ${elementNames.join(', ')}`);
  }

  if (analysis.pathologies?.length > 0) {
    parts.push(`${analysis.pathologies.length} anomalie(s) détectée(s)`);
  }

  return parts.join('. ') + '.';
}

function generateTasks(analysis: any): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  // Generate tasks from pathologies
  if (analysis.pathologies) {
    for (const patho of analysis.pathologies) {
      tasks.push({
        title: `Réparer ${patho.type}`,
        description: `${patho.type} détecté(e) - ${patho.location}`,
        ft_code: patho.ft_code || 'FT28',
        ft_label: 'Réparation',
        priority: patho.severity === 'grave' ? 'high' : patho.severity === 'moyenne' ? 'medium' : 'low',
      });
    }
  }

  // Generate tasks from elements in bad condition
  if (analysis.elements) {
    for (const element of analysis.elements) {
      if (element.etat === 'mauvais' || element.etat === 'absent') {
        tasks.push({
          title: element.etat === 'absent' 
            ? `Installer ${element.name}`
            : `Remplacer/réparer ${element.name}`,
          description: element.description || `${element.name} ${element.etat}`,
          ft_code: element.ft_code || 'FT28',
          ft_label: element.ft_label || 'Travaux',
          priority: element.etat === 'absent' ? 'high' : 'medium',
        });
      }
    }
  }

  return tasks;
}
