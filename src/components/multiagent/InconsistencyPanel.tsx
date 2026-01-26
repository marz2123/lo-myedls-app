import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, CheckCircle2, Zap, ArrowRight,
  Eye, FileText, ListTodo, Scale, Link, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentResolution, InconsistencyType, AgentName } from '@/types/multiagent';

interface InconsistencyPanelProps {
  resolutions: AgentResolution[];
  onApply?: () => void;
}

const INCONSISTENCY_LABELS: Record<InconsistencyType, { label: string; icon: React.ReactNode }> = {
  vision_description: { label: 'Vision ↔ Description', icon: <Eye className="h-4 w-4" /> },
  description_task: { label: 'Description ↔ Tâche', icon: <FileText className="h-4 w-4" /> },
  anomaly_task: { label: 'Anomalie ↔ Tâche', icon: <AlertTriangle className="h-4 w-4" /> },
  entry_exit: { label: 'Entrée ↔ Sortie', icon: <ArrowRight className="h-4 w-4" /> },
  state_anomaly: { label: 'État ↔ Anomalie', icon: <Award className="h-4 w-4" /> },
  photo_element: { label: 'Photo ↔ Élément', icon: <Eye className="h-4 w-4" /> },
  norm_violation: { label: 'Violation Norme', icon: <Scale className="h-4 w-4" /> },
  hallucination: { label: 'Hallucination IA', icon: <AlertTriangle className="h-4 w-4" /> },
  redundancy: { label: 'Redondance', icon: <Link className="h-4 w-4" /> },
  other: { label: 'Autre', icon: <AlertTriangle className="h-4 w-4" /> }
};

export const InconsistencyPanel: React.FC<InconsistencyPanelProps> = ({
  resolutions,
  onApply
}) => {
  const pendingResolutions = resolutions.filter(r => !r.appliedAt);
  const appliedResolutions = resolutions.filter(r => r.appliedAt);

  if (resolutions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucune incohérence détectée</h3>
          <p className="text-muted-foreground text-sm">
            Tous les agents sont en accord. L'EDL est cohérent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Incohérences détectées
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{pendingResolutions.length} en attente</Badge>
              {appliedResolutions.length > 0 && (
                <Badge variant="secondary">{appliedResolutions.length} corrigées</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {pendingResolutions.length > 0 && onApply && (
          <CardContent>
            <Button onClick={onApply} className="w-full gap-2">
              <Zap className="h-4 w-4" />
              Appliquer toutes les corrections ({pendingResolutions.length})
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Pending Resolutions */}
      {pendingResolutions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">En attente de correction</h4>
          {pendingResolutions.map((resolution) => (
            <ResolutionCard key={resolution.id} resolution={resolution} isPending />
          ))}
        </div>
      )}

      {/* Applied Resolutions */}
      {appliedResolutions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Corrections appliquées</h4>
          {appliedResolutions.map((resolution) => (
            <ResolutionCard key={resolution.id} resolution={resolution} isPending={false} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ResolutionCardProps {
  resolution: AgentResolution;
  isPending: boolean;
}

const ResolutionCard: React.FC<ResolutionCardProps> = ({ resolution, isPending }) => {
  const typeInfo = INCONSISTENCY_LABELS[resolution.inconsistencyType];

  return (
    <Card className={cn(
      "transition-all",
      isPending ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/30 bg-green-500/5"
    )}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
            isPending ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"
          )}>
            {isPending ? typeInfo.icon : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {typeInfo.label}
              </Badge>
              {resolution.chosenAgent && (
                <Badge variant="secondary" className="text-xs">
                  → {resolution.chosenAgent}
                </Badge>
              )}
            </div>
            <p className="text-sm">{resolution.conflictDescription}</p>
            {resolution.resolutionData?.suggestion && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 {resolution.resolutionData.suggestion}
              </p>
            )}
          </div>
          <Badge 
            variant={isPending ? 'outline' : 'secondary'}
            className="text-xs shrink-0"
          >
            {Math.round(resolution.confidence * 100)}%
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
