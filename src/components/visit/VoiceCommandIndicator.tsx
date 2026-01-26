import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

interface VoiceCommandIndicatorProps {
  enabled: boolean;
  onToggle: () => void;
  onCommand?: (command: string) => void;
  commands?: Array<{
    patterns: string[];
    action: () => void;
    description: string;
  }>;
  className?: string;
}

export const VoiceCommandIndicator = ({
  enabled,
  onToggle,
  onCommand,
  commands = [],
  className,
}: VoiceCommandIndicatorProps) => {
  const [showCommands, setShowCommands] = useState(false);
  
  const {
    isListening,
    isSupported,
    lastCommand,
    interimTranscript,
    toggleListening,
    updateCommand,
  } = useVoiceCommands({
    enabled,
    commands,
    onTranscript: (text) => {
      onCommand?.(text);
    },
  });

  // Sync enabled state
  useEffect(() => {
    if (enabled && !isListening && isSupported) {
      toggleListening();
    } else if (!enabled && isListening) {
      toggleListening();
    }
  }, [enabled, isListening, isSupported, toggleListening]);

  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main button */}
      <Button
        variant={isListening ? 'default' : 'outline'}
        size="icon"
        onClick={onToggle}
        className={cn(
          'h-14 w-14 rounded-full transition-all duration-300',
          isListening && 'bg-primary animate-pulse shadow-lg shadow-primary/30'
        )}
        style={{ minWidth: '56px', minHeight: '56px' }}
      >
        {isListening ? (
          <Mic className="h-6 w-6" />
        ) : (
          <MicOff className="h-6 w-6" />
        )}
      </Button>

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1 w-4 h-4">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
        </div>
      )}

      {/* Live transcript */}
      {isListening && interimTranscript && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-background border rounded-lg px-3 py-2 shadow-lg min-w-[150px] max-w-[250px]">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {interimTranscript}
            </span>
          </div>
        </div>
      )}

      {/* Last command indicator */}
      {lastCommand && (
        <Badge 
          variant="secondary" 
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap animate-fade-in"
        >
          ✓ {lastCommand}
        </Badge>
      )}

      {/* Available commands tooltip */}
      {showCommands && (
        <div className="absolute right-full mr-3 top-0 bg-background border rounded-lg p-3 shadow-lg min-w-[200px] z-50">
          <p className="font-medium text-sm mb-2">Commandes vocales</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• "Suivant" → Élément suivant</p>
            <p>• "Retour" → Retour</p>
            <p>• "Photo" → Prendre photo</p>
            <p>• "Mur/Sol/Plafond" → Zone</p>
            <p>• "Valider" → Enregistrer</p>
          </div>
        </div>
      )}
    </div>
  );
};
