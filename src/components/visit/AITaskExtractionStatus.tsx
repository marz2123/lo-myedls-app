import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AITaskExtractionStatusProps {
  sequenceId?: string;
  projectId: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Composant de statut visuel pour le traitement IA des tâches extraites
 * Affiche le statut de l'extraction des tâches depuis les séquences
 */
export const AITaskExtractionStatus: React.FC<AITaskExtractionStatusProps> = ({
  sequenceId,
  projectId,
  onRetry,
  className
}) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [tasksCount, setTasksCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    // Vérifier le statut initial
    checkStatus();

    // Polling pour vérifier le statut toutes les 3 secondes
    const interval = setInterval(() => {
      if (status === 'processing' || status === 'idle') {
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId, sequenceId, status]);

  const checkStatus = async () => {
    try {
      // Compter les tâches extraites depuis les séquences
      let query = supabase
        .from('extracted_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('source_type', ['sequence', 'video', 'audio', 'photo', 'text']);

      if (sequenceId) {
        // Si une séquence spécifique est fournie, vérifier ses tâches
        const { data: sequence } = await supabase
          .from('visit_sequences')
          .select('id, metadata')
          .eq('id', sequenceId)
          .single();

        if (sequence?.metadata?.extracted_tasks_ids) {
          query = query.in('id', sequence.metadata.extracted_tasks_ids);
        }
      }

      const { count, error: countError } = await query;

      if (countError) {
        console.error('[AITaskExtractionStatus] Error checking status:', countError);
        setStatus('error');
        setError('Erreur lors de la vérification du statut');
        return;
      }

      const newCount = count || 0;

      if (newCount > tasksCount) {
        setStatus('complete');
        setTasksCount(newCount);
        setError(null);
      } else if (status === 'idle' && newCount === 0) {
        // Si aucune tâche et statut idle, passer en processing
        setStatus('processing');
      } else if (status === 'processing' && newCount === 0) {
        // Vérifier si une séquence récente existe (dans les 30 dernières secondes)
        const { data: recentSequences } = await supabase
          .from('visit_sequences')
          .select('id, created_at')
          .eq('project_id', projectId)
          .gte('created_at', new Date(Date.now() - 30000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentSequences && recentSequences.length > 0) {
          // Une séquence récente existe, traitement en cours
          setStatus('processing');
        } else {
          // Pas de séquence récente, peut-être une erreur
          setStatus('idle');
        }
      }
    } catch (err) {
      console.error('[AITaskExtractionStatus] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleRetry = async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setStatus('processing');
    setError(null);

    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Retry automatique : déclencher l'extraction des tâches
        if (sequenceId) {
          const { error: extractError } = await supabase.functions.invoke('extract-tasks-from-sequences', {
            body: {
              sequenceIds: [sequenceId],
              projectId,
            }
          });

          if (extractError) {
            throw extractError;
          }
        } else {
          // Extraire toutes les séquences du projet
          const { error: extractError } = await supabase.functions.invoke('extract-tasks-from-sequences', {
            body: {
              projectId,
            }
          });

          if (extractError) {
            throw extractError;
          }
        }

        toast.success('Extraction des tâches relancée');
      }

      // Attendre un peu puis vérifier à nouveau
      setTimeout(() => {
        checkStatus();
      }, 2000);
    } catch (err) {
      console.error('[AITaskExtractionStatus] Retry error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur lors de la relance');
      toast.error('Erreur lors de la relance de l\'extraction');
    } finally {
      setIsRetrying(false);
    }
  };

  // Ne rien afficher si idle et aucune tâche
  if (status === 'idle' && tasksCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-muted/50 border ${className || ''}`}>
      {status === 'processing' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Extraction des tâches en cours...
          </span>
        </>
      )}
      
      {status === 'complete' && (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400">
            {tasksCount} tâche{tasksCount > 1 ? 's' : ''} extraite{tasksCount > 1 ? 's' : ''}
          </span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400 flex-1">
            {error || 'Erreur lors de l\'extraction'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-7"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Relance...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Réessayer
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};
