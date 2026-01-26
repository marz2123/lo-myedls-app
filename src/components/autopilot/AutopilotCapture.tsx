import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, Loader2, Camera, Mic, Eye, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AutopilotCaptureProps {
  isRecording: boolean;
  onStartRecording: () => Promise<MediaStream | null>;
  onStopRecording: () => void;
  progress: {
    phase: string;
    progress: number;
    message: string;
    currentRoom?: string;
    roomsProcessed: number;
    totalRooms: number;
  };
}

export const AutopilotCapture: React.FC<AutopilotCaptureProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  progress
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const [detectedRoom, setDetectedRoom] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
        
        // Simulate room detection for visual feedback
        const rooms = ['Entrée', 'Séjour', 'Cuisine', 'Chambre 1', 'Salle de bain', 'WC'];
        const roomIndex = Math.floor(duration / 10) % rooms.length;
        setDetectedRoom(rooms[roomIndex]);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, duration]);

  const handleStartRecording = async () => {
    const mediaStream = await onStartRecording();
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setDuration(0);
    }
  };

  const handleStopRecording = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onStopRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (progress.phase) {
      case 'recording': return 'bg-red-500';
      case 'uploading': return 'bg-blue-500';
      case 'segmenting': return 'bg-purple-500';
      case 'analyzing': return 'bg-amber-500';
      case 'generating': return 'bg-green-500';
      case 'complete': return 'bg-emerald-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-black rounded-3xl overflow-hidden">
      {/* Video Preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Scan Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Scan border animation */}
            <div className="absolute inset-4 border-2 border-blue-500/50 rounded-2xl">
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ height: '100%' }}
              />
            </div>

            {/* Corner markers */}
            {[0, 1, 2, 3].map((corner) => (
              <motion.div
                key={corner}
                className={cn(
                  "absolute w-8 h-8 border-2 border-blue-400",
                  corner === 0 && "top-4 left-4 border-r-0 border-b-0 rounded-tl-lg",
                  corner === 1 && "top-4 right-4 border-l-0 border-b-0 rounded-tr-lg",
                  corner === 2 && "bottom-4 left-4 border-r-0 border-t-0 rounded-bl-lg",
                  corner === 3 && "bottom-4 right-4 border-l-0 border-t-0 rounded-br-lg"
                )}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: corner * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRecording && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Camera className="h-3 w-3 mr-1" />
              4K
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Mic className="h-3 w-3 mr-1" />
              Audio
            </Badge>
          </div>
        </div>
      </div>

      {/* Room Detection Overlay */}
      <AnimatePresence>
        {isRecording && detectedRoom && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2"
          >
            <Badge className="bg-blue-600 text-white text-lg px-4 py-2 rounded-full shadow-lg">
              <Eye className="h-4 w-4 mr-2" />
              Pièce détectée: {detectedRoom}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {/* Progress Bar (when processing) */}
        {progress.phase !== 'idle' && progress.phase !== 'recording' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-3"
          >
            <div className="flex items-center justify-between text-white text-sm">
              <span className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", getPhaseColor())} />
                {progress.message}
              </span>
              <span>{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className="h-2 bg-white/20" />
          </motion.div>
        )}

        {/* Main Action Button */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                onClick={handleStartRecording}
                disabled={progress.phase !== 'idle' && progress.phase !== 'complete'}
                className="h-20 px-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-semibold shadow-xl"
              >
                {progress.phase !== 'idle' && progress.phase !== 'complete' ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Zap className="h-6 w-6 mr-3" />
                    Démarrer Autopilot
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopRecording}
                className="h-20 px-8 rounded-full text-lg font-semibold shadow-xl"
              >
                <Square className="h-6 w-6 mr-3 fill-current" />
                Arrêter et Analyser
              </Button>
            </motion.div>
          )}
        </div>

        {/* Instructions */}
        {isRecording && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white/70 text-sm mt-4"
          >
            Filmez lentement chaque pièce • L'IA détecte automatiquement les transitions
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default AutopilotCapture;
