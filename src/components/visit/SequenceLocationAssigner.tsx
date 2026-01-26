import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Home, 
  ChevronRight, 
  MapPin,
  Check,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PropertyPart {
  id: string;
  name: string;
  part_type: 'commune' | 'privative';
}

interface PropertyLocation {
  id: string;
  name: string;
  location_type: string;
  part_id: string;
}

interface SequenceLocationAssignerProps {
  projectId: string;
  sequenceId: string;
  currentDescription?: string | null;
  onComplete: () => void;
  onCancel: () => void;
}

const ZONE_TYPES = [
  { value: 'mur', label: 'Mur', icon: '🧱' },
  { value: 'sol', label: 'Sol', icon: '🪵' },
  { value: 'plafond', label: 'Plafond', icon: '⬆️' },
  { value: 'equipements', label: 'Équipements', icon: '⚙️' },
  { value: 'menuiseries', label: 'Menuiseries', icon: '🚪' },
  { value: 'sanitaires', label: 'Sanitaires', icon: '🚿' },
  { value: 'electricite', label: 'Électricité', icon: '⚡' },
  { value: 'revetement', label: 'Revêtement', icon: '🎨' },
  { value: 'toiture', label: 'Toiture', icon: '🏠' },
  { value: 'gouttieres', label: 'Gouttières', icon: '💧' },
  { value: 'autre', label: 'Autre', icon: '📍' },
];

const ENDROITS_BY_TYPE: Record<string, string[]> = {
  appartement: ['Entrée', 'Séjour', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Chambre 3', 'SDB', 'WC', 'Couloir', 'Balcon', 'Terrasse', 'Cellier'],
  local_commercial: ['Entrée', 'Espace principal', 'Arrière-boutique', 'Réserve', 'Sanitaires', 'Bureau'],
  hall: ['Hall principal', 'Dégagement', 'Boîtes aux lettres', 'Local poubelles'],
  escalier: ['Palier RDC', 'Palier 1er', 'Palier 2ème', 'Palier 3ème', 'Palier 4ème', 'Palier 5ème'],
  ascenseur: ['Cabine', 'Palier'],
  facade: ['Façade avant', 'Façade arrière', 'Façade latérale gauche', 'Façade latérale droite'],
  toiture: ['Versant avant', 'Versant arrière', 'Cheminée', 'Gouttières', 'Zinguerie'],
  parking: ['Place 1', 'Place 2', 'Place 3', 'Allée circulation'],
  cave: ['Cave 1', 'Cave 2', 'Cave 3', 'Couloir caves'],
  jardin: ['Jardin avant', 'Jardin arrière', 'Terrasse'],
  combles: ['Espace principal', 'Rampants', 'Charpente'],
};

export const SequenceLocationAssigner: React.FC<SequenceLocationAssignerProps> = ({
  projectId,
  sequenceId,
  currentDescription,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'partie' | 'lieu' | 'endroit' | 'zone'>('partie');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  
  // Selections
  const [selectedPart, setSelectedPart] = useState<PropertyPart | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedEndroit, setSelectedEndroit] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    loadStructure();
  }, [projectId]);

  const loadStructure = async () => {
    try {
      // Load parts
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', projectId)
        .order('part_type', { ascending: true });
      
      // Load locations
      const { data: locationsData } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', projectId);
      
      setParts(partsData || []);
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading structure:', error);
      toast.error('Erreur lors du chargement de la structure');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPart = (part: PropertyPart) => {
    setSelectedPart(part);
    setStep('lieu');
  };

  const handleSelectLocation = (location: PropertyLocation) => {
    setSelectedLocation(location);
    setStep('endroit');
  };

  const handleSelectEndroit = (endroit: string) => {
    setSelectedEndroit(endroit);
    setStep('zone');
  };

  const handleSelectZone = async (zone: string) => {
    setSelectedZone(zone);
    await saveLocation(zone);
  };

  const saveLocation = async (zone: string) => {
    if (!selectedLocation) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({
          part_id: selectedPart?.id,
          location_id: selectedLocation.id,
          endroit_name: selectedEndroit,
          zone_type: zone,
        })
        .eq('id', sequenceId);

      if (error) throw error;

      toast.success('Séquence localisée avec succès !');
      onComplete();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Erreur lors de la localisation');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'zone') {
      setSelectedZone(null);
      setStep('endroit');
    } else if (step === 'endroit') {
      setSelectedEndroit(null);
      setStep('lieu');
    } else if (step === 'lieu') {
      setSelectedLocation(null);
      setStep('partie');
    } else {
      onCancel();
    }
  };

  const filteredLocations = locations.filter(loc => loc.part_id === selectedPart?.id);
  const endroitOptions = selectedLocation 
    ? ENDROITS_BY_TYPE[selectedLocation.location_type] || ['Zone principale', 'Zone secondaire']
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="font-bold text-lg mb-2">Structure non définie</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Vous devez d'abord définir la structure du bien (parties, lieux) dans les informations du projet.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h3 className="font-bold">Localiser la séquence</h3>
            <div className="flex items-center gap-1 mt-1">
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${step === 'partie' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1. Partie
              </Badge>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${step === 'lieu' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2. Lieu
              </Badge>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${step === 'endroit' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3. Endroit
              </Badge>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${step === 'zone' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                4. Zone
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Current selection summary */}
        {(selectedPart || selectedLocation || selectedEndroit) && (
          <div className="flex items-center gap-1 flex-wrap mt-3 pt-3 border-t border-border/30">
            {selectedPart && (
              <Badge className={`text-[10px] px-2 py-0.5 h-5 ${
                selectedPart.part_type === 'commune'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }`}>
                {selectedPart.name}
              </Badge>
            )}
            {selectedLocation && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Badge className="text-[10px] px-2 py-0.5 h-5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {selectedLocation.name}
                </Badge>
              </>
            )}
            {selectedEndroit && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <Badge className="text-[10px] px-2 py-0.5 h-5 bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  {selectedEndroit}
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      {/* Description reminder */}
      {currentDescription && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border/30">
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="font-medium">Problème:</span> {currentDescription}
          </p>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Step 1: Partie */}
          {step === 'partie' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez la partie du bien
              </p>
              {parts.map(part => (
                <button
                  key={part.id}
                  onClick={() => handleSelectPart(part)}
                  className={`
                    w-full p-4 rounded-2xl border-2 text-left transition-all
                    ${part.part_type === 'commune'
                      ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50'
                      : 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${part.part_type === 'commune'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                      }
                    `}>
                      {part.part_type === 'commune' ? (
                        <Building2 className="w-6 h-6" />
                      ) : (
                        <Home className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{part.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {part.part_type === 'commune' ? 'Partie commune' : 'Partie privative'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Step 2: Lieu */}
          {step === 'lieu' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez le lieu dans "{selectedPart?.name}"
              </p>
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Aucun lieu défini dans cette partie</p>
                </div>
              ) : (
                filteredLocations.map(location => (
                  <button
                    key={location.id}
                    onClick={() => handleSelectLocation(location)}
                    className="w-full p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 
                      hover:bg-emerald-500/10 hover:border-emerald-500/50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{location.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {location.location_type?.replace('_', ' ')}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {/* Step 3: Endroit */}
          {step === 'endroit' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez l'endroit dans "{selectedLocation?.name}"
              </p>
              {endroitOptions.map(endroit => (
                <button
                  key={endroit}
                  onClick={() => handleSelectEndroit(endroit)}
                  className="w-full p-4 rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 
                    hover:bg-violet-500/10 hover:border-violet-500/50 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center text-lg">
                      🏠
                    </div>
                    <p className="font-medium flex-1">{endroit}</p>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Step 4: Zone */}
          {step === 'zone' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Sélectionnez la zone concernée
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ZONE_TYPES.map(zone => (
                  <button
                    key={zone.value}
                    onClick={() => handleSelectZone(zone.value)}
                    disabled={saving}
                    className="p-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 
                      hover:bg-amber-500/10 hover:border-amber-500/50 text-left transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{zone.icon}</span>
                      <span className="font-medium text-sm">{zone.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {saving && (
                <div className="flex items-center justify-center gap-2 py-4 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Enregistrement...</span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
