import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, Circle, MapPin, AlertTriangle,
  ChevronRight, Building2, Home, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverageItem {
  name: string;
  type?: string;
  partie?: string;
  lieu?: string;
  seen: boolean;
  confidence: number;
}

interface Coverage {
  parties: CoverageItem[];
  lieux: CoverageItem[];
  zones: CoverageItem[];
  completionPercent: number;
}

interface CoveragePanelProps {
  coverage: Coverage | null;
  onCaptureZone?: (partie: string, lieu: string, zone: string) => void;
  className?: string;
}

export const CoveragePanel: React.FC<CoveragePanelProps> = ({
  coverage,
  onCaptureZone,
  className,
}) => {
  if (!coverage) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Pas encore de données de couverture</p>
      </div>
    );
  }

  const seenItems = coverage.parties.filter(p => p.seen);
  const missingItems = coverage.parties.filter(p => !p.seen);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-500/10';
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with progress */}
      <div className="p-4 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Couverture de visite
          </h3>
          <Badge 
            variant={coverage.completionPercent >= 80 ? 'default' : 'secondary'}
            className={cn(
              coverage.completionPercent >= 80 && 'bg-green-500',
              coverage.completionPercent >= 50 && coverage.completionPercent < 80 && 'bg-amber-500'
            )}
          >
            {coverage.completionPercent}%
          </Badge>
        </div>
        <Progress value={coverage.completionPercent} className="h-2" />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Zones couvertes */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Zones couvertes ({seenItems.length})
            </h4>
            <div className="space-y-1">
              {seenItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune zone capturée</p>
              ) : (
                seenItems.map((item, idx) => (
                  <div 
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/20"
                  >
                    <div className="flex items-center gap-2">
                      {item.type === 'commune' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Home className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <Badge className={cn("text-xs", getConfidenceColor(item.confidence))}>
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lieux détaillés */}
          {coverage.lieux.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                Lieux visités ({coverage.lieux.length})
              </h4>
              <div className="space-y-1">
                {coverage.lieux.map((lieu, idx) => (
                  <div 
                    key={`${lieu.partie}-${lieu.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{lieu.partie} ›</span>
                      <span className="text-sm">{lieu.name}</span>
                    </div>
                    <Badge className={cn("text-xs", getConfidenceColor(lieu.confidence))}>
                      {Math.round(lieu.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zones manquantes */}
          {missingItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Zones manquantes ({missingItems.length})
              </h4>
              <div className="space-y-1">
                {missingItems.map((item, idx) => (
                  <Button
                    key={`${item.name}-${idx}`}
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10"
                    onClick={() => onCaptureZone?.(item.type || 'commune', item.name, '')}
                  >
                    <div className="flex items-center gap-2">
                      <Circle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      Capturer
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Zones détectées */}
          {coverage.zones.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Éléments détectés ({coverage.zones.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {coverage.zones.map((zone, idx) => (
                  <Badge 
                    key={`${zone.lieu}-${zone.name}-${idx}`}
                    variant="outline" 
                    className="text-xs"
                  >
                    {zone.lieu} › {zone.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
