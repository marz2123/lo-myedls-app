import { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DigitalTwinModel } from '@/types/digital-twin';

interface TwinHealthScoreProps {
  twin: DigitalTwinModel;
}

export function TwinHealthScore({ twin }: TwinHealthScoreProps) {
  const healthData = useMemo(() => {
    const score = twin.health_score || 0;
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    let color: string;
    let Icon: React.ElementType;
    let trend: 'up' | 'down' | 'stable';

    if (score >= 90) {
      status = 'excellent';
      color = 'text-green-500';
      Icon = CheckCircle2;
    } else if (score >= 75) {
      status = 'good';
      color = 'text-lime-500';
      Icon = CheckCircle2;
    } else if (score >= 50) {
      status = 'fair';
      color = 'text-yellow-500';
      Icon = Activity;
    } else if (score >= 25) {
      status = 'poor';
      color = 'text-orange-500';
      Icon = AlertTriangle;
    } else {
      status = 'critical';
      color = 'text-red-500';
      Icon = AlertTriangle;
    }

    // Simulate trend based on anomalies vs elements ratio
    const anomalyRatio = twin.total_elements > 0 
      ? twin.total_anomalies / twin.total_elements 
      : 0;
    trend = anomalyRatio > 0.2 ? 'down' : anomalyRatio < 0.05 ? 'up' : 'stable';

    return { score, status, color, Icon, trend };
  }, [twin]);

  const statusLabels = {
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Moyen',
    poor: 'Dégradé',
    critical: 'Critique',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <healthData.Icon className={`h-5 w-5 ${healthData.color}`} />
          <span className="font-medium">Score de santé</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-2xl font-bold ${healthData.color}`}>
            {Math.round(healthData.score)}%
          </span>
          {healthData.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
          {healthData.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      <Progress 
        value={healthData.score} 
        className="h-2"
      />

      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{twin.total_elements}</p>
          <p className="text-xs text-muted-foreground">Éléments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive">{twin.total_anomalies}</p>
          <p className="text-xs text-muted-foreground">Anomalies</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{twin.total_tasks}</p>
          <p className="text-xs text-muted-foreground">Tâches</p>
        </div>
      </div>

      <div className="flex items-center justify-center pt-2">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${healthData.color} bg-current/10`}>
          {statusLabels[healthData.status]}
        </span>
      </div>
    </div>
  );
}
