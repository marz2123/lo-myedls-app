import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  Clock, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Package,
  Loader2
} from 'lucide-react';
import { usePredictiveAnalysis } from '@/hooks/usePredictiveAnalysis';
import { cn } from '@/lib/utils';

interface PredictivePlanningPanelProps {
  projectId: string;
  autoRun?: boolean;
  compact?: boolean;
  onNavigateToTasks?: (taskIds: string[]) => void;
  onNavigateToPurchases?: () => void;
}

export const PredictivePlanningPanel: React.FC<PredictivePlanningPanelProps> = ({
  projectId,
  autoRun = false,
  compact = false,
  onNavigateToTasks,
  onNavigateToPurchases
}) => {
  const {
    isAnalyzing,
    analysis,
    meta,
    lastAnalyzedAt,
    runAnalysis,
    getQuickStats
  } = usePredictiveAnalysis();

  const stats = getQuickStats();

  useEffect(() => {
    if (autoRun && projectId && !analysis) {
      runAnalysis(projectId);
    }
  }, [autoRun, projectId, analysis, runAnalysis]);

  const getRiskColor = (score: number) => {
    if (score > 70) return 'text-destructive';
    if (score > 40) return 'text-amber-500';
    return 'text-green-500';
  };

  const getImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'bg-destructive/10 text-destructive border-destructive/20',
      medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      low: 'bg-green-500/10 text-green-600 border-green-500/20'
    };
    const labels = { high: 'Élevé', medium: 'Moyen', low: 'Faible' };
    return <Badge variant="outline" className={variants[impact]}>{labels[impact]}</Badge>;
  };

  const getPriorityBadge = (priority: 'critical' | 'high' | 'normal') => {
    const variants = {
      critical: 'bg-destructive text-destructive-foreground',
      high: 'bg-amber-500 text-white',
      normal: 'bg-muted text-muted-foreground'
    };
    const labels = { critical: 'Critique', high: 'Haute', normal: 'Normale' };
    return <Badge className={variants[priority]}>{labels[priority]}</Badge>;
  };

  if (compact) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Analyse prédictive
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => runAnalysis(projectId)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span>{stats.totalDelayDays}j retard</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-destructive" />
                <span>{stats.overloadedResources} surchargé(s)</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-primary" />
                <span>{stats.criticalBudgetItems} critique(s)</span>
              </div>
              <div className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3 text-green-500" />
                <span>{stats.purchaseItemsCount} achats</span>
              </div>
            </div>
          )}
          {!analysis && !isAnalyzing && (
            <Button 
              size="sm" 
              className="w-full" 
              onClick={() => runAnalysis(projectId)}
            >
              <Brain className="h-4 w-4 mr-2" />
              Lancer l'analyse
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Analyse prédictive Planning & Budget
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastAnalyzedAt && (
              <span className="text-xs text-muted-foreground">
                {lastAnalyzedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => runAnalysis(projectId)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Risk Score & Summary */}
        {analysis && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Score de risque</span>
              <span className={cn("text-2xl font-bold", getRiskColor(analysis.riskScore))}>
                {analysis.riskScore}/100
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            <p className="text-xs text-muted-foreground/70 mt-2 italic">
              ⚠️ Analyses générées par IA à titre indicatif. Validation humaine requise.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!analysis && !isAnalyzing && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              Lancez une analyse prédictive pour anticiper les retards, 
              les surcharges et les besoins budgétaires.
            </p>
            <Button onClick={() => runAnalysis(projectId)}>
              <Brain className="h-4 w-4 mr-2" />
              Lancer l'analyse
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">
              Analyse en cours...
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Tâches, risques, planning et budget
            </p>
          </div>
        )}

        {analysis && (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              
              {/* 1. Delays */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Retard potentiel</span>
                    <Badge variant="secondary">{analysis.delays.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {analysis.delays.length === 0 ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Aucun retard significatif détecté
                    </div>
                  ) : (
                    analysis.delays.map((delay, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{delay.area}</span>
                          <Badge variant="destructive">{delay.estimatedDelayDays}j</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{delay.causes}</p>
                        <p className="text-xs text-primary">💡 {delay.suggestedMitigation}</p>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* 2. Workload */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Charge de travail</span>
                    <Badge variant="secondary">{analysis.workload.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {analysis.workload.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <div>
                        <span className="font-medium text-sm">{w.resource}</span>
                        <p className="text-xs text-muted-foreground">{w.taskCount} tâches • {w.details}</p>
                      </div>
                      <Badge variant={w.status === 'overloaded' ? 'destructive' : w.status === 'balanced' ? 'default' : 'secondary'}>
                        {w.status === 'overloaded' ? 'Surchargé' : w.status === 'balanced' ? 'Équilibré' : 'Sous-utilisé'}
                      </Badge>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* 3. Budget Critical */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Éléments budget critiques</span>
                    <Badge variant="secondary">{analysis.budgetCriticalItems.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {analysis.budgetCriticalItems.length === 0 ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Pas d'éléments critiques identifiés
                    </div>
                  ) : (
                    analysis.budgetCriticalItems.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.label}</span>
                          {getImpactBadge(item.estimatedImpact)}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                        <p className="text-xs text-primary">→ {item.recommendedAction}</p>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* 4. Purchase Suggestions */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Achats recommandés</span>
                    <Badge variant="secondary">{analysis.purchaseSuggestions.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {analysis.purchaseSuggestions.length === 0 ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Pas de recommandations d'achats
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid gap-2">
                        {analysis.purchaseSuggestions.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                            <div>
                              <span className="text-sm font-medium">{item.label}</span>
                              <p className="text-xs text-muted-foreground">{item.family}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">{item.quantityEstimate} {item.unit}</span>
                              <p className="text-xs text-muted-foreground">{item.timeFrame}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {onNavigateToPurchases && (
                        <Button size="sm" variant="outline" className="w-full" onClick={onNavigateToPurchases}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Voir les achats suggérés
                        </Button>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* 5. Action Plan */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Plan d'action 7 jours</span>
                    <Badge variant="secondary">{analysis.actionPlan7Days.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {analysis.actionPlan7Days.map((day, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Jour {day.day}</span>
                        {getPriorityBadge(day.priority)}
                      </div>
                      <p className="text-sm">{day.focus}</p>
                      {day.suggestedTasks.length > 0 && onNavigateToTasks && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="mt-2 text-xs"
                          onClick={() => onNavigateToTasks(day.suggestedTasks)}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Voir {day.suggestedTasks.length} tâches
                        </Button>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

            </div>
          </ScrollArea>
        )}

        {/* Meta info */}
        {meta && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {meta.tasksAnalyzed} tâches • {meta.problemsAnalyzed} problèmes • {meta.risksAnalyzed} risques
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictivePlanningPanel;
