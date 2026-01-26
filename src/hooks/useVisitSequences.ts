import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  VisitSequence,
  IdentifiedProblem,
  ProblemTask,
  ConditionState,
  ZoneType,
} from '@/types/businessModel';

export const useVisitSequences = (projectId: string | undefined) => {
  const [sequences, setSequences] = useState<VisitSequence[]>([]);
  const [problems, setProblems] = useState<IdentifiedProblem[]>([]);
  const [tasks, setTasks] = useState<ProblemTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSequence, setCurrentSequence] = useState<VisitSequence | null>(null);

  const loadDtcMaps = async () => {
    const [ftResult, ctResult, scResult] = await Promise.all([
      supabase.from('ft_familles').select('id, ft_label'),
      supabase.from('ct_categories').select('id, ct_label'),
      supabase.from('sc_sous_categories').select('id, sc_label'),
    ]);

    return {
      ftMap: new Map(ftResult.data?.map(ft => [ft.id, ft]) || []),
      ctMap: new Map(ctResult.data?.map(ct => [ct.id, ct]) || []),
      scMap: new Map(scResult.data?.map(sc => [sc.id, sc]) || []),
    };
  };

  const mapTaskWithDtc = (task: any, maps: { ftMap: Map<any, any>; ctMap: Map<any, any>; scMap: Map<any, any>; }): ProblemTask => {
    const ft = task.family_id ? maps.ftMap.get(task.family_id) : null;
    const ct = task.category_id ? maps.ctMap.get(task.category_id) : null;
    const sc = task.subcategory_id ? maps.scMap.get(task.subcategory_id) : null;

    return {
      ...task,
      family_name: ft?.ft_label,
      category_name: ct?.ct_label,
      subcategory_name: sc?.sc_label,
    } as ProblemTask;
  };

  // Load all sequences and related data for a project
  const loadSequences = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      // Load sequences
      const { data: seqData } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });
      
      setSequences((seqData || []) as VisitSequence[]);

      // Load problems
      const { data: probData } = await supabase
        .from('identified_problems')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      setProblems((probData || []) as IdentifiedProblem[]);

      // Load tasks and DTC labels
      const [taskResult, maps] = await Promise.all([
        supabase
          .from('problem_tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        loadDtcMaps(),
      ]);

      const tasksWithNames = (taskResult.data || []).map(t => mapTaskWithDtc(t, maps));
      setTasks(tasksWithNames);

    } catch (error) {
      console.error('Error loading sequences:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSequences();
  }, [loadSequences]);

  // Start a new visit sequence
  const startSequence = async (
    partId?: string, 
    locationId?: string,
    options?: {
      endroitName?: string;
      zoneType?: string;
      description?: string;
    }
  ) => {
    if (!projectId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Stocker endroit_name, zone_type et description dans metadata (comme lo-myhome)
      const { data, error } = await supabase
        .from('visit_sequences')
        .insert({
          project_id: projectId,
          part_id: partId,
          location_id: locationId,
          user_id: user.id,
          status: 'recording',
          photos: [],
          detected_zones: options?.zoneType ? [options.zoneType] : [],
          metadata: {
            endroit_name: options?.endroitName || null,
            zone_type: options?.zoneType || null,
            description: options?.description || null,
          },
        })
        .select()
        .single();
      
      if (error) throw error;
      const sequence = data as VisitSequence;
      setSequences(prev => [sequence, ...prev]);
      setCurrentSequence(sequence);
      return sequence;
    } catch (error) {
      console.error('Error starting sequence:', error);
      toast.error('Erreur lors du démarrage de la séquence');
      return null;
    }
  };

  // End current sequence
  const endSequence = async (sequenceId: string, videoUrl?: string, audioUrl?: string) => {
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .update({
          status: 'processing',
          ended_at: new Date().toISOString(),
          video_url: videoUrl,
          audio_url: audioUrl,
        })
        .eq('id', sequenceId)
        .select()
        .single();
      
      if (error) throw error;
      setSequences(prev => prev.map(s => s.id === sequenceId ? data as VisitSequence : s));
      setCurrentSequence(null);
      return data;
    } catch (error) {
      console.error('Error ending sequence:', error);
      toast.error('Erreur lors de la fin de la séquence');
      return null;
    }
  };

  // Update sequence with AI analysis results
  const updateSequenceAnalysis = async (
    sequenceId: string,
    analysis: {
      transcription?: string;
      detected_condition?: ConditionState;
      detected_zones?: ZoneType[];
      ai_analysis?: Record<string, any>;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .update({
          ...analysis,
          status: 'completed',
        })
        .eq('id', sequenceId)
        .select()
        .single();
      
      if (error) throw error;
      setSequences(prev => prev.map(s => s.id === sequenceId ? data as VisitSequence : s));
      return data;
    } catch (error) {
      console.error('Error updating sequence analysis:', error);
      return null;
    }
  };

  // Add photos to sequence
  const addPhotosToSequence = async (sequenceId: string, photoUrls: string[]) => {
    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence) return null;

    try {
      const newPhotos = [...(sequence.photos || []), ...photoUrls];
      const { data, error } = await supabase
        .from('visit_sequences')
        .update({ photos: newPhotos })
        .eq('id', sequenceId)
        .select()
        .single();
      
      if (error) throw error;
      setSequences(prev => prev.map(s => s.id === sequenceId ? data as VisitSequence : s));
      return data;
    } catch (error) {
      console.error('Error adding photos:', error);
      return null;
    }
  };

  // Create a problem from a sequence
  const createProblem = async (
    data: Partial<IdentifiedProblem> & { title: string }
  ) => {
    if (!projectId) return null;

    try {
      const { data: created, error } = await supabase
        .from('identified_problems')
        .insert({
          ...data,
          project_id: projectId,
          photo_urls: data.photo_urls || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      setProblems(prev => [created as IdentifiedProblem, ...prev]);
      return created;
    } catch (error) {
      console.error('Error creating problem:', error);
      toast.error('Erreur lors de la création du problème');
      return null;
    }
  };

  // Create a task linked to a problem
  const createTask = async (
    problemId: string,
    data: Partial<ProblemTask> & { title: string }
  ) => {
    if (!projectId) return null;

    try {
      const { data: created, error } = await supabase
        .from('problem_tasks')
        .insert({
          ...data,
          problem_id: problemId,
          project_id: projectId,
          photo_urls: data.photo_urls || [],
        })
        .single();
      
      if (error) throw error;
      
      const maps = await loadDtcMaps();
      const taskWithNames = mapTaskWithDtc(created, maps);
      
      setTasks(prev => [taskWithNames, ...prev]);
      return taskWithNames;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erreur lors de la création de la tâche');
      return null;
    }
  };

  // Update a task
  const updateTask = async (taskId: string, data: Partial<ProblemTask>) => {
    try {
      const { data: updated, error } = await supabase
        .from('problem_tasks')
        .update(data)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      
      const maps = await loadDtcMaps();
      const taskWithNames = mapTaskWithDtc(updated, maps);
      
      setTasks(prev => prev.map(t => t.id === taskId ? taskWithNames : t));
      return taskWithNames;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erreur lors de la mise à jour');
      return null;
    }
  };

  // Delete a problem (cascades to tasks)
  const deleteProblem = async (problemId: string) => {
    try {
      const { error } = await supabase
        .from('identified_problems')
        .delete()
        .eq('id', problemId);
      
      if (error) throw error;
      setProblems(prev => prev.filter(p => p.id !== problemId));
      setTasks(prev => prev.filter(t => t.problem_id !== problemId));
      toast.success('Problème supprimé');
    } catch (error) {
      console.error('Error deleting problem:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Delete a sequence
  const deleteSequence = async (sequenceId: string) => {
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .delete()
        .eq('id', sequenceId);
      
      if (error) throw error;
      setSequences(prev => prev.filter(s => s.id !== sequenceId));
      toast.success('Séquence supprimée');
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Get sequences for a specific location
  const getSequencesForLocation = (locationId: string) => {
    return sequences.filter(s => s.location_id === locationId);
  };

  // Get problems for a specific sequence
  const getProblemsForSequence = (sequenceId: string) => {
    return problems.filter(p => p.sequence_id === sequenceId);
  };

  // Get tasks for a specific problem
  const getTasksForProblem = (problemId: string) => {
    return tasks.filter(t => t.problem_id === problemId);
  };

  // Get all tasks for a location (across all problems)
  const getTasksForLocation = (locationId: string) => {
    return tasks.filter(t => t.location_id === locationId);
  };

  // Set user condition override
  const setUserCondition = async (sequenceId: string, condition: ConditionState) => {
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({ user_condition: condition })
        .eq('id', sequenceId);
      
      if (error) throw error;
      setSequences(prev => 
        prev.map(s => s.id === sequenceId ? { ...s, user_condition: condition } : s)
      );
    } catch (error) {
      console.error('Error setting condition:', error);
    }
  };

  // Analyze a completed sequence with AI
  const analyzeSequence = async (
    sequenceId: string,
    options: {
      transcription?: string;
      photoUrls?: string[];
      videoUrl?: string;
    } = {}
  ) => {
    const sequence = sequences.find(s => s.id === sequenceId);
    if (!sequence) return null;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-visit-sequence', {
        body: {
          sequenceId,
          projectId,
          partId: sequence.part_id,
          locationId: sequence.location_id,
          transcription: options.transcription,
          photoUrls: options.photoUrls || sequence.photos,
          videoUrl: options.videoUrl || sequence.video_url,
        }
      });

      if (error) throw error;

      // Reload data to get new problems and tasks
      await loadSequences();

      return data;
    } catch (error) {
      console.error('Error analyzing sequence:', error);
      toast.error('Erreur lors de l\'analyse IA');
      return null;
    }
  };

  // Confirm a problem (after AI detection)
  const confirmProblem = async (problemId: string, confirmed: boolean) => {
    try {
      const { error } = await supabase
        .from('identified_problems')
        .update({ is_confirmed: confirmed })
        .eq('id', problemId);
      
      if (error) throw error;
      setProblems(prev => 
        prev.map(p => p.id === problemId ? { ...p, is_confirmed: confirmed } : p)
      );
    } catch (error) {
      console.error('Error confirming problem:', error);
    }
  };

  // Resolve a problem
  const resolveProblem = async (problemId: string) => {
    try {
      const { error } = await supabase
        .from('identified_problems')
        .update({ is_resolved: true })
        .eq('id', problemId);
      
      if (error) throw error;
      setProblems(prev => 
        prev.map(p => p.id === problemId ? { ...p, is_resolved: true } : p)
      );
      toast.success('Problème marqué comme résolu');
    } catch (error) {
      console.error('Error resolving problem:', error);
    }
  };

  return {
    sequences,
    problems,
    tasks,
    loading,
    currentSequence,
    loadSequences,
    startSequence,
    endSequence,
    updateSequenceAnalysis,
    addPhotosToSequence,
    createProblem,
    createTask,
    updateTask,
    deleteProblem,
    deleteSequence,
    getSequencesForLocation,
    getProblemsForSequence,
    getTasksForProblem,
    getTasksForLocation,
    setUserCondition,
    analyzeSequence,
    confirmProblem,
    resolveProblem,
  };
};
