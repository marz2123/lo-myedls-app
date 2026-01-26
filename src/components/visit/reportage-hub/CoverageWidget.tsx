import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, CheckCircle2, Circle, AlertTriangle, 
  ChevronRight, Building2, Home, Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisitCoverage, VisitCoverage } from '@/hooks/useVisitCoverage';

interface CoverageWidgetProps {
  projectId: string;
  onCaptureZone?: (partie: string, lieu: string, zone: string) => void;
  className?: string;
}

export const CoverageWidget: React.FC<CoverageWidgetProps> = ({
  projectId,
  onCaptureZone,
  className
}) => {
  const { coverage, loading, refresh } = useVisitCoverage(projectId);
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !coverage) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="secondary" className="animate-pulse">
          <MapPin className="h-3 w-3 mr-1" />
          Chargement...
        </Badge>
      </div>
    );
  }

  const seenParties = coverage.parties.filter(p => p.seen).length;
  const totalParties = coverage.parties.length;
  const seenLieux = coverage.lieux.filter(l => l.seen).length;
  const totalLieux = coverage.lieux.length;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-500/10';
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-500/10';
    return 'text-red-600 bg-red-500/10';
  };

  const getBadgeVariant = () => {
    if (coverage.completionPercent >= 80) return 'default';
    if (coverage.completionPercent >= 50) return 'secondary';
    return 'outline';
  };

  const getBadgeColor = () => {
    if (coverage.completionPercent >= 80) return 'bg-green-500 hover:bg-green-600';
    if (coverage.completionPercent >= 50) return 'bg-amber-500 hover:bg-amber-600';
    return '';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 gap-1.5 text-xs font-medium rounded-full",
            "bg-background/90 backdrop-blur-sm border border-border/50 shadow-sm",
            "hover:bg-muted transition-colors",
            className
          )}
        >
          <MapPin className="h-3 w-3 text-primary" />
          <span>{coverage.completionPercent}%</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Couverture de visite
          </SheetTitle>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">
              {seenParties} sur {totalParties} parties visitées
            </span>
            <Badge 
              variant={getBadgeVariant()} 
              className={cn("text-sm", getBadgeColor())}
            >
              {coverage.completionPercent}%
            </Badge>
          </div>
          <Progress value={coverage.completionPercent} className="h-2 mt-2" />
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-6">
            {/* Parties couvertes */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Parties couvertes ({seenParties})
              </h4>
              <div className="space-y-2">
                {coverage.parties.filter(p => p.seen).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">
                    Aucune partie capturée pour l'instant
                  </p>
                ) : (
                  coverage.parties.filter(p => p.seen).map((item, idx) => (
                    <div 
                      key={`seen-${item.name}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20"
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

            {/* Lieux visités */}
            {coverage.lieux.filter(l => l.seen).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  Lieux visités ({seenLieux})
                </h4>
                <div className="space-y-2">
                  {coverage.lieux.filter(l => l.seen).map((lieu, idx) => (
                    <div 
                      key={`lieu-${lieu.partie}-${lieu.name}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20"
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

            {/* Parties manquantes */}
            {coverage.parties.filter(p => !p.seen).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Parties non visitées ({coverage.parties.filter(p => !p.seen).length})
                </h4>
                <div className="space-y-2">
                  {coverage.parties.filter(p => !p.seen).map((item, idx) => (
                    <Button
                      key={`missing-${item.name}-${idx}`}
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto rounded-lg bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10"
                      onClick={() => {
                        onCaptureZone?.(item.type || 'commune', item.name, '');
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'commune' ? 'Commune' : 'Privative'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Video className="h-3 w-3" />
                        Capturer
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Lieux manquants */}
            {coverage.lieux.filter(l => !l.seen).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  Lieux non visités ({coverage.lieux.filter(l => !l.seen).length})
                </h4>
                <div className="space-y-2">
                  {coverage.lieux.filter(l => !l.seen).map((lieu, idx) => (
                    <Button
                      key={`missing-lieu-${lieu.partie}-${lieu.name}-${idx}`}
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto rounded-lg bg-muted/50 border hover:bg-muted"
                      onClick={() => {
                        onCaptureZone?.(lieu.partie || '', lieu.name, '');
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 text-left">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{lieu.partie} ›</span>
                        <span className="text-sm">{lieu.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Zones détectées */}
            {coverage.zones.filter(z => z.seen).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Zones détectées ({coverage.zones.filter(z => z.seen).length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {coverage.zones.filter(z => z.seen).map((zone, idx) => (
                    <Badge 
                      key={`zone-${zone.lieu}-${zone.name}-${idx}`}
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
      </SheetContent>
    </Sheet>
  );
};
