import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  X,
  ChevronRight,
  FileText,
  CheckCircle2,
  CircleDot,
  Package,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MissingItem, MissingCategory } from '@/hooks/useMissingItems';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const CATEGORY_ICONS: Record<MissingCategory, React.ReactNode> = {
  photo_missing: <Camera className="h-4 w-4" />,
  description_missing: <FileText className="h-4 w-4" />,
  task_not_validated: <CheckCircle2 className="h-4 w-4" />,
  state_not_set: <CircleDot className="h-4 w-4" />,
  anomaly_not_confirmed: <AlertTriangle className="h-4 w-4" />,
  partial_completion: <Package className="h-4 w-4" />,
  mandatory_not_done: <AlertCircle className="h-4 w-4" />,
  ai_data_ignored: <Sparkles className="h-4 w-4" />
};

const SEVERITY_STYLES = {
  blocking: 'bg-red-50 border-red-200 text-red-800',
  missing: 'bg-orange-50 border-orange-200 text-orange-800',
  recommended: 'bg-yellow-50 border-yellow-200 text-yellow-800'
};

const SEVERITY_ICON_BG = {
  blocking: 'bg-red-100',
  missing: 'bg-orange-100',
  recommended: 'bg-yellow-100'
};

interface MissingItemCardProps {
  item: MissingItem;
  onNavigate: (item: MissingItem) => void;
  onMarkAsDone: (item: MissingItem) => void;
  onConfirmAnomaly: (item: MissingItem) => void;
  onValidateTask: (item: MissingItem) => void;
  onAutoComplete: (item: MissingItem) => void;
  onIgnore: (item: MissingItem, reason: string) => void;
}

export function MissingItemCard({
  item,
  onNavigate,
  onMarkAsDone,
  onConfirmAnomaly,
  onValidateTask,
  onAutoComplete,
  onIgnore
}: MissingItemCardProps) {
  const haptic = useHapticFeedback();
  const [showIgnoreDialog, setShowIgnoreDialog] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');

  const handleAction = (action: () => void) => {
    haptic.trigger('zone_complete');
    action();
  };

  const handleIgnoreConfirm = () => {
    if (ignoreReason.trim()) {
      onIgnore(item, ignoreReason);
      setShowIgnoreDialog(false);
      setIgnoreReason('');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "p-3 rounded-xl border transition-all",
          SEVERITY_STYLES[item.severity]
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            SEVERITY_ICON_BG[item.severity]
          )}>
            {CATEGORY_ICONS[item.category]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.label}</p>
            <p className="text-xs opacity-70 truncate">{item.description}</p>
          </div>

          {/* Navigate button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => handleAction(() => onNavigate(item))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-current/10">
          {item.actionType === 'add_photo' && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={() => handleAction(() => onNavigate(item))}
            >
              <Camera className="h-3 w-3" />
              Ajouter photo
            </Button>
          )}

          {item.actionType === 'set_state' && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={() => handleAction(() => onMarkAsDone(item))}
            >
              <Check className="h-3 w-3" />
              Marquer Bon
            </Button>
          )}

          {item.actionType === 'confirm_anomaly' && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={() => handleAction(() => onConfirmAnomaly(item))}
            >
              <AlertTriangle className="h-3 w-3" />
              Valider anomalie
            </Button>
          )}

          {item.actionType === 'validate_task' && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={() => handleAction(() => onValidateTask(item))}
            >
              <CheckCircle2 className="h-3 w-3" />
              Valider tâche
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => handleAction(() => onAutoComplete(item))}
          >
            <Sparkles className="h-3 w-3" />
            Auto IA
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-60 hover:opacity-100"
            onClick={() => setShowIgnoreDialog(true)}
          >
            <X className="h-3 w-3" />
            Ignorer
          </Button>
        </div>
      </motion.div>

      {/* Ignore Dialog */}
      <AlertDialog open={showIgnoreDialog} onOpenChange={setShowIgnoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez indiquer la raison pour ignorer "{item.label}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Raison (ex: Non applicable, Inaccessible...)"
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleIgnoreConfirm}
              disabled={!ignoreReason.trim()}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
