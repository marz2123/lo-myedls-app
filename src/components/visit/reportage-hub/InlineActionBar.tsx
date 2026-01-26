import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, AlertTriangle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineActionBarProps {
  onAddNote: () => void;
  onMarkProblem: () => void;
  onLinkClassification: () => void;
  className?: string;
  compact?: boolean;
}

export const InlineActionBar: React.FC<InlineActionBarProps> = ({
  onAddNote,
  onMarkProblem,
  onLinkClassification,
  className,
  compact = false
}) => {
  const handleClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className={cn(
      "flex items-center gap-1",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground",
          compact && "px-2"
        )}
        onClick={(e) => handleClick(e, onAddNote)}
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        {!compact && <span>Note</span>}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 gap-1.5 text-xs font-normal text-amber-600 hover:text-amber-700 hover:bg-amber-50",
          compact && "px-2"
        )}
        onClick={(e) => handleClick(e, onMarkProblem)}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {!compact && <span>Problème</span>}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground",
          compact && "px-2"
        )}
        onClick={(e) => handleClick(e, onLinkClassification)}
      >
        <Link2 className="h-3.5 w-3.5" />
        {!compact && <span>FT/CT/ST</span>}
      </Button>
    </div>
  );
};
