import { cn } from '@/lib/utils';
import { Building2, CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Piece {
  id: string;
  name: string;
  captured: boolean;
  progress?: number; // 0-100
}

interface GlobalEDLProgressProps {
  pieces: Piece[];
  buildingName?: string;
  variant?: 'compact' | 'detailed';
  className?: string;
}

/**
 * GlobalEDLProgress - Overall EDL capture progress
 * 
 * Shows "Immeuble: XX% capturé" based on pieces planned vs captured
 */
export const GlobalEDLProgress = ({
  pieces,
  buildingName = "Immeuble",
  variant = 'compact',
  className,
}: GlobalEDLProgressProps) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  
  const capturedCount = pieces.filter(p => p.captured).length;
  const totalCount = pieces.length;
  const percent = totalCount > 0 ? Math.round((capturedCount / totalCount) * 100) : 0;
  const isComplete = percent === 100;

  // Animate on change
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percent), 50);
    return () => clearTimeout(timer);
  }, [percent]);

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl",
        "bg-gradient-to-r",
        isComplete 
          ? "from-green-500/10 to-emerald-500/10 border border-green-500/20" 
          : "from-primary/10 to-primary/5 border border-primary/20",
        className
      )}>
        <Building2 className={cn(
          "h-5 w-5 shrink-0",
          isComplete ? "text-green-600" : "text-primary"
        )} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium truncate">{buildingName}</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              isComplete ? "text-green-600" : "text-primary"
            )}>
              {animatedPercent}%
            </span>
          </div>
          
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isComplete ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${animatedPercent}%` }}
            />
          </div>
        </div>
        
        {isComplete && (
          <CheckCircle2 className="h-5 w-5 text-green-500 animate-scale-in shrink-0" />
        )}
      </div>
    );
  }

  // Detailed variant with piece list
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with progress */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 rounded-xl",
          isComplete ? "bg-green-500/10" : "bg-primary/10"
        )}>
          <Building2 className={cn(
            "h-6 w-6",
            isComplete ? "text-green-600" : "text-primary"
          )} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">{buildingName}</span>
            <span className={cn(
              "text-lg font-bold",
              isComplete ? "text-green-600" : "text-primary"
            )}>
              {animatedPercent}% capturé
            </span>
          </div>
          
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isComplete ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${animatedPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Pieces summary */}
      <div className="flex flex-wrap gap-2">
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              piece.captured
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {piece.captured ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span className="truncate max-w-[80px]">{piece.name}</span>
          </div>
        ))}
      </div>
      
      {/* Summary text */}
      <p className="text-sm text-muted-foreground">
        {capturedCount}/{totalCount} pièces capturées
      </p>
    </div>
  );
};
