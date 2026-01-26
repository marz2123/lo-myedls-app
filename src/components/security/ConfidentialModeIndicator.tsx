import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfidentialMode } from '@/contexts/ConfidentialModeContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidentialModeIndicatorProps {
  className?: string;
  showToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConfidentialModeIndicator: React.FC<ConfidentialModeIndicatorProps> = ({
  className,
  showToggle = true,
  size = 'md'
}) => {
  const { isConfidential, toggleConfidential } = useConfidentialMode();

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (!showToggle && !isConfidential) {
    return null;
  }

  const Icon = isConfidential ? Lock : Unlock;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isConfidential ? "default" : "ghost"}
            size="icon"
            className={cn(
              sizeClasses[size],
              isConfidential && "bg-amber-500 hover:bg-amber-600 text-white",
              className
            )}
            onClick={showToggle ? toggleConfidential : undefined}
          >
            <Icon className={iconSizes[size]} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isConfidential 
            ? "Mode confidentiel activé" 
            : "Activer le mode confidentiel"
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Floating indicator for app-wide display
export const FloatingConfidentialIndicator: React.FC = () => {
  const { isConfidential } = useConfidentialMode();

  if (!isConfidential) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-full shadow-lg">
        <Lock className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Mode confidentiel</span>
      </div>
    </div>
  );
};
