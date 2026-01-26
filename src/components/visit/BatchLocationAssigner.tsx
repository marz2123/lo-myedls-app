import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Home, 
  ChevronRight, 
  MapPin,
  Check,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VisitSequence {
  id: string;
  description: string | null;
  location_id: string | null;
  endroit_name?: string | null;
  zone_type: string | null;
}

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

interface BatchLocationAssignerProps {
  projectId: string;
  sequences: VisitSequence[];
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

export const BatchLocationAssigner: React.FC<BatchLocationAssignerProps> = ({
  projectId,
  sequences,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'select' | 'partie' | 'lieu' | 'endroit' | 'zone' | 'confirm'>('select');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  
  // Selected sequences
  const [selectedSequences, setSelectedSequences] = useState<Set<string>>(new Set());
  
  // Selections
  const [selectedPart, setSelectedPart] = useState<PropertyPart | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedEndroit, setSelectedEndroit] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    loadStructure();
    // Pre-select all sequences
    setSelectedSequences(new Set(sequences.map(s => s.id)));
  }, [projectId, sequences]);

  const loadStructure = async () => {
    try {
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', projectId)
        .order('part_type', { ascending: true });
      
      const { data: locationsData } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', projectId);
      
      setParts(partsData || []);
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading structure:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const toggleSequence = (id: string) => {
    const newSelected = new Set(selectedSequences);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSequences(newSelected);
  };

  const selectAll = () => setSelectedSequences(new Set(sequences.map(s => s.id)));
  const deselectAll = () => setSelectedSequences(new Set());

  const handleConfirm = async () => {
    if (!selectedLocation || selectedSequences.size === 0) return;
    
    setSaving(true);
    try {
      const updates = Array.from(selectedSequences).map(async (id) => {
        const { error } = await supabase
          .from('visit_sequences')
          .update({
            part_id: selectedPart?.id,
            location_id: selectedLocation.id,
            endroit_name: selectedEndroit,
            zone_type: selectedZone,
          })
          .eq('id', id);
        if (error) throw error;
      });

      await Promise.all(updates);
      toast.success(`${selectedSequences.size} séquences localisées !`);
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la localisation');
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'confirm') setStep('zone');
    else if (step === 'zone') { setSelectedZone(null); setStep('endroit'); }
    else if (step === 'endroit') { setSelectedEndroit(null); setStep('lieu'); }
    else if (step === 'lieu') { setSelectedLocation(null); setStep('partie'); }
    else if (step === 'partie') { setSelectedPart(null); setStep('select'); }
    else onCancel();
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

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h3 className="font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Localisation par lot
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSequences.size} séquence(s) sélectionnée(s)
            </p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-1 mt-3">
          {['select', 'partie', 'lieu', 'endroit', 'zone', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-2 h-2 rounded-full ${step === s ? 'bg-primary' : i < ['select', 'partie', 'lieu', 'endroit', 'zone', 'confirm'].indexOf(step) ? 'bg-primary/50' : 'bg-muted'}`} />
              {i < 5 && <div className="w-4 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Step: Select sequences */}
          {step === 'select' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Sélectionnez les séquences à localiser</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={selectAll} className="h-6 text-xs">Tout</Button>
                  <Button size="sm" variant="ghost" onClick={deselectAll} className="h-6 text-xs">Aucun</Button>
                </div>
              </div>
              
              {sequences.map(seq => (
                <button
                  key={seq.id}
                  onClick={() => toggleSequence(seq.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    selectedSequences.has(seq.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border/30 bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedSequences.has(seq.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">
                        {seq.description || 'Pas de description'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              
              <Button
                className="w-full h-12 rounded-xl mt-4"
                disabled={selectedSequences.size === 0}
                onClick={() => setStep('partie')}
              >
                Continuer ({selectedSequences.size})
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step: Partie */}
          {step === 'partie' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">Partie du bien</p>
              {parts.map(part => (
                <button
                  key={part.id}
                  onClick={() => { setSelectedPart(part); setStep('lieu'); }}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    part.part_type === 'commune'
                      ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
                      : 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      part.part_type === 'commune' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {part.part_type === 'commune' ? <Building2 className="w-6 h-6" /> : <Home className="w-6 h-6" />}
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

          {/* Step: Lieu */}
          {step === 'lieu' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">Lieu dans "{selectedPart?.name}"</p>
              {filteredLocations.map(location => (
                <button
                  key={location.id}
                  onClick={() => { setSelectedLocation(location); setStep('endroit'); }}
                  className="w-full p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{location.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{location.location_type?.replace('_', ' ')}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Step: Endroit */}
          {step === 'endroit' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">Endroit dans "{selectedLocation?.name}"</p>
              {endroitOptions.map(endroit => (
                <button
                  key={endroit}
                  onClick={() => { setSelectedEndroit(endroit); setStep('zone'); }}
                  className="w-full p-4 rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center text-lg">🏠</div>
                    <p className="font-medium flex-1">{endroit}</p>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Step: Zone */}
          {step === 'zone' && (
            <>
              <p className="text-sm text-muted-foreground mb-3">Zone concernée</p>
              <div className="grid grid-cols-2 gap-2">
                {ZONE_TYPES.map(zone => (
                  <button
                    key={zone.value}
                    onClick={() => { setSelectedZone(zone.value); setStep('confirm'); }}
                    className="p-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-left transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{zone.icon}</span>
                      <span className="font-medium text-sm">{zone.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border-2 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h4 className="font-bold">Récapitulatif</h4>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Séquences</span>
                    <Badge>{selectedSequences.size}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Partie</span>
                    <Badge className={selectedPart?.part_type === 'commune' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}>
                      {selectedPart?.name}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lieu</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400">{selectedLocation?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endroit</span>
                    <Badge className="bg-violet-500/20 text-violet-400">{selectedEndroit}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zone</span>
                    <Badge className="bg-amber-500/20 text-amber-400">
                      {ZONE_TYPES.find(z => z.value === selectedZone)?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button
                className="w-full h-14 rounded-xl text-lg"
                disabled={saving}
                onClick={handleConfirm}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Appliquer à {selectedSequences.size} séquences
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
