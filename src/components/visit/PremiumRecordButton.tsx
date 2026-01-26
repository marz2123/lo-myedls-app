import { useState, useEffect } from 'react';
import { Video, Square, Mic, MicOff, Camera, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumRecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onTakePhoto: () => void;
  disabled?: boolean;
}

export const PremiumRecordButton = ({
  isRecording,
  isPaused,
  recordingTime,
  onStart,
  onStop,
  onPause,
  onTakePhoto,
  disabled,
}: PremiumRecordButtonProps) => {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const interval = setInterval(() => {
        setPulseScale(prev => prev === 1 ? 1.1 : 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onStart}
          disabled={disabled}
          className={cn(
            "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
            "bg-gradient-to-br from-destructive to-destructive/80",
            "shadow-lg shadow-destructive/30",
            "hover:scale-105 hover:shadow-xl hover:shadow-destructive/40",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
            "group"
          )}
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-destructive/30 group-hover:border-destructive/50 transition-colors" />
          
          {/* Inner button */}
          <div className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center">
            <Video className="w-7 h-7 text-white" />
          </div>
        </button>
        
        <p className="text-sm text-muted-foreground">
          Appuyez pour enregistrer
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Timer */}
      <div className="flex items-center gap-3">
        <div 
          className="w-3 h-3 rounded-full bg-destructive"
          style={{ transform: `scale(${pulseScale})`, transition: 'transform 0.5s ease' }}
        />
        <span className="font-mono text-2xl font-semibold tabular-nums">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        {/* Pause/Resume */}
        <button
          onClick={onPause}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-card border-2 border-border",
            "hover:bg-muted hover:border-primary/30",
            "active:scale-95",
            "shadow-md"
          )}
        >
          {isPaused ? (
            <Play className="w-5 h-5 text-foreground ml-0.5" />
          ) : (
            <Pause className="w-5 h-5 text-foreground" />
          )}
        </button>

        {/* Stop button */}
        <button
          onClick={onStop}
          className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            "bg-gradient-to-br from-destructive to-destructive/80",
            "shadow-lg shadow-destructive/30",
            "hover:scale-105 hover:shadow-xl hover:shadow-destructive/40",
            "active:scale-95"
          )}
        >
          {/* Pulsing ring */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-destructive/30 animate-ping"
            style={{ animationDuration: '1.5s' }}
          />
          
          {/* Stop square */}
          <div className="w-8 h-8 rounded-md bg-white" />
        </button>

        {/* Take photo */}
        <button
          onClick={onTakePhoto}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
            "bg-card border-2 border-border",
            "hover:bg-muted hover:border-primary/30",
            "active:scale-95",
            "shadow-md"
          )}
        >
          <Camera className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Status indicator */}
      <div className={cn(
        "px-4 py-2 rounded-full text-sm font-medium",
        isPaused 
          ? "bg-warning/10 text-warning" 
          : "bg-destructive/10 text-destructive"
      )}>
        {isPaused ? 'En pause' : 'Enregistrement...'}
      </div>
    </div>
  );
};
