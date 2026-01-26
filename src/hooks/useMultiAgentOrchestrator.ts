import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AgentName,
  AnalysisStatus,
  SessionStatus,
  MultiAgentSession,
  AgentAnalysis, 
  AgentResolution,
  TriggerType,
  AGENT_CONFIGS 
} from '@/types/multiagent';

interface OrchestratorState {
  session: MultiAgentSession | null;
  analyses: AgentAnalysis[];
  resolutions: AgentResolution[];
  isProcessing: boolean;
  currentAgent: AgentName | null;
  progress: number;
  statusMessage: string;
}

interface TriggerOptions {
  projectId: string;
  triggerType: TriggerType;
  triggerItemId?: string;
  imageUrl?: string;
  videoUrl?: string;
  sequenceId?: string;
  agents?: AgentName[];
  autoApplyCorrections?: boolean;
}

export const useMultiAgentOrchestrator = () => {
  const [state, setState] = useState<OrchestratorState>({
    session: null,
    analyses: [],
    resolutions: [],
    isProcessing: false,
    currentAgent: null,
    progress: 0,
    statusMessage: ''
  });

  const updateStatus = useCallback((message: string, progress?: number, agent?: AgentName | null) => {
    setState(prev => ({
      ...prev,
      statusMessage: message,
      progress: progress ?? prev.progress,
      currentAgent: agent !== undefined ? agent : prev.currentAgent
    }));
  }, []);

  const triggerMultiAgentAnalysis = useCallback(async (options: TriggerOptions): Promise<MultiAgentSession | null> => {
    const { projectId, triggerType, agents } = options;
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      statusMessage: 'Initialisation de l\'orchestrateur...',
      currentAgent: 'orchestrator'
    }));

    try {
      // Invoke the multi-agent orchestrator edge function
      const { data, error } = await supabase.functions.invoke('multiagent-orchestrator', {
        body: {
          action: 'analyze',
          projectId,
          triggerType,
          triggerItemId: options.triggerItemId,
          imageUrl: options.imageUrl,
          videoUrl: options.videoUrl,
          sequenceId: options.sequenceId,
          agents: agents || ['vision', 'description', 'task', 'normes', 'coherence', 'quality'],
          autoApplyCorrections: options.autoApplyCorrections ?? true
        }
      });

      if (error) {
        console.error('Orchestrator error:', error);
        toast.error('Erreur Multi-Agent AI', { description: error.message });
        setState(prev => ({ ...prev, isProcessing: false, statusMessage: 'Erreur' }));
        return null;
      }

      const session: MultiAgentSession = {
        id: data.sessionId,
        projectId,
        triggerType,
        status: data.status,
        agentsTriggered: data.agentsTriggered || [],
        agentsCompleted: data.agentsCompleted || [],
        totalAnalyses: data.totalAnalyses || 0,
        totalResolutions: data.totalResolutions || 0,
        overallConfidence: data.overallConfidence || 0,
        qualityScore: data.qualityScore || 0,
        coherenceScore: data.coherenceScore || 0,
        completenessScore: data.completenessScore || 0,
        finalResult: data.finalResult || {},
        processingStartedAt: data.processingStartedAt,
        processingCompletedAt: data.processingCompletedAt
      };

      setState(prev => ({
        ...prev,
        session,
        analyses: data.analyses || [],
        resolutions: data.resolutions || [],
        isProcessing: false,
        progress: 100,
        statusMessage: 'Analyse complète',
        currentAgent: null
      }));

      toast.success('Analyse Multi-Agent terminée', {
        description: `${session.totalAnalyses} analyses, ${session.totalResolutions} corrections`
      });

      return session;
    } catch (err: any) {
      console.error('Orchestrator error:', err);
      toast.error('Erreur Multi-Agent AI', { description: err.message });
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: 'Erreur' }));
      return null;
    }
  }, []);

  const applyResolutions = useCallback(async (resolutionIds: string[]): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('multiagent-orchestrator', {
        body: {
          action: 'apply_resolutions',
          resolutionIds
        }
      });

      if (error) {
        toast.error('Erreur application corrections', { description: error.message });
        return false;
      }

      toast.success('Corrections appliquées', { description: `${resolutionIds.length} corrections appliquées` });
      return true;
    } catch (err: any) {
      toast.error('Erreur', { description: err.message });
      return false;
    }
  }, []);

  const fetchSessionResults = useCallback(async (sessionId: string) => {
    try {
      // Fetch analyses for this session
      const { data: analyses, error: analysesError } = await supabase
        .from('multiagent_analysis')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (analysesError) throw analysesError;

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('multiagent_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Map to our types
      const mappedAnalyses: AgentAnalysis[] = (analyses || []).map(a => ({
        id: a.id,
        projectId: a.project_id,
        sessionId: a.session_id,
        frameId: a.frame_id,
        sequenceId: a.sequence_id,
        agentName: a.agent_name as AgentName,
        resultJson: a.result_json,
        confidence: Number(a.confidence),
        processingTimeMs: a.processing_time_ms,
        status: a.status as AnalysisStatus,
        errorMessage: a.error_message,
        createdAt: a.created_at
      }));

      const session: MultiAgentSession = {
        id: sessionData.id,
        projectId: sessionData.project_id,
        triggerType: sessionData.trigger_type as TriggerType,
        status: sessionData.status as SessionStatus,
        agentsTriggered: (sessionData.agents_triggered || []) as AgentName[],
        agentsCompleted: (sessionData.agents_completed || []) as AgentName[],
        totalAnalyses: sessionData.total_analyses,
        totalResolutions: sessionData.total_resolutions,
        overallConfidence: Number(sessionData.overall_confidence),
        qualityScore: Number(sessionData.quality_score),
        coherenceScore: Number(sessionData.coherence_score),
        completenessScore: Number(sessionData.completeness_score),
        finalResult: (sessionData.final_result || {}) as MultiAgentSession['finalResult'],
        processingStartedAt: sessionData.processing_started_at,
        processingCompletedAt: sessionData.processing_completed_at
      };

      setState(prev => ({
        ...prev,
        session,
        analyses: mappedAnalyses
      }));

      return { session, analyses: mappedAnalyses };
    } catch (err: any) {
      console.error('Error fetching session:', err);
      toast.error('Erreur chargement session');
      return null;
    }
  }, []);

  const getAgentConfig = useCallback((agentName: AgentName) => {
    return AGENT_CONFIGS[agentName];
  }, []);

  const reset = useCallback(() => {
    setState({
      session: null,
      analyses: [],
      resolutions: [],
      isProcessing: false,
      currentAgent: null,
      progress: 0,
      statusMessage: ''
    });
  }, []);

  return {
    ...state,
    triggerMultiAgentAnalysis,
    applyResolutions,
    fetchSessionResults,
    getAgentConfig,
    reset
  };
};
