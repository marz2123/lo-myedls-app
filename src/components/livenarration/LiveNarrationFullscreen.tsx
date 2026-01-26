import React, { useState } from 'react';
import { X, Mic, Pause, Play, Square, Camera, AlertTriangle, ChevronRight, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useLiveNarration } from '@/hooks/useLiveNarration';
import { cn } from '@/lib/utils';

interface LiveNarrationFullscreenProps {
  projectId: string;
  onClose: () => void;
  onComplete?: (sessionId: string, generateAutoStory: boolean) => void;
}

export function LiveNarrationFullscreen({ projectId, onClose, onComplete }: LiveNarrationFullscreenProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  
  const {
    session,
    state,
    startSession,
    endSession,
    togglePause
  } = useLiveNarration({ projectId });

  const handleEnd = async (generateStory: boolean) => {
    const completedSession = await endSession();
    if (completedSession) {
      onComplete?.(completedSession.id, generateStory);
    }
    onClose();
  };

  const statusColor = {
    active: 'text-green-400',
    paused: 'text-yellow-400',
    idle: 'text-muted-foreground',
    generating: 'text-primary'
  }[state.sessionStatus];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", 
            state.sessionStatus === 'active' && "bg-green-500 animate-pulse",
            state.sessionStatus === 'paused' && "bg-yellow-500",
            state.sessionStatus === 'idle' && "bg-muted-foreground/30"
          )} />
          <span className={cn("font-medium", statusColor)}>
            {state.sessionStatus === 'active' && 'Écoute active'}
            {state.sessionStatus === 'paused' && 'En pause'}
            {state.sessionStatus === 'idle' && 'Prêt à démarrer'}
          </span>
        </div>
        
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* Stats */}
        {session && (
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-1">
              <Camera className="h-3 w-3" />
              {session.totalPhotos}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {session.totalAnomaliesDetected}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ChevronRight className="h-3 w-3" />
              {session.roomsVisited?.length || 0} pièces
            </Badge>
          </div>
        )}

        {/* Large Waveform */}
        <div className="w-full max-w-md bg-muted/30 rounded-2xl p-6">
          <WaveformVisualizer 
            waveform={state.currentWaveform} 
            isActive={state.isListening}
            className="h-24"
          />
        </div>

        {/* Live Transcription */}
        <div className="min-h-[80px] max-w-lg text-center">
          {state.liveTranscription ? (
            <p className="text-xl text-muted-foreground italic">
              "{state.liveTranscription}"
            </p>
          ) : state.sessionStatus === 'active' ? (
            <p className="text-muted-foreground">
              Parlez naturellement...
            </p>
          ) : null}
        </div>

        {/* Current Room */}
        {state.currentRoom && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Pièce actuelle</span>
            <p className="text-2xl font-bold">{state.currentRoom}</p>
          </div>
        )}

        {/* Main Controls */}
        <div className="flex items-center gap-6">
          {state.sessionStatus === 'idle' ? (
            <Button 
              size="lg" 
              onClick={startSession}
              className="h-20 w-20 rounded-full"
            >
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={togglePause}
                className="h-14 w-14 rounded-full"
              >
                {state.sessionStatus === 'paused' ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </Button>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowEndDialog(true)}
                className="h-20 w-20 rounded-full"
              >
                <Square className="h-8 w-8" />
              </Button>
            </>
          )}
        </div>

        {/* Help Text */}
        {state.sessionStatus === 'active' && (
          <div className="text-center text-sm text-muted-foreground max-w-md">
            <p className="font-medium mb-2">Commandes vocales:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">"Photo"</Badge>
              <Badge variant="outline">"Anomalie..."</Badge>
              <Badge variant="outline">"Pièce suivante"</Badge>
              <Badge variant="outline">"Terminer"</Badge>
            </div>
          </div>
        )}
      </div>

      {/* End Session Dialog */}
      {showEndDialog && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-xl border">
            <h3 className="text-xl font-semibold text-center">
              Terminer la session ?
            </h3>
            
            <div className="space-y-3">
              <Button 
                className="w-full gap-2" 
                onClick={() => handleEnd(true)}
              >
                <Wand2 className="h-4 w-4" />
                Terminer + AutoStory
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleEnd(false)}
              >
                Terminer sans vidéo
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setShowEndDialog(false)}
              >
                Continuer la visite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
