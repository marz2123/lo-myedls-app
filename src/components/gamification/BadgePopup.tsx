import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EDLBadge } from '@/hooks/useEDLGamification';

interface BadgePopupProps {
  badge: EDLBadge | null;
  onDismiss: () => void;
}

export const BadgePopup: React.FC<BadgePopupProps> = ({ badge, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [badge, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <AnimatePresence>
      {badge && isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, x: 50, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-20 right-4 z-[9999] pointer-events-auto"
        >
          <div 
            className={cn(
              "relative overflow-hidden rounded-2xl shadow-2xl",
              "bg-gradient-to-r p-[2px]",
              badge.color
            )}
          >
            {/* Inner content */}
            <div className="relative bg-card rounded-[14px] p-4 pr-12">
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-[14px] opacity-20"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary)), transparent)`
                }}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-3">
                {/* Icon with bounce */}
                <motion.div
                  className="text-4xl"
                  animate={{ 
                    y: [0, -5, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 0.5,
                    repeat: 2,
                    repeatType: 'reverse'
                  }}
                >
                  {badge.icon}
                </motion.div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Nouveau badge !
                    </span>
                  </div>

                  {/* Badge name */}
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {badge.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground truncate">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 -translate-x-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                }}
                animate={{ translateX: ['100%', '-100%'] }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.5,
                  ease: 'easeInOut'
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
