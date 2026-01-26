import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface VoiceCommand {
  patterns: string[];
  action: () => void;
  description: string;
}

interface UseVoiceCommandsOptions {
  enabled?: boolean;
  language?: string;
  onTranscript?: (text: string) => void;
  commands?: VoiceCommand[];
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Default navigation commands for hands-free operation
const DEFAULT_COMMANDS: VoiceCommand[] = [
  { patterns: ['suivant', 'prochain', 'next'], action: () => {}, description: 'Aller à l\'élément suivant' },
  { patterns: ['précédent', 'retour', 'back'], action: () => {}, description: 'Retour à l\'élément précédent' },
  { patterns: ['photo', 'prendre photo', 'capture'], action: () => {}, description: 'Prendre une photo' },
  { patterns: ['valider', 'enregistrer', 'sauvegarder', 'ok'], action: () => {}, description: 'Valider et sauvegarder' },
  { patterns: ['annuler', 'cancel'], action: () => {}, description: 'Annuler' },
  { patterns: ['mur', 'murs'], action: () => {}, description: 'Sélectionner zone Mur' },
  { patterns: ['sol', 'sols'], action: () => {}, description: 'Sélectionner zone Sol' },
  { patterns: ['plafond', 'plafonds'], action: () => {}, description: 'Sélectionner zone Plafond' },
  { patterns: ['fenêtre', 'fenetre', 'fenêtres'], action: () => {}, description: 'Sélectionner zone Fenêtre' },
  { patterns: ['porte', 'portes'], action: () => {}, description: 'Sélectionner zone Porte' },
];

export const useVoiceCommands = (options: UseVoiceCommandsOptions = {}) => {
  const {
    enabled = true,
    language = 'fr-FR',
    onTranscript,
    commands = [],
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const commandsRef = useRef<VoiceCommand[]>([...DEFAULT_COMMANDS, ...commands]);

  // Update commands ref when commands change
  useEffect(() => {
    commandsRef.current = [...DEFAULT_COMMANDS, ...commands];
  }, [commands]);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Process voice commands
  const processCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    for (const command of commandsRef.current) {
      for (const pattern of command.patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          setLastCommand(pattern);
          command.action();
          
          // Haptic feedback if supported
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          return true;
        }
      }
    }
    return false;
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled || !isSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += result + ' ';
        } else {
          interimText += result;
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText);
        onTranscript?.(finalText.trim());
        processCommand(finalText);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      
      console.error('Voice command error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      // Auto-restart for continuous listening
      if (isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart recognition');
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [enabled, isSupported, language, onTranscript, processCommand]);

  // Keep ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      toast.error('Commandes vocales non supportées');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      
      toast.success('🎤 Commandes vocales activées', { duration: 2000 });
    } catch (e) {
      console.error('Failed to start listening:', e);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const updateCommand = useCallback((pattern: string, action: () => void) => {
    const index = commandsRef.current.findIndex(cmd => 
      cmd.patterns.some(p => p.toLowerCase() === pattern.toLowerCase())
    );
    if (index !== -1) {
      commandsRef.current[index].action = action;
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    updateCommand,
  };
};
