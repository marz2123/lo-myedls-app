import { useEffect, useState } from 'react';
import { Mic, Eye, Brain, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIStatus = 'idle' | 'listening' | 'analyzing' | 'detecting' | 'complete';

interface AIStatusOverlayProps {
  status: AIStatus;
  className?: string;
}

const statusConfig = {
  idle: {
    icon: null,
    label: '',
    color: '',
  },
  listening: {
    icon: Mic,
    label: 'IA écoute...',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  analyzing: {
    icon: Eye,
    label: 'Analyse de la pièce...',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'border-accent/30',
  },
  detecting: {
    icon: Brain,
    label: 'Détection des problèmes...',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Analyse terminée',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
  },
};

export const AIStatusOverlay = ({ status, className }: AIStatusOverlayProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (status === 'idle' || status === 'complete') {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "absolute inset-x-4 bottom-4 animate-slide-up",
        className
      )}
    >
      <div 
        className={cn(
          "glass-strong rounded-2xl p-4 flex items-center gap-4",
          "border",
          config.borderColor
        )}
      >
        {/* Icon container with animation */}
        <div 
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            config.bgColor
          )}
        >
          {Icon && (
            <Icon 
              className={cn(
                "w-6 h-6",
                config.color,
                status !== 'complete' && "animate-pulse"
              )} 
            />
          )}
        </div>
        
        {/* Text */}
        <div className="flex-1">
          <p className={cn("font-semibold", config.color)}>
            {config.label}
            {status !== 'complete' && (
              <span className="inline-block w-8">{dots}</span>
            )}
          </p>
          {status === 'analyzing' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Identification du type de pièce et des matériaux
            </p>
          )}
          {status === 'detecting' && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Recherche de pathologies et défauts
            </p>
          )}
        </div>

        {/* Sparkles animation */}
        {status !== 'complete' && (
          <Sparkles className={cn("w-5 h-5 animate-pulse", config.color)} />
        )}
      </div>
    </div>
  );
};
