import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Trash2, Folder } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { VisitSessionDetailDialog } from './VisitSessionDetailDialog';

interface VisitSessionsListProps {
  projectId: string;
  onSelectSession: (sessionId: string) => void;
  onExportSession: (sessionId: string) => void;
}

export const VisitSessionsList: React.FC<VisitSessionsListProps> = ({
  projectId,
  onSelectSession,
  onExportSession
}) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [projectId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select(`
          *,
          detected_blocks(id)
        `)
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete related data first (cascade should handle this, but being explicit)
      const { error } = await supabase
        .from('visit_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();
      
      toast({
        title: '✅ Visite supprimée',
        description: 'La session de visite a été supprimée avec succès',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la session',
        variant: 'destructive',
      });
    } finally {
      setDeleteSessionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'recording': { variant: 'destructive', label: 'En cours' },
      'processing': { variant: 'secondary', label: 'Traitement' },
      'completed': { variant: 'default', label: 'Terminée' },
      'failed': { variant: 'destructive', label: 'Échec' },
    };
    
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Séquences visites</h3>
        <div className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-xl">
          Chargement...
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Séquences visites</h3>
        <div className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-xl">
          Aucune séquence enregistrée
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Séquences visites</h3>
          <Badge variant="secondary" className="rounded-full">
            {sessions.length}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setViewSessionId(session.id)}
              className="apple-button group h-28"
            >
              <div className="apple-button-icon bg-primary/10 group-hover:bg-primary/20 !mb-2 !w-10 !h-10">
                <Folder className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium leading-tight">
                {formatDate(session.started_at).split(' ')[0]}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {getStatusBadge(session.status)}
              </div>
            </button>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => sessions[0] && onExportSession(sessions[0].id)}
            disabled={sessions.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => sessions[0] && setDeleteSessionId(sessions[0].id)}
            disabled={sessions.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <VisitSessionDetailDialog
        sessionId={viewSessionId}
        open={!!viewSessionId}
        onOpenChange={(open) => !open && setViewSessionId(null)}
      />

      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette visite ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de cette visite (zones, photos, transcriptions) seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSessionId && handleDeleteSession(deleteSessionId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
