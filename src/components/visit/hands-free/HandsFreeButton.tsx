import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceWaveform } from './VoiceWaveform';

interface HandsFreeButtonProps {
  isActive: boolean;
  isListening: boolean;
  isProcessing: boolean;
  audioLevel: number;
  transcript?: string;
  statusMessage?: string | null;
  onTap: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  className?: string;
}

export const HandsFreeButton: React.FC<HandsFreeButtonProps> = ({
  isActive,
  isListening,
  isProcessing,
  audioLevel,
  transcript,
  statusMessage,
  onTap,
  onLongPressStart,
  onLongPressEnd,
  className,
}) => {
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const [isLongPress, setIsLongPress] = useState(false);

  const handlePressStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true);
      onLongPressStart();
    }, 500);
  }, [onLongPressStart]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    if (isLongPress) {
      setIsLongPress(false);
      onLongPressEnd();
    } else if (!isActive) {
      onTap();
    } else {
      onLongPressEnd();
    }
  }, [isLongPress, isActive, onTap, onLongPressEnd]);

  return (
    <div className={cn("fixed bottom-24 right-4 z-50 safe-area-bottom", className)}>
      <AnimatePresence>
        {/* Status Card */}
        {(statusMessage || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "absolute bottom-20 right-0 w-64",
              "bg-background/95 backdrop-blur-xl",
              "rounded-2xl border border-border shadow-xl",
              "p-4 space-y-3"
            )}
          >
            {/* Waveform */}
            {isListening && (
              <VoiceWaveform 
                audioLevel={audioLevel} 
                isActive={isListening} 
              />
            )}
            
            {/* Transcript */}
            {transcript && (
              <p className="text-sm text-foreground leading-relaxed">
                "{transcript}"
              </p>
            )}
            
            {/* Status message */}
            {statusMessage && (
              <p className={cn(
                "text-xs font-medium",
                statusMessage.includes('Compris') ? "text-green-500" :
                statusMessage.includes('Erreur') ? "text-red-500" :
                "text-muted-foreground"
              )}>
                {statusMessage}
              </p>
            )}
          </motion.div>
        )}

        {/* Activation Banner */}
        {isActive && !statusMessage && !transcript && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={cn(
              "absolute bottom-20 right-0",
              "bg-primary text-primary-foreground",
              "px-4 py-2 rounded-full",
              "text-xs font-medium whitespace-nowrap",
              "shadow-lg"
            )}
          >
            Mode Main Libre activé
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={() => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
          }
        }}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center justify-center",
          "h-14 w-14 rounded-full",
          "shadow-xl transition-all duration-300",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-background border-2 border-border text-foreground",
          isListening && "ring-4 ring-primary/30"
        )}
      >
        {/* Glow effect when active */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.2, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* Audio level ring */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary"
            style={{
              scale: 1 + audioLevel * 0.3,
              opacity: 0.3 + audioLevel * 0.4
            }}
          />
        )}
        
        {/* Icon */}
        <div className="relative z-10">
          {isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isActive ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </div>
      </motion.button>
    </div>
  );
};
