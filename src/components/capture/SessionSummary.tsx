import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Camera, 
  AlertTriangle, 
  ListTodo, 
  FileText, 
  Columns3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SessionSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    piecesCaptures: number;
    observationsCritiques: number;
    tachesGenerees: number;
    dureeCapture?: string;
    edlType?: string;
  };
  onViewReport: () => void;
  onViewKanban: () => void;
  onClose?: () => void;
}

/**
 * SessionSummary - Post-capture summary screen
 * 
 * Shows:
 * - X pièces capturées
 * - Y observations critiques détectées
 * - Z tâches générées
 * 
 * With actions: "Voir le rapport EDL" / "Voir les tâches (Kanban)"
 */
export const SessionSummary = ({
  open,
  onOpenChange,
  stats,
  onViewReport,
  onViewKanban,
  onClose,
}: SessionSummaryProps) => {
  const [animatedStats, setAnimatedStats] = useState({
    pieces: 0,
    critiques: 0,
    taches: 0,
  });

  // Animate numbers on open
  useEffect(() => {
    if (open) {
      // Reset first
      setAnimatedStats({ pieces: 0, critiques: 0, taches: 0 });
      
      // Animate each stat with staggered timing
      const timers = [
        setTimeout(() => {
          let current = 0;
          const interval = setInterval(() => {
            current++;
            setAnimatedStats(prev => ({ ...prev, pieces: current }));
            if (current >= stats.piecesCaptures) clearInterval(interval);
          }, 50);
        }, 200),
        
        setTimeout(() => {
          let current = 0;
          const interval = setInterval(() => {
            current++;
            setAnimatedStats(prev => ({ ...prev, critiques: current }));
            if (current >= stats.observationsCritiques) clearInterval(interval);
          }, 80);
        }, 400),
        
        setTimeout(() => {
          let current = 0;
          const interval = setInterval(() => {
            current++;
            setAnimatedStats(prev => ({ ...prev, taches: current }));
            if (current >= stats.tachesGenerees) clearInterval(interval);
          }, 30);
        }, 600),
      ];

      return () => timers.forEach(clearTimeout);
    }
  }, [open, stats]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-2xl p-0 overflow-hidden">
        {/* Success header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Capture terminée !
            </DialogTitle>
            <DialogDescription className="text-white/80">
              L'IA a analysé votre visite
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Stats grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Pieces */}
            <div className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
              <Camera className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary tabular-nums">
                {animatedStats.pieces}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                pièce{stats.piecesCaptures > 1 ? 's' : ''} capturée{stats.piecesCaptures > 1 ? 's' : ''}
              </p>
            </div>

            {/* Critical observations */}
            <div className="text-center p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold text-amber-600 tabular-nums">
                {animatedStats.critiques}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                point{stats.observationsCritiques > 1 ? 's' : ''} critique{stats.observationsCritiques > 1 ? 's' : ''}
              </p>
            </div>

            {/* Tasks generated */}
            <div className="text-center p-4 rounded-xl bg-green-500/5 border border-green-500/10">
              <ListTodo className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-600 tabular-nums">
                {animatedStats.taches}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                tâche{stats.tachesGenerees > 1 ? 's' : ''} générée{stats.tachesGenerees > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Duration badge */}
          {stats.dureeCapture && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                Durée : {stats.dureeCapture}
              </Badge>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={onViewReport}
              className="w-full h-14 text-lg font-semibold gap-2"
            >
              <FileText className="h-5 w-5" />
              Voir le rapport EDL
              <ArrowRight className="h-5 w-5 ml-auto" />
            </Button>

            <Button
              variant="outline"
              onClick={onViewKanban}
              className="w-full h-12 gap-2"
            >
              <Columns3 className="h-5 w-5" />
              Voir les tâches (Kanban)
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-muted-foreground"
              >
                Fermer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
