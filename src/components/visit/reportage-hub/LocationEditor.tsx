import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, Home, Building2, ChevronRight, Check, 
  Layers, Info, Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { toast } from 'sonner';

interface LocationEditorProps {
  projectId: string;
  itemId: string;
  itemType: 'sequence' | 'frame';
  currentLocationId?: string | null;
  currentZoneId?: string | null;
  currentLocationName?: string;
  currentZoneName?: string;
  locationConfidence?: number | null;
  zoneConfidence?: number | null;
  onUpdate?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LocationEditor: React.FC<LocationEditorProps> = ({
  projectId,
  itemId,
  itemType,
  currentLocationId,
  currentZoneId,
  currentLocationName,
  currentZoneName,
  locationConfidence,
  zoneConfidence,
  onUpdate,
  open,
  onOpenChange
}) => {
  const { parts, locations, zones, loading } = usePropertyStructure(projectId);
  const [step, setStep] = useState<'location' | 'zone'>('location');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(currentLocationId || null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(currentZoneId || null);
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedLocationId(currentLocationId || null);
      setSelectedZoneId(currentZoneId || null);
      setStep('location');
    }
  }, [open, currentLocationId, currentZoneId]);

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const filteredZones = selectedLocationId 
    ? zones.filter(z => z.location_id === selectedLocationId)
    : [];

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    // Clear zone if changing location
    if (locationId !== currentLocationId) {
      setSelectedZoneId(null);
    }
    // Move to zone step
    setStep('zone');
  };

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZoneId(zoneId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (itemType === 'sequence') {
        const { error } = await supabase
          .from('visit_sequences')
          .update({
            location_id: selectedLocationId,
            zone_id: selectedZoneId,
            // Clear confidence when manually set
            location_confidence: null,
            zone_confidence: null
          })
          .eq('id', itemId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('extracted_frames')
          .update({
            location_id: selectedLocationId,
            zone_id: selectedZoneId,
            location_confidence: null,
            zone_confidence: null
          })
          .eq('id', itemId);
        
        if (error) throw error;
      }

      toast.success('Localisation mise à jour');
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number | null | undefined) => {
    if (!confidence) return null;
    const percent = Math.round(confidence * 100);
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs gap-1",
          percent >= 80 ? "text-green-600 border-green-300" :
          percent >= 50 ? "text-amber-600 border-amber-300" :
          "text-red-600 border-red-300"
        )}
      >
        <Sparkles className="h-3 w-3" />
        IA: {percent}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Modifier la localisation
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-2">
          <Button
            variant={step === 'location' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => setStep('location')}
          >
            1. Pièce
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={step === 'zone' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => selectedLocationId && setStep('zone')}
            disabled={!selectedLocationId}
          >
            2. Zone
          </Button>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          {step === 'location' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez la pièce ou lieu où cet élément a été capturé
              </p>
              
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune pièce définie</p>
                  <p className="text-xs mt-1">
                    Définissez la structure du bien dans les paramètres du projet
                  </p>
                </div>
              ) : (
                <>
                  {parts.map(part => {
                    const partLocations = locations.filter(l => l.part_id === part.id);
                    if (partLocations.length === 0) return null;
                    
                    return (
                      <div key={part.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          {part.part_type === 'commune' ? (
                            <Building2 className="h-3.5 w-3.5" />
                          ) : (
                            <Home className="h-3.5 w-3.5" />
                          )}
                          {part.name}
                        </div>
                        {partLocations.map(location => (
                          <Button
                            key={location.id}
                            variant={selectedLocationId === location.id ? 'default' : 'outline'}
                            className={cn(
                              "w-full justify-between h-auto py-3 px-4",
                              selectedLocationId === location.id && "ring-2 ring-primary"
                            )}
                            onClick={() => handleLocationSelect(location.id)}
                          >
                            <span className="font-medium">{location.name}</span>
                            {selectedLocationId === location.id && (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez la zone spécifique (optionnel)
              </p>
              
              {selectedLocation && (
                <div className="p-3 bg-primary/10 rounded-lg mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{selectedLocation.name}</span>
                </div>
              )}

              {filteredZones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune zone définie pour cette pièce</p>
                  <p className="text-xs mt-1">
                    Vous pouvez enregistrer sans zone
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredZones.map(zone => (
                    <Button
                      key={zone.id}
                      variant={selectedZoneId === zone.id ? 'default' : 'outline'}
                      className={cn(
                        "h-auto py-3 justify-start",
                        selectedZoneId === zone.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleZoneSelect(zone.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium capitalize">
                          {zone.custom_name || zone.zone_type}
                        </span>
                      </div>
                      {selectedZoneId === zone.id && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedLocationId}
            className="flex-1"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
