import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Droplets,
  Zap,
  Wind,
  Thermometer,
  Building2,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { PredictiveRisk } from '@/types/predictive';

interface FutureRisksPanelProps {
  risks: PredictiveRisk[];
  isLoading?: boolean;
  onMitigate?: (riskId: string) => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  structural: { label: 'Structure', icon: <Building2 className="h-4 w-4" />, color: 'text-slate-600' },
  humidity: { label: 'Humidité', icon: <Droplets className="h-4 w-4" />, color: 'text-blue-600' },
  electrical: { label: 'Électricité', icon: <Zap className="h-4 w-4" />, color: 'text-amber-600' },
  plumbing: { label: 'Plomberie', icon: <Droplets className="h-4 w-4" />, color: 'text-cyan-600' },
  ventilation: { label: 'Ventilation', icon: <Wind className="h-4 w-4" />, color: 'text-green-600' },
  thermal: { label: 'Thermique', icon: <Thermometer className="h-4 w-4" />, color: 'text-orange-600' }
};

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: 'Modéré', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  high: { label: 'Élevé', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  critical: { label: 'Critique', color: 'text-red-600', bgColor: 'bg-red-100' }
};

export const FutureRisksPanel: React.FC<FutureRisksPanelProps> = ({
  risks,
  isLoading,
  onMitigate
}) => {
  const criticalRisks = risks.filter(r => r.severity === 'critical');
  const highRisks = risks.filter(r => r.severity === 'high');
  const otherRisks = risks.filter(r => r.severity !== 'critical' && r.severity !== 'high');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risques Futurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderRiskCard = (risk: PredictiveRisk) => {
    const category = categoryConfig[risk.risk_category] || categoryConfig.structural;
    const severity = severityConfig[risk.severity];

    return (
      <div key={risk.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={category.color}>
              {category.icon}
            </div>
            <div>
              <h4 className="font-medium text-sm">{risk.risk_type}</h4>
              <p className="text-xs text-muted-foreground">{category.label}</p>
            </div>
          </div>
          <Badge className={`${severity.bgColor} ${severity.color} border-0`}>
            {severity.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Probabilité:</span>
            <span className="font-medium">{risk.probability}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Impact:</span>
            <span className="font-medium">{risk.impact_score}/100</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span>Occurrence estimée: {risk.estimated_occurrence}</span>
        </div>

        {risk.estimated_cost_if_ignored > 0 && (
          <p className="text-xs text-red-600 mb-2">
            Coût si ignoré: {risk.estimated_cost_if_ignored.toLocaleString()}€
          </p>
        )}

        {risk.detected_indicators && risk.detected_indicators.length > 0 && (
          <div className="text-xs mb-2">
            <span className="text-muted-foreground">Indicateurs: </span>
            <span>{risk.detected_indicators.map(i => i.indicator).join(', ')}</span>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {risk.status === 'active' && onMitigate && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onMitigate(risk.id)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Atténuer
            </Button>
          )}
          <Button size="sm" variant="ghost" className="flex-1">
            <Eye className="h-3 w-3 mr-1" />
            Surveiller
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Risques Futurs Détectés
          {risks.length > 0 && (
            <Badge variant="secondary">{risks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Aucun risque majeur détecté</p>
              <p className="text-sm">Le bien est en bon état général</p>
            </div>
          ) : (
            <div className="space-y-4">
              {criticalRisks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Risques Critiques ({criticalRisks.length})
                  </h4>
                  <div className="space-y-2">
                    {criticalRisks.map(renderRiskCard)}
                  </div>
                </div>
              )}

              {highRisks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-orange-600 mb-2">
                    Risques Élevés ({highRisks.length})
                  </h4>
                  <div className="space-y-2">
                    {highRisks.map(renderRiskCard)}
                  </div>
                </div>
              )}

              {otherRisks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Autres Risques ({otherRisks.length})
                  </h4>
                  <div className="space-y-2">
                    {otherRisks.map(renderRiskCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
