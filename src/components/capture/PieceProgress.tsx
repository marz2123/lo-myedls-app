import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PieceProgressProps {
  checkedZones: Set<string>;
  totalZones?: number;
  variant?: 'circular' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * PieceProgress - Animated progress indicator for piece/zone completion
 * 
 * Shows 0-100% based on Mur/Sol/Plafond/Ouvertures/Détails coverage
 */
export const PieceProgress = ({
  checkedZones,
  totalZones = 5,
  variant = 'circular',
  size = 'md',
  showLabel = true,
  className,
}: PieceProgressProps) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  
  const percent = Math.round((checkedZones.size / totalZones) * 100);
  const isComplete = percent === 100;

  // Animate progress change
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 50);
    return () => clearTimeout(timer);
  }, [percent]);

  const sizeClasses = {
    sm: { circle: 'w-10 h-10', stroke: 3, text: 'text-xs' },
    md: { circle: 'w-14 h-14', stroke: 4, text: 'text-sm' },
    lg: { circle: 'w-20 h-20', stroke: 5, text: 'text-base' },
  };

  const config = sizeClasses[size];
  const radius = size === 'sm' ? 16 : size === 'md' ? 22 : 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;

  if (variant === 'horizontal') {
    return (
      <div className={cn("space-y-1.5", className)}>
        {showLabel && (
          <div className="flex items-center justify-between">
            <span className={cn("font-medium", config.text)}>
              {isComplete ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Complet
                </span>
              ) : (
                `${checkedZones.size}/${totalZones} zones`
              )}
            </span>
            <span className={cn("font-bold", config.text, isComplete && "text-green-600 dark:text-green-400")}>
              {animatedPercent}%
            </span>
          </div>
        )}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              isComplete 
                ? "bg-green-500" 
                : "bg-primary"
            )}
            style={{ width: `${animatedPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Circular variant
  return (
    <div className={cn("relative flex items-center justify-center", config.circle, className)}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-500 ease-out",
            isComplete ? "text-green-500" : "text-primary"
          )}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isComplete ? (
          <CheckCircle2 className={cn(
            "text-green-500 animate-scale-in",
            size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'
          )} />
        ) : (
          <span className={cn("font-bold", config.text)}>
            {animatedPercent}%
          </span>
        )}
      </div>
    </div>
  );
};
