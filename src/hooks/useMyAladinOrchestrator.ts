import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Conversation state for MyAladin flow
interface ConversationState {
  step: 'init' | 'identify_project' | 'identify_edl_type' | 'select_capture_mode' | 'capturing' | 'processing' | 'review' | 'complete';
  projectId?: string;
  projectName?: string;
  edlType?: 'avant_travaux' | 'apres_travaux' | 'entree' | 'sortie';
  captureMode?: 'video' | 'photos_notes';
  pendingQuestion?: string;
}

interface EDLSummary {
  resumeGlobal: string;
  parPieces: Array<{
    piece: string;
    etatGeneral: 'bon' | 'moyen' | 'mauvais';
    pointsForts: string[];
    pointsFaibles: string[];
  }>;
}

interface StructuredTask {
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string;
  taskName: string;
  description: string;
  pieceOrZone: string;
  priority: 'haute' | 'normale' | 'basse';
  status: 'à faire';
  observations: string;
}

interface OrchestrationResult {
  message: string;
  action?: string;
  tasks?: StructuredTask[];
  report?: any;
  edlSummary?: EDLSummary;
  conversationState?: ConversationState;
  voiceGuidance?: string;
  statusUpdates?: string[];
  captureMode?: 'video' | 'photos_notes';
  suggestions?: Array<{ id: string; name: string }>;
}

interface MediaData {
  type: 'video' | 'photo' | 'audio';
  base64?: string;
  url?: string;
}

export const useMyAladinOrchestrator = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<OrchestrationResult | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);

  const orchestrate = useCallback(async (
    action: 'start_edl' | 'continue_flow' | 'process_media' | 'extract_tasks' | 'generate_report' | 'validate' | 'modify' | 'chat',
    options: {
      projectId?: string;
      userResponse?: string;
      conversationState?: ConversationState;
      mediaData?: MediaData[];
      message?: string;
      conversationId?: string;
      context?: any;
    } = {}
  ): Promise<OrchestrationResult | null> => {
    setIsProcessing(true);
    setCurrentAction(action);

    try {
      const { data, error } = await supabase.functions.invoke('myaladin-orchestrator', {
        body: {
          action,
          ...options,
          conversationState: options.conversationState || conversationState
        }
      });

      if (error) {
        console.error('Orchestration error:', error);
        toast.error('Erreur MyAladin', {
          description: error.message || 'Impossible de traiter la demande'
        });
        return null;
      }

      // Update conversation state if returned
      if (data?.conversationState) {
        setConversationState(data.conversationState);
      }

      setLastResult(data);
      return data;
    } catch (error: any) {
      console.error('Orchestration error:', error);
      toast.error('Erreur MyAladin', {
        description: error.message || 'Une erreur est survenue'
      });
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  }, [conversationState]);

  const startEDL = useCallback(async () => {
    return await orchestrate('start_edl');
  }, [orchestrate]);

  const continueFlow = useCallback(async (userResponse: string) => {
    return await orchestrate('continue_flow', { userResponse });
  }, [orchestrate]);

  const processMedia = useCallback(async (mediaData: MediaData[], projectId?: string, context?: any) => {
    return await orchestrate('process_media', { mediaData, projectId, context });
  }, [orchestrate]);

  const extractTasks = useCallback(async (projectId: string, context?: any) => {
    return await orchestrate('extract_tasks', { projectId, context });
  }, [orchestrate]);

  const generateReport = useCallback(async (projectId: string) => {
    return await orchestrate('generate_report', { projectId });
  }, [orchestrate]);

  const validateEDL = useCallback(async (projectId: string, context?: any) => {
    return await orchestrate('validate', { projectId, context });
  }, [orchestrate]);

  const modifyTask = useCallback(async (message: string, context?: any) => {
    return await orchestrate('modify', { message, context });
  }, [orchestrate]);

  const chat = useCallback(async (message: string, conversationId?: string, context?: any) => {
    return await orchestrate('chat', { message, conversationId, context });
  }, [orchestrate]);

  const resetConversation = useCallback(() => {
    setConversationState(null);
    setLastResult(null);
  }, []);

  return {
    isProcessing,
    currentAction,
    lastResult,
    conversationState,
    startEDL,
    continueFlow,
    processMedia,
    extractTasks,
    generateReport,
    validateEDL,
    modifyTask,
    chat,
    resetConversation,
    orchestrate
  };
};
