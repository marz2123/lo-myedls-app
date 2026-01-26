import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, Home, Building2, MapPin, ChevronRight,
  DoorOpen, Car, TreeDeciduous
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';

interface RoomCount {
  locationId: string;
  count: number;
}

interface RoomDrawerProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string | null) => void;
  roomCounts: Map<string, number>;
  unlocalizedCount: number;
}

export const RoomDrawer: React.FC<RoomDrawerProps> = ({
  projectId,
  open,
  onClose,
  selectedLocationId,
  onLocationSelect,
  roomCounts,
  unlocalizedCount,
}) => {
  const { parts, locations, loading } = usePropertyStructure(projectId);

  const getPartIcon = (partType: string) => {
    switch (partType) {
      case 'commune':
        return <Building2 className="h-4 w-4" />;
      case 'privative':
        return <Home className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationIcon = (locationType?: string) => {
    switch (locationType?.toLowerCase()) {
      case 'garage':
      case 'parking':
      case 'box':
        return <Car className="h-4 w-4" />;
      case 'jardin':
      case 'terrasse':
        return <TreeDeciduous className="h-4 w-4" />;
      default:
        return <DoorOpen className="h-4 w-4" />;
    }
  };

  const totalItems = Array.from(roomCounts.values()).reduce((sum, c) => sum + c, 0) + unlocalizedCount;

  if (!open) return null;

  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl",
        "transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold text-foreground">Pièces</h2>
          <p className="text-xs text-muted-foreground">
            {totalItems} élément{totalItems !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
        <div className="p-3 space-y-4">
          {/* All items option */}
          <Button
            variant={selectedLocationId === null ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between h-auto py-3 px-3",
              selectedLocationId === null && "bg-primary/10 border border-primary/20"
            )}
            onClick={() => onLocationSelect(null)}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">Toutes les pièces</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {totalItems}
            </Badge>
          </Button>

          {/* Unlocalized items */}
          {unlocalizedCount > 0 && (
            <Button
              variant={selectedLocationId === 'unlocalized' ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between h-auto py-3 px-3 text-muted-foreground",
                selectedLocationId === 'unlocalized' && "bg-amber-500/10 border border-amber-500/20 text-foreground"
              )}
              onClick={() => onLocationSelect('unlocalized')}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Non localisés</span>
              </div>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                {unlocalizedCount}
              </Badge>
            </Button>
          )}

          {/* Parts and locations */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            parts.map(part => {
              const partLocations = locations.filter(l => l.part_id === part.id);
              const partCount = partLocations.reduce(
                (sum, loc) => sum + (roomCounts.get(loc.id) || 0), 
                0
              );

              if (partLocations.length === 0) return null;

              return (
                <div key={part.id} className="space-y-1">
                  {/* Part header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {getPartIcon(part.part_type)}
                    <span className="flex-1">{part.name}</span>
                    <span className="text-xs font-normal normal-case">
                      {partCount} élément{partCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Locations */}
                  <div className="space-y-0.5 pl-2">
                    {partLocations.map(location => {
                      const count = roomCounts.get(location.id) || 0;
                      const isSelected = selectedLocationId === location.id;

                      return (
                        <Button
                          key={location.id}
                          variant={isSelected ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-between h-auto py-2.5 px-3 text-left",
                            isSelected && "bg-primary/10 border border-primary/20"
                          )}
                          onClick={() => onLocationSelect(location.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {getLocationIcon(location.location_type)}
                            <span className="truncate font-medium text-sm">
                              {location.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge 
                              variant={count > 0 ? "secondary" : "outline"} 
                              className={cn(
                                "text-xs",
                                count === 0 && "text-muted-foreground"
                              )}
                            >
                              {count}
                            </Badge>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer with reset */}
      {selectedLocationId !== null && (
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-background">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onLocationSelect(null);
              onClose();
            }}
          >
            Réinitialiser le filtre
          </Button>
        </div>
      )}
    </div>
  );
};
