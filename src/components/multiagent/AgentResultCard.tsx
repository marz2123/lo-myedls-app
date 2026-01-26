import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, ChevronUp, Eye, FileText, ListTodo, Scale, 
  Link, Award, GitCompare, Calendar, Zap, Brain, Clock,
  CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentName, AGENT_CONFIGS, AnalysisStatus } from '@/types/multiagent';

interface AgentResultCardProps {
  agentName: AgentName;
  result: any;
  confidence: number;
  processingTimeMs?: number;
  status: AnalysisStatus;
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

export const AgentResultCard: React.FC<AgentResultCardProps> = ({
  agentName,
  result,
  confidence,
  processingTimeMs,
  status
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = AGENT_CONFIGS[agentName];

  const renderVisionResult = () => {
    if (!result) return null;
    return (
      <div className="space-y-3">
        {result.elements?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Éléments détectés</p>
            <div className="flex flex-wrap gap-1">
              {result.elements.slice(0, 8).map((el: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {el.label} ({Math.round(el.confidence * 100)}%)
                </Badge>
              ))}
              {result.elements.length > 8 && (
                <Badge variant="outline" className="text-xs">+{result.elements.length - 8}</Badge>
              )}
            </div>
          </div>
        )}
        {result.anomalies?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Anomalies</p>
            <div className="space-y-1">
              {result.anomalies.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className={cn(
                    "h-3 w-3",
                    a.severity === 'critical' && "text-red-500",
                    a.severity === 'high' && "text-orange-500",
                    a.severity === 'medium' && "text-yellow-500",
                    a.severity === 'low' && "text-blue-500"
                  )} />
                  <span className="flex-1">{a.description}</span>
                  <Badge variant="outline" className="text-xs capitalize">{a.severity}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        {result.roomType && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Pièce:</span>
            <Badge variant="outline">{result.roomType}</Badge>
          </div>
        )}
      </div>
    );
  };

  const renderTaskResult = () => {
    if (!result?.tasks?.length) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tâches générées ({result.tasks.length})</p>
        {result.tasks.slice(0, 5).map((task: any, i: number) => (
          <div key={i} className="p-2 rounded-lg bg-muted/50 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{task.title}</span>
              <Badge variant={
                task.priority === 'haute' ? 'destructive' : 
                task.priority === 'normale' ? 'secondary' : 'outline'
              } className="text-xs">
                {task.priority}
              </Badge>
            </div>
            {task.familyName && (
              <p className="text-muted-foreground">FT: {task.familyName}</p>
            )}
          </div>
        ))}
        {result.tasks.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{result.tasks.length - 5} autres tâches
          </p>
        )}
      </div>
    );
  };

  const renderNormesResult = () => {
    if (!result) return null;
    return (
      <div className="space-y-3">
        {result.compliance && (
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{result.compliance.overall}%</p>
              <p className="text-xs text-muted-foreground">Global</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className={cn("text-lg font-bold", result.compliance.alur ? "text-green-600" : "text-red-500")}>
                {result.compliance.alur ? '✓' : '✗'}
              </p>
              <p className="text-xs text-muted-foreground">ALUR</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className={cn("text-lg font-bold", result.compliance.rtRe ? "text-green-600" : "text-red-500")}>
                {result.compliance.rtRe ? '✓' : '✗'}
              </p>
              <p className="text-xs text-muted-foreground">RT/RE</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className={cn("text-lg font-bold", result.compliance.european ? "text-green-600" : "text-red-500")}>
                {result.compliance.european ? '✓' : '✗'}
              </p>
              <p className="text-xs text-muted-foreground">EU</p>
            </div>
          </div>
        )}
        {result.violations?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Violations</p>
            {result.violations.map((v: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs mb-1">
                <p className="font-medium text-red-600">{v.normName}</p>
                <p className="text-muted-foreground">{v.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCoherenceResult = () => {
    if (!result) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Score cohérence</span>
          <Badge variant={result.score > 80 ? 'default' : result.score > 50 ? 'secondary' : 'destructive'}>
            {result.score}%
          </Badge>
        </div>
        {result.inconsistencies?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Incohérences ({result.inconsistencies.length})
            </p>
            {result.inconsistencies.map((inc: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs mb-1">
                <p className="font-medium text-amber-600">{inc.type.replace('_', ' ↔ ')}</p>
                <p className="text-muted-foreground">{inc.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQualityResult = () => {
    if (!result?.scores) return null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(result.scores).map(([key, value]: [string, any]) => (
            <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{Math.round(value)}</p>
              <p className="text-xs text-muted-foreground capitalize">{key}</p>
            </div>
          ))}
        </div>
        {result.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recommandations</p>
            {result.recommendations.slice(0, 3).map((rec: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{rec.priority}</Badge>
                  <span className="font-medium">{rec.category}</span>
                </div>
                <p className="text-muted-foreground mt-1">{rec.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDescriptionResult = () => {
    if (!result) return null;
    return (
      <div className="space-y-2">
        {result.globalDescription && (
          <div className="p-2 rounded-lg bg-muted/50 text-xs">
            <p className="font-medium mb-1">Description globale</p>
            <p className="text-muted-foreground">{result.globalDescription}</p>
          </div>
        )}
        {result.descriptions?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Descriptions ({result.descriptions.length})
            </p>
            {result.descriptions.slice(0, 3).map((d: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-muted/50 text-xs mb-1">
                <p>{d.corrected}</p>
                {d.corrections?.length > 0 && (
                  <p className="text-amber-600 text-xs mt-1">
                    Corrections: {d.corrections.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (agentName) {
      case 'vision': return renderVisionResult();
      case 'description': return renderDescriptionResult();
      case 'task': return renderTaskResult();
      case 'normes': return renderNormesResult();
      case 'coherence': return renderCoherenceResult();
      case 'quality': return renderQualityResult();
      default: return (
        <pre className="text-xs overflow-auto max-h-48 bg-muted/50 p-2 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
    }
  };

  return (
    <Card className={cn(
      "transition-all",
      status === 'completed' && "border-green-500/30",
      status === 'failed' && "border-destructive/30"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  status === 'completed' && "bg-green-500/20 text-green-600",
                  status === 'failed' && "bg-destructive/20 text-destructive",
                  status === 'processing' && "bg-primary/20 text-primary"
                )}>
                  {AGENT_ICONS[agentName]}
                </div>
                <div>
                  <CardTitle className="text-sm">{config.displayName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {Math.round(confidence * 100)}%
                </Badge>
                {processingTimeMs && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    {(processingTimeMs / 1000).toFixed(1)}s
                  </Badge>
                )}
                {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {renderContent()}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
