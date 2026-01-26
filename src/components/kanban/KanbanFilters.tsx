import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, Layers, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanFiltersProps {
  families: string[];
  zones: string[];
  selectedFamily: string | null;
  selectedZone: string | null;
  selectedPriority: string | null;
  onFamilyChange: (family: string | null) => void;
  onZoneChange: (zone: string | null) => void;
  onPriorityChange: (priority: string | null) => void;
  onClearAll: () => void;
}

export const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  families,
  zones,
  selectedFamily,
  selectedZone,
  selectedPriority,
  onFamilyChange,
  onZoneChange,
  onPriorityChange,
  onClearAll,
}) => {
  const hasFilters = selectedFamily || selectedZone || selectedPriority;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filtres</span>
      </div>

      {/* Family Filter */}
      <Select
        value={selectedFamily || 'all'}
        onValueChange={(v) => onFamilyChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-9">
          <Layers className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Famille FT" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les familles</SelectItem>
          {families.map((family) => (
            <SelectItem key={family} value={family}>
              {family}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Zone Filter */}
      <Select
        value={selectedZone || 'all'}
        onValueChange={(v) => onZoneChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-9">
          <MapPin className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Pièce/Zone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les zones</SelectItem>
          {zones.map((zone) => (
            <SelectItem key={zone} value={zone}>
              {zone}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <div className="flex items-center gap-1">
        {['urgente', 'haute', 'normale', 'basse'].map((priority) => (
          <Button
            key={priority}
            variant={selectedPriority === priority ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPriorityChange(selectedPriority === priority ? null : priority)}
            className={cn(
              'h-8 text-xs capitalize',
              selectedPriority === priority && priority === 'urgente' && 'bg-red-500 hover:bg-red-600',
              selectedPriority === priority && priority === 'haute' && 'bg-orange-500 hover:bg-orange-600',
              selectedPriority === priority && priority === 'normale' && 'bg-blue-500 hover:bg-blue-600',
              selectedPriority === priority && priority === 'basse' && 'bg-muted hover:bg-muted/80'
            )}
          >
            {priority}
          </Button>
        ))}
      </div>

      {/* Clear All */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Effacer
        </Button>
      )}

      {/* Active Filters Count */}
      {hasFilters && (
        <Badge variant="secondary" className="ml-auto">
          {[selectedFamily, selectedZone, selectedPriority].filter(Boolean).length} filtre(s)
        </Badge>
      )}
    </div>
  );
};
