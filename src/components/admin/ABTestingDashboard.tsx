import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical, TrendingUp, Users, Award, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Strategy {
  id: string;
  name: string;
  description: string;
  strategy_config: any;
  is_active: boolean;
}

interface StrategyMetrics {
  strategy_id: string;
  strategy_name: string;
  total_predictions: number;
  accepted_predictions: number;
  acceptance_rate: number;
  avg_confidence: number;
  user_count: number;
}

export function ABTestingDashboard() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [metrics, setMetrics] = useState<StrategyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
    
    // Check for rollback every 5 minutes
    const rollbackInterval = setInterval(checkAndRollback, 5 * 60 * 1000);
    
    return () => clearInterval(rollbackInterval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('prediction_strategies')
        .select('*')
        .order('created_at');

      if (strategiesError) throw strategiesError;
      setStrategies(strategiesData || []);

      // Load metrics for each strategy
      const metricsPromises = (strategiesData || []).map(async (strategy) => {
        // Get prediction feedback for this strategy
        const { data: assignments } = await supabase
          .from('user_prediction_assignments')
          .select('user_id')
          .eq('strategy_id', strategy.id);

        const userIds = assignments?.map(a => a.user_id) || [];

        if (userIds.length === 0) {
          return {
            strategy_id: strategy.id,
            strategy_name: strategy.name,
            total_predictions: 0,
            accepted_predictions: 0,
            acceptance_rate: 0,
            avg_confidence: 0,
            user_count: 0
          };
        }

        const { data: feedbackData } = await supabase
          .from('task_prediction_feedback')
          .select('accepted, feedback_score')
          .in('user_id', userIds);

        const totalPredictions = feedbackData?.length || 0;
        const acceptedPredictions = feedbackData?.filter(f => f.accepted).length || 0;
        const acceptanceRate = totalPredictions > 0 ? (acceptedPredictions / totalPredictions) * 100 : 0;
        const avgConfidence = totalPredictions > 0
          ? feedbackData!.reduce((sum, f) => sum + (f.feedback_score || 0), 0) / totalPredictions
          : 0;

        return {
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          total_predictions: totalPredictions,
          accepted_predictions: acceptedPredictions,
          acceptance_rate: acceptanceRate,
          avg_confidence: avgConfidence,
          user_count: userIds.length
        };
      });

      const metricsData = await Promise.all(metricsPromises);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading A/B testing data:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeStrategies = async () => {
    setIsOptimizing(true);
    try {
      // Find best performing strategy
      const bestStrategy = metrics.reduce((best, current) => {
        if (current.total_predictions < 10) return best; // Minimum sample size
        if (!best || current.acceptance_rate > best.acceptance_rate) {
          return current;
        }
        return best;
      }, null as StrategyMetrics | null);

      if (!bestStrategy) {
        toast.error("Pas assez de données pour optimiser");
        return;
      }

      // Store current performance metrics before optimization for rollback
      const activeStrategies = strategies.filter(s => s.is_active);
      for (const strategy of activeStrategies) {
        const strategyMetrics = metrics.find(m => m.strategy_id === strategy.id);
        if (strategyMetrics && strategyMetrics.total_predictions >= 10) {
          await supabase
            .from('prediction_strategies')
            .update({
              previous_performance: {
                acceptance_rate: strategyMetrics.acceptance_rate,
                avg_confidence: strategyMetrics.avg_confidence,
                total_predictions: strategyMetrics.total_predictions,
                user_count: strategyMetrics.user_count,
                timestamp: new Date().toISOString()
              },
              last_optimization_at: new Date().toISOString()
            })
            .eq('id', strategy.id);
        }
      }

      // Deactivate underperforming strategies
      const underperformingStrategies = metrics.filter(m => 
        m.total_predictions >= 10 && 
        m.acceptance_rate < bestStrategy.acceptance_rate * 0.8 &&
        m.strategy_id !== bestStrategy.strategy_id
      );

      for (const strategy of underperformingStrategies) {
        await supabase
          .from('prediction_strategies')
          .update({ is_active: false })
          .eq('id', strategy.strategy_id);
      }

      // Reassign users from deactivated strategies to best strategy
      const deactivatedIds = underperformingStrategies.map(s => s.strategy_id);
      if (deactivatedIds.length > 0) {
        await supabase
          .from('user_prediction_assignments')
          .update({ strategy_id: bestStrategy.strategy_id })
          .in('strategy_id', deactivatedIds);
      }

      toast.success(
        `Optimisation terminée. Stratégie "${bestStrategy.strategy_name}" sélectionnée (${bestStrategy.acceptance_rate.toFixed(1)}% taux d'acceptation). Surveillance automatique activée.`
      );

      await loadData();
    } catch (error) {
      console.error('Error optimizing strategies:', error);
      toast.error("Erreur lors de l'optimisation");
    } finally {
      setIsOptimizing(false);
    }
  };

  const checkAndRollback = async () => {
    try {
      // Check each active strategy for performance degradation
      const activeStrategies = strategies.filter(s => s.is_active);
      
      for (const strategy of activeStrategies) {
        const currentMetrics = metrics.find(m => m.strategy_id === strategy.id);
        if (!currentMetrics || currentMetrics.total_predictions < 10) continue;

        // Call the database function to check if rollback is needed
        const { data: needsRollback, error } = await supabase.rpc(
          'check_strategy_performance_degradation',
          {
            p_strategy_id: strategy.id,
            p_current_acceptance_rate: currentMetrics.acceptance_rate,
            p_monitoring_window_hours: 24
          }
        );

        if (error) {
          console.error('Error checking rollback:', error);
          continue;
        }

        if (needsRollback) {
          // Performance degraded - trigger rollback
          toast.warning(
            `⚠️ Dégradation détectée pour "${strategy.name}". Rollback automatique en cours...`
          );

          // Reactivate previously deactivated strategies
          const { data: allStrategies } = await supabase
            .from('prediction_strategies')
            .select('*');

          if (allStrategies) {
            const strategiesToReactivate = allStrategies.filter(s => 
              !s.is_active && 
              s.previous_performance && 
              (s.previous_performance as any).acceptance_rate > currentMetrics.acceptance_rate
            );

            for (const oldStrategy of strategiesToReactivate) {
              await supabase
                .from('prediction_strategies')
                .update({ is_active: true })
                .eq('id', oldStrategy.id);
            }

            // Deactivate underperforming strategy
            await supabase
              .from('prediction_strategies')
              .update({ is_active: false })
              .eq('id', strategy.id);

            toast.success(
              `✅ Rollback effectué. Stratégies précédentes réactivées pour maintenir les performances.`
            );

            await loadData();
          }
        }
      }
    } catch (error) {
      console.error('Error during rollback check:', error);
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

  const totalUsers = metrics.reduce((sum, m) => sum + m.user_count, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'A/B Testing des Stratégies' : 'Strategy A/B Testing'}
              </CardTitle>
              <CardDescription>
                {t('cancel') === 'Annuler' 
                  ? 'Comparaison et optimisation automatique des stratégies de prédiction'
                  : 'Comparison and automatic optimization of prediction strategies'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('cancel') === 'Annuler' ? 'Actualiser' : 'Refresh'}
              </Button>
              <Button variant="outline" size="sm" onClick={checkAndRollback}>
                {t('cancel') === 'Annuler' ? 'Vérifier Rollback' : 'Check Rollback'}
              </Button>
              <Button size="sm" onClick={optimizeStrategies} disabled={isOptimizing}>
                {isOptimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('cancel') === 'Annuler' ? 'Optimisation...' : 'Optimizing...'}
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Optimiser Auto' : 'Auto Optimize'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Stratégies Actives' : 'Active Strategies'}
                    </p>
                    <p className="text-2xl font-bold">{strategies.filter(s => s.is_active).length}</p>
                  </div>
                  <FlaskConical className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Utilisateurs' : 'Users'}
                    </p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Meilleure Stratégie' : 'Best Strategy'}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {metrics.reduce((best, current) => 
                        current.acceptance_rate > (best?.acceptance_rate || 0) ? current : best
                      , null as StrategyMetrics | null)?.strategy_name || 'N/A'}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {metrics.map((metric) => {
              const strategy = strategies.find(s => s.id === metric.strategy_id);
              if (!strategy) return null;

              return (
                <Card key={metric.strategy_id} className={!strategy.is_active ? 'opacity-60' : ''}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{metric.strategy_name}</h4>
                          {!strategy.is_active && (
                            <Badge variant="secondary">
                              {t('cancel') === 'Annuler' ? 'Inactive' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {t('cancel') === 'Annuler' ? 'Utilisateurs' : 'Users'}
                            </p>
                            <p className="font-semibold">{metric.user_count}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {t('cancel') === 'Annuler' ? 'Prédictions' : 'Predictions'}
                            </p>
                            <p className="font-semibold">{metric.total_predictions}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">{strategy.description}</p>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {t('cancel') === 'Annuler' ? 'Taux Acceptation' : 'Acceptance Rate'}
                            </span>
                            <span className="text-sm font-semibold">
                              {metric.acceptance_rate.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={metric.acceptance_rate} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {t('cancel') === 'Annuler' ? 'Confiance Moy.' : 'Avg. Confidence'}
                            </span>
                            <span className="text-sm font-semibold">
                              {metric.avg_confidence.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={metric.avg_confidence} className="h-2" />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <strong>Config:</strong> 
                        {' '}Historique: {strategy.strategy_config.useUserHistory ? '✓' : '✗'}
                        {' '}| Projets similaires: {strategy.strategy_config.useSimilarProjects ? '✓' : '✗'}
                        {' '}| Apprentissage: {strategy.strategy_config.useFeedbackLearning ? '✓' : '✗'}
                        {' '}| Seuil: {strategy.strategy_config.confidenceThreshold}%
                        {' '}| Max: {strategy.strategy_config.maxSuggestions}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}