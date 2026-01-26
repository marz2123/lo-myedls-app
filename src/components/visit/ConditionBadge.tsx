import { CheckCircle2, ThumbsUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConditionState } from '@/types/businessModel';

interface ConditionBadgeProps {
  condition: ConditionState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const conditionConfig = {
  neuf: {
    icon: CheckCircle2,
    label: 'Neuf',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    dotColor: 'bg-success',
  },
  bon: {
    icon: ThumbsUp,
    label: 'Bon état',
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/30',
    dotColor: 'bg-info',
  },
  a_refaire: {
    icon: AlertTriangle,
    label: 'À refaire',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    dotColor: 'bg-destructive',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-3 h-3',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-4 h-4',
    dot: 'w-2.5 h-2.5',
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2.5',
    icon: 'w-5 h-5',
    dot: 'w-3 h-3',
  },
};

export const ConditionBadge = ({ 
  condition, 
  size = 'md', 
  showLabel = true,
  className 
}: ConditionBadgeProps) => {
  const config = conditionConfig[condition];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.bgColor,
        config.borderColor,
        config.color,
        sizes.container,
        className
      )}
    >
      <div className={cn("rounded-full", config.dotColor, sizes.dot)} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export const ConditionDot = ({ 
  condition, 
  size = 'md',
  className 
}: { 
  condition: ConditionState; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const config = conditionConfig[condition];
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div 
      className={cn(
        "rounded-full",
        config.dotColor,
        dotSizes[size],
        className
      )}
      title={config.label}
    />
  );
};
