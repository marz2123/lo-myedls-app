import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHapticFeedback } from './useHapticFeedback';
import { toast } from 'sonner';

export interface VoiceCommand {
  type: 'navigation' | 'description' | 'anomaly' | 'task' | 'status' | 'validation' | 'query' | 'unknown';
  action: string;
  data?: Record<string, unknown>;
  confidence: number;
  originalText: string;
}

interface UseHandsFreeModeOptions {
  onCommand?: (command: VoiceCommand) => void;
  onTranscript?: (text: string) => void;
  onNavigate?: (action: string) => void;
  onStatusChange?: (status: 'bon' | 'moyen' | 'mauvais') => void;
  onAddDescription?: (text: string) => void;
  onAddAnomaly?: (description: string, type?: string) => void;
  onAddTask?: (title: string) => void;
  onValidateRoom?: () => void;
  onQuery?: (action: string) => void;
}

export function useHandsFreeMode(options: UseHandsFreeModeOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const haptic = useHapticFeedback();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopRecording();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      // Setup audio analyser for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Update audio level for visualization
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      
      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      setIsListening(true);
      setStatusMessage('Je vous écoute…');
      haptic.trigger('recording_start');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
      setIsActive(false);
    }
  }, [haptic]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setStatusMessage('Analyse en cours…');
    
    try {
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte), ''
        )
      );
      
      // Transcribe audio
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
        'transcribe-visit-audio',
        { body: { audio: base64Audio, language: 'fr' } }
      );
      
      if (transcribeError || !transcribeData?.success) {
        throw new Error(transcribeData?.error || 'Transcription failed');
      }
      
      const transcribedText = transcribeData.text_cleaned || transcribeData.text || '';
      setTranscript(transcribedText);
      options.onTranscript?.(transcribedText);
      
      if (!transcribedText.trim()) {
        setStatusMessage('Je n\'ai pas compris. Réessayez.');
        setTimeout(() => setStatusMessage(null), 2000);
        setIsProcessing(false);
        return;
      }
      
      // Classify the command
      const { data: commandData, error: commandError } = await supabase.functions.invoke(
        'voice-command',
        { body: { text: transcribedText } }
      );
      
      if (commandError || !commandData?.success) {
        throw new Error(commandData?.error || 'Command classification failed');
      }
      
      const command: VoiceCommand = commandData.command;
      
      setStatusMessage('Compris.');
      haptic.trigger('piece_complete');
      
      // Execute the command
      await executeCommand(command);
      
      options.onCommand?.(command);
      
      setTimeout(() => {
        setStatusMessage(null);
        setTranscript('');
      }, 2000);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatusMessage('Erreur de traitement');
      haptic.trigger('error');
      setTimeout(() => setStatusMessage(null), 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [options, haptic]);

  const executeCommand = useCallback(async (command: VoiceCommand) => {
    setStatusMessage('J\'exécute la commande…');
    
    switch (command.type) {
      case 'navigation':
        options.onNavigate?.(command.action);
        break;
        
      case 'status':
        if (command.data?.status) {
          options.onStatusChange?.(command.data.status as 'bon' | 'moyen' | 'mauvais');
        }
        break;
        
      case 'description':
        if (command.data?.text) {
          options.onAddDescription?.(command.data.text as string);
        }
        break;
        
      case 'anomaly':
        if (command.data?.description) {
          options.onAddAnomaly?.(
            command.data.description as string,
            command.data.anomalyType as string | undefined
          );
        }
        break;
        
      case 'task':
        if (command.data?.title) {
          options.onAddTask?.(command.data.title as string);
        }
        break;
        
      case 'validation':
        options.onValidateRoom?.();
        break;
        
      case 'query':
        options.onQuery?.(command.action);
        break;
        
      case 'unknown':
        setStatusMessage('Commande non reconnue');
        haptic.selectionChanged();
        break;
    }
  }, [options, haptic]);

  const activate = useCallback(() => {
    setIsActive(true);
    startRecording();
  }, [startRecording]);

  const deactivate = useCallback(() => {
    setIsActive(false);
    stopRecording();
    setStatusMessage(null);
    setTranscript('');
  }, [stopRecording]);

  const toggle = useCallback(() => {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
  }, [isActive, activate, deactivate]);

  // Long press for continuous mode
  const startContinuousMode = useCallback(() => {
    if (!isActive) {
      activate();
    }
  }, [isActive, activate]);

  const stopAndProcess = useCallback(() => {
    if (isListening) {
      stopRecording();
    }
  }, [isListening, stopRecording]);

  return {
    isActive,
    isListening,
    isProcessing,
    transcript,
    statusMessage,
    audioLevel,
    activate,
    deactivate,
    toggle,
    startContinuousMode,
    stopAndProcess,
  };
}
