import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EDLProgressBarProps {
  percent: number;
  coveredRooms: number;
  totalRooms: number;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const EDLProgressBar: React.FC<EDLProgressBarProps> = ({
  percent,
  coveredRooms,
  totalRooms,
  className,
  variant = 'compact'
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  const isComplete = percent === 100;

  if (variant === 'compact') {
    return (
      <motion.div 
        className={cn("flex items-center gap-3", className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 min-w-0">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                isComplete 
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-primary to-accent"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${animatedPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {/* Shimmer effect */}
            {!isComplete && (
              <motion.div
                className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '500%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>
        <Badge
          className={cn(
            "text-xs font-medium shrink-0 gap-1",
            isComplete 
              ? "bg-emerald-500 text-white"
              : "bg-primary/10 text-primary border-0"
          )}
        >
          {isComplete && <CheckCircle2 className="h-3 w-3" />}
          {Math.round(animatedPercent)}%
        </Badge>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={cn(
        "p-4 rounded-2xl bg-card border border-border/50 shadow-sm",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            isComplete ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
          )}>
            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Visite EDL</h3>
            <p className="text-xs text-muted-foreground">
              {coveredRooms}/{totalRooms} pièces couvertes
            </p>
          </div>
        </div>
        <div className="text-right">
          <motion.span
            className={cn(
              "text-2xl font-bold",
              isComplete ? "text-emerald-600" : "text-primary"
            )}
            key={animatedPercent}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {Math.round(animatedPercent)}%
          </motion.span>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <TrendingUp className="h-3 w-3" />
            complétée
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isComplete 
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-primary via-accent to-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${animatedPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Animated gradient for non-complete state */}
        {!isComplete && (
          <motion.div
            className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: `${animatedPercent}%` }}
          />
        )}
      </div>

      {/* Milestone indicators */}
      <div className="flex justify-between mt-2 px-1">
        {[25, 50, 75, 100].map((milestone) => (
          <div 
            key={milestone}
            className={cn(
              "text-[10px] transition-colors",
              animatedPercent >= milestone 
                ? isComplete ? "text-emerald-600 font-medium" : "text-primary font-medium" 
                : "text-muted-foreground/50"
            )}
          >
            {milestone}%
          </div>
        ))}
      </div>
    </motion.div>
  );
};
