import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Zap
} from 'lucide-react';
import { CapturedZone, RiskItem } from '@/hooks/useSuperConducteur';

interface SuperConducteurStatusProps {
  isActive: boolean;
  isAnalyzing: boolean;
  currentPiece: string | null;
  currentSubZone: string | null;
  capturedZones: CapturedZone[];
  risksDetected: RiskItem[];
  idleSeconds: number;
  className?: string;
}

export const SuperConducteurStatus = ({
  isActive,
  isAnalyzing,
  currentPiece,
  currentSubZone,
  capturedZones,
  risksDetected,
  idleSeconds,
  className
}: SuperConducteurStatusProps) => {
  if (!isActive) return null;

  // Calculate progress for current piece
  const subZones = ['mur', 'sol', 'plafond', 'ouvertures', 'equipements'];
  const capturedInPiece = currentPiece
    ? capturedZones.filter(z => z.piece === currentPiece).length
    : 0;
  const progress = currentPiece ? (capturedInPiece / subZones.length) * 100 : 0;

  const criticalRisks = risksDetected.filter(r => r.severity === 'critical' || r.severity === 'high');

  return (
    <div className={cn("space-y-3", className)}>
      {/* Active indicator */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isAnalyzing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
        )} />
        <span className="text-xs font-medium text-muted-foreground">
          Super Conducteur {isAnalyzing ? 'analyse...' : 'actif'}
        </span>
        {isAnalyzing && <Brain className="h-3 w-3 text-primary animate-pulse" />}
      </div>

      {/* Current location */}
      {currentPiece && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Position:</span>
          <Badge variant="outline" className="text-xs">
            {currentPiece}
            {currentSubZone && ` / ${currentSubZone}`}
          </Badge>
        </div>
      )}

      {/* Progress bar for current piece */}
      {currentPiece && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression pièce</span>
            <span>{capturedInPiece}/{subZones.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Sub-zones checklist */}
      {currentPiece && (
        <div className="flex flex-wrap gap-1.5">
          {subZones.map(zone => {
            const isCaptured = capturedZones.some(
              z => z.piece === currentPiece && z.subZone === zone
            );
            const isCurrent = zone === currentSubZone;

            return (
              <Badge
                key={zone}
                variant={isCaptured ? "default" : "outline"}
                className={cn(
                  "text-xs capitalize",
                  isCaptured && "bg-emerald-500 hover:bg-emerald-600",
                  isCurrent && !isCaptured && "border-primary"
                )}
              >
                {isCaptured && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {zone}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Risks indicator */}
      {criticalRisks.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">
            {criticalRisks.length} risque{criticalRisks.length > 1 ? 's' : ''} critique{criticalRisks.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Idle warning */}
      {idleSeconds >= 5 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Inactif depuis {idleSeconds}s</span>
        </div>
      )}

      {/* AI active indicator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Zap className="h-3 w-3 text-primary" />
        <span>Pilotage IA activé</span>
      </div>
    </div>
  );
};
