import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Zone {
  id: string;
  label: string;
  emoji: string;
}

interface QuickZoneButtonsProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
  className?: string;
  size?: 'default' | 'large';
}

// Most common zones for quick access
const QUICK_ZONES: Zone[] = [
  { id: 'mur', label: 'Mur', emoji: '🧱' },
  { id: 'sol', label: 'Sol', emoji: '🪨' },
  { id: 'plafond', label: 'Plafond', emoji: '⬜' },
  { id: 'fenetre', label: 'Fenêtre', emoji: '🪟' },
  { id: 'porte', label: 'Porte', emoji: '🚪' },
  { id: 'electricite', label: 'Élec', emoji: '⚡' },
];

export const QuickZoneButtons = ({
  zones,
  selectedZone,
  onSelectZone,
  className,
  size = 'default',
}: QuickZoneButtonsProps) => {
  // Filter to show only quick zones that are available
  const availableQuickZones = QUICK_ZONES.filter(qz => 
    zones.some(z => z.id === qz.id)
  );

  if (availableQuickZones.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <span className="text-xs text-muted-foreground font-medium w-full mb-1">
        Accès rapide
      </span>
      {availableQuickZones.map(zone => {
        const isSelected = selectedZone?.id === zone.id;
        
        return (
          <Button
            key={zone.id}
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => onSelectZone(zone)}
            className={cn(
              'transition-all duration-200 active:scale-95',
              size === 'large' 
                ? 'h-16 min-w-[80px] flex-col gap-1 text-base' 
                : 'h-12 min-w-[70px] flex-col gap-0.5 text-sm',
              // Minimum 44px touch target for accessibility
              'min-h-[44px]',
              isSelected && 'ring-2 ring-primary ring-offset-2'
            )}
            style={{
              // Ensure minimum touch target of 44x44px
              minWidth: '60px',
              minHeight: '60px',
            }}
          >
            <span className={size === 'large' ? 'text-2xl' : 'text-xl'}>
              {zone.emoji}
            </span>
            <span className="font-medium">{zone.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
