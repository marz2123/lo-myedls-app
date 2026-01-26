import React, { useState, useCallback, useEffect } from 'react';
import { MyAladinBubble } from './MyAladinBubble';
import { MyAladinPanel } from './MyAladinPanel';
import { useMyAladinProactive, ProactiveSuggestion } from '@/hooks/useMyAladinProactive';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineMyAladinBadge } from '@/components/offline';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MyAladinCoachProps {
  projectId: string;
  sessionId?: string;
  context?: 'reportage' | 'checklist' | 'report' | 'comparison';
  onNavigateToRoom?: (roomId: string) => void;
  onOpenCaptureHub?: () => void;
  onShowMissingItems?: () => void;
  onCreateTask?: (data?: any) => void;
}

const VOICE_COMMANDS = [
  { pattern: /passe.*(pièce|piece).*suivante/i, action: 'NEXT_ROOM' },
  { pattern: /note.*:?\s*(.+)/i, action: 'ADD_NOTE' },
  { pattern: /valide.*(pièce|piece|cette)/i, action: 'VALIDATE_ROOM' },
  { pattern: /(montre|affiche).*anomalie/i, action: 'SHOW_ANOMALIES' },
  { pattern: /(montre|affiche).*manque/i, action: 'SHOW_MISSING' },
  { pattern: /(créer?|ajoute).*tâche/i, action: 'CREATE_TASK' },
  { pattern: /(prend|capture|photo)/i, action: 'CAPTURE_PHOTO' },
  { pattern: /aide|help/i, action: 'HELP' },
];

export const MyAladinCoach: React.FC<MyAladinCoachProps> = ({
  projectId,
  sessionId,
  context = 'reportage',
  onNavigateToRoom,
  onOpenCaptureHub,
  onShowMissingItems,
  onCreateTask
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const navigate = useNavigate();
  const { trigger } = useHapticFeedback();
  const { isOffline } = useNetworkStatus();

  // Proactive suggestions
  const {
    suggestions,
    isAnalyzing,
    trackActivity,
    dismissSuggestion,
    analyzeAndSuggest
  } = useMyAladinProactive({
    projectId,
    sessionId,
    enabled: true,
    onSuggestion: handleProactiveSuggestion
  });

  // Voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    console.log('Voice command received:', command);
    
    for (const { pattern, action } of VOICE_COMMANDS) {
      const match = command.match(pattern);
      if (match) {
        trigger('medium');
        executeVoiceAction(action, match);
        return;
      }
    }
    
    // Default: treat as a chat message
    setIsPanelOpen(true);
  }, [trigger]);

  const { 
    isListening, 
    startListening, 
    stopListening,
    isSupported: voiceSupported
  } = useVoiceCommands({
    enabled: isVoiceMode,
    onTranscript: handleVoiceCommand
  });

  async function executeVoiceAction(action: string, match: RegExpMatchArray) {
    switch (action) {
      case 'NEXT_ROOM':
        toast.info('Passage à la pièce suivante...');
        // Navigate to next room logic
        break;
        
      case 'ADD_NOTE':
        const noteContent = match[1];
        if (noteContent) {
          toast.success(`Note ajoutée: "${noteContent}"`);
          // Save note logic
        }
        break;
        
      case 'VALIDATE_ROOM':
        toast.success('Pièce validée !');
        trigger('success');
        break;
        
      case 'SHOW_ANOMALIES':
        setIsPanelOpen(true);
        break;
        
      case 'SHOW_MISSING':
        onShowMissingItems?.();
        break;
        
      case 'CREATE_TASK':
        onCreateTask?.();
        break;
        
      case 'CAPTURE_PHOTO':
        onOpenCaptureHub?.();
        break;
        
      case 'HELP':
        setIsPanelOpen(true);
        break;
    }
  }

  function handleProactiveSuggestion(suggestion: ProactiveSuggestion) {
    // Show toast for important suggestions
    if (suggestion.severity === 'critical' || suggestion.severity === 'warning') {
      toast(suggestion.message, {
        action: suggestion.action ? {
          label: suggestion.action.label,
          onClick: () => handleAction(suggestion.action!.type, suggestion.action!.payload)
        } : undefined,
        duration: 5000
      });
      trigger('notification');
    }
  }

  const handleAction = useCallback(async (actionType: string, payload?: any) => {
    trackActivity();
    
    switch (actionType) {
      case 'navigate':
        if (payload?.locationId) {
          onNavigateToRoom?.(payload.locationId);
        } else if (payload?.view === 'missing_items') {
          onShowMissingItems?.();
        }
        break;
        
      case 'add_photo':
        onOpenCaptureHub?.();
        break;
        
      case 'create_task':
        onCreateTask?.(payload);
        break;
        
      case 'validate':
        if (payload?.anomalyIds) {
          await supabase
            .from('detected_anomalies')
            .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
            .in('id', payload.anomalyIds);
          toast.success('Anomalies validées');
          analyzeAndSuggest();
        }
        break;
        
      case 'auto_complete':
        toast.info('Auto-complétion en cours...');
        // Auto-complete logic
        break;

      case 'open_task_creator':
        onCreateTask?.();
        break;

      case 'show_missing_items':
        onShowMissingItems?.();
        break;

      case 'apply_description':
        toast.success('Description appliquée');
        break;

      case 'review_changes':
        toast.info('Revue des modifications');
        break;
    }
  }, [trackActivity, onNavigateToRoom, onOpenCaptureHub, onShowMissingItems, onCreateTask, analyzeAndSuggest]);

  const handleBubbleClick = () => {
    trackActivity();
    setIsPanelOpen(true);
  };

  const handleLongPress = () => {
    trackActivity();
    if (voiceSupported) {
      setIsVoiceMode(true);
      if (!isListening) {
        startListening();
        toast.info('J\'écoute vos commandes vocales...');
      } else {
        stopListening();
        setIsVoiceMode(false);
      }
    } else {
      toast.error('Commandes vocales non supportées sur ce navigateur');
    }
  };

  // Track user activity on interactions
  useEffect(() => {
    const handleInteraction = () => trackActivity();
    window.addEventListener('click', handleInteraction);
    window.addEventListener('scroll', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, [trackActivity]);

  return (
    <>
      <div className="relative">
        <MyAladinBubble
          onClick={handleBubbleClick}
          onLongPress={handleLongPress}
          hasNotification={suggestions.some(s => s.severity === 'warning' || s.severity === 'critical')}
          isListening={isListening}
        />
        <OfflineMyAladinBadge 
          isOffline={isOffline} 
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
        />
      </div>

      <MyAladinPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        projectId={projectId}
        sessionId={sessionId}
        context={context}
        suggestions={suggestions}
        onAction={handleAction}
        onDismissSuggestion={dismissSuggestion}
        isOffline={isOffline}
      />
    </>
  );
};

export default MyAladinCoach;
