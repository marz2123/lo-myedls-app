// AI Steps Checklist Component
// Shows processing progress with live status updates

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { AIStep } from '@/hooks/useParallelAIProcessing';

interface AIStepsChecklistProps {
  steps: AIStep[];
  className?: string;
  compact?: boolean;
}

export const AIStepsChecklist: React.FC<AIStepsChecklistProps> = ({
  steps,
  className,
  compact = false,
}) => {
  const getStepIcon = (step: AIStep) => {
    switch (step.status) {
      case 'complete':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const overallProgress = Math.round(
    steps.reduce((sum, s) => sum + s.progress, 0) / steps.length
  );

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Analyse IA</span>
          <span className="font-medium">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="flex gap-2 flex-wrap">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                step.status === 'complete' && "bg-green-500/10 text-green-700 dark:text-green-400",
                step.status === 'processing' && "bg-primary/10 text-primary",
                step.status === 'error' && "bg-destructive/10 text-destructive",
                step.status === 'pending' && "bg-muted text-muted-foreground"
              )}
            >
              {getStepIcon(step)}
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Analyse en cours</span>
          <span className="text-sm text-muted-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Individual Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl transition-all duration-300",
              step.status === 'complete' && "bg-green-500/5 border border-green-500/20",
              step.status === 'processing' && "bg-primary/5 border border-primary/20",
              step.status === 'error' && "bg-destructive/5 border border-destructive/20",
              step.status === 'pending' && "bg-muted/30 border border-transparent"
            )}
          >
            {/* Step Number/Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              step.status === 'complete' && "bg-green-500 text-white",
              step.status === 'processing' && "bg-primary text-primary-foreground",
              step.status === 'error' && "bg-destructive text-destructive-foreground",
              step.status === 'pending' && "bg-muted text-muted-foreground"
            )}>
              {step.status === 'complete' ? (
                <Check className="h-4 w-4" />
              ) : step.status === 'processing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step.status === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  step.status === 'pending' && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {step.status === 'processing' && (
                  <span className="text-xs text-muted-foreground">
                    {step.progress}%
                  </span>
                )}
              </div>
              
              {step.status === 'processing' && (
                <Progress 
                  value={step.progress} 
                  className="h-1 mt-2" 
                />
              )}
              
              {step.status === 'error' && step.error && (
                <p className="text-xs text-destructive mt-1 truncate">
                  {step.error}
                </p>
              )}
            </div>

            {/* Status Label */}
            {step.status === 'complete' && (
              <span className="text-xs text-green-600 font-medium">✓</span>
            )}
          </div>
        ))}
      </div>

      {/* AI Warning */}
      <p className="text-xs text-muted-foreground text-center">
        Analyses générées par IA à titre indicatif. Validation humaine requise.
      </p>
    </div>
  );
};

export default AIStepsChecklist;
