import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  FileText,
  Wrench,
  ClipboardCheck,
  Home
} from 'lucide-react';
import type { PredictiveHistoryEvent } from '@/types/predictive';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PredictiveHistoryTimelineProps {
  history: PredictiveHistoryEvent[];
  isLoading?: boolean;
}

const eventTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  edl_entry: { label: 'EDL Entrée', icon: <Home className="h-4 w-4" />, color: 'bg-green-500' },
  edl_exit: { label: 'EDL Sortie', icon: <Home className="h-4 w-4" />, color: 'bg-blue-500' },
  audit: { label: 'Audit', icon: <ClipboardCheck className="h-4 w-4" />, color: 'bg-purple-500' },
  inspection: { label: 'Inspection', icon: <FileText className="h-4 w-4" />, color: 'bg-amber-500' },
  maintenance: { label: 'Maintenance', icon: <Wrench className="h-4 w-4" />, color: 'bg-slate-500' }
};

export const PredictiveHistoryTimeline: React.FC<PredictiveHistoryTimelineProps> = ({
  history,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique du Bien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique du Bien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucun historique disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historique du Bien
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {history.map((event, index) => {
                const config = eventTypeConfig[event.event_type] || eventTypeConfig.inspection;
                const scoreChange = event.changes_from_previous?.score_change || 0;
                
                return (
                  <div key={event.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full ${config.color} flex items-center justify-center text-white`}>
                      {config.icon}
                    </div>
                    
                    <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {config.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.event_date), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {event.overall_condition_score}%
                          </span>
                          {index < history.length - 1 && (
                            <div className="flex items-center">
                              {scoreChange > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : scoreChange < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-muted-foreground" />
                              )}
                              {scoreChange !== 0 && (
                                <span className={`text-sm ${scoreChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {scoreChange > 0 ? '+' : ''}{scoreChange}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Éléments</p>
                          <p className="font-medium">{event.element_states?.length || 0}</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Anomalies</p>
                          <p className="font-medium">{event.anomalies_detected?.length || 0}</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Tâches</p>
                          <p className="font-medium">{event.tasks_generated?.length || 0}</p>
                        </div>
                      </div>
                      
                      {event.degradation_rate > 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          Dégradation: {event.degradation_rate}% depuis le dernier événement
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
