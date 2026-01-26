import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Loader2, FileText, Building2, Video, ListChecks, FileCode, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dashboard analytics pour afficher les métriques d'utilisation
 */
export const AnalyticsDashboard: React.FC = () => {
  const { metrics, loading } = useAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Aucune métrique disponible</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Projets',
      value: metrics.totalProjects,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Rapports',
      value: metrics.totalReports,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Séquences',
      value: metrics.totalSequences,
      icon: Video,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Tâches',
      value: metrics.totalTasks,
      icon: ListChecks,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const exportStats = [
    { label: 'PDF', value: metrics.exportsGenerated.pdf, color: 'bg-red-500' },
    { label: 'HTML', value: metrics.exportsGenerated.html, color: 'bg-blue-500' },
    { label: 'DOCX', value: metrics.exportsGenerated.docx, color: 'bg-green-500' },
  ];

  const totalExports = metrics.exportsGenerated.pdf + metrics.exportsGenerated.html + metrics.exportsGenerated.docx;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Analytics & Métriques</h2>
        <p className="text-muted-foreground">
          Statistiques d'utilisation de votre compte
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn('p-3 rounded-lg', stat.bgColor)}>
                    <Icon className={cn('w-6 h-6', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Exports & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Exports générés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Total</span>
                <span className="font-semibold">{totalExports}</span>
              </div>
              {exportStats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{stat.label}</span>
                    <span className="font-semibold">{stat.value}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full transition-all', stat.color)}
                      style={{
                        width: totalExports > 0 ? `${(stat.value / totalExports) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Temps moyen IA</span>
                  <span className="font-semibold">
                    {metrics.aiProcessingTime > 0
                      ? `${(metrics.aiProcessingTime / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: metrics.aiProcessingTime > 0
                        ? `${Math.min((metrics.aiProcessingTime / 10000) * 100, 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Temps moyen rapport</span>
                  <span className="font-semibold">
                    {metrics.averageReportGenerationTime > 0
                      ? `${(metrics.averageReportGenerationTime / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: metrics.averageReportGenerationTime > 0
                        ? `${Math.min((metrics.averageReportGenerationTime / 5000) * 100, 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Templates utilisés</span>
                <span className="font-semibold">{metrics.templatesUsed}</span>
              </div>
              {metrics.lastActivity && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dernière activité</span>
                  <span className="text-sm">
                    {new Date(metrics.lastActivity).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total erreurs</span>
              <span className={cn(
                'font-semibold',
                metrics.errorsCount > 0 ? 'text-destructive' : 'text-green-500'
              )}>
                {metrics.errorsCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
