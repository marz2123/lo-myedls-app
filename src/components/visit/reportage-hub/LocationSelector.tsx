import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, MapPin, Building2, 
  Home, Layers, Check, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import type { PropertyPart, PropertyLocation, LocationZone } from '@/types/businessModel';

interface LocationSelectorProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: {
    partId: string;
    partName: string;
    locationId: string;
    locationName: string;
    zoneId?: string;
    zoneName?: string;
  }) => void;
  currentPartId?: string;
  currentLocationId?: string;
  currentZoneId?: string;
}

type Step = 'partie' | 'lieu' | 'zone';

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  projectId,
  open,
  onOpenChange,
  onSelect,
  currentPartId,
  currentLocationId,
  currentZoneId,
}) => {
  const { parts, locations, zones, loading } = usePropertyStructure(projectId);
  const [step, setStep] = useState<Step>('partie');
  const [selectedPart, setSelectedPart] = useState<PropertyPart | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<LocationZone | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-select current values if available
      if (currentPartId) {
        const part = parts.find(p => p.id === currentPartId);
        if (part) {
          setSelectedPart(part);
          if (currentLocationId) {
            const loc = locations.find(l => l.id === currentLocationId);
            if (loc) {
              setSelectedLocation(loc);
              if (currentZoneId) {
                const zone = zones.find(z => z.id === currentZoneId);
                if (zone) setSelectedZone(zone);
              }
            }
          }
        }
      }
      setStep('partie');
    }
  }, [open, currentPartId, currentLocationId, currentZoneId, parts, locations, zones]);

  const handlePartSelect = (part: PropertyPart) => {
    setSelectedPart(part);
    setSelectedLocation(null);
    setSelectedZone(null);
    setStep('lieu');
  };

  const handleLocationSelect = (location: PropertyLocation) => {
    setSelectedLocation(location);
    setSelectedZone(null);
    setStep('zone');
  };

  const handleZoneSelect = (zone: LocationZone | null) => {
    setSelectedZone(zone);
  };

  const handleConfirm = () => {
    if (selectedPart && selectedLocation) {
      onSelect({
        partId: selectedPart.id,
        partName: selectedPart.name,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        zoneId: selectedZone?.id,
        zoneName: selectedZone ? (selectedZone.custom_name || selectedZone.zone_type) : undefined,
      });
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (step === 'zone') {
      setStep('lieu');
    } else if (step === 'lieu') {
      setStep('partie');
    }
  };

  const filteredLocations = selectedPart 
    ? locations.filter(l => l.part_id === selectedPart.id)
    : [];

  const filteredZones = selectedLocation
    ? zones.filter(z => z.location_id === selectedLocation.id)
    : [];

  const getPartIcon = (partType: string) => {
    return partType === 'commune' ? Building2 : Home;
  };

  const getZoneLabel = (zone: LocationZone) => {
    return zone.custom_name || zone.zone_type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Localisation
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm py-2 border-b">
          <Badge 
            variant={step === 'partie' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setStep('partie')}
          >
            1. Partie
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant={step === 'lieu' ? 'default' : 'secondary'}
            className={cn(!selectedPart && 'opacity-50')}
            onClick={() => selectedPart && setStep('lieu')}
          >
            2. Lieu
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant={step === 'zone' ? 'default' : 'secondary'}
            className={cn(!selectedLocation && 'opacity-50')}
            onClick={() => selectedLocation && setStep('zone')}
          >
            3. Zone
          </Badge>
        </div>

        {/* Current Selection Summary */}
        {(selectedPart || selectedLocation || selectedZone) && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {selectedPart && (
              <Badge variant="outline" className="gap-1">
                {React.createElement(getPartIcon(selectedPart.part_type), { className: 'h-3 w-3' })}
                {selectedPart.name}
              </Badge>
            )}
            {selectedLocation && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {selectedLocation.name}
              </Badge>
            )}
            {selectedZone && (
              <Badge variant="outline" className="gap-1">
                <Layers className="h-3 w-3" />
                {getZoneLabel(selectedZone)}
              </Badge>
            )}
          </div>
        )}

        <ScrollArea className="h-[300px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Step 1: Partie */}
              {step === 'partie' && (
                <div className="space-y-2">
                  {parts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucune partie définie. Définissez la structure dans les paramètres du projet.
                    </p>
                  ) : (
                    parts.map((part) => {
                      const Icon = getPartIcon(part.part_type);
                      const isSelected = selectedPart?.id === part.id;
                      return (
                        <button
                          key={part.id}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                            isSelected 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                          onClick={() => handlePartSelect(part)}
                        >
                          <div className={cn(
                            "p-2 rounded-lg",
                            part.part_type === 'commune' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              part.part_type === 'commune' ? 'text-blue-600' : 'text-amber-600'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{part.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{part.part_type}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Step 2: Lieu */}
              {step === 'lieu' && (
                <div className="space-y-2">
                  <button
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour aux parties
                  </button>
                  {filteredLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun lieu défini dans cette partie.
                    </p>
                  ) : (
                    filteredLocations.map((location) => {
                      const isSelected = selectedLocation?.id === location.id;
                      return (
                        <button
                          key={location.id}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                            isSelected 
                              ? "bg-primary/10 border-primary/30" 
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                          onClick={() => handleLocationSelect(location)}
                        >
                          <div className="p-2 rounded-lg bg-muted">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{location.name}</p>
                            {location.floor_level && (
                              <p className="text-xs text-muted-foreground">Niveau: {location.floor_level}</p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Step 3: Zone */}
              {step === 'zone' && (
                <div className="space-y-2">
                  <button
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour aux lieux
                  </button>

                  {/* Option: No zone (location only) */}
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                      selectedZone === null 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                    onClick={() => handleZoneSelect(null)}
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Aucune zone spécifique</p>
                      <p className="text-xs text-muted-foreground">Localiser au niveau du lieu uniquement</p>
                    </div>
                    {selectedZone === null && <Check className="h-4 w-4 text-primary" />}
                  </button>

                  {filteredZones.map((zone) => {
                    const isSelected = selectedZone?.id === zone.id;
                    return (
                      <button
                        key={zone.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                          isSelected 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-muted/30 border-transparent hover:bg-muted/50"
                        )}
                        onClick={() => handleZoneSelect(zone)}
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <Layers className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{getZoneLabel(zone)}</p>
                          {zone.condition && (
                            <p className="text-xs text-muted-foreground capitalize">{zone.condition}</p>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPart || !selectedLocation}
          >
            <Check className="h-4 w-4 mr-2" />
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
