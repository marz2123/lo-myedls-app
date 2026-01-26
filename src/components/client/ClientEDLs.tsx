import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Eye,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientEDLsProps {
  projectId: string;
}

interface VisitSession {
  id: string;
  edl_type: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
}

interface SimplifiedTask {
  title: string;
  description: string;
  location: string;
  category: string; // Simplified, no FT codes
  photos: string[];
}

export const ClientEDLs: React.FC<ClientEDLsProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<VisitSession | null>(null);
  const [sessionTasks, setSessionTasks] = useState<SimplifiedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [projectId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select('id, status, created_at, duration_seconds')
        .eq('project_id', projectId)
        .in('status', ['validated', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map to include edl_type with default
      setSessions((data || []).map(s => ({ ...s, edl_type: 'avant_travaux' })));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionTasks = async (sessionId: string) => {
    setLoadingTasks(true);
    try {
      // Get tasks without exposing FT/CT/ST codes
      const { data: tasks, error } = await supabase
        .from('extracted_tasks')
        .select('title, description, location, area, image_url')
        .eq('visit_session_id', sessionId);

      if (error) throw error;

      // Transform to simplified format
      const simplified: SimplifiedTask[] = (tasks || []).map(task => ({
        title: task.title,
        description: task.description || '',
        location: task.location || task.area || 'Non spécifié',
        category: simplifyCategory(task.title), // Extract category from title
        photos: task.image_url ? [task.image_url] : []
      }));

      setSessionTasks(simplified);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Convert technical category to human-readable
  const simplifyCategory = (title: string): string => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('plomb') || titleLower.includes('eau') || titleLower.includes('sanitaire')) {
      return 'Plomberie & Sanitaires';
    }
    if (titleLower.includes('électr') || titleLower.includes('prise') || titleLower.includes('lumière')) {
      return 'Électricité';
    }
    if (titleLower.includes('mur') || titleLower.includes('peinture') || titleLower.includes('crépi')) {
      return 'Murs & Revêtements';
    }
    if (titleLower.includes('sol') || titleLower.includes('carrelage') || titleLower.includes('parquet')) {
      return 'Sols';
    }
    if (titleLower.includes('fenêtre') || titleLower.includes('porte') || titleLower.includes('menuiserie')) {
      return 'Menuiseries';
    }
    if (titleLower.includes('toiture') || titleLower.includes('toit') || titleLower.includes('couverture')) {
      return 'Toiture';
    }
    if (titleLower.includes('façade') || titleLower.includes('extérieur')) {
      return 'Façade';
    }
    return 'Travaux généraux';
  };

  const getEDLTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'avant_travaux': 'Avant travaux',
      'apres_travaux': 'Après travaux',
      'location_entree': 'Entrée location',
      'location_sortie': 'Sortie location',
      'diagnostic': 'Diagnostic'
    };
    return labels[type] || type;
  };

  const handleOpenSession = (session: VisitSession) => {
    setSelectedSession(session);
    loadSessionTasks(session.id);
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">États des lieux</h2>
        <Badge variant="secondary">{sessions.length} rapport(s)</Badge>
      </div>

      {sessions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Aucun état des lieux validé
            </h3>
            <p className="text-muted-foreground">
              Les rapports apparaîtront ici une fois validés par l'équipe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{getEDLTypeLabel(session.edl_type)}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(session.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Validé
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => handleOpenSession(session)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Consulter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session Detail Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedSession && getEDLTypeLabel(selectedSession.edl_type)}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            {loadingTasks ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : sessionTasks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>Aucune observation dans ce rapport</p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {sessionTasks.map((task, index) => (
                  <Card key={index} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">{task.title}</h4>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {task.category}
                            </Badge>
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{task.location}</span>
                        </div>

                        {task.photos.length > 0 && (
                          <div className="flex items-center gap-2 pt-2">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <div className="flex gap-2">
                              {task.photos.map((url, photoIndex) => (
                                <img 
                                  key={photoIndex}
                                  src={url} 
                                  alt={`Photo ${photoIndex + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
