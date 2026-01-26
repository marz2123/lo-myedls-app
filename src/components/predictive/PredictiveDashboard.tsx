import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  RefreshCw,
  Download,
  TrendingUp,
  AlertTriangle,
  Wrench,
  Clock
} from 'lucide-react';
import { usePredictiveEDL } from '@/hooks/usePredictiveEDL';
import { PredictiveHistoryTimeline } from './PredictiveHistoryTimeline';
import { WearScorePanel } from './WearScorePanel';
import { FutureRisksPanel } from './FutureRisksPanel';
import { MaintenancePlanPanel } from './MaintenancePlanPanel';
import { LongTermScoreCard } from './LongTermScoreCard';
import { ForecastChart } from './ForecastChart';

interface PredictiveDashboardProps {
  projectId: string;
}

export const PredictiveDashboard: React.FC<PredictiveDashboardProps> = ({
  projectId
}) => {
  const {
    isLoading,
    isAnalyzing,
    history,
    forecast,
    risks,
    maintenancePlan,
    wearScores,
    longTermScore,
    loadPredictiveData,
    runPredictiveAnalysis,
    getRiskSummary
  } = usePredictiveEDL(projectId);

  useEffect(() => {
    loadPredictiveData();
  }, [loadPredictiveData]);

  const riskSummary = getRiskSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            EDL Prédictif
          </h2>
          <p className="text-muted-foreground">
            Analyse historique, usure estimée et maintenance préventive
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadPredictiveData()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            onClick={() => runPredictiveAnalysis()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Lancer l'analyse IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">Score Global</span>
          </div>
          <p className="text-2xl font-bold">
            {longTermScore?.overall_score || '--'}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">Risques Actifs</span>
          </div>
          <p className="text-2xl font-bold">
            {riskSummary.total}
            {riskSummary.critical > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {riskSummary.critical} critique{riskSummary.critical > 1 ? 's' : ''}
              </Badge>
            )}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Actions Maintenance</span>
          </div>
          <p className="text-2xl font-bold">
            {maintenancePlan?.maintenance_schedule?.length || 0}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">Événements</span>
          </div>
          <p className="text-2xl font-bold">{history.length}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Forecast Chart */}
          <ForecastChart forecast={forecast} isLoading={isLoading} />
          
          {/* History Timeline */}
          <PredictiveHistoryTimeline history={history} isLoading={isLoading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Long Term Score */}
          <LongTermScoreCard score={longTermScore} isLoading={isLoading} />
          
          {/* Wear Scores */}
          <WearScorePanel wearScores={wearScores} isLoading={isLoading} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Future Risks */}
        <FutureRisksPanel risks={risks} isLoading={isLoading} />
        
        {/* Maintenance Plan */}
        <MaintenancePlanPanel plan={maintenancePlan} isLoading={isLoading} />
      </div>
    </div>
  );
};
