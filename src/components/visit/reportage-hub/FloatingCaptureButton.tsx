import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Video, Mic, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface FloatingCaptureButtonProps {
  onPhoto?: () => void;
  onVideo?: () => void;
  onVoiceNote?: () => void;
  className?: string;
}

export const FloatingCaptureButton: React.FC<FloatingCaptureButtonProps> = ({
  onPhoto,
  onVideo,
  onVoiceNote,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { selectionChanged, trigger } = useHapticFeedback();

  const menuItems = [
    { id: 'photo', icon: Camera, label: 'Photo', color: 'bg-blue-500', action: onPhoto },
    { id: 'video', icon: Video, label: 'Vidéo', color: 'bg-red-500', action: onVideo },
    { id: 'voice', icon: Mic, label: 'Note vocale', color: 'bg-green-500', action: onVoiceNote },
  ];

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setLongPressActive(true);
      setIsExpanded(true);
      trigger('zone_complete');
    }, 400);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressActive(false);
  };

  const handleClick = () => {
    if (!longPressActive) {
      selectionChanged();
      setIsExpanded(!isExpanded);
    }
  };

  const handleMenuItemClick = (action?: () => void) => {
    selectionChanged();
    setIsExpanded(false);
    action?.();
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isExpanded]);

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 safe-area-bottom", className)}>
      {/* Expanded menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-20 right-0 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 justify-end"
              >
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-full shadow-lg border border-border whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
                <Button
                  onClick={() => handleMenuItemClick(item.action)}
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg text-white transition-transform hover:scale-110 active:scale-95",
                    item.color
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={handleClick}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        className={cn(
          "relative h-14 w-14 rounded-full flex items-center justify-center text-primary-foreground",
          "transition-colors duration-200",
          isExpanded
            ? "bg-muted text-foreground"
            : "bg-primary hover:bg-primary/90"
        )}
        style={{
          boxShadow: '0 4px 14px -4px hsl(var(--primary) / 0.4)'
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </motion.div>
      </motion.button>

    </div>
  );
};
