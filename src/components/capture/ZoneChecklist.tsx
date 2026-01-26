import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ZoneId } from './SimpleCaptureUI';

interface Zone {
  id: ZoneId;
  label: string;
}

interface ZoneChecklistProps {
  zones: readonly Zone[];
  checkedZones: Set<ZoneId>;
  onToggle?: (zoneId: ZoneId) => void;
  className?: string;
}

/**
 * ZoneChecklist - Compact vertical checklist for zone verification
 * 
 * Shows during capture: Mur, Sol, Plafond, Ouvertures, Détails
 * One-tap to mark complete
 */
export const ZoneChecklist = ({
  zones,
  checkedZones,
  onToggle,
  className,
}: ZoneChecklistProps) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {zones.map((zone) => {
        const isChecked = checkedZones.has(zone.id);
        
        return (
          <button
            key={zone.id}
            onClick={() => onToggle?.(zone.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
              "backdrop-blur-sm border text-sm font-medium",
              "active:scale-95",
              isChecked 
                ? "bg-green-500/90 border-green-400 text-white" 
                : "bg-black/50 border-white/20 text-white/80 hover:bg-black/70"
            )}
          >
            {isChecked ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>{zone.label}</span>
          </button>
        );
      })}
    </div>
  );
};
