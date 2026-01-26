import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EDLScore } from '@/hooks/useEDLGamification';

interface EDLScoreGaugeProps {
  score: EDLScore;
  variant?: 'compact' | 'detailed';
  className?: string;
}

const levelConfig = {
  basic: {
    icon: Star,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    progressColor: 'bg-slate-500'
  },
  advanced: {
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    progressColor: 'bg-blue-500'
  },
  premium: {
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    progressColor: 'bg-amber-500'
  },
  master: {
    icon: Crown,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    progressColor: 'bg-gradient-to-r from-purple-500 to-pink-500'
  }
};

export const EDLScoreGauge: React.FC<EDLScoreGaugeProps> = ({
  score,
  variant = 'compact',
  className
}) => {
  const config = levelConfig[score.level];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full",
          config.bgColor
        )}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              Score EDL
            </span>
            <span className={cn("text-sm font-bold", config.color)}>
              {score.totalScore}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", config.progressColor)}
              initial={{ width: 0 }}
              animate={{ width: `${score.totalScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn(
      "p-4 rounded-2xl border border-border bg-card",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            config.bgColor
          )}>
            <Icon className={cn("h-6 w-6", config.color)} />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Score EDL</h3>
            <p className={cn("text-sm font-medium", config.color)}>
              {score.levelLabel}
            </p>
          </div>
        </div>
        
        {/* Circular score */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-muted"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              className={config.color}
              strokeDasharray={176}
              initial={{ strokeDashoffset: 176 }}
              animate={{ strokeDashoffset: 176 - (176 * score.totalScore / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">{score.totalScore}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", config.progressColor)}
            initial={{ width: 0 }}
            animate={{ width: `${score.totalScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0</span>
          <span>60</span>
          <span>80</span>
          <span>95</span>
          <span>100</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Pièces</p>
          <p className="font-semibold text-sm">
            {score.roomsCompleted}/{score.totalRooms}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="font-semibold text-sm">
            {score.itemsCompleted}/{score.totalItems}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Photos</p>
          <p className="font-semibold text-sm">{score.photosCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Anomalies</p>
          <p className="font-semibold text-sm">{score.anomaliesCount}</p>
        </div>
      </div>
    </div>
  );
};
