import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LayoutDashboard, AlertTriangle, CheckCircle, Activity, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OverviewMetrics {
  pendingReviews: number;
  totalClassifications: number;
  successRate: number;
  activeStrategies: number;
  strategyNames: string[];
  categorySuccessRate: number;
  familySuccessRate: number;
  subcategorySuccessRate: number;
}

export function AdminOverviewDashboard() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch classification stats
      const { data: statsData, error: statsError } = await supabase
        .from('dsc_classification_stats')
        .select('*')
        .single();

      if (statsError) throw statsError;

      // Fetch active strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('prediction_strategies')
        .select('name, is_active')
        .eq('is_active', true);

      if (strategiesError) throw strategiesError;

      const stats = statsData || {
        pending_reviews: 0,
        total_classifications: 0,
        category_success_rate: 0,
        family_success_rate: 0,
        subcategory_success_rate: 0,
      };

      const avgSuccessRate =
        (((stats.category_success_rate || 0) +
          (stats.family_success_rate || 0) +
          (stats.subcategory_success_rate || 0)) /
          3) || 0;

      setMetrics({
        pendingReviews: stats.pending_reviews || 0,
        totalClassifications: stats.total_classifications || 0,
        successRate: avgSuccessRate,
        activeStrategies: strategiesData?.length || 0,
        strategyNames: strategiesData?.map(s => s.name) || [],
        categorySuccessRate: stats.category_success_rate || 0,
        familySuccessRate: stats.family_success_rate || 0,
        subcategorySuccessRate: stats.subcategory_success_rate || 0,
      });
    } catch (error) {
      console.error('Error loading overview metrics:', error);
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

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Tableau de Bord Admin' : 'Admin Dashboard'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler'
              ? 'Vue d\'ensemble des métriques clés du système'
              : 'Overview of key system metrics'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Révisions en attente' : 'Pending Reviews'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {metrics.pendingReviews}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Classifications totales' : 'Total Classifications'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {metrics.totalClassifications}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Taux de succès global' : 'Overall Success Rate'}
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {metrics.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <Progress value={metrics.successRate} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('cancel') === 'Annuler' ? 'Stratégies actives' : 'Active Strategies'}
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {metrics.activeStrategies}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Rates by Level */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('cancel') === 'Annuler' ? 'Taux de succès par niveau' : 'Success Rate by Level'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('cancel') === 'Annuler' ? 'Famille' : 'Family'}
                  </span>
                  <Badge variant="outline">
                    {metrics.familySuccessRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.familySuccessRate} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('cancel') === 'Annuler' ? 'Catégorie' : 'Category'}
                  </span>
                  <Badge variant="outline">
                    {metrics.categorySuccessRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.categorySuccessRate} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t('cancel') === 'Annuler' ? 'Sous-catégorie' : 'Subcategory'}
                  </span>
                  <Badge variant="outline">
                    {metrics.subcategorySuccessRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={metrics.subcategorySuccessRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Active Strategies */}
          {metrics.strategyNames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('cancel') === 'Annuler' ? 'Stratégies actives' : 'Active Strategies'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {metrics.strategyNames.map((name) => (
                    <Badge key={name} variant="secondary" className="text-sm">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
