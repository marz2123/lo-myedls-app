// Recovery Prompt Component
// Shows when there's a recoverable session from crash/close

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, PlayCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecoveryPromptProps {
  isOpen: boolean;
  savedAt: string | null;
  projectName?: string;
  pieceName?: string;
  onResume: () => void;
  onDiscard: () => void;
}

export const RecoveryPrompt: React.FC<RecoveryPromptProps> = ({
  isOpen,
  savedAt,
  projectName,
  pieceName,
  onResume,
  onDiscard,
}) => {
  const formatSavedAt = () => {
    if (!savedAt) return '';
    try {
      const date = new Date(savedAt);
      return format(date, "EEEE d MMMM 'à' HH:mm", { locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-lg">
              Reprendre le reportage en cours ?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-3">
            <p className="text-foreground/80">
              Un reportage non terminé a été trouvé.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              {projectName && (
                <p>
                  <span className="text-muted-foreground">Projet:</span>{' '}
                  <span className="font-medium">{projectName}</span>
                </p>
              )}
              {pieceName && (
                <p>
                  <span className="text-muted-foreground">Dernière pièce:</span>{' '}
                  <span className="font-medium">{pieceName}</span>
                </p>
              )}
              {savedAt && (
                <p>
                  <span className="text-muted-foreground">Sauvegardé:</span>{' '}
                  <span className="font-medium">{formatSavedAt()}</span>
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="gap-2 order-2 sm:order-1"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer et recommencer
          </Button>
          <Button
            onClick={onResume}
            className="gap-2 order-1 sm:order-2 h-12 text-base"
          >
            <PlayCircle className="h-5 w-5" />
            Reprendre
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RecoveryPrompt;
