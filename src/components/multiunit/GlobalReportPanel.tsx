import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Download, 
  BarChart3, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  Layers,
  Wrench
} from 'lucide-react';
import type { MultiunitReport, BuildingSummaryStats } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface GlobalReportPanelProps {
  stats: BuildingSummaryStats;
  report?: MultiunitReport;
  onGenerateReport: () => void;
  onDownloadPDF: () => void;
  onDownloadDPGF: () => void;
  isGenerating?: boolean;
}

export function GlobalReportPanel({
  stats,
  report,
  onGenerateReport,
  onDownloadPDF,
  onDownloadDPGF,
  isGenerating
}: GlobalReportPanelProps) {
  const completionPercent = stats.total_units > 0 
    ? Math.round((stats.completed_units / stats.total_units) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Rapport Global Immeuble</CardTitle>
          </div>
          {report?.generated_at && (
            <Badge variant="outline" className="text-xs">
              Généré le {new Date(report.generated_at).toLocaleDateString('fr-FR')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Lots</span>
            </div>
            <p className="text-xl font-bold">{stats.total_units}</p>
            <Progress value={completionPercent} className="h-1 mt-1" />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Score qualité</span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              stats.average_quality_score >= 80 ? "text-green-600" :
              stats.average_quality_score >= 60 ? "text-amber-600" : "text-red-600"
            )}>
              {Math.round(stats.average_quality_score)}%
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Anomalies</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.total_anomalies}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tâches</span>
            </div>
            <p className="text-xl font-bold">{stats.total_tasks}</p>
          </div>
        </div>

        {/* Budget Estimate */}
        {stats.estimated_budget_min && stats.estimated_budget_max && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">Budget estimé travaux</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.estimated_budget_min.toLocaleString('fr-FR')} € - {stats.estimated_budget_max.toLocaleString('fr-FR')} €
            </p>
          </div>
        )}

        {/* Report Content Preview */}
        {report && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Contenu du rapport :</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Présentation immeuble
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Liste des lots
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Synthèse anomalies
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Synthèse tâches
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Résumé par étage
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Planning global
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button 
            onClick={onGenerateReport} 
            className="w-full"
            disabled={isGenerating || completionPercent < 100}
          >
            {isGenerating ? 'Génération en cours...' : 'Générer le rapport global'}
          </Button>

          {report && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={onDownloadDPGF}>
                <Download className="h-4 w-4 mr-2" />
                DPGF
              </Button>
            </div>
          )}
        </div>

        {completionPercent < 100 && (
          <p className="text-xs text-muted-foreground text-center">
            Terminez tous les EDL pour générer le rapport global
          </p>
        )}
      </CardContent>
    </Card>
  );
}
