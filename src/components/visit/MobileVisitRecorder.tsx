import { useState, useRef, useEffect } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SimpleAudioRecorder } from "@/utils/audioRecorder";
import { Video, Square, Eye, AlertCircle, Camera as CameraIcon, Ruler } from "lucide-react";
import { useARScanner } from "@/hooks/useARScanner";
import { ARScanResult } from "@/services/arScanner";

interface MobileVisitRecorderProps {
  projectId: string;
  onVisitComplete: (sessionId: string) => void;
}

export const MobileVisitRecorder = ({ projectId, onVisitComplete }: MobileVisitRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBlock, setCurrentBlock] = useState<string>("En attente...");
  const [detectedRoom, setDetectedRoom] = useState<string>("");
  const [arMeasurements, setArMeasurements] = useState<any>(null);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<SimpleAudioRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { 
    isScanning: isARScanning, 
    arAvailable, 
    startAutoScan, 
    stopAutoScan,
    currentMeasurement
  } = useARScanner();

  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    let sessionId: string | null = null;
    
    try {
      setIsProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });
      
      videoStreamRef.current = stream;
      
      const { data: session, error: sessionError } = await supabase
        .from('visit_sessions')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'recording',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      sessionIdRef.current = session.id;
      sessionId = session.id;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Simple video recording avec collecte de chunks régulière
      videoChunksRef.current = [];
      const videoRecorder = new MediaRecorder(stream);
      
      videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`📹 Chunk vidéo capturé: ${event.data.size} bytes`);
          videoChunksRef.current.push(event.data);
        }
      };
      
      // CRITIQUE: timeslice de 1000ms pour capturer des chunks régulièrement
      videoRecorder.start(1000);
      videoRecorderRef.current = videoRecorder;

      // Start audio recording
      audioRecorderRef.current = new SimpleAudioRecorder();
      await audioRecorderRef.current.start();

      // Start frame capture for AI analysis
      frameIntervalRef.current = setInterval(() => {
        captureAndAnalyzeFrame();
      }, 5000);

      // Start AR scanning
      if (arAvailable) {
        await startAutoScan(handleARMeasurement);
        toast.success('AR scan automatique activé');
      }

      setIsRecording(true);
      setIsProcessing(false);
      setCurrentBlock("Enregistrement en cours...");
      toast.success("Visite démarrée");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      
      if (sessionId) {
        await supabase.from('visit_sessions').delete().eq('id', sessionId);
      }
      
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      
      const errorMessage = error instanceof DOMException && error.name === 'NotAllowedError'
        ? "Permissions caméra/micro refusées"
        : "Erreur lors du démarrage";
      
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  const handleARMeasurement = async (result: ARScanResult) => {
    setArMeasurements(result.measurements);
    setDetectedObjects(result.detectedObjects || []);
    
    if (currentBlockId && result.measurements) {
      try {
        await supabase
          .from('detected_blocks')
          .update({
            volume_data: {
              width: result.measurements.width,
              height: result.measurements.height,
              depth: result.measurements.depth,
              area: result.measurements.area,
              volume: result.measurements.volume,
              confidence: result.measurements.confidence,
              timestamp: result.measurements.timestamp,
              detectedObjects: result.detectedObjects.map(obj => ({
                type: obj.type,
                confidence: obj.confidence,
                position: obj.position,
                dimensions: obj.dimensions,
                timestamp: obj.timestamp
              })),
              objectsSummary: result.objectsSummary
            }
          })
          .eq('id', currentBlockId);
      } catch (error) {
        console.error('Error saving AR measurements:', error);
      }
    }
  };

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !sessionIdRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
      });

      const timestamp = Date.now();
      const fileName = `frame_${timestamp}.jpg`;
      const filePath = `${sessionIdRef.current}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('visit-frames')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visit-frames')
        .getPublicUrl(filePath);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-video-frame',
        {
          body: {
            imageUrl: publicUrl,
            timestamp: timestamp / 1000
          }
        }
      );

      if (analysisError) throw analysisError;

      // Store frame in database
      const { error: frameInsertError } = await supabase
        .from('extracted_frames')
        .insert({
          visit_session_id: sessionIdRef.current,
          frame_url: publicUrl,
          timestamp_seconds: timestamp / 1000,
          analysis_result: analysisData?.analysis || analysisData,
          is_key_frame: analysisData?.transitionDetected || false
        });

      if (frameInsertError) {
        console.error('Error storing frame:', frameInsertError);
      }

      if (analysisData?.analysis?.room_type || analysisData?.roomType) {
        setDetectedRoom(analysisData.analysis?.room_type || analysisData.roomType);
      }

      if (analysisData?.analysis?.transition_detected || analysisData?.transitionDetected) {
        const roomType = analysisData.analysis?.room_type || analysisData.roomType;
        setCurrentBlock(`Transition détectée vers ${roomType || 'nouvelle zone'}`);
        
        // Créer un bloc TOUJOURS (même sans AR)
        const volumeData = arMeasurements ? {
          width: arMeasurements.width,
          height: arMeasurements.height,
          depth: arMeasurements.depth,
          area: arMeasurements.area,
          volume: arMeasurements.volume,
          confidence: arMeasurements.confidence,
          timestamp: arMeasurements.timestamp,
          detectedObjects: detectedObjects.map(obj => ({
            type: obj.type,
            confidence: obj.confidence,
            position: obj.position,
            dimensions: obj.dimensions,
            timestamp: obj.timestamp
          })),
          objectsSummary: {
            doors: detectedObjects.filter(obj => obj.type === 'door').length,
            windows: detectedObjects.filter(obj => obj.type === 'window').length,
            radiators: detectedObjects.filter(obj => obj.type === 'radiator').length,
            outlets: detectedObjects.filter(obj => obj.type === 'outlet').length,
            switches: detectedObjects.filter(obj => obj.type === 'switch').length,
            fixtures: detectedObjects.filter(obj => obj.type === 'fixture').length,
          }
        } : null;
        
        const { data: newBlock } = await supabase
          .from('detected_blocks')
          .insert({
            visit_session_id: sessionIdRef.current,
            block_number: Math.floor(timestamp / 1000),
            detected_room_type: roomType,
            timestamp_start: timestamp / 1000,
            volume_data: volumeData
          })
          .select()
          .single();
        
        if (newBlock) {
          setCurrentBlockId(newBlock.id);
        }
      }

    } catch (error) {
      console.error("Error analyzing frame:", error);
    }
  };

  const stopRecording = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      setIsProcessing(true);
      setCurrentBlock("Traitement en cours...");

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      if (arAvailable && isARScanning) {
        await stopAutoScan();
      }

      if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
        videoRecorderRef.current.stop();
        await new Promise(resolve => {
          videoRecorderRef.current!.onstop = resolve;
        });
        
        // Attendre un peu pour que ondataavailable se déclenche
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📊 État capture vidéo: ${videoChunksRef.current.length} chunks, total: ${videoChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);

      // Validation CRITIQUE : vérifier qu'on a capturé des données vidéo
      if (videoChunksRef.current.length === 0) {
        console.error('ERREUR CRITIQUE : Aucune données vidéo capturée');
        toast.error("Aucune vidéo enregistrée - MediaRecorder n'a capturé aucun chunk");
        
        // Nettoyer la session incomplète
        if (sessionIdRef.current) {
          await supabase.from('visit_sessions').delete().eq('id', sessionIdRef.current);
        }
        
        setIsRecording(false);
        setIsProcessing(false);
        return;
      }

      console.log(`✅ Vidéo capturée : ${videoChunksRef.current.length} chunks`);

      // Upload video - simple without compression
      if (sessionIdRef.current) {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoPath = `${user.id}/${sessionIdRef.current}/recording.webm`;

        const { error: videoUploadError } = await supabase.storage
          .from('visit-videos')
          .upload(videoPath, videoBlob);

        if (!videoUploadError) {
          const { data: { publicUrl: videoUrl } } = supabase.storage
            .from('visit-videos')
            .getPublicUrl(videoPath);

          await supabase
            .from('visit_sessions')
            .update({ video_url: videoUrl })
            .eq('id', sessionIdRef.current);
        }
      }

      // Stop and upload audio
      if (audioRecorderRef.current && sessionIdRef.current) {
        const audioBlob = await audioRecorderRef.current.stop();
        const audioPath = `${user.id}/${sessionIdRef.current}/audio.webm`;

        const { error: audioUploadError } = await supabase.storage
          .from('visit-audio')
          .upload(audioPath, audioBlob);

        if (!audioUploadError) {
          const reader = new FileReader();
          const audioBase64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(audioBlob);
          });

          const { data: transcriptionData } = await supabase.functions.invoke('transcribe-visit-audio', {
            body: {
              audio: audioBase64,
              language: 'fr'
            }
          });

          const { data: { publicUrl: audioUrl } } = supabase.storage
            .from('visit-audio')
            .getPublicUrl(audioPath);

          await supabase
            .from('visit_sessions')
            .update({ audio_url: audioUrl })
            .eq('id', sessionIdRef.current);

          if (transcriptionData?.segments && sessionIdRef.current) {
            for (const segment of transcriptionData.segments) {
              await supabase
                .from('audio_segments')
                .insert({
                  visit_session_id: sessionIdRef.current,
                  transcription: segment.text,
                  timestamp_start: segment.start,
                  timestamp_end: segment.end,
                  confidence_score: segment.confidence || 0.9
                });
            }
          }
        }
      }

      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }

      if (sessionIdRef.current) {
        const { data: frames } = await supabase
          .from('extracted_frames')
          .select('*')
          .eq('visit_session_id', sessionIdRef.current);
        
        const { data: audioSegments } = await supabase
          .from('audio_segments')
          .select('*')
          .eq('visit_session_id', sessionIdRef.current);

        if (frames && frames.length > 0) {
          await supabase.functions.invoke('process-visit-session', {
            body: { 
              visitSessionId: sessionIdRef.current,
              frames: frames.map(f => ({
                url: f.frame_url,
                timestamp: f.timestamp_seconds,
                analysis: f.analysis_result
              })),
              audioSegments: audioSegments?.map(a => ({
                text: a.transcription,
                start: a.timestamp_start,
                end: a.timestamp_end,
                confidence: a.confidence_score
              })) || []
            }
          });
        }

        await supabase
          .from('visit_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionIdRef.current);

        toast.success("Visite terminée");
        onVisitComplete(sessionIdRef.current);
      }

      setIsRecording(false);
      setIsProcessing(false);
      setCurrentBlock("En attente...");
      setDetectedRoom("");
      
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast.error("Erreur lors de l'arrêt");
      setIsProcessing(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath && sessionIdRef.current) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        
        const timestamp = Date.now();
        const fileName = `photo_${timestamp}.jpg`;
        const filePath = `${sessionIdRef.current}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('visit-frames')
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        toast.success("Photo capturée");
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Erreur lors de la capture photo");
    }
  };

  return (
    <Card className="w-full h-full flex flex-col p-4 bg-background">
      <div className="relative flex-1 rounded-lg overflow-hidden bg-black mb-4">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        {isRecording && (
          <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-5 h-5 text-primary animate-pulse" />
                <span className="text-sm font-medium">{currentBlock}</span>
              </div>
              {detectedRoom && (
                <div className="mt-2 text-xs text-gray-300">
                  {detectedRoom}
                </div>
              )}
            </div>
            
            {arAvailable && (
              <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium">AR Scan</span>
                  </div>
                  <Badge 
                    variant={isARScanning ? "default" : "secondary"}
                    className="h-5 text-xs"
                  >
                    {isARScanning ? 'Actif' : 'En attente'}
                  </Badge>
                </div>
                {arMeasurements && (
                  <>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">L:</span>
                        <span className="ml-1 font-mono">{arMeasurements.width.toFixed(1)}m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">H:</span>
                        <span className="ml-1 font-mono">{arMeasurements.height.toFixed(1)}m</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Vol:</span>
                        <span className="ml-1 font-mono">{arMeasurements.volume.toFixed(1)}m³</span>
                      </div>
                    </div>
                    
                    {detectedObjects.length > 0 && (
                      <div className="mt-2 border-t border-white/20 pt-2 space-y-1">
                        <div className="text-xs font-semibold text-emerald-400">🔍 Objets détectés</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {detectedObjects.filter(obj => obj.type === 'door').length > 0 && (
                            <div className="text-gray-300">🚪 {detectedObjects.filter(obj => obj.type === 'door').length}</div>
                          )}
                          {detectedObjects.filter(obj => obj.type === 'window').length > 0 && (
                            <div className="text-gray-300">🪟 {detectedObjects.filter(obj => obj.type === 'window').length}</div>
                          )}
                          {detectedObjects.filter(obj => obj.type === 'radiator').length > 0 && (
                            <div className="text-gray-300">🔥 {detectedObjects.filter(obj => obj.type === 'radiator').length}</div>
                          )}
                          {detectedObjects.filter(obj => obj.type === 'outlet').length > 0 && (
                            <div className="text-gray-300">🔌 {detectedObjects.filter(obj => obj.type === 'outlet').length}</div>
                          )}
                          {detectedObjects.filter(obj => obj.type === 'switch').length > 0 && (
                            <div className="text-gray-300">💡 {detectedObjects.filter(obj => obj.type === 'switch').length}</div>
                          )}
                          {detectedObjects.filter(obj => obj.type === 'fixture').length > 0 && (
                            <div className="text-gray-300">🔧 {detectedObjects.filter(obj => obj.type === 'fixture').length}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!isRecording ? (
          <>
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              size="lg"
              className="h-16 text-lg font-bold"
            >
              <Video className="w-6 h-6 mr-3" />
              Démarrer la visite
            </Button>
            
            <Button
              onClick={capturePhoto}
              variant="outline"
              size="lg"
              className="h-14"
            >
              <CameraIcon className="w-5 h-5 mr-2" />
              Photo rapide
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={stopRecording}
              disabled={isProcessing}
              variant="destructive"
              size="lg"
              className="h-16 text-lg font-bold"
            >
              <Square className="w-6 h-6 mr-3" />
              Terminer la visite
            </Button>

            <Button
              onClick={capturePhoto}
              variant="secondary"
              size="lg"
              className="h-14"
            >
              <CameraIcon className="w-5 h-5 mr-2" />
              Capturer photo
            </Button>
          </>
        )}
      </div>

      {isProcessing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="w-4 h-4 animate-spin" />
          <span className="text-sm">Traitement en cours...</span>
        </div>
      )}
    </Card>
  );
};
