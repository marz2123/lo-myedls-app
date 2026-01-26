import React from 'react';
import { Mic, MicOff, Pause, Play, Square, Wand2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WaveformVisualizer } from './WaveformVisualizer';
import { useLiveNarration } from '@/hooks/useLiveNarration';
import { cn } from '@/lib/utils';

interface LiveNarrationPanelProps {
  projectId: string;
  onSessionComplete?: (sessionId: string) => void;
  className?: string;
}

export function LiveNarrationPanel({ projectId, onSessionComplete, className }: LiveNarrationPanelProps) {
  const {
    session,
    state,
    startSession,
    endSession,
    togglePause,
    generateAutoStory,
    isSupported
  } = useLiveNarration({ projectId });

  const handleEnd = async () => {
    const completedSession = await endSession();
    if (completedSession) {
      onSessionComplete?.(completedSession.id);
    }
  };

  const handleGenerateAutoStory = async () => {
    const videoId = await generateAutoStory();
    if (videoId) {
      // Navigate to autostory or show dialog
    }
  };

  if (!isSupported) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="p-6 text-center">
          <MicOff className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">
            Reconnaissance vocale non supportée par votre navigateur
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      state.sessionStatus === 'active' && "ring-2 ring-primary",
      className
    )}>
      <CardContent className="p-6 space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              state.sessionStatus === 'active' && "bg-green-500 animate-pulse",
              state.sessionStatus === 'paused' && "bg-yellow-500",
              state.sessionStatus === 'idle' && "bg-muted-foreground/30"
            )} />
            <span className="font-medium">
              {state.sessionStatus === 'active' && 'Écoute...'}
              {state.sessionStatus === 'paused' && 'En pause'}
              {state.sessionStatus === 'idle' && 'Prêt'}
              {state.sessionStatus === 'generating' && 'Génération...'}
            </span>
          </div>
          
          {session && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{session.totalCommands} commandes</Badge>
              <Badge variant="secondary">{session.totalPhotos} photos</Badge>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        <div className="bg-muted/50 rounded-xl p-4">
          <WaveformVisualizer 
            waveform={state.currentWaveform} 
            isActive={state.isListening}
          />
        </div>

        {/* Live Transcription */}
        {state.liveTranscription && (
          <div className="bg-muted/30 rounded-lg p-4 min-h-[60px]">
            <div className="flex items-start gap-2">
              <Volume2 className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-sm italic text-muted-foreground">
                "{state.liveTranscription}"
              </p>
            </div>
          </div>
        )}

        {/* Current Room */}
        {state.currentRoom && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Pièce actuelle:</span>
            <p className="font-semibold text-lg">{state.currentRoom}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {state.sessionStatus === 'idle' ? (
            <Button 
              size="lg" 
              onClick={startSession}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              Démarrer LiveNarration
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={togglePause}
                className="h-12 w-12 rounded-full"
              >
                {state.sessionStatus === 'paused' ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              
              <Button
                variant="destructive"
                size="icon"
                onClick={handleEnd}
                className="h-14 w-14 rounded-full"
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* AutoStory Integration */}
        {session?.status === 'completed' && (
          <div className="pt-4 border-t">
            <Button 
              onClick={handleGenerateAutoStory}
              className="w-full gap-2"
              disabled={state.sessionStatus === 'generating'}
            >
              <Wand2 className="h-4 w-4" />
              {state.sessionStatus === 'generating' 
                ? 'Génération AutoStory...' 
                : 'Générer Film AutoStory'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Créez automatiquement un film narré à partir de cette session
            </p>
          </div>
        )}

        {/* Quick Commands Help */}
        {state.sessionStatus === 'active' && (
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p><strong>Commandes:</strong></p>
            <p>"Photo" • "Anomalie..." • "Pièce suivante" • "Terminer"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
