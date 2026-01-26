import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, PartyPopper, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CelebrationOverlayProps {
  type: 'room' | 'edl' | null;
  score?: number;
  onViewReport?: () => void;
  onExportPDF?: () => void;
  onDismiss?: () => void;
}

// Confetti particle component
const ConfettiParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const randomX = Math.random() * 100;
  const randomRotation = Math.random() * 720 - 360;
  const randomDuration = 2 + Math.random() * 2;

  return (
    <motion.div
      className="absolute w-3 h-3"
      style={{ 
        left: `${randomX}%`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px'
      }}
      initial={{ 
        y: -20,
        opacity: 1,
        scale: Math.random() * 0.5 + 0.5,
        rotate: 0
      }}
      animate={{ 
        y: '100vh',
        opacity: 0,
        rotate: randomRotation
      }}
      transition={{ 
        duration: randomDuration,
        delay,
        ease: 'easeIn'
      }}
    />
  );
};

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  type,
  score,
  onViewReport,
  onExportPDF,
  onDismiss
}) => {
  const [confettiColors] = useState([
    '#10b981', // emerald
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#8b5cf6', // violet
    '#f97316', // orange
  ]);

  if (type === 'room') {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Mini confetti burst */}
          {[...Array(20)].map((_, i) => (
            <ConfettiParticle 
              key={i} 
              delay={i * 0.05} 
              color={confettiColors[i % confettiColors.length]}
            />
          ))}

          {/* Center badge */}
          <motion.div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex flex-col items-center gap-2 bg-card/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-emerald-500/30">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <span className="text-lg font-bold">Pièce validée !</span>
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (type === 'edl') {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onDismiss}
          />

          {/* Full confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(60)].map((_, i) => (
              <ConfettiParticle 
                key={i} 
                delay={i * 0.03} 
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
          </div>

          {/* Center content */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-500/30 p-8 text-center">
              {/* Trophy animation */}
              <motion.div
                className="mx-auto mb-4"
                animate={{ 
                  y: [0, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
              >
                <div className="relative">
                  <Trophy className="h-20 w-20 text-amber-500 mx-auto" />
                  <motion.div
                    className="absolute -top-2 -right-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-8 w-8 text-amber-400" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-2xl font-bold mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                EDL Terminé !
              </motion.h2>

              {/* Score */}
              {score !== undefined && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <PartyPopper className="h-5 w-5 text-amber-500" />
                    <span className="text-lg font-bold">Score: {score}%</span>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {onViewReport && (
                  <Button 
                    onClick={onViewReport}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    Voir rapport
                  </Button>
                )}
                {onExportPDF && (
                  <Button 
                    variant="outline" 
                    onClick={onExportPDF}
                    className="w-full"
                  >
                    Export PDF
                  </Button>
                )}
                {onDismiss && (
                  <Button 
                    variant="ghost" 
                    onClick={onDismiss}
                    className="w-full text-muted-foreground"
                  >
                    Fermer
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
};
