import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EDLBadge } from '@/hooks/useEDLGamification';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BadgeCollectionProps {
  badges: EDLBadge[];
  showLocked?: boolean;
  className?: string;
}

// All possible badges for showing locked state
const ALL_BADGE_KEYS = [
  'room_completed',
  'room_no_anomaly',
  'room_perfect_ai',
  'room_all_photos',
  'edl_50_percent',
  'edl_100_percent',
  'no_missing_tasks',
  'report_complete',
  'first_anomaly',
  'auto_task_generated',
  'ten_anomalies',
  'speed_demon',
  'perfectionist'
];

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({
  badges,
  showLocked = false,
  className
}) => {
  const unlockedBadgeIds = badges.map(b => b.id);
  const displayBadges = showLocked 
    ? ALL_BADGE_KEYS.map(key => {
        const unlocked = badges.find(b => b.id === key);
        if (unlocked) return unlocked;
        return { id: key, locked: true } as any;
      })
    : badges;

  if (badges.length === 0 && !showLocked) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-6 text-center",
        className
      )}>
        <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucun badge obtenu pour le moment
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Complétez des pièces pour débloquer des badges
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Badges</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {badges.length} obtenu{badges.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Badge grid */}
        <div className="flex flex-wrap gap-2">
          {displayBadges.map((badge, index) => {
            const isLocked = 'locked' in badge && badge.locked;

            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative flex items-center justify-center w-10 h-10 rounded-xl",
                      "transition-all duration-200",
                      isLocked 
                        ? "bg-muted/50 cursor-not-allowed"
                        : "bg-gradient-to-br cursor-pointer hover:scale-110 shadow-md",
                      !isLocked && badge.color
                    )}
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-muted-foreground/50" />
                    ) : (
                      <span className="text-lg">{badge.icon}</span>
                    )}
                    
                    {/* Glow effect for unlocked */}
                    {!isLocked && (
                      <motion.div
                        className="absolute inset-0 rounded-xl opacity-30"
                        style={{
                          boxShadow: '0 0 20px currentColor'
                        }}
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  {isLocked ? (
                    <p className="text-xs text-muted-foreground">Badge verrouillé</p>
                  ) : (
                    <>
                      <p className="font-medium text-sm">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
