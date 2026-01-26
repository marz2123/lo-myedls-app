import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence_score: number;
  is_confirmed: boolean;
  created_at: string;
}

interface AnomalyDetectionPanelProps {
  projectId: string;
}

const anomalyTypeLabels: Record<string, string> = {
  crack_evolution: 'Évolution de fissure',
  recurring_infiltration: 'Infiltration récurrente',
  structural_concern: 'Préoccupation structurelle',
  material_degradation: 'Dégradation matérielle'
};

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export const AnomalyDetectionPanel = ({ projectId }: AnomalyDetectionPanelProps) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnomalies();
  }, [projectId]);

  const loadAnomalies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('detected_anomalies')
      .select('*')
      .eq('project_id', projectId)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading anomalies:', error);
      toast.error('Erreur lors du chargement des anomalies');
    } else {
      setAnomalies((data || []) as Anomaly[]);
    }
    setLoading(false);
  };

  const confirmAnomaly = async (anomalyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('detected_anomalies')
      .update({
        is_confirmed: true,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', anomalyId);

    if (error) {
      toast.error('Erreur lors de la confirmation');
    } else {
      toast.success('Anomalie confirmée');
      loadAnomalies();
    }
  };

  if (loading) {
    return <div className="animate-pulse">Chargement des anomalies...</div>;
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Aucune anomalie détectée
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Anomalies Détectées ({anomalies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className="p-4 border rounded-lg space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={severityColors[anomaly.severity]}>
                    {anomaly.severity.toUpperCase()}
                  </Badge>
                  <span className="font-medium">
                    {anomalyTypeLabels[anomaly.anomaly_type]}
                  </span>
                  {anomaly.is_confirmed && (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmée
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {anomaly.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  Confiance: {(anomaly.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            {!anomaly.is_confirmed && (
              <Button
                size="sm"
                onClick={() => confirmAnomaly(anomaly.id)}
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmer cette anomalie
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};