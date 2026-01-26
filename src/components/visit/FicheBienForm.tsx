import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  MapPin,
  Calendar,
  Thermometer,
  Wind,
  FileText,
  AlertTriangle,
  Wrench,
  Save,
  Plus,
  Minus,
  Home,
  Car,
  Trees,
  Layers,
  Accessibility,
  Navigation,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TYPE_BIEN_LABELS,
  TypeBien,
  FicheBien,
} from '@/types/visitModel';
import { cn } from '@/lib/utils';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { AddressSuggestion } from '@/hooks/useFrenchAddressSearch';
import { PropertyLocationSection } from '@/components/location/PropertyLocationSection';

interface FicheBienFormProps {
  projectId: string;
  onSave?: () => void;
}

export const FicheBienForm = ({ projectId, onSave }: FicheBienFormProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [composition, setComposition] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nom_bien: '',
    type_bien: 'immeuble' as TypeBien,
    adresse: '',
    code_postal: '',
    ville: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    code_insee: undefined as string | undefined,
    // Composition
    nb_appartements: 0,
    nb_cages: 1,
    nb_facades: 4,
    nb_parkings: 0,
    nb_boxes: 0,
    nb_garages: 0,
    nb_caves: 0,
    nb_jardins: 0,
    nb_etages: 0,
    nb_locaux_techniques: 0,
    surface_totale_m2: 0,
    // Contexte
    date_construction: '',
    type_chauffage: '',
    type_ventilation: '',
    contexte_historique: '',
    sinistres_precedents: '',
    travaux_anterieurs: '',
    contraintes: '',
    acces_handicapes: false,
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      // Load project
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (proj) {
        setProject(proj);
        const typeBien = (['immeuble', 'maison', 'appartement', 'plateau', 'commerce', 'autre'].includes(proj.property_type) 
          ? proj.property_type 
          : 'immeuble') as TypeBien;
        setFormData(prev => ({
          ...prev,
          adresse: proj.address || '',
          code_postal: proj.postal_code || '',
          ville: proj.city || '',
          type_bien: typeBien,
        }));
      }

      // Load composition
      const { data: comp } = await supabase
        .from('property_composition')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (comp) {
        setComposition(comp);
        const compTypeBien = (['immeuble', 'maison', 'appartement', 'plateau', 'commerce', 'autre'].includes(comp.type_bien) 
          ? comp.type_bien 
          : null) as TypeBien | null;
        setFormData(prev => ({
          ...prev,
          nom_bien: comp.nom_bien || '',
          type_bien: compTypeBien || prev.type_bien,
          nb_appartements: comp.nb_apartments || 0,
          nb_cages: comp.nb_staircases || 1,
          nb_facades: comp.nb_facades || 4,
          nb_parkings: comp.nb_parking_spots || 0,
          nb_boxes: comp.nb_boxes || 0,
          nb_garages: comp.nb_garages || 0,
          nb_caves: comp.nb_caves || 0,
          nb_jardins: comp.nb_gardens || 0,
          nb_etages: comp.nb_etages || comp.total_floors || 0,
          nb_locaux_techniques: comp.nb_locaux_techniques || 0,
          surface_totale_m2: comp.surface_totale_m2 || 0,
          date_construction: comp.date_construction || '',
          type_chauffage: comp.type_chauffage || '',
          type_ventilation: comp.type_ventilation || '',
          contexte_historique: comp.contexte_historique || comp.history_notes || '',
          sinistres_precedents: comp.sinistres_precedents || '',
          travaux_anterieurs: comp.travaux_anterieurs_detail ? JSON.stringify(comp.travaux_anterieurs_detail) : comp.previous_works || '',
          contraintes: comp.constraints || '',
          acces_handicapes: comp.acces_handicapes || false,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update project
      await supabase
        .from('projects')
        .update({
          address: formData.adresse,
          postal_code: formData.code_postal,
          city: formData.ville,
          property_type: formData.type_bien,
        })
        .eq('id', projectId);

      // Upsert composition
      const compositionData = {
        project_id: projectId,
        nom_bien: formData.nom_bien,
        type_bien: formData.type_bien,
        nb_apartments: formData.nb_appartements,
        nb_staircases: formData.nb_cages,
        nb_facades: formData.nb_facades,
        nb_parking_spots: formData.nb_parkings,
        nb_boxes: formData.nb_boxes,
        nb_garages: formData.nb_garages,
        nb_caves: formData.nb_caves,
        nb_gardens: formData.nb_jardins,
        nb_etages: formData.nb_etages,
        total_floors: formData.nb_etages,
        nb_locaux_techniques: formData.nb_locaux_techniques,
        surface_totale_m2: formData.surface_totale_m2,
        date_construction: formData.date_construction || null,
        type_chauffage: formData.type_chauffage,
        type_ventilation: formData.type_ventilation,
        contexte_historique: formData.contexte_historique,
        history_notes: formData.contexte_historique,
        sinistres_precedents: formData.sinistres_precedents,
        previous_works: formData.travaux_anterieurs,
        constraints: formData.contraintes,
        acces_handicapes: formData.acces_handicapes,
      };

      if (composition?.id) {
        await supabase
          .from('property_composition')
          .update(compositionData)
          .eq('id', composition.id);
      } else {
        await supabase
          .from('property_composition')
          .insert(compositionData);
      }

      toast.success('Fiche bien enregistrée');
      onSave?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const NumberInput = ({ 
    label, 
    field, 
    icon: Icon,
    min = 0 
  }: { 
    label: string; 
    field: string; 
    icon: any;
    min?: number;
  }) => (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => updateField(field, Math.max(min, (formData as any)[field] - 1))}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-8 text-center font-semibold">{(formData as any)[field]}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => updateField(field, (formData as any)[field] + 1)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="card-premium">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building2 className="w-8 h-8 text-primary animate-pulse mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Fiche Bien
          </CardTitle>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="localisation">
              <Navigation className="w-3 h-3 mr-1" />
              Localisation
            </TabsTrigger>
            <TabsTrigger value="composition">Composition</TabsTrigger>
            <TabsTrigger value="contexte">Contexte</TabsTrigger>
          </TabsList>

          {/* Général */}
          <TabsContent value="general" className="space-y-4 animate-fade-in">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du bien</Label>
                <Input
                  placeholder="Ex: Résidence Les Jardins"
                  value={formData.nom_bien}
                  onChange={(e) => updateField('nom_bien', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select
                  value={formData.type_bien}
                  onValueChange={(v) => updateField('type_bien', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_BIEN_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <AddressAutocomplete
                  value={formData.adresse}
                  onChange={(value) => updateField('adresse', value)}
                  onAddressSelect={(suggestion: AddressSuggestion) => {
                    setFormData(prev => ({
                      ...prev,
                      adresse: suggestion.street || suggestion.label.split(',')[0],
                      code_postal: suggestion.postcode,
                      ville: suggestion.city,
                      latitude: suggestion.lat,
                      longitude: suggestion.lon,
                      code_insee: suggestion.citycode,
                    }));
                  }}
                  placeholder="15 rue de la République"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input
                    placeholder="75001"
                    value={formData.code_postal}
                    onChange={(e) => updateField('code_postal', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    placeholder="Paris"
                    value={formData.ville}
                    onChange={(e) => updateField('ville', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Surface totale (m²)</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={formData.surface_totale_m2 || ''}
                  onChange={(e) => updateField('surface_totale_m2', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Localisation */}
          <TabsContent value="localisation" className="animate-fade-in">
            <ScrollArea className="h-[600px] pr-4">
              <PropertyLocationSection
                latitude={formData.latitude}
                longitude={formData.longitude}
                address={formData.adresse}
                postalCode={formData.code_postal}
                city={formData.ville}
                codeInsee={formData.code_insee}
              />
            </ScrollArea>
          </TabsContent>

          {/* Composition */}
          <TabsContent value="composition" className="animate-fade-in">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                <NumberInput label="Appartements" field="nb_appartements" icon={Home} />
                <NumberInput label="Cages d'escalier" field="nb_cages" icon={Layers} min={1} />
                <NumberInput label="Façades" field="nb_facades" icon={Building2} min={1} />
                <NumberInput label="Étages" field="nb_etages" icon={Layers} />
                <NumberInput label="Parkings" field="nb_parkings" icon={Car} />
                <NumberInput label="Boxes" field="nb_boxes" icon={Car} />
                <NumberInput label="Garages" field="nb_garages" icon={Car} />
                <NumberInput label="Caves" field="nb_caves" icon={Layers} />
                <NumberInput label="Jardins" field="nb_jardins" icon={Trees} />
                <NumberInput label="Locaux techniques" field="nb_locaux_techniques" icon={Wrench} />
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                      <Accessibility className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">Accès handicapés</span>
                  </div>
                  <Switch
                    checked={formData.acces_handicapes}
                    onCheckedChange={(v) => updateField('acces_handicapes', v)}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Contexte */}
          <TabsContent value="contexte" className="animate-fade-in">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Année de construction
                  </Label>
                  <Input
                    type="date"
                    value={formData.date_construction}
                    onChange={(e) => updateField('date_construction', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      Type de chauffage
                    </Label>
                    <Input
                      placeholder="Gaz collectif"
                      value={formData.type_chauffage}
                      onChange={(e) => updateField('type_chauffage', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Wind className="w-4 h-4" />
                      Type de ventilation
                    </Label>
                    <Input
                      placeholder="VMC simple flux"
                      value={formData.type_ventilation}
                      onChange={(e) => updateField('type_ventilation', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Contexte historique
                  </Label>
                  <Textarea
                    placeholder="Historique du bâtiment, travaux majeurs passés..."
                    value={formData.contexte_historique}
                    onChange={(e) => updateField('contexte_historique', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Sinistres précédents
                  </Label>
                  <Textarea
                    placeholder="Dégâts des eaux, incendies, catastrophes naturelles..."
                    value={formData.sinistres_precedents}
                    onChange={(e) => updateField('sinistres_precedents', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Travaux antérieurs
                  </Label>
                  <Textarea
                    placeholder="Liste des travaux réalisés..."
                    value={formData.travaux_anterieurs}
                    onChange={(e) => updateField('travaux_anterieurs', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contraintes particulières</Label>
                  <Textarea
                    placeholder="Servitudes, règles de copropriété, contraintes techniques..."
                    value={formData.contraintes}
                    onChange={(e) => updateField('contraintes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
