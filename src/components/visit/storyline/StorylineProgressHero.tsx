import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertTriangle, ListTodo, Image, 
  Flag, Sparkles, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface StorylineProgressHeroProps {
  completionPercent: number;
  completedRooms: number;
  totalRooms: number;
  totalAnomalies: number;
  totalTasks: number;
  totalPhotos: number;
  onEndEDL?: () => void;
  onViewReport?: () => void;
  className?: string;
}

export const StorylineProgressHero: React.FC<StorylineProgressHeroProps> = ({
  completionPercent,
  completedRooms,
  totalRooms,
  totalAnomalies,
  totalTasks,
  totalPhotos,
  onEndEDL,
  onViewReport,
  className
}) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const isComplete = completionPercent === 100;

  // Animate progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(completionPercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [completionPercent]);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-gradient-to-br from-primary/10 via-primary/5 to-background",
      "border border-primary/20 shadow-lg",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative p-4 sm:p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isComplete ? "bg-green-500/20" : "bg-primary/20"
            )}>
              {isComplete ? (
                <Sparkles className="h-5 w-5 text-green-500" />
              ) : (
                <Flag className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Visite EDL</h2>
              <p className="text-xs text-muted-foreground">
                {isComplete ? 'Visite terminée !' : 'En cours...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewReport && (
              <Button
                onClick={onViewReport}
                size="sm"
                variant="outline"
                className="rounded-full text-sm gap-1.5"
              >
                <FileText className="h-4 w-4" />
                Rapport Live
              </Button>
            )}
            <Button
              onClick={onEndEDL}
              size="sm"
              variant={isComplete ? "default" : "outline"}
              className={cn(
                "rounded-full text-sm",
                isComplete && "bg-green-500 hover:bg-green-600"
              )}
            >
              {isComplete ? 'Finaliser EDL' : 'Terminer'}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Progression globale
            </span>
            <motion.span 
              className={cn(
                "text-2xl font-bold",
                isComplete ? "text-green-500" : "text-primary"
              )}
              key={animatedPercent}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {animatedPercent}%
            </motion.span>
          </div>
          
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isComplete 
                  ? "bg-gradient-to-r from-green-400 to-green-500" 
                  : "bg-gradient-to-r from-primary to-blue-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${animatedPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatBadge
            icon={<CheckCircle2 className="h-4 w-4" />}
            value={`${completedRooms}/${totalRooms}`}
            label="Pièces"
            color="green"
          />
          <StatBadge
            icon={<AlertTriangle className="h-4 w-4" />}
            value={totalAnomalies}
            label="Anomalies"
            color={totalAnomalies > 0 ? "amber" : "muted"}
          />
          <StatBadge
            icon={<ListTodo className="h-4 w-4" />}
            value={totalTasks}
            label="Tâches"
            color="blue"
          />
          <StatBadge
            icon={<Image className="h-4 w-4" />}
            value={totalPhotos}
            label="Photos"
            color="purple"
          />
        </div>
      </div>

      {/* Completion celebration */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Confetti particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  i % 3 === 0 ? "bg-green-400" : i % 3 === 1 ? "bg-blue-400" : "bg-amber-400"
                )}
                initial={{ 
                  x: '50%', 
                  y: '50%',
                  scale: 0 
                }}
                animate={{ 
                  x: `${20 + (i * 6)}%`,
                  y: `${10 + (i * 7)}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StatBadgeProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'green' | 'amber' | 'blue' | 'purple' | 'muted';
}

const StatBadge: React.FC<StatBadgeProps> = ({ icon, value, label, color }) => {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    muted: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-2 px-1 rounded-xl border",
      colorClasses[color]
    )}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <span className="text-[10px] opacity-80">{label}</span>
    </div>
  );
};
