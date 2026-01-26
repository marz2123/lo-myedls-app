import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Camera, Cpu, Target, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressBadge {
  id: string;
  label: string;
  icon: React.ReactNode;
  achieved: boolean;
  color: string;
}

interface ProgressBadgesProps {
  coveragePercent: number;
  technicalElementsDetected: number;
  missingZonesCount: number;
  className?: string;
}

export const ProgressBadges: React.FC<ProgressBadgesProps> = ({
  coveragePercent,
  technicalElementsDetected,
  missingZonesCount,
  className
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevCoverage, setPrevCoverage] = useState(coveragePercent);

  // Trigger confetti when reaching 100%
  useEffect(() => {
    if (coveragePercent === 100 && prevCoverage < 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setPrevCoverage(coveragePercent);
  }, [coveragePercent, prevCoverage]);

  const badges: ProgressBadge[] = [
    {
      id: 'coverage',
      label: '100% pièces couvertes',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      achieved: coveragePercent === 100,
      color: 'bg-emerald-500'
    },
    {
      id: 'technical',
      label: 'Éléments techniques détectés',
      icon: <Cpu className="h-3.5 w-3.5" />,
      achieved: technicalElementsDetected >= 3,
      color: 'bg-cyan-500'
    },
    {
      id: 'complete',
      label: 'Aucune zone manquante',
      icon: <Target className="h-3.5 w-3.5" />,
      achieved: missingZonesCount === 0,
      color: 'bg-violet-500'
    }
  ];

  const achievedCount = badges.filter(b => b.achieved).length;

  return (
    <div className={cn("relative", className)}>
      {/* Confetti animation */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[100]">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: '50vw',
                  y: '50vh',
                  scale: 0,
                  opacity: 1
                }}
                animate={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: Math.random() * 1.5 + 0.5,
                  opacity: 0,
                  rotate: Math.random() * 720 - 360
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2 + Math.random(),
                  ease: "easeOut"
                }}
              >
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 5)]
                  }}
                />
              </motion.div>
            ))}
            {/* Center trophy animation */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex flex-col items-center gap-2 bg-card/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-border">
                <Trophy className="h-12 w-12 text-amber-500" />
                <span className="text-lg font-bold">EDL Complet !</span>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Badges display */}
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <motion.div
            key={badge.id}
            initial={false}
            animate={badge.achieved ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Badge
              className={cn(
                "gap-1.5 py-1 px-2.5 text-xs font-medium transition-all duration-300",
                badge.achieved
                  ? `${badge.color} text-white shadow-md`
                  : "bg-muted text-muted-foreground border border-border"
              )}
            >
              {badge.icon}
              {badge.label}
              {badge.achieved && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-1"
                >
                  ✓
                </motion.span>
              )}
            </Badge>
          </motion.div>
        ))}
      </div>

      {/* Achievement summary */}
      {achievedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-muted-foreground flex items-center gap-1"
        >
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          {achievedCount}/{badges.length} badges obtenus
        </motion.div>
      )}
    </div>
  );
};
