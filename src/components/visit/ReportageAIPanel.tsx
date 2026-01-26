import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Video, 
  Sparkles, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Volume2,
  VolumeX,
  Zap,
  Eye,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportageAI } from '@/hooks/useReportageAI';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportageAIPanelProps {
  projectId: string;
  locationId?: string;
  locationName?: string;
  zoneType?: string;
  onPhotoCapture?: () => void;
  onVideoCapture?: () => void;
  onTaskCreated?: (task: any) => void;
  className?: string;
}

export const ReportageAIPanel: React.FC<ReportageAIPanelProps> = ({
  projectId,
  locationId,
  locationName,
  zoneType,
  onPhotoCapture,
  onVideoCapture,
  onTaskCreated,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const ai = useReportageAI({
    projectId,
    locationId,
    locationName,
    zoneType,
    onTranscript: (text) => {
      setLiveTranscript(text);
    },
    onTasksExtracted: (tasks) => {
      tasks.forEach(task => onTaskCreated?.(task));
    }
  });

  const handleVoiceToggle = useCallback(async () => {
    if (ai.isVoiceConnected) {
      await ai.stopVoiceCapture();
    } else {
      await ai.startVoiceCapture();
    }
  }, [ai]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'neuf': return 'text-emerald-400';
      case 'bon': return 'text-green-400';
      case 'usure_normale': return 'text-yellow-400';
      case 'degrade': return 'text-orange-400';
      case 'tres_degrade': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* AI Status Bar */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              ai.isVoiceConnected 
                ? "bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" 
                : "bg-muted"
            )}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">MyAladin AI</h3>
              <p className="text-xs text-muted-foreground">
                {ai.isProcessing ? 'Analyse en cours...' : 
                 ai.isVoiceConnected ? 'Écoute active' : 
                 'Prêt'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Voice Toggle */}
            <Button
              variant={ai.isVoiceConnected ? "default" : "outline"}
              size="sm"
              onClick={handleVoiceToggle}
              disabled={ai.isVoiceConnecting}
              className={cn(
                "relative",
                ai.isVoiceConnected && "bg-gradient-to-r from-violet-500 to-purple-600"
              )}
            >
              {ai.isVoiceConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ai.isVoiceConnected ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              {ai.isVoiceConnected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </Button>

            {/* AI Speaking Indicator */}
            {ai.isAISpeaking && (
              <Badge variant="secondary" className="gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" />
                Parle
              </Badge>
            )}
          </div>
        </div>

        {/* Live Transcript */}
        <AnimatePresence>
          {(liveTranscript || ai.isVoiceConnected) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-purple-500/20"
            >
              <p className="text-sm text-muted-foreground italic">
                {liveTranscript || (ai.isVoiceConnected ? "En attente de votre voix..." : "")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Analysis Results */}
      <AnimatePresence>
        {ai.lastAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-sm">Analyse Vision</h4>
                </div>
                <Badge variant="outline" className="text-xs">
                  {ai.lastAnalysis.etat_general}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground">
                {ai.lastAnalysis.description}
              </p>

              {/* Elements */}
              {ai.lastAnalysis.elements?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">
                    Éléments détectés ({ai.lastAnalysis.elements.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ai.lastAnalysis.elements.slice(0, 6).map((el, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn("text-xs", getStateColor(el.state))}
                      >
                        {el.name}
                      </Badge>
                    ))}
                    {ai.lastAnalysis.elements.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{ai.lastAnalysis.elements.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {ai.lastAnalysis.anomalies?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1 text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    Anomalies ({ai.lastAnalysis.anomalies.length})
                  </p>
                  <div className="space-y-1">
                    {ai.lastAnalysis.anomalies.map((anomaly, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "text-xs p-2 rounded-md border",
                          anomaly.severity === 'high' ? 'bg-red-500/10 border-red-500/20' :
                          anomaly.severity === 'medium' ? 'bg-orange-500/10 border-orange-500/20' :
                          'bg-yellow-500/10 border-yellow-500/20'
                        )}
                      >
                        <span className="font-medium">{anomaly.type}</span>
                        <span className="text-muted-foreground"> - {anomaly.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extracted Tasks */}
      <AnimatePresence>
        {ai.extractedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="font-medium text-sm">Tâches générées</h4>
                <Badge variant="secondary" className="ml-auto">
                  {ai.extractedTasks.length}
                </Badge>
              </div>

              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {ai.extractedTasks.map((task, i) => (
                    <div 
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs shrink-0", getPriorityColor(task.priority))}
                      >
                        {task.priority}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Indicator */}
      <AnimatePresence>
        {ai.isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 p-4"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyse IA en cours...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportageAIPanel;
