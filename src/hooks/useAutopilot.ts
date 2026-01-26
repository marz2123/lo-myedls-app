import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AutopilotSession {
  id: string;
  project_id: string;
  status: 'recording' | 'processing' | 'analyzing' | 'generating' | 'ready' | 'validated' | 'error';
  video_url?: string;
  duration_seconds?: number;
  total_rooms_detected: number;
  total_elements_detected: number;
  total_anomalies_detected: number;
  total_tasks_generated: number;
  total_photos_extracted: number;
  overall_confidence_score: number;
  edl_report_json?: any;
  created_at: string;
}

export interface AutopilotSegment {
  id: string;
  segment_index: number;
  room_type: string;
  room_label: string;
  start_time_seconds: number;
  end_time_seconds: number;
  confidence_score: number;
  preview_frame_url?: string;
  elements_detected: any[];
  anomalies_detected: any[];
  global_state: string;
  description_generated: string;
  tasks_generated: any[];
}

export interface AutopilotProgress {
  phase: 'idle' | 'recording' | 'uploading' | 'segmenting' | 'analyzing' | 'generating' | 'complete';
  progress: number;
  message: string;
  currentRoom?: string;
  roomsProcessed: number;
  totalRooms: number;
}

export const useAutopilot = (projectId: string) => {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);
  const [session, setSession] = useState<AutopilotSession | null>(null);
  const [segments, setSegments] = useState<AutopilotSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AutopilotProgress>({
    phase: 'idle',
    progress: 0,
    message: '',
    roomsProcessed: 0,
    totalRooms: 0
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<{ url: string; timestamp: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new autopilot session
  const createSession = useCallback(async () => {
    if (!userId) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('autopilot_sessions')
        .insert({
          project_id: projectId,
          user_id: userId,
          status: 'recording'
        })
        .select()
        .single();

      if (error) throw error;
      
      setSession(data as AutopilotSession);
      return data;
    } catch (error) {
      console.error('Error creating autopilot session:', error);
      toast.error('Erreur lors de la création de la session');
      return null;
    }
  }, [projectId, userId]);

  // Start video recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true
      });

      // Create session first
      const newSession = await createSession();
      if (!newSession) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Setup video element for frame extraction
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      videoRef.current = video;

      // Setup canvas for frame capture
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      framesRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start frame extraction every 2 seconds
      let startTime = Date.now();
      frameIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
            const timestamp = (Date.now() - startTime) / 1000;
            framesRef.current.push({ url: dataUrl, timestamp });
          }
        }
      }, 2000);

      mediaRecorder.start(1000);
      
      setProgress({
        phase: 'recording',
        progress: 0,
        message: 'Enregistrement en cours... Filmez chaque pièce lentement.',
        roomsProcessed: 0,
        totalRooms: 0
      });

      toast.success('Enregistrement démarré');
      return stream;
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Erreur d\'accès à la caméra');
      return null;
    }
  }, [createSession]);

  // Stop recording and process
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && session) {
      mediaRecorderRef.current.stop();
      
      // Stop frame extraction
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      // Stop video stream
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }

      setProgress({
        phase: 'uploading',
        progress: 10,
        message: 'Téléchargement de la vidéo...',
        roomsProcessed: 0,
        totalRooms: 0
      });

      setIsProcessing(true);

      try {
        // Upload video
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoPath = `autopilot/${session.id}/scan.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('visit-videos')
          .upload(videoPath, videoBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('visit-videos')
          .getPublicUrl(videoPath);

        // Upload frames to storage
        setProgress({
          phase: 'segmenting',
          progress: 30,
          message: 'Segmentation des pièces...',
          roomsProcessed: 0,
          totalRooms: framesRef.current.length
        });

        const uploadedFrames: { url: string; timestamp: number }[] = [];
        
        for (let i = 0; i < framesRef.current.length; i++) {
          const frame = framesRef.current[i];
          // Convert data URL to blob
          const response = await fetch(frame.url);
          const blob = await response.blob();
          
          const framePath = `autopilot/${session.id}/frame-${i}.jpg`;
          const { error: frameError } = await supabase.storage
            .from('visit-frames')
            .upload(framePath, blob);

          if (!frameError) {
            const { data: { publicUrl: frameUrl } } = supabase.storage
              .from('visit-frames')
              .getPublicUrl(framePath);
            
            uploadedFrames.push({ url: frameUrl, timestamp: frame.timestamp });
          }

          setProgress(prev => ({
            ...prev,
            progress: 30 + (i / framesRef.current.length) * 20,
            roomsProcessed: i + 1
          }));
        }

        // Process with AI
        setProgress({
          phase: 'analyzing',
          progress: 50,
          message: 'Analyse IA en cours...',
          roomsProcessed: 0,
          totalRooms: uploadedFrames.length
        });

        const { data: processResult, error: processError } = await supabase.functions.invoke('process-autopilot', {
          body: {
            sessionId: session.id,
            videoUrl: publicUrl,
            frames: uploadedFrames
          }
        });

        if (processError) throw processError;

        setProgress({
          phase: 'generating',
          progress: 90,
          message: 'Génération du rapport EDL...',
          roomsProcessed: processResult?.summary?.roomsDetected || 0,
          totalRooms: processResult?.summary?.roomsDetected || 0
        });

        // Fetch updated session and segments
        await fetchSession();
        await fetchSegments();

        setProgress({
          phase: 'complete',
          progress: 100,
          message: 'Analyse terminée !',
          roomsProcessed: processResult?.summary?.roomsDetected || 0,
          totalRooms: processResult?.summary?.roomsDetected || 0
        });

        toast.success(`EDL généré : ${processResult?.summary?.roomsDetected || 0} pièces détectées`);
      } catch (error) {
        console.error('Error processing autopilot:', error);
        toast.error('Erreur lors du traitement');
        setProgress({
          phase: 'idle',
          progress: 0,
          message: 'Erreur lors du traitement',
          roomsProcessed: 0,
          totalRooms: 0
        });
      } finally {
        setIsProcessing(false);
      }
    }
  }, [session]);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!session?.id) return;

    try {
      const { data, error } = await supabase
        .from('autopilot_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (error) throw error;
      setSession(data as AutopilotSession);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }, [session?.id]);

  // Fetch segments
  const fetchSegments = useCallback(async () => {
    if (!session?.id) return;

    try {
      const { data, error } = await supabase
        .from('autopilot_segments')
        .select('*')
        .eq('session_id', session.id)
        .order('segment_index', { ascending: true });

      if (error) throw error;
      setSegments((data || []) as AutopilotSegment[]);
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
  }, [session?.id]);

  // Validate the EDL
  const validateEDL = useCallback(async () => {
    if (!session?.id) return;

    try {
      const { error } = await supabase
        .from('autopilot_sessions')
        .update({ status: 'validated' })
        .eq('id', session.id);

      if (error) throw error;
      
      await fetchSession();
      toast.success('EDL validé avec succès');
    } catch (error) {
      console.error('Error validating EDL:', error);
      toast.error('Erreur lors de la validation');
    }
  }, [session?.id, fetchSession]);

  // Load existing sessions for project
  const loadProjectSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('autopilot_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSession(data[0] as AutopilotSession);
        
        // Load segments if session is ready
        if (data[0].status === 'ready' || data[0].status === 'validated') {
          const { data: segmentsData } = await supabase
            .from('autopilot_segments')
            .select('*')
            .eq('session_id', data[0].id)
            .order('segment_index', { ascending: true });
          
          setSegments((segmentsData || []) as AutopilotSegment[]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, [projectId]);

  return {
    session,
    segments,
    isProcessing,
    progress,
    startRecording,
    stopRecording,
    validateEDL,
    loadProjectSessions,
    fetchSession,
    fetchSegments
  };
};

export default useAutopilot;
