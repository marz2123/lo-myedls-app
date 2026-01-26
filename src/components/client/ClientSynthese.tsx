import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  FileText,
  Lightbulb,
  Eye
} from 'lucide-react';

interface ClientSyntheseProps {
  projectId: string;
}

interface ProjectSummary {
  globalProgress: number;
  objective: string;
  currentState: string;
  nextSteps: string[];
  importantPoints: string[];
  watchItems: string[];
}

export const ClientSynthese: React.FC<ClientSyntheseProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });

  useEffect(() => {
    loadSummary();
  }, [projectId]);

  const loadSummary = async () => {
    try {
      // Get task stats (simplified view - no FT codes)
      const { data: tasks, error } = await supabase
        .from('problem_tasks')
        .select('status')
        .eq('project_id', projectId);

      if (!error && tasks) {
        const stats = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'validated' || t.status === 'done').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          pending: tasks.filter(t => t.status === 'pending' || t.status === 'todo').length
        };
        setTaskStats(stats);

        const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        // Generate client-friendly summary via AI
        await generateClientSummary(progress);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      // Set default summary
      setSummary({
        globalProgress: 0,
        objective: "Rénovation et mise aux normes du bâtiment",
        currentState: "Le projet est en cours d'évaluation",
        nextSteps: ["Évaluation initiale", "Planification des travaux"],
        importantPoints: ["Inspection complète réalisée"],
        watchItems: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateClientSummary = async (progress: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('myaladin-orchestrator', {
        body: {
          action: 'generate_client_summary',
          projectId,
          context: {
            progress,
            taskStats
          }
        }
      });

      if (error) throw error;

      if (data?.summary) {
        setSummary({
          globalProgress: progress,
          ...data.summary
        });
      } else {
        // Default fallback
        setSummary({
          globalProgress: progress,
          objective: "Rénovation et amélioration du bien immobilier",
          currentState: progress > 50 
            ? "Les travaux avancent conformément au planning prévu."
            : "Le projet est en phase d'évaluation et de préparation.",
          nextSteps: [
            "Finalisation des inspections",
            "Planification des interventions",
            "Début des travaux prioritaires"
          ],
          importantPoints: [
            "État des lieux complet réalisé",
            "Zones prioritaires identifiées",
            "Planning en cours d'élaboration"
          ],
          watchItems: progress < 30 ? [
            "Points d'attention identifiés lors de l'inspection"
          ] : []
        });
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary({
        globalProgress: progress,
        objective: "Rénovation et amélioration du bien immobilier",
        currentState: "Le projet est en cours.",
        nextSteps: ["Planification en cours"],
        importantPoints: ["Évaluation réalisée"],
        watchItems: []
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Progress Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Avancement global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-primary">
                {summary?.globalProgress || 0}%
              </span>
              <Badge 
                variant={
                  (summary?.globalProgress || 0) >= 80 ? 'default' :
                  (summary?.globalProgress || 0) >= 50 ? 'secondary' : 'outline'
                }
              >
                {(summary?.globalProgress || 0) >= 80 ? 'Avancé' :
                 (summary?.globalProgress || 0) >= 50 ? 'En cours' : 'Démarrage'}
              </Badge>
            </div>
            <Progress value={summary?.globalProgress || 0} className="h-3" />
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700">{taskStats.completed}</div>
                <div className="text-xs text-green-600">Terminés</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-700">{taskStats.inProgress}</div>
                <div className="text-xs text-blue-600">En cours</div>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <FileText className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-700">{taskStats.pending}</div>
                <div className="text-xs text-slate-600">À venir</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objective & Current State */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Objectif des travaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{summary?.objective}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5 text-primary" />
              État actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{summary?.currentState}</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      {summary?.nextSteps && summary.nextSteps.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-blue-500" />
              Prochaines étapes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Important Points */}
      {summary?.importantPoints && summary.importantPoints.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Points importants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.importantPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Watch Items */}
      {summary?.watchItems && summary.watchItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Points à surveiller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.watchItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-800">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
