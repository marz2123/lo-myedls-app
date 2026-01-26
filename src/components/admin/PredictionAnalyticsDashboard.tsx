import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, TrendingUp, CheckCircle, XCircle, Clock, Award } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PredictionMetrics {
  totalPredictions: number;
  acceptedPredictions: number;
  rejectedPredictions: number;
  acceptanceRate: number;
  avgConfidence: number;
  avgConfidenceAccepted: number;
  avgConfidenceRejected: number;
  predictionsByWorkType: {
    work_type: string;
    total: number;
    accepted: number;
    rate: number;
  }[];
}

export function PredictionAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<PredictionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all prediction feedback
      const { data: feedbackData, error } = await supabase
        .from('task_prediction_feedback')
        .select('accepted, feedback_score, predicted_task_data, created_at')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!feedbackData || feedbackData.length === 0) {
        setMetrics({
          totalPredictions: 0,
          acceptedPredictions: 0,
          rejectedPredictions: 0,
          acceptanceRate: 0,
          avgConfidence: 0,
          avgConfidenceAccepted: 0,
          avgConfidenceRejected: 0,
          predictionsByWorkType: []
        });
        return;
      }

      // Calculate metrics
      const totalPredictions = feedbackData.length;
      const acceptedPredictions = feedbackData.filter(f => f.accepted).length;
      const rejectedPredictions = totalPredictions - acceptedPredictions;
      const acceptanceRate = (acceptedPredictions / totalPredictions) * 100;

      const avgConfidence = feedbackData.reduce((sum, f) => sum + (f.feedback_score || 0), 0) / totalPredictions;
      
      const acceptedFeedback = feedbackData.filter(f => f.accepted);
      const avgConfidenceAccepted = acceptedFeedback.length > 0
        ? acceptedFeedback.reduce((sum, f) => sum + (f.feedback_score || 0), 0) / acceptedFeedback.length
        : 0;

      const rejectedFeedback = feedbackData.filter(f => !f.accepted);
      const avgConfidenceRejected = rejectedFeedback.length > 0
        ? rejectedFeedback.reduce((sum, f) => sum + (f.feedback_score || 0), 0) / rejectedFeedback.length
        : 0;

      // Group by work type
      const workTypeMap = new Map<string, { total: number; accepted: number }>();
      feedbackData.forEach(f => {
        const workType = (f.predicted_task_data as any)?.work_type || 'unknown';
        if (!workTypeMap.has(workType)) {
          workTypeMap.set(workType, { total: 0, accepted: 0 });
        }
        const stats = workTypeMap.get(workType)!;
        stats.total++;
        if (f.accepted) stats.accepted++;
      });

      const predictionsByWorkType = Array.from(workTypeMap.entries()).map(([work_type, stats]) => ({
        work_type,
        total: stats.total,
        accepted: stats.accepted,
        rate: (stats.accepted / stats.total) * 100
      })).sort((a, b) => b.total - a.total);

      setMetrics({
        totalPredictions,
        acceptedPredictions,
        rejectedPredictions,
        acceptanceRate,
        avgConfidence,
        avgConfidenceAccepted,
        avgConfidenceRejected,
        predictionsByWorkType
      });
    } catch (error) {
      console.error('Error loading prediction metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.totalPredictions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Analytics des Prédictions' : 'Prediction Analytics'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Aucune donnée de prédiction disponible pour le moment'
              : 'No prediction data available yet'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Analytics des Prédictions' : 'Prediction Analytics'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Métriques de qualité et performance du système prédictif'
              : 'Quality metrics and predictive system performance'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Total Prédictions' : 'Total Predictions'}
                    </p>
                    <p className="text-2xl font-bold">{metrics.totalPredictions}</p>
                  </div>
                  <Award className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Taux Acceptation' : 'Acceptance Rate'}
                    </p>
                    <p className="text-2xl font-bold">{metrics.acceptanceRate.toFixed(1)}%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <Progress value={metrics.acceptanceRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Confiance Moy.' : 'Avg. Confidence'}
                    </p>
                    <p className="text-2xl font-bold">{metrics.avgConfidence.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
                <Progress value={metrics.avgConfidence} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Rejetées' : 'Rejected'}
                    </p>
                    <p className="text-2xl font-bold">{metrics.rejectedPredictions}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('cancel') === 'Annuler' ? 'Confiance par Statut' : 'Confidence by Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t('cancel') === 'Annuler' ? 'Prédictions Acceptées' : 'Accepted Predictions'}
                  </span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {metrics.avgConfidenceAccepted.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.avgConfidenceAccepted} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    {t('cancel') === 'Annuler' ? 'Prédictions Rejetées' : 'Rejected Predictions'}
                  </span>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {metrics.avgConfidenceRejected.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.avgConfidenceRejected} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Performance by Work Type */}
          {metrics.predictionsByWorkType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('cancel') === 'Annuler' ? 'Performance par Type de Travaux' : 'Performance by Work Type'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.predictionsByWorkType.map((workType) => (
                    <div key={workType.work_type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {workType.work_type === 'renovation' 
                              ? (t('cancel') === 'Annuler' ? 'Rénovation' : 'Renovation')
                              : (t('cancel') === 'Annuler' ? 'Neuf' : 'New Build')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {workType.accepted}/{workType.total}
                          </span>
                        </div>
                        <Badge 
                          variant={workType.rate >= 70 ? "default" : workType.rate >= 50 ? "secondary" : "destructive"}
                        >
                          {workType.rate.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress value={workType.rate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">
                    {t('cancel') === 'Annuler' ? 'Insights' : 'Insights'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metrics.acceptanceRate >= 70 
                      ? (t('cancel') === 'Annuler' 
                          ? 'Excellente performance ! Le système apprend bien de vos retours.'
                          : 'Excellent performance! The system is learning well from your feedback.')
                      : metrics.acceptanceRate >= 50
                      ? (t('cancel') === 'Annuler' 
                          ? 'Performance correcte. Continuez à donner des retours pour améliorer.'
                          : 'Fair performance. Keep providing feedback to improve.')
                      : (t('cancel') === 'Annuler' 
                          ? 'Performance à améliorer. Vos retours aident le système à apprendre.'
                          : 'Performance needs improvement. Your feedback helps the system learn.')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}