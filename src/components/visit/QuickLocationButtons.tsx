import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Home, MapPin, Clock, ChevronRight, Zap } from 'lucide-react';

interface RecentLocation {
  part_id: string;
  part_name: string;
  part_type: 'commune' | 'privative';
  location_id: string;
  location_name: string;
  endroit_name: string;
  zone_type: string;
  count: number;
  lastUsed: Date;
}

interface QuickLocationButtonsProps {
  recentLocations: RecentLocation[];
  onSelect: (location: RecentLocation) => void;
  onCustom: () => void;
  compact?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  'mur': 'Mur',
  'sol': 'Sol',
  'plafond': 'Plafond',
  'equipements': 'Équipements',
  'menuiseries': 'Menuiseries',
  'sanitaires': 'Sanitaires',
  'electricite': 'Électricité',
  'revetement': 'Revêtement',
  'toiture': 'Toiture',
  'gouttieres': 'Gouttières',
  'autre': 'Autre',
};

export const QuickLocationButtons: React.FC<QuickLocationButtonsProps> = ({
  recentLocations,
  onSelect,
  onCustom,
  compact = false
}) => {
  if (recentLocations.length === 0) {
    return null;
  }

  // Show top 4 recent locations
  const topLocations = recentLocations.slice(0, 4);

  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground px-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Rapide:
        </div>
        {topLocations.map((loc, idx) => (
          <button
            key={`${loc.location_id}-${loc.endroit_name}-${loc.zone_type}`}
            onClick={() => onSelect(loc)}
            className={`
              shrink-0 h-7 px-2.5 rounded-full text-xs font-medium transition-all
              flex items-center gap-1.5
              ${loc.part_type === 'commune'
                ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border border-blue-500/30'
                : 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 border border-orange-500/30'
              }
            `}
          >
            {loc.part_type === 'commune' ? (
              <Building2 className="w-3 h-3" />
            ) : (
              <Home className="w-3 h-3" />
            )}
            <span className="truncate max-w-[80px]">
              {loc.endroit_name || loc.location_name}
            </span>
            <span className="text-[10px] opacity-70">
              {ZONE_LABELS[loc.zone_type] || loc.zone_type}
            </span>
          </button>
        ))}
        <button
          onClick={onCustom}
          className="shrink-0 h-7 px-2.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 flex items-center gap-1"
        >
          <MapPin className="w-3 h-3" />
          Autre
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Zap className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">Localisation rapide</span>
        <Badge variant="secondary" className="text-[10px] px-1.5">
          <Clock className="w-2.5 h-2.5 mr-1" />
          Récentes
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {topLocations.map((loc, idx) => (
          <button
            key={`${loc.location_id}-${loc.endroit_name}-${loc.zone_type}`}
            onClick={() => onSelect(loc)}
            className={`
              p-3 rounded-xl border-2 text-left transition-all
              ${loc.part_type === 'commune'
                ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50'
                : 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50'
              }
            `}
          >
            <div className="flex items-start gap-2">
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                ${loc.part_type === 'commune' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}
              `}>
                {loc.part_type === 'commune' ? (
                  <Building2 className="w-4 h-4" />
                ) : (
                  <Home className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{loc.location_name}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {loc.endroit_name && (
                    <>
                      <span className="truncate">{loc.endroit_name}</span>
                      <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                    </>
                  )}
                  <span className="text-amber-500 font-medium">
                    {ZONE_LABELS[loc.zone_type] || loc.zone_type}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      <Button
        variant="outline"
        className="w-full h-10 rounded-xl"
        onClick={onCustom}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Autre localisation
      </Button>
    </div>
  );
};
