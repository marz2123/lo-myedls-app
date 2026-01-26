import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ChevronDown,
  ChevronRight,
  Camera,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface RoomElement {
  type: string;
  material: string | null;
  state: string | null;
  anomalies: string[];
  notes: string[];
}

interface RoomSummary {
  id: string;
  name: string;
  global_state: string;
  elements: RoomElement[];
  key_photos: string[];
  anomaly_count: number;
}

interface EDLReport {
  rooms: RoomSummary[];
  global_summary: string;
  recommendations: string;
  generated_at: string;
  stats: {
    total_rooms: number;
    total_elements: number;
    total_anomalies: number;
    rooms_with_issues: number;
  };
}

interface EDLSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId?: string;
}

export const EDLSummaryDialog: React.FC<EDLSummaryDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  sessionId
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EDLReport | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const generateSummary = async () => {
    if (!sessionId) {
      toast.error('Aucune session de visite active');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-edl-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ projectId, sessionId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Échec de la génération');
      }

      setReport(result.data);
      toast.success('Résumé EDL généré avec succès');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Erreur lors de la génération du résumé');
    } finally {
      setLoading(false);
    }
  };

  // Load existing report when dialog opens
  useEffect(() => {
    if (open && sessionId && !report) {
      const loadExistingReport = async () => {
        const { data } = await supabase
          .from('edl_reports')
          .select('report_json')
          .eq('session_id', sessionId)
          .single();

        if (data?.report_json) {
          setReport(data.report_json as unknown as EDLReport);
        }
      };
      loadExistingReport();
    }
  }, [open, sessionId, report]);

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'Bon':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Moyen':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'Mauvais':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStateBadge = (state: string) => {
    const variants: Record<string, string> = {
      'Bon': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Moyen': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      'Mauvais': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return variants[state] || 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Résumé EDL
          </DialogTitle>
          <DialogDescription>
            Synthèse automatique de l'état des lieux basée sur les captures et analyses IA
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {report.stats.total_rooms}
                  </div>
                  <div className="text-xs text-muted-foreground">Pièces</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {report.stats.total_elements}
                  </div>
                  <div className="text-xs text-muted-foreground">Éléments</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-500">
                    {report.stats.total_anomalies}
                  </div>
                  <div className="text-xs text-muted-foreground">Anomalies</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {report.stats.rooms_with_issues}
                  </div>
                  <div className="text-xs text-muted-foreground">À vérifier</div>
                </div>
              </div>

              {/* Global Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Synthèse globale</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.global_summary}
                </p>
              </div>

              {/* Recommendations */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Recommandations
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.recommendations}
                </p>
              </div>

              {/* Rooms List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Détail par pièce</h3>
                
                {report.rooms.map((room) => (
                  <Collapsible 
                    key={room.id}
                    open={expandedRooms.has(room.id)}
                    onOpenChange={() => toggleRoom(room.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedRooms.has(room.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {getStateIcon(room.global_state)}
                          <span className="font-medium text-foreground">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {room.anomaly_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {room.anomaly_count} anomalie{room.anomaly_count > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge className={cn("text-xs", getStateBadge(room.global_state))}>
                            {room.global_state}
                          </Badge>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="pl-8 pr-3 py-3 space-y-4">
                        {/* Key Photos */}
                        {room.key_photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {room.key_photos.map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt={`${room.name} photo ${idx + 1}`}
                                className="h-16 w-16 object-cover rounded-lg flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}

                        {/* Elements */}
                        {room.elements.length > 0 ? (
                          <div className="space-y-2">
                            {room.elements.map((element, idx) => (
                              <div 
                                key={idx} 
                                className="bg-background border rounded-lg p-3"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm text-foreground">
                                    {element.type}
                                  </span>
                                  {element.state && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn("text-xs", getStateBadge(element.state))}
                                    >
                                      {element.state}
                                    </Badge>
                                  )}
                                </div>
                                {element.material && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Matériau: {element.material}
                                  </p>
                                )}
                                {element.anomalies.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {element.anomalies.slice(0, 3).map((anomaly, aIdx) => (
                                      <div 
                                        key={aIdx}
                                        className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400"
                                      >
                                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span>{anomaly}</span>
                                      </div>
                                    ))}
                                    {element.anomalies.length > 3 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{element.anomalies.length - 3} autre(s)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Aucun élément documenté
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {report.rooms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune pièce documentée
                  </div>
                )}
              </div>

              {/* Generated timestamp */}
              <p className="text-xs text-muted-foreground text-center pt-4 border-t">
                Généré le {new Date(report.generated_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-2">
                Aucun résumé disponible
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Cliquez sur "Générer" pour créer automatiquement un résumé structuré 
                basé sur vos captures et analyses.
              </p>
              <Button onClick={generateSummary} disabled={loading || !sessionId}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Générer le résumé
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <div className="flex items-center gap-2">
            {report && (
              <>
                <Button 
                  variant="outline" 
                  onClick={generateSummary} 
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Régénérer
                </Button>
                <Button disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter PDF
                </Button>
              </>
            )}
            {!report && (
              <Button onClick={generateSummary} disabled={loading || !sessionId}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Générer le résumé
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
