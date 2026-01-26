import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, SlidersHorizontal, X, Calendar as CalendarIcon,
  Video, MessageSquare, AlertTriangle, Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';

export interface SearchFilters {
  query: string;
  types: ('media' | 'sequence' | 'note' | 'problem')[];
  dateFrom?: Date;
  dateTo?: Date;
  partieId?: string;
  lieuId?: string;
  zoneType?: string;
  severity?: string;
}

interface SearchFilterBarProps {
  projectId: string;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount?: number;
}

const ITEM_TYPES = [
  { id: 'sequence', label: 'Séquences', icon: Video },
  { id: 'media', label: 'Médias', icon: Image },
  { id: 'note', label: 'Notes', icon: MessageSquare },
  { id: 'problem', label: 'Problèmes', icon: AlertTriangle },
] as const;

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'critical', label: 'Critique' },
];

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  projectId,
  filters,
  onFiltersChange,
  resultCount,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.query);
  const { parts, locations, zones, loading } = usePropertyStructure(projectId);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.query) {
        onFiltersChange({ ...filters, query: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  const toggleType = useCallback((type: 'media' | 'sequence' | 'note' | 'problem') => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({
      query: '',
      types: [],
      dateFrom: undefined,
      dateTo: undefined,
      partieId: undefined,
      lieuId: undefined,
      zoneType: undefined,
      severity: undefined,
    });
  }, [onFiltersChange]);

  const activeFilterCount = [
    filters.types.length > 0,
    filters.dateFrom || filters.dateTo,
    filters.partieId,
    filters.lieuId,
    filters.zoneType,
    filters.severity,
  ].filter(Boolean).length;

  const filteredLocations = filters.partieId 
    ? locations.filter(l => l.part_id === filters.partieId)
    : locations;

  const uniqueZoneTypes = [...new Set(zones.map(z => z.zone_type))];

  return (
    <div className="space-y-3">
      {/* Search bar row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher notes, transcriptions, anomalies..."
            className="pl-10 pr-10 rounded-xl h-11"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                onFiltersChange({ ...filters, query: '' });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "h-11 w-11 rounded-xl shrink-0",
                activeFilterCount > 0 && "border-primary bg-primary/5"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtres avancés</h4>
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 text-xs"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[60vh]">
              <div className="p-4 space-y-5">
                {/* Type filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type d'élément</Label>
                  <div className="flex flex-wrap gap-2">
                    {ITEM_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isActive = filters.types.includes(type.id as any);
                      return (
                        <Badge
                          key={type.id}
                          variant={isActive ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer px-3 py-1.5 gap-1.5",
                            isActive && "bg-primary hover:bg-primary/90"
                          )}
                          onClick={() => toggleType(type.id as any)}
                        >
                          <Icon className="h-3 w-3" />
                          {type.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Date range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Période</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={cn(
                            "justify-start text-left font-normal h-9",
                            !filters.dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                          {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy') : 'Du'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={cn(
                            "justify-start text-left font-normal h-9",
                            !filters.dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                          {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy') : 'Au'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Separator />

                {/* Location filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Localisation</Label>
                  
                  <Select
                    value={filters.partieId || 'all'}
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      partieId: value === 'all' ? undefined : value,
                      lieuId: undefined // Reset lieu when partie changes
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Partie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les parties</SelectItem>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.lieuId || 'all'}
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      lieuId: value === 'all' ? undefined : value 
                    })}
                    disabled={!filters.partieId && filteredLocations.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Lieu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les lieux</SelectItem>
                      {filteredLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.zoneType || 'all'}
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      zoneType: value === 'all' ? undefined : value 
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Type de zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les zones</SelectItem>
                      {uniqueZoneTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Severity filter (for problems) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Gravité (problèmes)</Label>
                  <Select
                    value={filters.severity || 'all'}
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      severity: value === 'all' ? undefined : value 
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Toutes gravités" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes gravités</SelectItem>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/30">
              <Button 
                className="w-full" 
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                Appliquer les filtres
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {(activeFilterCount > 0 || filters.query) && (
        <div className="flex items-center gap-2 flex-wrap">
          {resultCount !== undefined && (
            <span className="text-sm text-muted-foreground">
              {resultCount} résultat{resultCount !== 1 ? 's' : ''}
            </span>
          )}
          
          {filters.query && (
            <Badge variant="secondary" className="gap-1 px-2">
              "{filters.query}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setSearchInput('');
                  onFiltersChange({ ...filters, query: '' });
                }}
              />
            </Badge>
          )}

          {filters.types.map((type) => {
            const typeInfo = ITEM_TYPES.find(t => t.id === type);
            return (
              <Badge key={type} variant="secondary" className="gap-1 px-2">
                {typeInfo?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => toggleType(type)}
                />
              </Badge>
            );
          })}

          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1 px-2">
              {filters.dateFrom && format(filters.dateFrom, 'dd/MM')}
              {' - '}
              {filters.dateTo && format(filters.dateTo, 'dd/MM')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
              />
            </Badge>
          )}

          {filters.partieId && (
            <Badge variant="secondary" className="gap-1 px-2">
              {parts.find(p => p.id === filters.partieId)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, partieId: undefined, lieuId: undefined })}
              />
            </Badge>
          )}

          {filters.lieuId && (
            <Badge variant="secondary" className="gap-1 px-2">
              {locations.find(l => l.id === filters.lieuId)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, lieuId: undefined })}
              />
            </Badge>
          )}

          {filters.severity && (
            <Badge variant="secondary" className="gap-1 px-2">
              {SEVERITY_OPTIONS.find(s => s.value === filters.severity)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, severity: undefined })}
              />
            </Badge>
          )}

          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-6 text-xs text-muted-foreground"
            >
              Tout effacer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
