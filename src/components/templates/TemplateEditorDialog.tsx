import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Layers,
  Settings,
  FileText,
  Sparkles
} from 'lucide-react';
import { EdlTemplate, RoomConfig, useEdlTemplates } from '@/hooks/useEdlTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EdlTemplate | null;
  onSave: () => void;
}

const roomTypes = [
  { value: 'entree', label: 'Entrée' },
  { value: 'sejour', label: 'Séjour' },
  { value: 'chambre', label: 'Chambre' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'sdb', label: 'Salle de bain' },
  { value: 'wc', label: 'WC' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'terrasse', label: 'Terrasse/Balcon' },
  { value: 'garage', label: 'Garage' },
  { value: 'cave', label: 'Cave' },
  { value: 'exterieur', label: 'Extérieur' },
  { value: 'parties_communes', label: 'Parties communes' },
];

const defaultElements = [
  'murs', 'sol', 'plafond', 'fenetres', 'portes', 'prises', 
  'interrupteurs', 'chauffage', 'vmc', 'placards'
];

export function TemplateEditorDialog({ 
  open, 
  onOpenChange, 
  template, 
  onSave 
}: TemplateEditorDialogProps) {
  const { createTemplate, updateTemplate } = useEdlTemplates();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'standard' as EdlTemplate['template_type'],
    property_type: '' as string,
    rooms_config: [] as RoomConfig[],
    elements_config: {} as Record<string, string[]>,
    ai_rules: {
      min_description_length: 20,
      detect_humidity: true,
      detect_cracks: true,
      auto_classify_tasks: true,
    },
    min_photos_required: 20,
    is_public: false,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        template_type: template.template_type,
        property_type: template.property_type || '',
        rooms_config: template.rooms_config,
        elements_config: template.elements_config,
        ai_rules: {
          min_description_length: template.ai_rules?.min_description_length || 20,
          detect_humidity: template.ai_rules?.detect_humidity ?? true,
          detect_cracks: template.ai_rules?.detect_cracks ?? true,
          auto_classify_tasks: template.ai_rules?.auto_classify_tasks ?? true,
        },
        min_photos_required: template.min_photos_required,
        is_public: template.is_public,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        template_type: 'standard',
        property_type: '',
        rooms_config: [],
        elements_config: {},
        ai_rules: {
          min_description_length: 20,
          detect_humidity: true,
          detect_cracks: true,
          auto_classify_tasks: true,
        },
        min_photos_required: 20,
        is_public: false,
      });
    }
  }, [template, open]);

  const handleAddRoom = () => {
    setFormData(prev => ({
      ...prev,
      rooms_config: [...prev.rooms_config, { name: 'Nouvelle pièce', type: 'sejour' }],
    }));
  };

  const handleRemoveRoom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rooms_config: prev.rooms_config.filter((_, i) => i !== index),
    }));
  };

  const handleRoomChange = (index: number, field: keyof RoomConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      rooms_config: prev.rooms_config.map((room, i) => 
        i === index ? { ...room, [field]: value } : room
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (template) {
        await updateTemplate(template.id, formData);
      } else {
        await createTemplate(formData);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {template ? 'Modifier le modèle' : 'Nouveau modèle'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Général
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Pièces
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Règles IA
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[500px] px-6 py-4">
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du modèle</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Appartement T3 standard"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez l'usage de ce modèle..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type d'EDL</Label>
                  <Select 
                    value={formData.template_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, template_type: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="entree">Entrée</SelectItem>
                      <SelectItem value="sortie">Sortie</SelectItem>
                      <SelectItem value="technique">Technique</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type de bien</Label>
                  <Select 
                    value={formData.property_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, property_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="t1">T1</SelectItem>
                      <SelectItem value="t2">T2</SelectItem>
                      <SelectItem value="t3">T3</SelectItem>
                      <SelectItem value="t4">T4</SelectItem>
                      <SelectItem value="t5">T5+</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="immeuble">Immeuble</SelectItem>
                      <SelectItem value="commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photos">Nombre minimum de photos</Label>
                <Input
                  id="photos"
                  type="number"
                  value={formData.min_photos_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_photos_required: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Partager ce modèle</p>
                  <p className="text-sm text-muted-foreground">Rendre visible aux autres utilisateurs</p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="rooms" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formData.rooms_config.length} pièce(s) configurée(s)
                </p>
                <Button variant="outline" size="sm" onClick={handleAddRoom}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une pièce
                </Button>
              </div>

              <div className="space-y-3">
                {formData.rooms_config.map((room, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Input
                      value={room.name}
                      onChange={(e) => handleRoomChange(index, 'name', e.target.value)}
                      className="flex-1"
                      placeholder="Nom de la pièce"
                    />
                    <Select 
                      value={room.type} 
                      onValueChange={(v) => handleRoomChange(index, 'type', v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRoom(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {formData.rooms_config.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune pièce configurée</p>
                    <p className="text-sm">Cliquez sur "Ajouter une pièce" pour commencer</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Détection d'humidité</p>
                    <p className="text-sm text-muted-foreground">L'IA détectera automatiquement les traces d'humidité</p>
                  </div>
                  <Switch
                    checked={formData.ai_rules.detect_humidity}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      ai_rules: { ...prev.ai_rules, detect_humidity: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Détection de fissures</p>
                    <p className="text-sm text-muted-foreground">L'IA détectera automatiquement les fissures</p>
                  </div>
                  <Switch
                    checked={formData.ai_rules.detect_cracks}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      ai_rules: { ...prev.ai_rules, detect_cracks: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Classification automatique des tâches</p>
                    <p className="text-sm text-muted-foreground">Les tâches seront classifiées selon le DSC</p>
                  </div>
                  <Switch
                    checked={formData.ai_rules.auto_classify_tasks}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      ai_rules: { ...prev.ai_rules, auto_classify_tasks: checked }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Longueur minimale des descriptions</Label>
                  <Input
                    type="number"
                    value={formData.ai_rules.min_description_length || 20}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      ai_rules: { ...prev.ai_rules, min_description_length: parseInt(e.target.value) || 20 }
                    }))}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Les descriptions plus courtes déclencheront un avertissement
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-end gap-3 p-6 pt-0 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
