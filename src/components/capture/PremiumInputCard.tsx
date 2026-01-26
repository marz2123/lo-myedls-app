import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Camera, Video, X, Play, Pause,
  Sparkles, AlertTriangle, Check, Loader2, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  file?: File;
}

interface PremiumInputCardProps {
  type: 'problem' | 'recommendation';
  value: string;
  onChange: (value: string) => void;
  media: CapturedMedia[];
  onMediaAdd: (media: CapturedMedia) => void;
  onMediaRemove: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export const PremiumInputCard: React.FC<PremiumInputCardProps> = ({
  type,
  value,
  onChange,
  media,
  onMediaAdd,
  onMediaRemove,
  placeholder,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isProblem = type === 'problem';
  
  const config = isProblem ? {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'Problème constaté',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    ringColor: 'ring-amber-500/30',
    accentColor: 'bg-amber-500',
  } : {
    icon: Sparkles,
    iconColor: 'text-primary',
    label: 'Préconisations',
    gradient: 'from-primary/10 via-accent/5 to-transparent',
    ringColor: 'ring-primary/30',
    accentColor: 'bg-primary',
  };

  const Icon = config.icon;

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        setIsTranscribing(true);
        try {
          const { data, error } = await supabase.functions.invoke('transcribe-visit-audio', {
            body: { audio: await blobToBase64(blob) }
          });

          if (error) throw error;
          if (data?.text) {
            onChange(value ? `${value}\n${data.text}` : data.text);
            toast.success('Transcription ajoutée');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          toast.error('Erreur de transcription');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start audio visualization
      updateAudioLevel();
      
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setAudioLevel(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      onMediaAdd({
        id: crypto.randomUUID(),
        type: 'photo',
        url,
        file
      });
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVideoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      onMediaAdd({
        id: crypto.randomUUID(),
        type: 'video',
        url,
        file
      });
    });
    
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      className={cn(
        "relative rounded-3xl overflow-hidden",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50",
        "shadow-[var(--shadow-card)]",
        "transition-all duration-500",
        isFocused && "shadow-[var(--shadow-card-hover)] border-primary/30",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br pointer-events-none",
        config.gradient,
        "opacity-60"
      )} />
      
      {/* Header */}
      <div className="relative px-5 pt-5 pb-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br",
              isProblem ? "from-amber-500/20 to-orange-500/10" : "from-primary/20 to-accent/10"
            )}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.label}</h3>
              {!isProblem && (
                <p className="text-xs text-muted-foreground">Optionnel</p>
              )}
            </div>
          </div>
          
          {/* Recording indicator */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 rounded-full bg-destructive"
                />
                <span className="text-xs font-medium text-destructive">
                  {formatTime(recordingTime)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="relative px-5 pb-3 z-10">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || (isProblem ? "Décrivez le problème observé..." : "Travaux recommandés...")}
          className={cn(
            "w-full min-h-[80px] p-4 rounded-2xl",
            "bg-background/60 backdrop-blur-sm",
            "border-2 border-transparent",
            "focus:border-primary/30 focus:bg-background/80",
            "outline-none resize-none",
            "text-foreground placeholder:text-muted-foreground/60",
            "transition-all duration-300",
            "relative z-20",
            isRecording && "border-destructive/30 bg-destructive/5"
          )}
          rows={3}
          style={{ pointerEvents: 'auto' }}
        />
        
        {/* Transcribing overlay */}
        <AnimatePresence>
          {isTranscribing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-4 rounded-2xl bg-background/90 backdrop-blur-sm flex items-center justify-center gap-3 z-30"
              style={{ pointerEvents: 'none' }}
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Transcription en cours...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Media Preview */}
      <AnimatePresence>
        {media.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-3"
          >
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {media.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden group"
                >
                  {item.type === 'photo' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={item.url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => onMediaRemove(item.id)}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                    <span className="text-[10px] text-white font-medium">
                      {item.type === 'photo' ? 'Photo' : 'Vidéo'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <div className="relative px-5 pb-5 z-10">
        <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-muted/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
          {/* Media buttons */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-background/80 hover:bg-background",
                "text-muted-foreground hover:text-foreground",
                "border border-border/50 hover:border-border",
                "transition-all duration-200",
                "text-sm font-medium"
              )}
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Photo</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => videoInputRef.current?.click()}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-background/80 hover:bg-background",
                "text-muted-foreground hover:text-foreground",
                "border border-border/50 hover:border-border",
                "transition-all duration-200",
                "text-sm font-medium"
              )}
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Vidéo</span>
            </motion.button>
          </div>

          {/* Voice recording button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
            disabled={isTranscribing}
            type="button"
            className={cn(
              "relative flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "font-medium text-sm",
              "transition-all duration-300",
              "z-20",
              isRecording ? (
                "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25"
              ) : (
                "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40"
              ),
              isTranscribing && "opacity-50 cursor-not-allowed"
            )}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Audio level ring */}
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-white/30"
                animate={{ 
                  scale: 1 + audioLevel * 0.15,
                  opacity: 0.5 + audioLevel * 0.5
                }}
                transition={{ duration: 0.1 }}
              />
            )}
            
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4" />
                <span>Arrêter</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Dicter</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handlePhotoCapture}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleVideoCapture}
      />
    </motion.div>
  );
};

export default PremiumInputCard;
