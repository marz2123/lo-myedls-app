import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Cloud, Smartphone, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ConflictItem {
  id: string;
  table: string;
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: string;
  serverTimestamp: string;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictItem[];
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merge') => void;
  onResolveAll: (resolution: 'local' | 'server') => void;
}

export const ConflictResolutionDialog = ({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  onResolveAll,
}: ConflictResolutionDialogProps) => {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Conflits de synchronisation
          </DialogTitle>
          <DialogDescription>
            {conflicts.length} conflit(s) détecté(s). Choisissez la version à conserver.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <motion.div
                key={conflict.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'border rounded-xl p-4 transition-colors',
                  selectedConflict === conflict.id ? 'border-primary bg-primary/5' : 'border-border'
                )}
                onClick={() => setSelectedConflict(conflict.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium capitalize">
                    {conflict.table} — {conflict.field}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Local version */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Smartphone className="w-3 h-3" />
                      <span>Version locale</span>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs overflow-auto max-h-24">
                      <pre className="whitespace-pre-wrap break-words">
                        {formatValue(conflict.localValue)}
                      </pre>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(conflict.localTimestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  {/* Server version */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Cloud className="w-3 h-3" />
                      <span>Version serveur</span>
                    </div>
                    <div className="p-2 bg-green-50 border border-green-100 rounded-lg text-xs overflow-auto max-h-24">
                      <pre className="whitespace-pre-wrap break-words">
                        {formatValue(conflict.serverValue)}
                      </pre>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(conflict.serverTimestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Resolution buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve(conflict.id, 'local');
                    }}
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    Garder local
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve(conflict.id, 'server');
                    }}
                  >
                    <Cloud className="w-3 h-3 mr-1" />
                    Garder serveur
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve(conflict.id, 'merge');
                    }}
                  >
                    <Wand2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Bulk actions */}
        {conflicts.length > 1 && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onResolveAll('local')}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Tout garder local
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onResolveAll('server')}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Tout garder serveur
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
