import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface VoiceCommand {
  patterns: string[];
  action: string;
  description: string;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  {
    patterns: ['pièce suivante', 'piece suivante', 'suivant', 'prochain', 'prochaine', 'next'],
    action: 'NEXT',
    description: 'Pièce suivante',
  },
  {
    patterns: ['retour', 'précédent', 'back', 'arrière'],
    action: 'BACK',
    description: 'Retour',
  },
  {
    patterns: ['photo', 'prends une photo', 'capturer', 'capture', 'snap'],
    action: 'PHOTO',
    description: 'Prendre photo',
  },
  {
    patterns: ['pause', 'stop', 'arrête', 'attends'],
    action: 'PAUSE',
    description: 'Pause',
  },
  {
    patterns: ['reprendre', 'reprends', 'continue', 'continuer', 'resume', 'go'],
    action: 'RESUME',
    description: 'Reprendre',
  },
  {
    patterns: ['mur', 'les murs'],
    action: 'ZONE_MUR',
    description: 'Zone: Mur',
  },
  {
    patterns: ['sol', 'le sol', 'plancher'],
    action: 'ZONE_SOL',
    description: 'Zone: Sol',
  },
  {
    patterns: ['plafond', 'le plafond'],
    action: 'ZONE_PLAFOND',
    description: 'Zone: Plafond',
  },
  {
    patterns: ['fenêtre', 'fenetre', 'fenêtres', 'les fenêtres'],
    action: 'ZONE_FENETRE',
    description: 'Zone: Fenêtre',
  },
  {
    patterns: ['porte', 'les portes'],
    action: 'ZONE_PORTE',
    description: 'Zone: Porte',
  },
  {
    patterns: ['valider', 'enregistrer', 'sauvegarder', 'save', 'ok', 'confirmer'],
    action: 'VALIDATE',
    description: 'Valider',
  },
];

interface UseVoiceNavigationOptions {
  enabled: boolean;
  onCommand: (action: string) => void;
  sensitivityThreshold?: number;
}

interface UseVoiceNavigationReturn {
  isListening: boolean;
  isSupported: boolean;
  lastCommand: string | null;
  lastCommandTime: number | null;
  toggleListening: () => void;
  availableCommands: VoiceCommand[];
}

/**
 * useVoiceNavigation - Voice commands for hands-free navigation
 * 
 * Supports commands in French:
 * - "Pièce suivante" / "Suivant" → Move to next zone
 * - "Retour" → Go back
 * - "Photo" → Take a photo
 * - "Pause" → Pause recording
 * - "Reprendre" → Resume recording
 * - Zone shortcuts: "Mur", "Sol", "Plafond", etc.
 */
export const useVoiceNavigation = ({
  enabled,
  onCommand,
  sensitivityThreshold = 0.6,
}: UseVoiceNavigationOptions): UseVoiceNavigationReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastCommandTime, setLastCommandTime] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const lastCommandRef = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);

  // Haptic feedback
  const triggerHaptic = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        // Haptics not available
      }
    }
  }, []);

  // Match transcript to commands
  const matchCommand = useCallback((transcript: string): VoiceCommand | null => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const cmd of VOICE_COMMANDS) {
      for (const pattern of cmd.patterns) {
        // Check if pattern is contained in transcript
        if (normalizedTranscript.includes(pattern.toLowerCase())) {
          return cmd;
        }
      }
    }
    
    return null;
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('[VoiceNavigation] Web Speech API not supported');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false; // Only final results for commands
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 3;

    recognition.onresult = async (event: any) => {
      // Prevent rapid-fire commands
      if (cooldownRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          console.log('[VoiceNavigation] Heard:', transcript, 'Confidence:', confidence);

          // Check confidence threshold
          if (confidence < sensitivityThreshold) continue;

          const matchedCommand = matchCommand(transcript);
          
          if (matchedCommand) {
            // Prevent duplicate commands
            const now = Date.now();
            if (
              lastCommandRef.current === matchedCommand.action && 
              lastCommandTime && 
              now - lastCommandTime < 2000
            ) {
              continue;
            }

            console.log('[VoiceNavigation] Command matched:', matchedCommand.action);
            
            // Set cooldown
            cooldownRef.current = true;
            setTimeout(() => {
              cooldownRef.current = false;
            }, 1500);

            // Trigger haptic feedback
            await triggerHaptic();

            // Update state
            setLastCommand(matchedCommand.description);
            setLastCommandTime(now);
            lastCommandRef.current = matchedCommand.action;

            // Show subtle toast
            toast.success(`✓ ${matchedCommand.description}`, {
              duration: 1500,
              className: 'text-sm',
            });

            // Execute command
            onCommand(matchedCommand.action);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceNavigation] Error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if enabled
      if (isListeningRef.current && enabled) {
        try {
          setTimeout(() => {
            if (isListeningRef.current) {
              recognitionRef.current?.start();
            }
          }, 100);
        } catch (e) {
          console.warn('[VoiceNavigation] Failed to restart');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // Ignore
      }
    };
  }, [enabled, matchCommand, onCommand, sensitivityThreshold, lastCommandTime, triggerHaptic]);

  // Sync listening state with enabled
  useEffect(() => {
    if (enabled && !isListening && isSupported) {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        console.warn('[VoiceNavigation] Failed to start');
      }
    } else if (!enabled && isListening) {
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
        isListeningRef.current = false;
      } catch (e) {
        // Ignore
      }
    }
  }, [enabled, isListening, isSupported]);

  const toggleListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        toast.error('Erreur démarrage micro');
      }
    }
  }, [isListening, isSupported]);

  return {
    isListening,
    isSupported,
    lastCommand,
    lastCommandTime,
    toggleListening,
    availableCommands: VOICE_COMMANDS,
  };
};
