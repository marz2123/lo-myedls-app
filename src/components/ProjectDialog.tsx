import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, Plus, Building2, Home, Store, MapPin, 
  ChevronRight, ChevronLeft, Check, GripVertical, Edit2, Trash2,
  DoorOpen, Layers, Users, ArrowUpDown, Car, Warehouse, Box, Boxes,
  Flame, Trash, Bike, Sun, TreePine, Trees, FileText, Upload, FileCheck,
  Sparkles, Square, Globe, RefreshCw, MoveVertical, Waypoints, Building, 
  HomeIcon as HouseIcon, Triangle, Archive, Wrench, BedDouble, Bath, 
  Droplets, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { ProjectDocumentUploader } from "./ProjectDocumentUploader";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AddressSuggestion } from "@/hooks/useFrenchAddressSearch";
import { PropertyLocationPreview } from "./location/PropertyLocationPreview";

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
  number_of_units?: number;
  has_parking: boolean;
  has_box: boolean;
  has_garage: boolean;
  additional_info?: string;
  project_documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    uploadedAt: string;
  }>;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelected: (projectId: string) => void;
}

type PropertyType = 'building' | 'house' | 'apartment' | 'commercial';

interface PartieCommune {
  id: string;
  name: string;
  type: string;
}

interface PieceAppartement {
  id: string;
  type: string;
  name: string;
  surfaceM2?: number;
}

interface PartiePrivative {
  id: string;
  name: string;
  type: 'appartement' | 'local_commercial' | 'parking' | 'box' | 'cave' | 'jardin' | 'plateau' | 'combles';
  numero?: string;
  // Apartment specific fields
  typeAppartement?: string; // T1, T2, T3, T4, T5, Studio
  nbChambres?: number;
  nbSallesDeBain?: number;
  hasBalcon?: boolean;
  hasTerrasse?: boolean;
  hasJardin?: boolean;
  surfaceM2?: number;
  etage?: number;
  // Associated spaces
  parkingAssocie?: string;
  boxAssocie?: string;
  caveAssociee?: string;
  cellierAssocie?: string;
  // Rooms within apartment
  pieces?: PieceAppartement[];
}

const TYPES_APPARTEMENT = [
  { value: 'studio', label: 'Studio' },
  { value: 't1', label: 'T1' },
  { value: 't2', label: 'T2' },
  { value: 't3', label: 'T3' },
  { value: 't4', label: 'T4' },
  { value: 't5', label: 'T5+' },
];

const PROPERTY_TYPES = [
  { value: 'building' as PropertyType, label: 'Immeuble', labelEn: 'Building', icon: Building2, emoji: '🏢' },
  { value: 'house' as PropertyType, label: 'Maison', labelEn: 'House', icon: Home, emoji: '🏠' },
  { value: 'apartment' as PropertyType, label: 'Appartement', labelEn: 'Apartment', icon: Building2, emoji: '🏬' },
  { value: 'commercial' as PropertyType, label: 'Local commercial', labelEn: 'Commercial', icon: Store, emoji: '🏪' },
];

const PARTIES_COMMUNES_TYPES = [
  { value: 'hall', label: 'Hall d\'entrée', icon: DoorOpen },
  { value: 'escalier', label: 'Cage d\'escalier', icon: MoveVertical },
  { value: 'ascenseur', label: 'Ascenseur', icon: ArrowUpDown },
  { value: 'couloir', label: 'Couloir / Palier', icon: Waypoints },
  { value: 'facade', label: 'Façade', icon: Building },
  { value: 'toiture', label: 'Toiture', icon: HouseIcon },
  { value: 'combles', label: 'Combles', icon: Triangle },
  { value: 'cave_commune', label: 'Cave commune', icon: Archive },
  { value: 'local_technique', label: 'Local technique', icon: Wrench },
  { value: 'chaufferie', label: 'Chaufferie', icon: Flame },
  { value: 'local_poubelles', label: 'Local poubelles', icon: Trash },
  { value: 'local_velos', label: 'Local vélos', icon: Bike },
  { value: 'parking_commun', label: 'Parking commun', icon: Car },
  { value: 'terrasse_commune', label: 'Terrasse commune', icon: Sun },
  { value: 'espaces_verts', label: 'Espaces verts', icon: Trees },
  { value: 'jardin_commun', label: 'Jardin', icon: TreePine },
  { value: 'autre', label: 'Autre', icon: Plus, isPlus: true },
];

const PARTIES_PRIVATIVES_TYPES = [
  { value: 'appartement' as const, label: 'Appartement', icon: Building2, emoji: '🏠' },
  { value: 'local_commercial' as const, label: 'Local commercial', icon: Store, emoji: '🏪' },
  { value: 'plateau' as const, label: 'Plateau à aménager', icon: Square, emoji: '📐' },
  { value: 'parking' as const, label: 'Place de parking', icon: Car, emoji: '🅿️' },
  { value: 'box' as const, label: 'Box / Garage', icon: Warehouse, emoji: '🚗' },
  { value: 'cave' as const, label: 'Cave', icon: Warehouse, emoji: '🪨' },
  { value: 'jardin' as const, label: 'Jardin privatif', icon: TreePine, emoji: '🌳' },
  { value: 'combles' as const, label: 'Combles à aménager', icon: Home, emoji: '🏚️' },
];

const PIECES_APPARTEMENT_TYPES = [
  { value: 'entree', label: 'Entrée', emoji: '🚪' },
  { value: 'sejour', label: 'Séjour', emoji: '🛋️' },
  { value: 'salon', label: 'Salon', emoji: '🪑' },
  { value: 'cuisine', label: 'Cuisine', emoji: '🍳' },
  { value: 'chambre', label: 'Chambre', emoji: '🛏️' },
  { value: 'sdb', label: 'Salle de bain', emoji: '🚿' },
  { value: 'wc', label: 'WC', emoji: '🚽' },
  { value: 'couloir', label: 'Couloir', emoji: '🚶' },
  { value: 'bureau', label: 'Bureau', emoji: '💼' },
  { value: 'dressing', label: 'Dressing', emoji: '👔' },
  { value: 'buanderie', label: 'Buanderie', emoji: '🧺' },
  { value: 'balcon', label: 'Balcon', emoji: '🌅' },
  { value: 'terrasse', label: 'Terrasse', emoji: '☀️' },
  { value: 'jardin', label: 'Jardin', emoji: '🌳' },
  { value: 'garage', label: 'Garage', emoji: '🚗' },
  { value: 'cave', label: 'Cave', emoji: '🪨' },
  { value: 'autre', label: 'Autre', emoji: '+', isPlus: true },
];

export const ProjectDialog = ({ open, onOpenChange, onProjectSelected }: ProjectDialogProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const { t } = useLanguage();
  const { toast } = useToast();
  const isFrench = t('cancel') === 'Annuler';

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Property type
  const [propertyType, setPropertyType] = useState<PropertyType>('building');

  // Step 2: Location
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [codeInsee, setCodeInsee] = useState<string | undefined>(undefined);

  // Step 3: Composition (for building)
  const [partiesCommunes, setPartiesCommunes] = useState<PartieCommune[]>([]);
  const [partiesPrivatives, setPartiesPrivatives] = useState<PartiePrivative[]>([]);
  const [showAddCommune, setShowAddCommune] = useState(false);
  const [showAddPrivative, setShowAddPrivative] = useState(false);
  const [editingCommune, setEditingCommune] = useState<string | null>(null);
  const [editingPrivative, setEditingPrivative] = useState<string | null>(null);
  const [editingAppartementDetails, setEditingAppartementDetails] = useState<string | null>(null);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [compositionMode, setCompositionMode] = useState<'communes' | 'privatives'>('communes');

  // Step 4: Additional info
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);

  // Legacy fields
  const [hasParking, setHasParking] = useState(false);
  const [hasBox, setHasBox] = useState(false);
  const [hasGarage, setHasGarage] = useState(false);

  const totalSteps = 5; // Always 5 steps for consistent UX

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset wizard when dialog closes
      setIsCreating(false);
      setCurrentStep(1);
    }
  }, [open]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as any) || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return propertyType !== null;
      case 2: return address.trim() !== '';
      case 3: 
        if (propertyType === 'building') {
          return true; // Composition is optional
        }
        return true;
      default: return true;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return propertyType !== null;
      case 2: return address.trim() !== '';
      case 3: 
        if (propertyType === 'building') {
          return true; // Composition optional but we consider it complete if reached
        }
        return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const getFirstIncompleteStep = (): number => {
    for (let i = 1; i <= totalSteps; i++) {
      if (!isStepComplete(i)) return i;
    }
    return totalSteps;
  };

  const handleStepClick = (targetStep: number) => {
    // Can always go back to previous steps
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    
    // If trying to go forward, check if all previous steps are complete
    const firstIncomplete = getFirstIncompleteStep();
    if (targetStep > firstIncomplete) {
      toast({
        title: isFrench ? "⚠️ Étape incomplète" : "⚠️ Incomplete step",
        description: isFrench 
          ? `Veuillez d'abord compléter l'étape ${firstIncomplete}` 
          : `Please complete step ${firstIncomplete} first`,
      });
      setCurrentStep(firstIncomplete);
      return;
    }
    
    // Can proceed to the target step
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateProject();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setIsCreating(false);
    }
  };

  const addPartieCommune = (type: string) => {
    const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === type);
    const isAutre = typeInfo && 'isPlus' in typeInfo && typeInfo.isPlus;
    const existingOfType = partiesCommunes.filter(p => p.type === type);
    
    let updatedParties = [...partiesCommunes];
    
    // If this is the second item (and not "Autre"), rename the first one to add "A" suffix
    if (!isAutre && existingOfType.length === 1) {
      updatedParties = updatedParties.map(p => {
        if (p.id === existingOfType[0].id) {
          return { ...p, name: `${typeInfo?.label} A` };
        }
        return p;
      });
    }
    
    // Determine suffix for new item
    const newSuffix = isAutre ? '' : (existingOfType.length === 0 ? '' : ` ${String.fromCharCode(65 + existingOfType.length)}`);
    const newId = crypto.randomUUID();
    
    const newPartie: PartieCommune = {
      id: newId,
      name: isAutre ? '' : `${typeInfo?.label}${newSuffix}`,
      type
    };
    
    setPartiesCommunes([...updatedParties, newPartie]);
    
    // Auto-focus on editing for "Autre" type
    if (isAutre) {
      setTimeout(() => setEditingCommune(newId), 50);
    }
  };

  const addMultiplePartiesCommunes = (type: string, count: number) => {
    const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === type);
    const existingOfType = partiesCommunes.filter(p => p.type === type);
    
    let updatedParties = [...partiesCommunes];
    const startIndex = existingOfType.length;
    
    // If we're adding to a single existing item, rename it first
    if (existingOfType.length === 1) {
      updatedParties = updatedParties.map(p => {
        if (p.id === existingOfType[0].id) {
          return { ...p, name: `${typeInfo?.label} A` };
        }
        return p;
      });
    }
    
    const newParties: PartieCommune[] = [];
    for (let i = 0; i < count; i++) {
      const letter = String.fromCharCode(65 + startIndex + i); // A, B, C...
      newParties.push({
        id: crypto.randomUUID(),
        name: `${typeInfo?.label} ${letter}`,
        type
      });
    }
    setPartiesCommunes([...updatedParties, ...newParties]);
  };

  const addPartiePrivative = (type: PartiePrivative['type']) => {
    const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === type);
    const existingOfType = partiesPrivatives.filter(p => p.type === type);
    
    let updatedParties = [...partiesPrivatives];
    
    // If this is the second item, rename the first one to add "1" or "A" suffix
    if (existingOfType.length === 1) {
      updatedParties = updatedParties.map(p => {
        if (p.id === existingOfType[0].id) {
          const newNumero = type === 'appartement' ? '1' : undefined;
          const newName = type === 'appartement' ? `${typeInfo?.label} 1` : `${typeInfo?.label} A`;
          return { ...p, name: newName, numero: newNumero };
        }
        return p;
      });
    }
    
    // Determine suffix for new item
    const existingCount = existingOfType.length;
    const newNumero = type === 'appartement' ? `${existingCount + 1}` : undefined;
    const newSuffix = existingCount === 0 ? '' : (type === 'appartement' ? ` ${existingCount + 1}` : ` ${String.fromCharCode(65 + existingCount)}`);
    
    const newPartie: PartiePrivative = {
      id: crypto.randomUUID(),
      name: `${typeInfo?.label}${newSuffix}`,
      type,
      numero: newNumero
    };
    
    setPartiesPrivatives([...updatedParties, newPartie]);
    // Keep panel open for multiple clicks
  };

  const removePartieCommune = (id: string) => {
    const toRemove = partiesCommunes.find(p => p.id === id);
    const newParties = partiesCommunes.filter(p => p.id !== id);
    
    // If removing leaves only one of this type, remove its suffix
    if (toRemove) {
      const remainingOfType = newParties.filter(p => p.type === toRemove.type);
      if (remainingOfType.length === 1) {
        const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === toRemove.type);
        setPartiesCommunes(newParties.map(p => {
          if (p.id === remainingOfType[0].id) {
            return { ...p, name: typeInfo?.label || p.name };
          }
          return p;
        }));
        return;
      }
    }
    
    setPartiesCommunes(newParties);
  };

  const removePartiePrivative = (id: string) => {
    setPartiesPrivatives(partiesPrivatives.filter(p => p.id !== id));
  };

  const updatePartieCommuneName = (id: string, name: string) => {
    setPartiesCommunes(partiesCommunes.map(p => 
      p.id === id ? { ...p, name } : p
    ));
  };

  const updatePartiePrivative = (id: string, updates: Partial<PartiePrivative>) => {
    setPartiesPrivatives(partiesPrivatives.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const addMultipleApartments = (count: number) => {
    const existingApts = partiesPrivatives.filter(p => p.type === 'appartement').length;
    const newApts: PartiePrivative[] = [];
    for (let i = 0; i < count; i++) {
      newApts.push({
        id: crypto.randomUUID(),
        name: 'Appartement',
        type: 'appartement',
        numero: `${existingApts + i + 1}`
      });
    }
    setPartiesPrivatives([...partiesPrivatives, ...newApts]);
  };

  const handleCreateProject = async () => {
    if (!address.trim()) {
      toast({
        title: isFrench ? "Adresse requise" : "Address required",
        description: isFrench ? "Veuillez saisir l'adresse du bien" : "Please enter the property address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Générer un nom pour le projet
      const projectName = address 
        ? `${address}${city ? `, ${city}` : ''}${postalCode ? ` ${postalCode}` : ''}`
        : `${propertyType === 'building' ? 'Immeuble' : propertyType === 'house' ? 'Maison' : 'Appartement'} - ${new Date().toLocaleDateString()}`;

      const { data, error } = await supabase
        .from('edl_projects')
        .insert({
          user_id: user.id,
          name: projectName,
          property_type: propertyType,
          address,
          postal_code: postalCode || null,
          city: city || null,
          number_of_units: partiesPrivatives.filter(p => p.type === 'appartement').length || null,
          has_parking: hasParking || partiesPrivatives.some(p => p.type === 'parking'),
          has_box: hasBox || partiesPrivatives.some(p => p.type === 'box'),
          has_garage: hasGarage,
          additional_info: additionalInfo || null,
          project_documents: projectDocuments,
        })
        .select()
        .single();

      if (error) {
        console.error('[ProjectDialog] Project creation error:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Create building composition and parts for buildings
      if (propertyType === 'building' && data) {
        // Create property composition
        const { error: compError } = await supabase
          .from('property_composition')
          .insert({
            project_id: data.id,
            type_bien: 'immeuble',
            nb_apartments: partiesPrivatives.filter(p => p.type === 'appartement').length,
            nb_parking_spots: partiesPrivatives.filter(p => p.type === 'parking').length,
            nb_boxes: partiesPrivatives.filter(p => p.type === 'box').length,
            nb_caves: partiesPrivatives.filter(p => p.type === 'cave').length,
            nb_gardens: partiesPrivatives.filter(p => p.type === 'jardin').length,
          });

        if (compError) console.error('Composition error:', compError);

        // Create Partie Commune
        if (partiesCommunes.length > 0) {
          const { data: communePart } = await supabase
            .from('property_parts')
            .insert({
              project_id: data.id,
              part_type: 'commune',
              name: 'Parties Communes',
              order_index: 0
            })
            .select()
            .single();

          if (communePart) {
            for (let i = 0; i < partiesCommunes.length; i++) {
              const partie = partiesCommunes[i];
              await supabase
                .from('property_locations')
                .insert({
                  project_id: data.id,
                  part_id: communePart.id,
                  name: partie.name,
                  location_type: partie.type,
                  order_index: i
                });
            }
          }
        }

        // Create Partie Privative
        if (partiesPrivatives.length > 0) {
          const { data: privativePart } = await supabase
            .from('property_parts')
            .insert({
              project_id: data.id,
              part_type: 'privative',
              name: 'Parties Privatives',
              order_index: 1
            })
            .select()
            .single();

          if (privativePart) {
            for (let i = 0; i < partiesPrivatives.length; i++) {
              const partie = partiesPrivatives[i];
              const locationName = partie.type === 'appartement' && partie.numero 
                ? `Appartement ${partie.numero}` 
                : partie.name;
              
              await supabase
                .from('property_locations')
                .insert({
                  project_id: data.id,
                  part_id: privativePart.id,
                  name: locationName,
                  location_type: partie.type,
                  numero_lot: partie.numero,
                  order_index: i
                });
            }
          }
        }
      }

      // Track project creation count for potential achievements (without hooks)
      const { data: allProjects } = await supabase
        .from('edl_projects')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);
      
      console.log('Project created successfully. Total projects:', allProjects?.length || 1);

      toast({
        title: "✅ Projet créé",
        description: isFrench ? "Passage à la description des travaux..." : "Moving to work description...",
      });

      onOpenChange(false);
      
      setTimeout(() => {
        onProjectSelected(data.id);
      }, 100);
      
      resetForm();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le projet",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSelectProject = () => {
    if (selectedProjectId) {
      toast({
        title: "✅ Projet sélectionné",
        description: isFrench ? "Passage à la description des travaux..." : "Moving to work description...",
      });
      
      onOpenChange(false);
      
      setTimeout(() => {
        onProjectSelected(selectedProjectId);
      }, 100);
    }
  };

  const resetForm = () => {
    setPropertyType("building");
    setAddress("");
    setPostalCode("");
    setCity("");
    setHasParking(false);
    setHasBox(false);
    setHasGarage(false);
    setAdditionalInfo("");
    setProjectDocuments([]);
    setPartiesCommunes([]);
    setPartiesPrivatives([]);
    setCompositionMode('communes');
    setCurrentStep(1);
    setIsCreating(false);
  };

  const propertyTypeLabels: Record<string, string> = {
    building: isFrench ? 'Immeuble' : 'Building',
    house: isFrench ? 'Maison' : 'House',
    apartment: isFrench ? 'Appartement' : 'Apartment',
    commercial: isFrench ? 'Local commercial' : 'Commercial property',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0" hideCloseButton={isCreating}>
        {!isCreating ? (
          // Project Selection View
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl">
                {isFrench ? 'Sélectionner ou créer un projet' : 'Select or create a project'}
              </DialogTitle>
              <DialogDescription>
                {isFrench 
                  ? 'Choisissez un projet existant ou créez-en un nouveau'
                  : 'Choose an existing project or create a new one'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>{isFrench ? 'Projets existants' : 'Existing projects'}</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isFrench ? 'Sélectionner un projet' : 'Select a project'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border z-50">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>{propertyTypeLabels[project.property_type]} - {project.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSelectProject} disabled={!selectedProjectId} className="w-full">
                    {isFrench ? 'Continuer avec ce projet' : 'Continue with this project'}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {isFrench ? 'Ou' : 'Or'}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
              
              <Button onClick={() => setIsCreating(true)} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isFrench ? 'Créer un nouveau projet' : 'Create a new project'}
              </Button>
            </div>
          </div>
        ) : (
          // Wizard View
          <>
            {/* Progress Header - Apple Style */}
            <div className="px-6 py-4 border-b bg-card/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{isFrench ? 'Nouveau projet' : 'New project'}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">en {totalSteps} étapes</p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetForm(); }}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Progress Steps */}
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div key={index} className="flex items-center flex-1">
                    <button
                      type="button"
                      onClick={() => handleStepClick(index + 1)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95",
                        index + 1 === currentStep 
                          ? "bg-primary text-primary-foreground scale-110" 
                          : index + 1 < currentStep 
                            ? "bg-green-500 text-white hover:bg-green-600" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {index + 1 < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                    </button>
                    {index < totalSteps - 1 && (
                      <div className={cn(
                        "flex-1 h-1 rounded-full mx-2 transition-all",
                        index + 1 < currentStep ? "bg-green-500" : "bg-muted"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Step Label */}
              <p className="text-sm text-muted-foreground mt-3">
                {currentStep === 1 && (isFrench ? "Type de bien" : "Property type")}
                {currentStep === 2 && (isFrench ? "Localisation" : "Location")}
                {currentStep === 3 && propertyType === 'building' && (isFrench ? "Composition du bien" : "Property composition")}
                {currentStep === 3 && propertyType !== 'building' && (isFrench ? "Options du bien" : "Property options")}
                {currentStep === 4 && (isFrench ? "Documents" : "Documents")}
                {currentStep === 5 && (isFrench ? "Récapitulatif" : "Summary")}
              </p>
            </div>

            {/* Step Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <div className="p-6 pb-8">
                {/* Step 1: Property Type */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1 mb-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 1</p>
                      <p className="text-muted-foreground">
                        {isFrench ? 'Quel type de bien allez-vous inspecter ?' : 'What type of property will you inspect?'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {PROPERTY_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = propertyType === type.value;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setPropertyType(type.value)}
                            className={cn(
                              "apple-button group",
                              isSelected && "selected"
                            )}
                          >
                            <div className={cn(
                              "apple-button-icon",
                              isSelected && "!bg-primary/20"
                            )}>
                              <IconComponent className={cn(
                                "w-7 h-7 transition-colors",
                                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                              )} />
                            </div>
                            <span className={cn(
                              "text-sm font-semibold transition-colors",
                              isSelected ? "text-primary" : "text-foreground"
                            )}>
                              {isFrench ? type.label : type.labelEn}
                            </span>
                            {isSelected && (
                              <div className="absolute top-3 right-3">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-4 h-4 text-primary-foreground" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1 mb-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 2</p>
                      <p className="text-muted-foreground">
                        {isFrench ? 'Où se situe le bien ?' : 'Where is the property located?'}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" />
                          {isFrench ? 'Adresse *' : 'Address *'}
                        </Label>
                        <AddressAutocomplete
                          value={address}
                          onChange={setAddress}
                          onAddressSelect={(suggestion: AddressSuggestion) => {
                            setAddress(suggestion.label);
                            setPostalCode(suggestion.postcode);
                            setCity(suggestion.city);
                            setLatitude(suggestion.lat);
                            setLongitude(suggestion.lon);
                            setCodeInsee(suggestion.citycode);
                          }}
                          placeholder={isFrench ? "Commencez à taper une adresse..." : "Start typing an address..."}
                          isFrench={isFrench}
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {isFrench 
                            ? "💡 Tapez au moins 3 caractères pour voir les suggestions" 
                            : "💡 Type at least 3 characters to see suggestions"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-2 block">{isFrench ? 'Code postal' : 'Postal code'}</Label>
                          <Input
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="75001"
                            className="h-12"
                            readOnly={false}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">{isFrench ? 'Ville' : 'City'}</Label>
                          <Input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Paris"
                            className="h-12"
                            readOnly={false}
                          />
                        </div>
                      </div>

                      {/* Location Preview - Only show when we have coordinates */}
                      {latitude && longitude && (
                        <div className="pt-4">
                          <PropertyLocationPreview
                            latitude={latitude}
                            longitude={longitude}
                            address={address.split(',')[0]}
                            postalCode={postalCode}
                            city={city}
                            codeInsee={codeInsee}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Composition (for Building) */}
                {currentStep === 3 && propertyType === 'building' && (
                  <div className="space-y-5">
                    <div className="space-y-1 mb-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 3</p>
                      <p className="text-muted-foreground">
                        {isFrench ? 'Définissez la structure de l\'immeuble' : 'Define the building structure'}
                      </p>
                    </div>

                    {/* Mode Switch Toggle - Apple Style */}
                    <div className="flex bg-muted rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => { setShowAddCommune(false); setShowAddPrivative(false); setCompositionMode('communes'); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                          compositionMode === 'communes' 
                            ? "bg-blue-500 text-white shadow-md" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        <span>{isFrench ? 'Communes' : 'Common'}</span>
                        {partiesCommunes.length > 0 && (
                          <Badge variant="secondary" className={cn(
                            "ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full",
                            compositionMode === 'communes'
                              ? "bg-white/20 text-white"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          )}>
                            {partiesCommunes.length}
                          </Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddCommune(false); setShowAddPrivative(false); setCompositionMode('privatives'); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                          compositionMode === 'privatives' 
                            ? "bg-blue-500 text-white shadow-md" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Home className="w-4 h-4" />
                        <span>{isFrench ? 'Privatives' : 'Private'}</span>
                        {partiesPrivatives.length > 0 && (
                          <Badge variant="secondary" className={cn(
                            "ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full",
                            compositionMode === 'privatives'
                              ? "bg-white/20 text-white"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          )}>
                            {partiesPrivatives.length}
                          </Badge>
                        )}
                      </button>
                    </div>

                    {/* Parties Communes */}
                    {compositionMode === 'communes' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          {isFrench ? 'Détails des parties communes' : 'Common areas details'}
                        </h3>
                        <Button 
                          size="icon" 
                          className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                          onClick={() => setShowAddCommune(true)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Sheet popup for adding communes */}
                      <Sheet open={showAddCommune} onOpenChange={setShowAddCommune}>
                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
                          {/* Handle bar Apple style */}
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                          </div>
                          
                          <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
                            <SheetTitle className="flex items-center gap-3 text-lg">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              {isFrench ? 'Ajouter une partie commune' : 'Add common area'}
                            </SheetTitle>
                            <p className="text-sm text-muted-foreground mt-1">{isFrench ? 'Sélectionnez un type' : 'Select a type'}</p>
                          </SheetHeader>
                          
                          <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-4 gap-4">
                              {PARTIES_COMMUNES_TYPES.map((type, index) => {
                                const count = partiesCommunes.filter(p => p.type === type.value).length;
                                const colors = [
                                  'bg-gradient-to-br from-blue-400 to-blue-600',
                                  'bg-gradient-to-br from-purple-400 to-purple-600',
                                  'bg-gradient-to-br from-indigo-400 to-indigo-600',
                                  'bg-gradient-to-br from-cyan-400 to-cyan-600',
                                  'bg-gradient-to-br from-teal-400 to-teal-600',
                                  'bg-gradient-to-br from-emerald-400 to-emerald-600',
                                  'bg-gradient-to-br from-green-400 to-green-600',
                                  'bg-gradient-to-br from-sky-400 to-sky-600',
                                  'bg-gradient-to-br from-violet-400 to-violet-600',
                                  'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
                                  'bg-gradient-to-br from-slate-400 to-slate-600',
                                ];
                                return (
                                  <button
                                    key={type.value}
                                    type="button"
                                    className="relative flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-accent/30 transition-all active:scale-95"
                                    onClick={() => addPartieCommune(type.value)}
                                  >
                                    <div className={`w-16 h-16 rounded-[18px] ${colors[index % colors.length]} flex items-center justify-center shadow-lg`}>
                                      <type.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-[11px] font-medium text-center leading-tight line-clamp-2">{type.label}</span>
                                    {count > 0 && (
                                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs bg-red-500 text-white rounded-full shadow">
                                        {count}
                                      </Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="p-4 border-t bg-background flex-shrink-0">
                            <Button 
                              className="w-full h-12 rounded-xl" 
                              variant="outline"
                              onClick={() => setShowAddCommune(false)}
                            >
                              {isFrench ? 'Fermer' : 'Close'}
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {partiesCommunes.length > 0 ? (
                        <div className="space-y-2">
                          {partiesCommunes.map((partie) => {
                            const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === partie.type);
                            const isAutreType = typeInfo && 'isPlus' in typeInfo && typeInfo.isPlus;
                            const isEditing = editingCommune === partie.id || (isAutreType && !partie.name);
                            return (
                            <Card key={partie.id} className="p-2">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                {isEditing ? (
                                  <Input
                                    value={partie.name}
                                    onChange={(e) => updatePartieCommuneName(partie.id, e.target.value)}
                                    onBlur={() => setEditingCommune(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingCommune(null)}
                                    autoFocus
                                    placeholder="Nom de la partie commune"
                                    className="flex-1 h-8"
                                  />
                                ) : (
                                  <span className="flex-1 font-medium text-sm">{partie.name || 'Autre'}</span>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCommune(partie.id)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removePartieCommune(partie.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-lg border-dashed">
                          {isFrench ? 'Aucune partie commune ajoutée' : 'No common areas added'}
                        </p>
                      )}
                    </div>
                    )}

                    {/* Parties Privatives */}
                    {compositionMode === 'privatives' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Home className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          {isFrench ? 'Détails des parties privatives' : 'Private areas details'}
                        </h3>
                        <Button 
                          size="icon" 
                          className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                          onClick={() => setShowAddPrivative(true)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Sheet popup for adding privatives */}
                      <Sheet open={showAddPrivative} onOpenChange={setShowAddPrivative}>
                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
                          {/* Handle bar Apple style */}
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                          </div>
                          
                          <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
                            <SheetTitle className="flex items-center gap-3 text-lg">
                              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <Home className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              {isFrench ? 'Ajouter une partie privative' : 'Add private area'}
                            </SheetTitle>
                            <p className="text-sm text-muted-foreground mt-1">{isFrench ? 'Sélectionnez un type' : 'Select a type'}</p>
                          </SheetHeader>
                          
                          <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-4 gap-4">
                              {PARTIES_PRIVATIVES_TYPES.map((type, index) => {
                                const count = partiesPrivatives.filter(p => p.type === type.value).length;
                                const colors = [
                                  'bg-gradient-to-br from-orange-400 to-orange-600',
                                  'bg-gradient-to-br from-amber-400 to-amber-600',
                                  'bg-gradient-to-br from-rose-400 to-rose-600',
                                  'bg-gradient-to-br from-pink-400 to-pink-600',
                                  'bg-gradient-to-br from-lime-400 to-lime-600',
                                ];
                                return (
                                  <button
                                    key={type.value}
                                    type="button"
                                    className="relative flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-accent/30 transition-all active:scale-95"
                                    onClick={() => addPartiePrivative(type.value)}
                                  >
                                    <div className={`w-16 h-16 rounded-[18px] ${colors[index % colors.length]} flex items-center justify-center shadow-lg`}>
                                      <span className="text-3xl">{type.emoji}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-center leading-tight line-clamp-2">{type.label}</span>
                                    {count > 0 && (
                                      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs bg-red-500 text-white rounded-full shadow">
                                        {count}
                                      </Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="p-4 border-t bg-background flex-shrink-0">
                            <Button 
                              className="w-full h-12 rounded-xl" 
                              variant="outline"
                              onClick={() => setShowAddPrivative(false)}
                            >
                              {isFrench ? 'Fermer' : 'Close'}
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {partiesPrivatives.length > 0 ? (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                          {partiesPrivatives.map((partie) => {
                            const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === partie.type);
                            const isAppartement = partie.type === 'appartement';
                            const typeAppartLabel = isAppartement && partie.typeAppartement 
                              ? TYPES_APPARTEMENT.find(t => t.value === partie.typeAppartement)?.label 
                              : null;
                            const piecesCount = isAppartement && partie.pieces ? partie.pieces.length : 0;
                            return (
                              <Card key={partie.id} className="p-2">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                  <span className="text-lg">{typeInfo?.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm">
                                      {isAppartement && partie.numero 
                                        ? `Appt ${partie.numero}`
                                        : partie.name}
                                    </span>
                                    {isAppartement && typeAppartLabel && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({typeAppartLabel})
                                      </span>
                                    )}
                                    {isAppartement && (partie.nbChambres || partie.nbSallesDeBain || piecesCount > 0) && (
                                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                                        {partie.nbChambres && (
                                          <span className="flex items-center gap-0.5">
                                            <BedDouble className="w-2.5 h-2.5" /> {partie.nbChambres}
                                          </span>
                                        )}
                                        {partie.nbSallesDeBain && (
                                          <span className="flex items-center gap-0.5">
                                            <Bath className="w-2.5 h-2.5" /> {partie.nbSallesDeBain}
                                          </span>
                                        )}
                                        {partie.surfaceM2 && (
                                          <span className="flex items-center gap-0.5">
                                            <Square className="w-2.5 h-2.5" /> {partie.surfaceM2}m²
                                          </span>
                                        )}
                                        {piecesCount > 0 && (
                                          <span className="flex items-center gap-0.5 text-primary">
                                            📍 {piecesCount}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7" 
                                    onClick={() => isAppartement 
                                      ? setEditingAppartementDetails(partie.id)
                                      : setEditingPrivative(partie.id)
                                    }
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removePartiePrivative(partie.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-lg border-dashed">
                          {isFrench ? 'Aucune partie privative ajoutée' : 'No private areas added'}
                        </p>
                      )}

                      {/* Sheet for editing apartment details */}
                      <Sheet open={!!editingAppartementDetails} onOpenChange={(open) => !open && setEditingAppartementDetails(null)}>
                        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col">
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                          </div>
                          
                          <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
                            <SheetTitle className="flex items-center gap-3 text-lg">
                              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <span className="text-xl">🏠</span>
                              </div>
                              {isFrench ? 'Détails de l\'appartement' : 'Apartment details'}
                            </SheetTitle>
                          </SheetHeader>
                          
                          {editingAppartementDetails && (() => {
                            const appt = partiesPrivatives.find(p => p.id === editingAppartementDetails);
                            if (!appt) return null;
                            
                            return (
                              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                                {/* Numéro et Type */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="mb-1 block text-sm">{isFrench ? 'Numéro' : 'Number'}</Label>
                                    <Input
                                      value={appt.numero || ''}
                                      onChange={(e) => updatePartiePrivative(appt.id, { numero: e.target.value })}
                                      placeholder="1, 2A, ..."
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1 block text-sm">Type</Label>
                                    <Select
                                      value={appt.typeAppartement || ''}
                                      onValueChange={(value) => updatePartiePrivative(appt.id, { typeAppartement: value })}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TYPES_APPARTEMENT.map((type) => (
                                          <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Chambres, SdB, Surface, Étage */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="mb-1 block text-sm">{isFrench ? 'Nb chambres' : 'Bedrooms'}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={appt.nbChambres || ''}
                                      onChange={(e) => updatePartiePrivative(appt.id, { nbChambres: parseInt(e.target.value) || undefined })}
                                      placeholder="0"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1 block text-sm">{isFrench ? 'Nb SdB' : 'Bathrooms'}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={appt.nbSallesDeBain || ''}
                                      onChange={(e) => updatePartiePrivative(appt.id, { nbSallesDeBain: parseInt(e.target.value) || undefined })}
                                      placeholder="0"
                                      className="h-9"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="mb-1 block text-sm">Surface (m²)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={appt.surfaceM2 || ''}
                                      onChange={(e) => updatePartiePrivative(appt.id, { surfaceM2: parseFloat(e.target.value) || undefined })}
                                      placeholder="45"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1 block text-sm">{isFrench ? 'Étage' : 'Floor'}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={appt.etage || ''}
                                      onChange={(e) => updatePartiePrivative(appt.id, { etage: parseInt(e.target.value) || undefined })}
                                      placeholder="0"
                                      className="h-9"
                                    />
                                  </div>
                                </div>

                                {/* Equipements extérieurs */}
                                <div>
                                  <Label className="mb-2 block text-sm font-medium">{isFrench ? 'Équipements' : 'Amenities'}</Label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <label className="flex items-center gap-1.5 p-2 border rounded-xl cursor-pointer hover:bg-accent/50 text-xs">
                                      <Checkbox
                                        checked={appt.hasBalcon || false}
                                        onCheckedChange={(checked) => updatePartiePrivative(appt.id, { hasBalcon: !!checked })}
                                      />
                                      <span>Balcon</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 p-2 border rounded-xl cursor-pointer hover:bg-accent/50 text-xs">
                                      <Checkbox
                                        checked={appt.hasTerrasse || false}
                                        onCheckedChange={(checked) => updatePartiePrivative(appt.id, { hasTerrasse: !!checked })}
                                      />
                                      <span>Terrasse</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 p-2 border rounded-xl cursor-pointer hover:bg-accent/50 text-xs">
                                      <Checkbox
                                        checked={appt.hasJardin || false}
                                        onCheckedChange={(checked) => updatePartiePrivative(appt.id, { hasJardin: !!checked })}
                                      />
                                      <span>Jardin</span>
                                    </label>
                                  </div>
                                </div>

                                {/* Annexes associées */}
                                <div>
                                  <Label className="mb-2 block text-sm font-medium">{isFrench ? 'Annexes associées' : 'Associated spaces'}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="mb-1 block text-xs text-muted-foreground">Parking</Label>
                                      <Input
                                        value={appt.parkingAssocie || ''}
                                        onChange={(e) => updatePartiePrivative(appt.id, { parkingAssocie: e.target.value })}
                                        placeholder="P12"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-1 block text-xs text-muted-foreground">Box/Garage</Label>
                                      <Input
                                        value={appt.boxAssocie || ''}
                                        onChange={(e) => updatePartiePrivative(appt.id, { boxAssocie: e.target.value })}
                                        placeholder="Box 5"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-1 block text-xs text-muted-foreground">Cave</Label>
                                      <Input
                                        value={appt.caveAssociee || ''}
                                        onChange={(e) => updatePartiePrivative(appt.id, { caveAssociee: e.target.value })}
                                        placeholder="Cave C3"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-1 block text-xs text-muted-foreground">Cellier</Label>
                                      <Input
                                        value={appt.cellierAssocie || ''}
                                        onChange={(e) => updatePartiePrivative(appt.id, { cellierAssocie: e.target.value })}
                                        placeholder="Cellier 2"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Pièces de l'appartement */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-medium">{isFrench ? 'Pièces de l\'appartement' : 'Rooms'}</Label>
                                  </div>
                                  
                                  {/* Grid of all room types */}
                                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                                    {PIECES_APPARTEMENT_TYPES.map((pieceType) => {
                                      const existingOfType = (appt.pieces || []).filter(p => p.type === pieceType.value);
                                      const count = existingOfType.length;
                                      return (
                                        <button
                                          key={pieceType.value}
                                          type="button"
                                          className="relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-accent/50 transition-all active:scale-95 border border-border/50"
                                          onClick={() => {
                                            const pieces = appt.pieces || [];
                                            const newPiece: PieceAppartement = {
                                              id: crypto.randomUUID(),
                                              type: pieceType.value,
                                              name: count > 0 ? `${pieceType.label} ${count + 1}` : pieceType.label,
                                            };
                                            let updatedPieces = [...pieces];
                                            if (count === 1) {
                                              updatedPieces = updatedPieces.map(p => 
                                                p.type === pieceType.value 
                                                  ? { ...p, name: `${pieceType.label} 1` }
                                                  : p
                                              );
                                            }
                                            updatePartiePrivative(appt.id, { 
                                              pieces: [...updatedPieces, newPiece]
                                            });
                                          }}
                                        >
                                          {'isPlus' in pieceType && pieceType.isPlus ? (
                                            <Plus className="w-4 h-4 text-primary" />
                                          ) : (
                                            <span className="text-lg">{pieceType.emoji}</span>
                                          )}
                                          <span className="text-[8px] font-medium text-center leading-tight line-clamp-1">{pieceType.label}</span>
                                          {count > 0 && (
                                            <Badge className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 text-[8px] bg-primary text-primary-foreground rounded-full">
                                              {count}
                                            </Badge>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* List of added rooms */}
                                  {(appt.pieces || []).length > 0 && (
                                    <div className="space-y-2 border-t pt-3">
                                      <p className="text-xs text-muted-foreground">
                                        {appt.pieces?.length} {isFrench ? 'pièce' : 'room'}{(appt.pieces?.length || 0) > 1 ? 's' : ''} {isFrench ? 'définie' : 'defined'}{(appt.pieces?.length || 0) > 1 ? 's' : ''}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {(appt.pieces || []).map((piece) => {
                                          const pieceTypeData = PIECES_APPARTEMENT_TYPES.find(t => t.value === piece.type);
                                          const isEditing = editingPieceId === piece.id;
                                          return (
                                            <div 
                                              key={piece.id} 
                                              className="group flex items-center gap-1 pl-2 pr-1 py-1 bg-accent/50 rounded-full border transition-all hover:bg-accent text-xs"
                                            >
                                              {'isPlus' in (pieceTypeData || {}) && (pieceTypeData as any)?.isPlus ? (
                                                <Plus className="w-3 h-3 text-primary" />
                                              ) : (
                                                <span className="text-xs">{pieceTypeData?.emoji}</span>
                                              )}
                                              {isEditing ? (
                                                <Input
                                                  value={piece.name}
                                                  onChange={(e) => {
                                                    const pieces = appt.pieces || [];
                                                    updatePartiePrivative(appt.id, { 
                                                      pieces: pieces.map(p => p.id === piece.id ? { ...p, name: e.target.value } : p)
                                                    });
                                                  }}
                                                  onBlur={() => setEditingPieceId(null)}
                                                  onKeyDown={(e) => e.key === 'Enter' && setEditingPieceId(null)}
                                                  autoFocus
                                                  className="h-5 w-20 text-xs px-1.5 rounded-full"
                                                />
                                              ) : (
                                                <>
                                                  <span className="font-medium">{piece.name}</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditingPieceId(piece.id)}
                                                    className="w-5 h-5 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors"
                                                  >
                                                    <Edit2 className="w-2.5 h-2.5 text-muted-foreground" />
                                                  </button>
                                                </>
                                              )}
                                              <button
                                                type="button"
                                                className="w-5 h-5 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
                                                onClick={() => {
                                                  const pieces = appt.pieces || [];
                                                  const remaining = pieces.filter(p => p.id !== piece.id);
                                                  const pType = piece.type;
                                                  const remainingOfType = remaining.filter(p => p.type === pType);
                                                  let updatedPieces = remaining;
                                                  if (remainingOfType.length === 1) {
                                                    const typeInfo = PIECES_APPARTEMENT_TYPES.find(t => t.value === pType);
                                                    updatedPieces = remaining.map(p =>
                                                      p.id === remainingOfType[0].id
                                                        ? { ...p, name: typeInfo?.label || p.name }
                                                        : p
                                                    );
                                                  }
                                                  updatePartiePrivative(appt.id, { pieces: updatedPieces });
                                                }}
                                              >
                                                <X className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          
                          <div className="p-4 border-t bg-background flex-shrink-0">
                            <Button 
                              className="w-full h-11 rounded-xl" 
                              onClick={() => setEditingAppartementDetails(null)}
                            >
                              {isFrench ? 'Terminé' : 'Done'}
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {/* Summary */}
                      {(partiesCommunes.length > 0 || partiesPrivatives.length > 0) && (
                        <Card className="p-3 bg-muted/50 mt-3">
                          <h4 className="font-medium mb-2 text-sm">{isFrench ? 'Résumé' : 'Summary'}</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>PC : {partiesCommunes.length}</div>
                            <div>Appts : {partiesPrivatives.filter(p => p.type === 'appartement').length}</div>
                            <div>Parkings : {partiesPrivatives.filter(p => p.type === 'parking').length}</div>
                          </div>
                        </Card>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {/* Step 3: Options du bien (for non-building types) */}
                {currentStep === 3 && propertyType !== 'building' && (
                  <div className="space-y-4">
                    <div className="space-y-1 mb-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 3</p>
                      <p className="text-muted-foreground">
                        {isFrench ? 'Quels espaces sont associés au bien ?' : 'What spaces are associated with the property?'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <label className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        hasParking ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}>
                        <Checkbox
                          checked={hasParking}
                          onCheckedChange={(checked) => setHasParking(!!checked)}
                          className="w-5 h-5"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            hasParking ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Car className={cn("w-5 h-5", hasParking ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <span className="font-medium">{isFrench ? 'Place de parking' : 'Parking space'}</span>
                        </div>
                      </label>

                      <label className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        hasBox ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}>
                        <Checkbox
                          checked={hasBox}
                          onCheckedChange={(checked) => setHasBox(!!checked)}
                          className="w-5 h-5"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            hasBox ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Warehouse className={cn("w-5 h-5", hasBox ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <span className="font-medium">{isFrench ? 'Box / Garage fermé' : 'Box / Closed garage'}</span>
                        </div>
                      </label>

                      <label className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        hasGarage ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}>
                        <Checkbox
                          checked={hasGarage}
                          onCheckedChange={(checked) => setHasGarage(!!checked)}
                          className="w-5 h-5"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            hasGarage ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Warehouse className={cn("w-5 h-5", hasGarage ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <span className="font-medium">{isFrench ? 'Cave / Cellier' : 'Cellar / Storage'}</span>
                        </div>
                      </label>
                    </div>

                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {isFrench ? 'Ces options sont facultatives' : 'These options are optional'}
                    </p>
                  </div>
                )}

                {/* Step 4: Documents (for all types) */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-1 mb-4">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 4</p>
                      <p className="text-muted-foreground">
                        {isFrench ? 'Ajoutez des documents et informations' : 'Add documents and information'}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">
                        {isFrench ? 'Notes, détails, contexte...' : 'Notes, details, context...'}
                      </Label>
                      <Textarea
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder={isFrench ? "Ajoutez des informations utiles..." : "Add useful information..."}
                        rows={3}
                      />
                    </div>

                    <ProjectDocumentUploader
                      documents={projectDocuments}
                      onDocumentsChange={setProjectDocuments}
                    />
                  </div>
                )}

                {/* Step 5: Récapitulatif (for all types) */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="text-center pb-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Étape 5</p>
                      <h3 className="text-lg font-bold text-foreground">
                        {isFrench ? 'Récapitulatif' : 'Summary'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isFrench ? 'Vérifiez avant de créer votre EDL' : 'Review before creating your inspection'}
                      </p>
                    </div>

                    {/* Step 1 Summary - Property Type */}
                    <div 
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setCurrentStep(1)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {isFrench ? 'Étape 1 • Type de bien' : 'Step 1 • Property type'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(() => {
                            const typeInfo = PROPERTY_TYPES.find(t => t.value === propertyType);
                            const PropertyIcon = typeInfo?.icon || Building2;
                            return (
                              <>
                                <PropertyIcon className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground">
                                  {propertyTypeLabels[propertyType]}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Step 2 Summary - Location */}
                    <div 
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setCurrentStep(2)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {isFrench ? 'Étape 2 • Localisation' : 'Step 2 • Location'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <div className="truncate">
                            <span className="font-semibold text-foreground">{address}</span>
                            {(postalCode || city) && (
                              <span className="text-muted-foreground text-sm ml-1">
                                • {postalCode} {city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Step 3 Summary - Composition or Options */}
                    <div 
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setCurrentStep(3)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {isFrench 
                            ? `Étape 3 • ${propertyType === 'building' ? 'Composition' : 'Options'}` 
                            : `Step 3 • ${propertyType === 'building' ? 'Composition' : 'Options'}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Layers className="w-4 h-4 text-purple-500" />
                          {propertyType === 'building' ? (
                            <>
                              {partiesCommunes.length > 0 && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  <Users className="w-3 h-3 mr-1" />
                                  {partiesCommunes.length} {isFrench ? 'PC' : 'CA'}
                                </Badge>
                              )}
                              {partiesPrivatives.length > 0 && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                  <Home className="w-3 h-3 mr-1" />
                                  {partiesPrivatives.length} {isFrench ? 'PP' : 'PA'}
                                </Badge>
                              )}
                              {partiesCommunes.length === 0 && partiesPrivatives.length === 0 && (
                                <span className="text-sm text-muted-foreground italic">
                                  {isFrench ? 'Non défini' : 'Not defined'}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {hasParking && (
                                <Badge variant="secondary" className="text-xs">
                                  <Car className="w-3 h-3 mr-1" />
                                  Parking
                                </Badge>
                              )}
                              {hasBox && (
                                <Badge variant="secondary" className="text-xs">
                                  <Warehouse className="w-3 h-3 mr-1" />
                                  Box
                                </Badge>
                              )}
                              {hasGarage && (
                                <Badge variant="secondary" className="text-xs">
                                  <Warehouse className="w-3 h-3 mr-1" />
                                  Cave
                                </Badge>
                              )}
                              {!hasParking && !hasBox && !hasGarage && (
                                <span className="text-sm text-muted-foreground italic">
                                  {isFrench ? 'Aucune option' : 'No options'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Step 4 Summary - Documents */}
                    <div 
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setCurrentStep(4)}
                    >
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {isFrench ? 'Étape 4 • Documents' : 'Step 4 • Documents'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Edit2 className="w-4 h-4 text-amber-500" />
                          {projectDocuments.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {projectDocuments.length} {isFrench ? 'document(s)' : 'document(s)'}
                            </Badge>
                          )}
                          {additionalInfo ? (
                            <span className="text-sm text-foreground truncate max-w-[150px]">
                              {additionalInfo.substring(0, 30)}{additionalInfo.length > 30 ? '...' : ''}
                            </span>
                          ) : projectDocuments.length === 0 ? (
                            <span className="text-sm text-muted-foreground italic">
                              {isFrench ? 'Aucun document' : 'No documents'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Ready to Create Banner */}
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground">
                            {isFrench ? 'Prêt à créer votre EDL' : 'Ready to create your inspection'}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isFrench 
                              ? 'Cliquez sur "Créer" pour démarrer votre état des lieux' 
                              : 'Click "Create" to start your property inspection'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="px-6 py-4 border-t bg-card/50 flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {isFrench ? 'Retour' : 'Back'}
              </Button>
              
              <Button 
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isLoading ? (isFrench ? 'Création...' : 'Creating...') 
                  : currentStep === totalSteps 
                    ? (isFrench ? 'Créer' : 'Create')
                    : (isFrench ? 'Suivant' : 'Next')}
                {!isLoading && currentStep < totalSteps && <ChevronRight className="w-4 h-4 ml-1" />}
                {!isLoading && currentStep === totalSteps && <Check className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
