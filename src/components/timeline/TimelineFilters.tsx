import { 
  Camera, 
  Bot, 
  AlertTriangle, 
  Wrench, 
  Home, 
  Sparkles, 
  Edit, 
  GitCompare,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TimelineFilters as FilterType } from '@/hooks/useEDLTimeline';
import { cn } from '@/lib/utils';

interface TimelineFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  activeCount: number;
}

const filterOptions = [
  { key: 'photo', label: 'Photos', icon: Camera, color: 'text-blue-600' },
  { key: 'ai', label: 'Analyses IA', icon: Bot, color: 'text-purple-600' },
  { key: 'anomaly', label: 'Anomalies', icon: AlertTriangle, color: 'text-red-600' },
  { key: 'task', label: 'Tâches', icon: Wrench, color: 'text-amber-600' },
  { key: 'room', label: 'Pièces', icon: Home, color: 'text-green-600' },
  { key: 'myaladin', label: 'MyAladin', icon: Sparkles, color: 'text-indigo-600' },
  { key: 'user', label: 'Actions utilisateur', icon: Edit, color: 'text-slate-600' },
  { key: 'comparison', label: 'Comparaisons', icon: GitCompare, color: 'text-cyan-600' },
];

export const TimelineFilters = ({
  filters,
  onFiltersChange,
  activeCount,
}: TimelineFiltersProps) => {
  const toggleFilter = (key: keyof FilterType) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      photo: true,
      ai: true,
      anomaly: true,
      task: true,
      room: true,
      myaladin: true,
      user: true,
      comparison: true,
      criticalOnly: false,
      validationsOnly: false,
    });
  };

  const activeFiltersCount = filterOptions.filter(
    (opt) => !filters[opt.key as keyof FilterType]
  ).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Filtres Timeline</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Réinitialiser
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Category filters */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Types d'événements
            </h4>
            <div className="space-y-2">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const isActive = filters[option.key as keyof FilterType];
                
                return (
                  <button
                    key={option.key}
                    onClick={() => toggleFilter(option.key as keyof FilterType)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                      isActive 
                        ? "bg-accent" 
                        : "bg-muted/50 opacity-50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", option.color)} />
                    <span className="text-sm flex-1 text-left">{option.label}</span>
                    <Switch
                      checked={isActive as boolean}
                      onCheckedChange={() => toggleFilter(option.key as keyof FilterType)}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special filters */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              Filtres spéciaux
            </h4>
            
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <Label htmlFor="critical-only" className="text-sm cursor-pointer">
                Événements critiques uniquement
              </Label>
              <Switch
                id="critical-only"
                checked={filters.criticalOnly}
                onCheckedChange={() => toggleFilter('criticalOnly')}
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <Label htmlFor="validations-only" className="text-sm cursor-pointer">
                Validations uniquement
              </Label>
              <Switch
                id="validations-only"
                checked={filters.validationsOnly}
                onCheckedChange={() => toggleFilter('validationsOnly')}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">{activeCount}</span> événement(s) affichés
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
