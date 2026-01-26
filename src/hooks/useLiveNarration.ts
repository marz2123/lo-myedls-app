import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  LiveNarrationSession, 
  VoiceCommand, 
  VoiceIntent, 
  LiveNarrationState,
  AutoAction 
} from '@/types/livenarration';
import type { Json } from '@/integrations/supabase/types';

interface UseLiveNarrationOptions {
  projectId: string;
  onCommandRecognized?: (command: VoiceCommand) => void;
  onRoomChange?: (roomId: string) => void;
  onPhotoTaken?: (photoUrl: string) => void;
  onAnomalyDetected?: (anomaly: Record<string, unknown>) => void;
}

export function useLiveNarration(options: UseLiveNarrationOptions) {
  const { projectId, onCommandRecognized, onRoomChange, onPhotoTaken, onAnomalyDetected } = options;
  
  const [session, setSession] = useState<LiveNarrationSession | null>(null);
  const [state, setState] = useState<LiveNarrationState>({
    isListening: false,
    isProcessing: false,
    currentWaveform: [],
    sessionStatus: 'idle'
  });
  const [user, setUser] = useState<{ id: string } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  // Load user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id } : null);
    });
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.error('Reconnaissance vocale non supportée');
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    
    return recognition;
  }, []);

  // Parse voice command intent
  const parseIntent = useCallback((transcription: string): VoiceIntent => {
    const text = transcription.toLowerCase().trim();
    
    // Room navigation
    if (text.includes('aller') || text.includes('passer') || text.includes('direction')) {
      return 'navigate_room';
    }
    if (text.includes('pièce suivante') || text.includes('suivant')) {
      return 'next_room';
    }
    if (text.includes('pièce précédente') || text.includes('retour')) {
      return 'previous_room';
    }
    
    // Actions
    if (text.includes('photo') || text.includes('prendre') || text.includes('capturer')) {
      return 'take_photo';
    }
    if (text.includes('anomalie') || text.includes('problème') || text.includes('défaut') || text.includes('fissure')) {
      return 'describe_anomaly';
    }
    if (text.includes('état') || text.includes('condition') || text.includes('bon état') || text.includes('mauvais état')) {
      return 'note_condition';
    }
    
    // Session control
    if (text.includes('terminer') || text.includes('finir') || text.includes('fin de visite')) {
      return 'finish_visit';
    }
    if (text.includes('répéter') || text.includes('répète')) {
      return 'repeat';
    }
    if (text.includes('aide') || text.includes('help')) {
      return 'help';
    }
    if (text.includes('oui') || text.includes('confirme') || text.includes('valider')) {
      return 'confirm';
    }
    if (text.includes('non') || text.includes('annuler') || text.includes('cancel')) {
      return 'cancel';
    }
    if (text.includes('rapport') || text.includes('générer')) {
      return 'generate_report';
    }
    
    return 'unknown';
  }, []);

  // Start waveform visualization
  const startWaveformVisualization = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const normalized = Array.from(dataArray).map(v => v / 255);
        setState(prev => ({ ...prev, currentWaveform: normalized }));
        
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      
      updateWaveform();
    } catch (error) {
      console.error('Error starting waveform:', error);
    }
  }, []);

  // Stop waveform visualization
  const stopWaveformVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  // End session
  const endSession = useCallback(async () => {
    if (!session) return null;
    
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopWaveformVisualization();
    
    const duration = sessionStartRef.current 
      ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      : 0;
    
    // Update session
    const { error } = await supabase
      .from('edl_livenarration_sessions')
      .update({
        status: 'completed',
        duration_seconds: duration,
        ended_at: new Date().toISOString()
      })
      .eq('id', session.id);
    
    if (error) {
      console.error('Error ending session:', error);
    }
    
    setState(prev => ({ 
      ...prev, 
      isListening: false, 
      sessionStatus: 'idle',
      currentWaveform: []
    }));
    
    const completedSession = { ...session, status: 'completed' as const, durationSeconds: duration };
    setSession(completedSession);
    toast.success('Session terminée');
    
    return completedSession;
  }, [session, stopWaveformVisualization]);

  // Process voice command
  const processCommand = useCallback(async (transcription: string) => {
    if (!session || !user) return;
    
    setState(prev => ({ ...prev, isProcessing: true }));
    
    const intent = parseIntent(transcription);
    const startTime = Date.now();
    
    const command: Omit<VoiceCommand, 'id' | 'createdAt'> = {
      sessionId: session.id,
      edlId: session.edlId,
      roomId: state.currentRoom,
      transcription,
      intent,
      confidenceScore: 0.85,
      processingTimeMs: Date.now() - startTime
    };
    
    // Save command to database
    const { data, error } = await supabase
      .from('edl_voice_commands')
      .insert({
        user_id: user.id,
        session_id: session.id,
        edl_id: session.edlId,
        room_id: state.currentRoom,
        transcription,
        intent,
        confidence_score: 0.85,
        processing_time_ms: Date.now() - startTime
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving command:', error);
    }
    
    // Execute intent
    const executedAction: AutoAction = {
      type: 'room_changed',
      timestamp: new Date().toISOString(),
      roomId: state.currentRoom,
      details: { intent, transcription }
    };
    
    switch (intent) {
      case 'take_photo':
        executedAction.type = 'photo_taken';
        onPhotoTaken?.('');
        toast.success('Photo prise');
        break;
      case 'describe_anomaly':
        executedAction.type = 'anomaly_detected';
        onAnomalyDetected?.({ description: transcription });
        toast.info('Anomalie enregistrée');
        break;
      case 'navigate_room':
      case 'next_room':
        onRoomChange?.(transcription);
        break;
      case 'finish_visit':
        await endSession();
        break;
      case 'help':
        toast.info('Dites: "photo", "anomalie", "pièce suivante", "terminer"');
        break;
    }
    
    // Convert to Json-compatible format
    const autoActionsJson: Json = [...(session.autoActions || []).map(a => ({
      type: a.type,
      timestamp: a.timestamp,
      roomId: a.roomId || null,
      details: a.details as Json
    })), {
      type: executedAction.type,
      timestamp: executedAction.timestamp,
      roomId: executedAction.roomId || null,
      details: executedAction.details as Json
    }];
    
    // Update session stats
    await supabase
      .from('edl_livenarration_sessions')
      .update({
        total_commands: (session.totalCommands || 0) + 1,
        auto_actions: autoActionsJson
      })
      .eq('id', session.id);
    
    if (data) {
      onCommandRecognized?.({
        ...command,
        id: data.id,
        createdAt: data.created_at
      } as VoiceCommand);
    }
    
    setState(prev => ({ ...prev, isProcessing: false }));
  }, [session, user, state.currentRoom, parseIntent, onCommandRecognized, onRoomChange, onPhotoTaken, onAnomalyDetected, endSession]);

  // Start session
  const startSession = useCallback(async () => {
    if (!user || !projectId) return;
    
    const { data, error } = await supabase
      .from('edl_livenarration_sessions')
      .insert({
        user_id: user.id,
        project_id: projectId,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erreur démarrage session');
      console.error(error);
      return;
    }
    
    const newSession: LiveNarrationSession = {
      id: data.id,
      userId: data.user_id,
      projectId: data.project_id,
      status: 'active',
      totalCommands: 0,
      totalPhotos: 0,
      totalAnomaliesDetected: 0,
      totalTasksGenerated: 0,
      roomsVisited: [],
      autoActions: [],
      startedAt: data.started_at
    };
    
    setSession(newSession);
    sessionStartRef.current = new Date();
    
    // Start listening
    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      
      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcription = lastResult[0].transcript;
        
        setState(prev => ({ ...prev, liveTranscription: transcription }));
        
        if (lastResult.isFinal) {
          processCommand(transcription);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Erreur reconnaissance vocale');
        }
      };
      
      recognition.onend = () => {
        if (state.sessionStatus === 'active' && recognitionRef.current) {
          recognitionRef.current.start();
        }
      };
      
      recognition.start();
      await startWaveformVisualization();
      
      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        sessionStatus: 'active' 
      }));
      
      toast.success('LiveNarration démarrée');
    }
  }, [user, projectId, initSpeechRecognition, processCommand, startWaveformVisualization, state.sessionStatus]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    if (state.sessionStatus === 'active') {
      recognitionRef.current?.stop();
      setState(prev => ({ ...prev, isListening: false, sessionStatus: 'paused' }));
      toast.info('Pause');
    } else if (state.sessionStatus === 'paused') {
      recognitionRef.current?.start();
      setState(prev => ({ ...prev, isListening: true, sessionStatus: 'active' }));
      toast.info('Reprise');
    }
  }, [state.sessionStatus]);

  // Generate AutoStory from session
  const generateAutoStory = useCallback(async () => {
    if (!session || !projectId || !user) return null;
    
    setState(prev => ({ ...prev, sessionStatus: 'generating' }));
    
    try {
      // Create autostory video entry
      const { data: video, error } = await supabase
        .from('autostory_videos')
        .insert({
          user_id: user.id,
          project_id: projectId,
          title: `LiveNarration - ${new Date().toLocaleDateString('fr-FR')}`,
          status: 'generating'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Link to session
      await supabase
        .from('edl_livenarration_sessions')
        .update({ autostory_video_id: video.id })
        .eq('id', session.id);
      
      // Trigger script generation
      await supabase.functions.invoke('generate-autostory-script', {
        body: {
          projectId,
          edlId: session.edlId,
          sessionData: {
            roomsVisited: session.roomsVisited,
            autoActions: session.autoActions,
            duration: session.durationSeconds
          }
        }
      });
      
      toast.success('Génération AutoStory lancée');
      return video.id;
    } catch (error) {
      console.error('Error generating autostory:', error);
      toast.error('Erreur génération AutoStory');
      return null;
    } finally {
      setState(prev => ({ ...prev, sessionStatus: 'idle' }));
    }
  }, [session, projectId, user]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopWaveformVisualization();
    };
  }, [stopWaveformVisualization]);

  return {
    session,
    state,
    startSession,
    endSession,
    togglePause,
    generateAutoStory,
    isSupported: typeof window !== 'undefined' && 
      (window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}
