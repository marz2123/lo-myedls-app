import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  X,
  AlertCircle,
  DollarSign,
  Eye
} from 'lucide-react';
import { SuperConducteurSuggestion, RiskItem } from '@/hooks/useSuperConducteur';

interface SuperConducteurOverlayProps {
  suggestion: SuperConducteurSuggestion | null;
  risksDetected: RiskItem[];
  missingItems: string[];
  budgetCritical: string[];
  onDismiss: () => void;
  onAction: (action: string) => void;
  isVisible?: boolean;
}

export const SuperConducteurOverlay = ({
  suggestion,
  risksDetected,
  missingItems,
  budgetCritical,
  onDismiss,
  onAction,
  isVisible = true
}: SuperConducteurOverlayProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (suggestion) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [suggestion]);

  if (!isVisible || !suggestion) return null;

  const getIcon = () => {
    switch (suggestion.type) {
      case 'risk':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'missing':
        return <Eye className="h-5 w-5 text-amber-500" />;
      case 'budget':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'next_action':
        return <ChevronRight className="h-5 w-5 text-primary" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    }
  };

  const getBorderColor = () => {
    switch (suggestion.priority) {
      case 'critical':
        return 'border-l-destructive';
      case 'high':
        return 'border-l-amber-500';
      case 'normal':
        return 'border-l-primary';
      default:
        return 'border-l-muted-foreground';
    }
  };

  return (
    <div 
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4",
        "transition-all duration-300 ease-out",
        isAnimating && "animate-in fade-in slide-in-from-top-2"
      )}
    >
      <div 
        className={cn(
          "bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border",
          "border-l-4",
          getBorderColor()
        )}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {getIcon()}
              <p className="text-sm font-medium text-foreground leading-tight">
                {suggestion.text}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action buttons */}
          {suggestion.actionOptions && suggestion.actionOptions.length > 0 && (
            <div className="flex gap-2 mt-3 ml-8">
              {suggestion.actionOptions.map((option, index) => (
                <Button
                  key={index}
                  variant={index === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onAction(option.action)}
                  className="text-xs h-8"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Status badges */}
        {(risksDetected.length > 0 || missingItems.length > 0 || budgetCritical.length > 0) && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {risksDetected.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {risksDetected.length} risque{risksDetected.length > 1 ? 's' : ''}
              </Badge>
            )}
            {missingItems.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                {missingItems.length} zone{missingItems.length > 1 ? 's' : ''} manquante{missingItems.length > 1 ? 's' : ''}
              </Badge>
            )}
            {budgetCritical.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                {budgetCritical.length} budget critique
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
