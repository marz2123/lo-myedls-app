import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Eye, FileText, ListTodo, Scale, Link, Award, 
  GitCompare, Calendar, Zap, CheckCircle2, AlertTriangle, 
  XCircle, Loader2, ChevronRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiAgentOrchestrator } from '@/hooks/useMultiAgentOrchestrator';
import { AgentName, AGENT_CONFIGS, MultiAgentSession } from '@/types/multiagent';
import { AgentResultCard } from './AgentResultCard';
import { InconsistencyPanel } from './InconsistencyPanel';
import { QualityScorePanel } from './QualityScorePanel';

interface MultiAgentDiagnosticProps {
  projectId: string;
  imageUrl?: string;
  onClose?: () => void;
}

const AGENT_ICONS: Record<AgentName, React.ReactNode> = {
  vision: <Eye className="h-4 w-4" />,
  description: <FileText className="h-4 w-4" />,
  task: <ListTodo className="h-4 w-4" />,
  normes: <Scale className="h-4 w-4" />,
  coherence: <Link className="h-4 w-4" />,
  quality: <Award className="h-4 w-4" />,
  comparative: <GitCompare className="h-4 w-4" />,
  planning: <Calendar className="h-4 w-4" />,
  autopilot: <Zap className="h-4 w-4" />,
  orchestrator: <Brain className="h-4 w-4" />
};

export const MultiAgentDiagnostic: React.FC<MultiAgentDiagnosticProps> = ({
  projectId,
  imageUrl,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const {
    session,
    analyses,
    resolutions,
    isProcessing,
    currentAgent,
    progress,
    statusMessage,
    triggerMultiAgentAnalysis,
    applyResolutions
  } = useMultiAgentOrchestrator();

  const handleStartAnalysis = async () => {
    await triggerMultiAgentAnalysis({
      projectId,
      triggerType: imageUrl ? 'photo' : 'manual',
      imageUrl,
      agents: ['vision', 'description', 'task', 'normes', 'coherence', 'quality'],
      autoApplyCorrections: true
    });
  };

  const handleApplyAll = async () => {
    const pendingResolutions = resolutions.filter(r => !r.appliedAt);
    if (pendingResolutions.length > 0) {
      await applyResolutions(pendingResolutions.map(r => r.id));
    }
  };

  const getAgentAnalysis = (agentName: AgentName) => {
    return analyses.find(a => a.agentName === agentName);
  };

  const renderAgentStatus = (agentName: AgentName) => {
    const config = AGENT_CONFIGS[agentName];
    const analysis = getAgentAnalysis(agentName);
    const isRunning = currentAgent === agentName;
    const isCompleted = session?.agentsCompleted?.includes(agentName);
    const isFailed = analysis?.status === 'failed';

    return (
      <div 
        key={agentName}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all",
          isRunning && "border-primary bg-primary/5 animate-pulse",
          isCompleted && "border-green-500/50 bg-green-500/5",
          isFailed && "border-destructive/50 bg-destructive/5",
          !isRunning && !isCompleted && !isFailed && "border-border/50"
        )}
      >
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center",
          isRunning && "bg-primary/20 text-primary",
          isCompleted && "bg-green-500/20 text-green-600",
          isFailed && "bg-destructive/20 text-destructive",
          !isRunning && !isCompleted && !isFailed && "bg-muted text-muted-foreground"
        )}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4" />
          ) : (
            AGENT_ICONS[agentName]
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{config.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{config.description}</p>
        </div>
        {analysis?.confidence && (
          <Badge variant="secondary" className="text-xs">
            {Math.round(analysis.confidence * 100)}%
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Multi-Agent AI Diagnostic</h2>
              <p className="text-sm text-muted-foreground">
                {isProcessing ? statusMessage : 'Analyse collaborative multi-IA'}
              </p>
            </div>
          </div>
          {!session && !isProcessing && (
            <Button onClick={handleStartAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Lancer l'analyse
            </Button>
          )}
          {session && !isProcessing && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {session.agentsCompleted?.length || 0} agents
              </Badge>
              {resolutions.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleApplyAll} className="gap-1">
                  <Zap className="h-3 w-3" />
                  Appliquer {resolutions.length} corrections
                </Button>
              )}
            </div>
          )}
        </div>
        
        {isProcessing && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">{statusMessage}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12">
              <TabsTrigger value="summary" className="gap-2">
                <Brain className="h-4 w-4" />
                Résumé
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-2">
                <Zap className="h-4 w-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="inconsistencies" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Incohérences
                {resolutions.length > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 text-xs rounded-full">
                    {resolutions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="quality" className="gap-2">
                <Award className="h-4 w-4" />
                Qualité
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <TabsContent value="summary" className="mt-0 space-y-4">
                {/* Scores Overview */}
                {session && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {Math.round((session.overallConfidence || 0) * 100)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Confiance globale</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round(session.qualityScore || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Score qualité</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(session.coherenceScore || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Cohérence</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">
                            {Math.round(session.completenessScore || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Complétude</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Agents Status Grid */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Statut des agents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(['vision', 'description', 'task', 'normes', 'coherence', 'quality'] as AgentName[]).map(renderAgentStatus)}
                  </CardContent>
                </Card>

                {/* Quick Results */}
                {session?.finalResult && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Résultats clés
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {session.finalResult.vision?.anomalies?.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Anomalies détectées</span>
                          <Badge variant="destructive">
                            {session.finalResult.vision.anomalies.length}
                          </Badge>
                        </div>
                      )}
                      {session.finalResult.task?.tasks?.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tâches générées</span>
                          <Badge variant="secondary">
                            {session.finalResult.task.tasks.length}
                          </Badge>
                        </div>
                      )}
                      {session.finalResult.normes?.violations?.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Violations normes</span>
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            {session.finalResult.normes.violations.length}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="agents" className="mt-0 space-y-4">
                {(['vision', 'description', 'task', 'normes', 'coherence', 'quality'] as AgentName[]).map(agentName => {
                  const analysis = getAgentAnalysis(agentName);
                  if (!analysis) return null;
                  return (
                    <AgentResultCard 
                      key={agentName}
                      agentName={agentName}
                      result={analysis.resultJson}
                      confidence={analysis.confidence}
                      processingTimeMs={analysis.processingTimeMs}
                      status={analysis.status}
                    />
                  );
                })}
              </TabsContent>

              <TabsContent value="inconsistencies" className="mt-0">
                <InconsistencyPanel 
                  resolutions={resolutions}
                  onApply={handleApplyAll}
                />
              </TabsContent>

              <TabsContent value="quality" className="mt-0">
                <QualityScorePanel 
                  qualityResult={session?.finalResult?.quality}
                  coherenceResult={session?.finalResult?.coherence}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};
