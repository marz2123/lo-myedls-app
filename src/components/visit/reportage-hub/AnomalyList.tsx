import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, CheckCircle2, Droplets, 
  ZapOff, Flame, Bug, Paintbrush2,
  SquareSlash, DoorOpen, Thermometer, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetectedAnomaly } from '@/hooks/useItemAnomalies';

interface AnomalyListProps {
  anomalies: DetectedAnomaly[];
  loading: boolean;
  onValidate?: (anomalyId: string) => void;
  compact?: boolean;
}

// EDL-specific anomaly type labels and icons
const anomalyTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  fissure: { label: 'Fissure', icon: SquareSlash, color: 'text-red-600' },
  crack: { label: 'Fissure', icon: SquareSlash, color: 'text-red-600' },
  humidity: { label: 'Humidité', icon: Droplets, color: 'text-blue-600' },
  humidite: { label: 'Humidité', icon: Droplets, color: 'text-blue-600' },
  stain: { label: 'Tache', icon: Droplets, color: 'text-amber-600' },
  tache: { label: 'Tache', icon: Droplets, color: 'text-amber-600' },
  mold: { label: 'Moisissure', icon: Bug, color: 'text-green-700' },
  moisissure: { label: 'Moisissure', icon: Bug, color: 'text-green-700' },
  paint_damage: { label: 'Peinture abîmée', icon: Paintbrush2, color: 'text-purple-600' },
  peinture: { label: 'Peinture abîmée', icon: Paintbrush2, color: 'text-purple-600' },
  floor_damage: { label: 'Sol abîmé', icon: SquareSlash, color: 'text-orange-600' },
  sol: { label: 'Sol abîmé', icon: SquareSlash, color: 'text-orange-600' },
  window_damage: { label: 'Fenêtre/Menuiserie', icon: DoorOpen, color: 'text-cyan-600' },
  fenetre: { label: 'Fenêtre/Menuiserie', icon: DoorOpen, color: 'text-cyan-600' },
  broken_equipment: { label: 'Équipement cassé', icon: ZapOff, color: 'text-gray-600' },
  equipement: { label: 'Équipement cassé', icon: ZapOff, color: 'text-gray-600' },
  heating: { label: 'Chauffage', icon: Thermometer, color: 'text-red-500' },
  electrical: { label: 'Électricité', icon: ZapOff, color: 'text-yellow-600' },
  fire_damage: { label: 'Dégât incendie', icon: Flame, color: 'text-red-700' },
  other: { label: 'Autre', icon: AlertTriangle, color: 'text-muted-foreground' },
};

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Faible', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  medium: { label: 'Modéré', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  high: { label: 'Élevé', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
  critical: { label: 'Critique', className: 'bg-red-700/10 text-red-700 border-red-700/30' },
};

export const AnomalyList: React.FC<AnomalyListProps> = ({
  anomalies,
  loading,
  onValidate,
  compact = false
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-border rounded-xl text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucune anomalie détectée</p>
      </div>
    );
  }

  const getAnomalyConfig = (type: string) => {
    const normalized = type.toLowerCase().replace(/[_-]/g, '');
    return anomalyTypeConfig[normalized] || anomalyTypeConfig[type] || anomalyTypeConfig.other;
  };

  const getSeverityConfig = (severity: string) => {
    return severityConfig[severity.toLowerCase()] || severityConfig.medium;
  };

  return (
    <div className="space-y-2">
      {anomalies.map((anomaly) => {
        const typeConfig = getAnomalyConfig(anomaly.anomaly_type);
        const sevConfig = getSeverityConfig(anomaly.severity);
        const Icon = typeConfig.icon;

        return (
          <div 
            key={anomaly.id}
            className={cn(
              "p-3 rounded-xl border bg-card",
              "hover:bg-muted/50 transition-colors",
              anomaly.is_confirmed && "border-green-500/30 bg-green-500/5"
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                sevConfig.className
              )}>
                <Icon className={cn("h-4 w-4", typeConfig.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{typeConfig.label}</span>
                  <Badge className={cn("text-xs border", sevConfig.className)}>
                    {sevConfig.label}
                  </Badge>
                  {anomaly.confidence_score && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      {Math.round(anomaly.confidence_score * 100)}%
                    </Badge>
                  )}
                </div>
                
                {!compact && anomaly.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {anomaly.description}
                  </p>
                )}

                {anomaly.is_confirmed && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Confirmé
                  </div>
                )}
              </div>

              {/* Actions */}
              {!compact && onValidate && !anomaly.is_confirmed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onValidate(anomaly.id)}
                >
                  Valider
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
