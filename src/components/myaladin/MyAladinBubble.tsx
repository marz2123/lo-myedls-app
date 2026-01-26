import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MyAladinBubbleProps {
  onClick: () => void;
  onLongPress: () => void;
  hasNotification?: boolean;
  isListening?: boolean;
  className?: string;
}

export const MyAladinBubble: React.FC<MyAladinBubbleProps> = ({
  onClick,
  onLongPress,
  hasNotification = false,
  isListening = false,
  className
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHapticFeedback();

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    // Snap to edges
    const windowWidth = window.innerWidth;
    const bubbleWidth = 64;
    const margin = 16;
    
    const newX = info.point.x < windowWidth / 2 
      ? -((windowWidth / 2) - margin - bubbleWidth / 2)
      : (windowWidth / 2) - margin - bubbleWidth / 2;
    
    setPosition({ x: newX, y: position.y + info.offset.y });
    trigger('light');
  };

  const handlePointerDown = () => {
    longPressTimeout.current = setTimeout(() => {
      trigger('medium');
      onLongPress();
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    if (!isDragging) {
      onClick();
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };
  }, []);

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9998]">
      <motion.div
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ x: position.x, y: position.y }}
        className={cn(
          "pointer-events-auto fixed bottom-24 right-4 md:bottom-8",
          "cursor-grab active:cursor-grabbing",
          className
        )}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl transition-all duration-500",
          isListening 
            ? "bg-gradient-to-r from-amber-400/60 to-orange-500/60 animate-pulse" 
            : "bg-gradient-to-r from-amber-500/30 to-orange-600/30"
        )} />
        
        {/* Main bubble */}
        <motion.div
          className={cn(
            "relative w-16 h-16 rounded-full shadow-2xl",
            "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600",
            "flex items-center justify-center",
            "border-2 border-amber-400/50",
            isListening && "ring-4 ring-amber-400/50 ring-offset-2 ring-offset-background"
          )}
          animate={isListening ? { 
            boxShadow: [
              "0 0 20px rgba(245, 158, 11, 0.5)",
              "0 0 40px rgba(245, 158, 11, 0.8)",
              "0 0 20px rgba(245, 158, 11, 0.5)"
            ]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {/* Egyptian genie avatar */}
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Mic className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <span className="text-3xl" role="img" aria-label="MyAladin">
              🧞
            </span>
          )}
          
          {/* Notification badge */}
          <AnimatePresence>
            {hasNotification && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-white">!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Listening indicator text */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span className="text-xs font-medium text-amber-500 bg-background/90 px-2 py-1 rounded-full">
                J'écoute...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
