import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, Video, Mic, ArrowLeft, MapPin, 
  Home, Building2, Car, Trees, ChevronRight,
  DoorOpen, Bath, UtensilsCrossed, Bed, Sofa, Warehouse, Layers,
  Lightbulb, Wind, Droplets, Flame, ParkingCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { getZonesForLocationType, type ZoneConfig } from '@/config/locationZoneMapping';

// Zone type to icon mapping
const ZONE_ICONS: Record<string, React.ComponentType<any>> = {
  'sol': Layers,
  'murs': Layers,
  'plafond': Layers,
  'menuiseries': DoorOpen,
  'electricite': Lightbulb,
  'plomberie': Droplets,
  'ventilation': Wind,
  'chauffage': Flame,
  'equipements': Layers,
  'facade': Building2,
  'toiture': Home,
  'autre': Layers,
};

// Room type icons
const ROOM_ICONS: Record<string, React.ComponentType<any>> = {
  'appartement': Building2,
  'hall': DoorOpen,
  'escalier': Layers,
  'facade': Building2,
  'toiture': Home,
  'parking': Car,
  'parking_commun': Car,
  'jardin': Trees,
  'cuisine': UtensilsCrossed,
  'chambre': Bed,
  'sejour': Sofa,
  'sdb': Bath,
  'wc': Bath,
  'cave': Warehouse,
  'cave_commune': Warehouse,
  'local_velos': ParkingCircle,
  'default': MapPin,
};

// Convert ZoneConfig to the format used in the component
const convertZonesToOptions = (zones: ZoneConfig[]) => {
  return zones.map(zone => ({
    id: zone.type,
    label: zone.label,
    icon: ZONE_ICONS[zone.type] || Layers,
    color: zone.color || 'bg-muted'
  }));
};

interface PropertyLocation {
  id: string;
  name: string;
  location_type: string;
  part_id: string;
}

interface PropertyPart {
  id: string;
  name: string;
  part_type: 'commune' | 'privative';
  property_locations: PropertyLocation[];
}

interface SimplifiedCaptureFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCapture: (locationId: string, locationName: string, zoneType: string, captureType: 'photo' | 'video' | 'voice') => void;
  defaultCaptureType?: 'photo' | 'video' | 'voice' | 'text';
}

type Step = 'lieu' | 'zone' | 'capture';

export const SimplifiedCaptureFlow: React.FC<SimplifiedCaptureFlowProps> = ({
  open,
  onOpenChange,
  projectId,
  onCapture,
  defaultCaptureType
}) => {
  const [step, setStep] = useState<Step>('lieu');
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Load property structure
  useEffect(() => {
    if (!open) return;
    
    const loadStructure = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('property_parts')
          .select(`
            id, name, part_type,
            property_locations (id, name, location_type, part_id)
          `)
          .eq('project_id', projectId)
          .order('order_index', { ascending: true });

        if (error) throw error;
        setParts(data || []);
      } catch (error) {
        console.error('Error loading structure:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStructure();
  }, [open, projectId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('lieu');
      setSelectedLocation(null);
      setSelectedZone(null);
    }
  }, [open]);

  const handleLocationSelect = (location: PropertyLocation) => {
    setSelectedLocation(location);
    setStep('zone');
  };

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId);
    
    // If defaultCaptureType is set, skip capture step and trigger immediately
    if (defaultCaptureType && selectedLocation) {
      const captureType = defaultCaptureType === 'text' ? 'voice' : defaultCaptureType;
      onCapture(selectedLocation.id, selectedLocation.name, zoneId, captureType);
      onOpenChange(false);
    } else {
      setStep('capture');
    }
  };

  const handleCaptureType = (type: 'photo' | 'video' | 'voice') => {
    if (selectedLocation && selectedZone) {
      onCapture(selectedLocation.id, selectedLocation.name, selectedZone, type);
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (step === 'zone') {
      setStep('lieu');
      setSelectedLocation(null);
    } else if (step === 'capture') {
      setStep('zone');
      setSelectedZone(null);
    }
  };

  const getRoomIcon = (locationType: string) => {
    const IconComponent = ROOM_ICONS[locationType] || ROOM_ICONS['default'];
    return IconComponent;
  };

  const getZoneLabel = (zoneId: string) => {
    const zones = convertZonesToOptions(getZonesForLocationType(selectedLocation?.location_type));
    return zones.find(z => z.id === zoneId)?.label || zoneId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-3xl">
        <VisuallyHidden>
          <DialogTitle>Capture rapide</DialogTitle>
          <DialogDescription>Sélectionnez un lieu et une zone pour capturer</DialogDescription>
        </VisuallyHidden>

        {/* Header with breadcrumb */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-3">
            {step !== 'lieu' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={cn(step === 'lieu' && 'text-primary font-medium')}>
                  1. Lieu
                </span>
                <ChevronRight className="h-3 w-3" />
                <span className={cn(step === 'zone' && 'text-primary font-medium')}>
                  2. Zone
                </span>
                <ChevronRight className="h-3 w-3" />
                <span className={cn(step === 'capture' && 'text-primary font-medium')}>
                  3. Capturer
                </span>
              </div>
              {selectedLocation && (
                <p className="text-sm font-medium mt-1">
                  {selectedLocation.name}
                  {selectedZone && ` › ${getZoneLabel(selectedZone)}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1: Select Lieu */}
            {step === 'lieu' && (
              <motion.div
                key="lieu"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-center mb-4">
                  Où êtes-vous ?
                </h2>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parts.map(part => (
                      <div key={part.id}>
                        <Badge variant="outline" className="mb-2">
                          {part.part_type === 'commune' ? 'Parties Communes' : 'Parties Privatives'}
                        </Badge>
                        <div className="grid grid-cols-2 gap-2">
                          {part.property_locations?.map((loc) => {
                            const IconComponent = getRoomIcon(loc.location_type);
                            return (
                              <button
                                key={loc.id}
                                onClick={() => handleLocationSelect(loc)}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-2xl border-2 border-border/50",
                                  "bg-card hover:bg-muted/50 hover:border-primary/50",
                                  "transition-all active:scale-95 text-left"
                                )}
                              >
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <IconComponent className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-sm font-medium line-clamp-2">{loc.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {parts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun lieu défini</p>
                        <p className="text-sm">Définissez la structure dans les paramètres du projet</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Select Zone */}
            {step === 'zone' && (
              <motion.div
                key="zone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-center mb-4">
                  Quelle zone ?
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  {convertZonesToOptions(getZonesForLocationType(selectedLocation?.location_type)).map((zone) => {
                    const ZoneIcon = zone.icon;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => handleZoneSelect(zone.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-border/50",
                          "bg-card hover:bg-muted/50 hover:border-primary/50",
                          "transition-all active:scale-95"
                        )}
                      >
                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", zone.color || "bg-primary/10 text-primary")}>
                          <ZoneIcon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium">{zone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Capture Type */}
            {step === 'capture' && (
              <motion.div
                key="capture"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-center mb-2">
                  Comment capturer ?
                </h2>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {selectedLocation?.name} › {getZoneLabel(selectedZone || '')}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleCaptureType('photo')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-border/50",
                      "bg-card hover:bg-muted/50 hover:border-primary/50",
                      "transition-all active:scale-95"
                    )}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                      <Camera className="h-8 w-8" />
                    </div>
                    <span className="font-semibold">Photo</span>
                  </button>

                  <button
                    onClick={() => handleCaptureType('video')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-border/50",
                      "bg-card hover:bg-muted/50 hover:border-primary/50",
                      "transition-all active:scale-95"
                    )}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                      <Video className="h-8 w-8" />
                    </div>
                    <span className="font-semibold">Vidéo</span>
                  </button>

                  <button
                    onClick={() => handleCaptureType('voice')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-border/50",
                      "bg-card hover:bg-muted/50 hover:border-primary/50",
                      "transition-all active:scale-95"
                    )}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                      <Mic className="h-8 w-8" />
                    </div>
                    <span className="font-semibold">Voix</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
