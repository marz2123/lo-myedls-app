import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZoneId } from './SimpleCaptureUI';

interface Zone {
  id: ZoneId;
  label: string;
}

interface EndOfPieceCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: readonly Zone[];
  checkedZones: Set<ZoneId>;
  onContinue: (skipMissing: boolean) => void;
  onFilmMissing?: (zoneId: ZoneId) => void;
}

/**
 * EndOfPieceCheck - Simple checklist dialog at end of piece
 * 
 * Shows what's been checked vs missing
 * Asks ONE question: "Il manque X. Tu veux la filmer ?"
 */
export const EndOfPieceCheck = ({
  open,
  onOpenChange,
  zones,
  checkedZones,
  onContinue,
  onFilmMissing,
}: EndOfPieceCheckProps) => {
  const missingZones = zones.filter(z => !checkedZones.has(z.id));
  const completedZones = zones.filter(z => checkedZones.has(z.id));
  
  // If all complete, show success message
  const allComplete = missingZones.length === 0;
  
  // Get first missing zone for focused question
  const firstMissing = missingZones[0];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm mx-4 rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            {allComplete ? (
              <span className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                Pièce complète ✔
              </span>
            ) : (
              "Vérification de la pièce"
            )}
          </AlertDialogTitle>
        </AlertDialogHeader>

        {/* Zone status list */}
        <div className="grid grid-cols-2 gap-2 my-4">
          {zones.map((zone) => {
            const isChecked = checkedZones.has(zone.id);
            
            return (
              <div
                key={zone.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  isChecked 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                )}
              >
                {isChecked ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" />
                )}
                <span>{zone.label}</span>
              </div>
            );
          })}
        </div>

        {/* Focused question if missing zones */}
        {!allComplete && firstMissing && (
          <AlertDialogDescription className="text-center text-base">
            Il manque <strong>{firstMissing.label}</strong>.{" "}
            Tu veux la filmer rapidement ?
          </AlertDialogDescription>
        )}

        {allComplete && (
          <AlertDialogDescription className="text-center">
            On passe à la suivante ?
          </AlertDialogDescription>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {allComplete ? (
            <>
              <Button
                onClick={() => onContinue(true)}
                className="w-full h-14 text-lg font-semibold"
              >
                Oui, pièce suivante
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full h-12"
              >
                Rester ici
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (firstMissing && onFilmMissing) {
                    onFilmMissing(firstMissing.id);
                  }
                }}
                className="w-full h-14 text-lg font-semibold gap-2"
              >
                <Camera className="h-5 w-5" />
                Oui, filmer {firstMissing?.label}
              </Button>
              <Button
                variant="outline"
                onClick={() => onContinue(true)}
                className="w-full h-12"
              >
                Non, passer à la suite
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
