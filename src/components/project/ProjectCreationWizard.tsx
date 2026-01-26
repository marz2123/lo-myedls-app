import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, Home, Building, Store, MapPin, Plus, Trash2, 
  ChevronRight, ChevronLeft, Check, GripVertical, Edit2,
  Layers, Users, Car, Warehouse, TreePine, Trees, DoorOpen, X,
  BedDouble, Bath, Square, ArrowUpDown, Trash, Bike, Flame, 
  Droplets, Box, Sun, Boxes, FileText, Upload, Loader2, FileCheck,
  Globe, Search, CheckCircle2, RefreshCw, MoveVertical, Waypoints, 
  HomeIcon as HouseIcon, Triangle, Archive, Wrench, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFrenchAddressSearch, AddressSuggestion } from '@/hooks/useFrenchAddressSearch';
import { Address360Section } from './Address360Section';
import { TechnicalCharacteristicsSheet, type TechnicalCharacteristics } from './TechnicalCharacteristicsSheet';

interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'plan', label: 'Plans', icon: FileText },
  { value: 'diagnostic', label: 'Diagnostics', icon: FileCheck },
  { value: 'bet', label: 'Rapport BET', icon: FileCheck },
  { value: 'preconisation', label: 'Préconisations', icon: FileCheck },
  { value: 'permis', label: 'Permis', icon: FileCheck },
  { value: 'arrete', label: 'Arrêtés de péril', icon: FileCheck },
  { value: 'autres', label: 'Autres', icon: FileText },
];

interface ProjectCreationWizardProps {
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}

type PropertyType = 'immeuble' | 'maison' | 'appartement' | 'commerce';

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
  typeAppartement?: string;
  nbChambres?: number;
  nbSallesDeBain?: number;
  hasBalcon?: boolean;
  hasTerrasse?: boolean;
  hasJardin?: boolean;
  surfaceM2?: number;
  etage?: number;
  parkingAssocie?: string;
  boxAssocie?: string;
  caveAssociee?: string;
  cellierAssocie?: string;
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

const PROPERTY_TYPES = [
  { value: 'immeuble' as PropertyType, label: 'Immeuble', icon: Building2, emoji: '🏢' },
  { value: 'maison' as PropertyType, label: 'Maison', icon: Home, emoji: '🏠' },
  { value: 'appartement' as PropertyType, label: 'Appartement', icon: Building, emoji: '🏠' },
  { value: 'commerce' as PropertyType, label: 'Local commercial', icon: Store, emoji: '🏪' },
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
  { value: 'appartement' as const, label: 'Appartement', icon: Building, emoji: '🏠' },
  { value: 'local_commercial' as const, label: 'Local commercial', icon: Store, emoji: '🏪' },
  { value: 'plateau' as const, label: 'Plateau à aménager', icon: Square, emoji: '📐' },
  { value: 'parking' as const, label: 'Place de parking', icon: Car, emoji: '🅿️' },
  { value: 'box' as const, label: 'Box / Garage', icon: Warehouse, emoji: '🚗' },
  { value: 'cave' as const, label: 'Cave', icon: Warehouse, emoji: '🪨' },
  { value: 'jardin' as const, label: 'Jardin privatif', icon: TreePine, emoji: '🌳' },
  { value: 'combles' as const, label: 'Combles à aménager', icon: Home, emoji: '🏚️' },
];

export const ProjectCreationWizard: React.FC<ProjectCreationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Property type
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  
  // Step 2: Location
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [addressLat, setAddressLat] = useState<number | undefined>();
  const [addressLon, setAddressLon] = useState<number | undefined>();
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Address autocomplete
  const { suggestions, isLoading: isSearchingAddress, searchAddresses, clearSuggestions } = useFrenchAddressSearch();
  
  // Step 3: Address 360 (auto-enriched)
  const [address360Refreshing, setAddress360Refreshing] = useState(false);
  const [address360RefreshFn, setAddress360RefreshFn] = useState<(() => void) | null>(null);
  
  // Step 4: Composition (for Immeuble)
  const [partiesCommunes, setPartiesCommunes] = useState<PartieCommune[]>([]);
  const [partiesPrivatives, setPartiesPrivatives] = useState<PartiePrivative[]>([]);
  const [showAddCommune, setShowAddCommune] = useState(false);
  const [showAddPrivative, setShowAddPrivative] = useState(false);
  const [editingCommune, setEditingCommune] = useState<string | null>(null);
  const [editingPrivative, setEditingPrivative] = useState<string | null>(null);
  const [editingAppartementDetails, setEditingAppartementDetails] = useState<string | null>(null);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [compositionMode, setCompositionMode] = useState<'communes' | 'privatives'>('communes');
  
  // Step 4: Technical Characteristics (for Immeuble)
  const [showTechnicalCharacteristics, setShowTechnicalCharacteristics] = useState(false);
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristics>({
    arrivals: {
      coldWater: { enabled: false },
      electricity: { enabled: false },
      gas: { enabled: false },
      fuel: { enabled: false },
      fiber: { enabled: false },
      phoneDsl: { enabled: false },
    },
    evacuations: {
      wasteWater: { enabled: false },
      rainWater: { enabled: false },
      greyWater: { enabled: false },
      vmc: { enabled: false },
      chimney: { enabled: false },
      smokeExtraction: { enabled: false },
    },
    collectiveEquipment: {
      antennas: { enabled: false },
      mailboxes: { enabled: false },
      electricalRoom: { enabled: false },
      gasRoom: { enabled: false },
      collectiveMeters: { water: false, electricity: false, gas: false, heating: false },
      elevator: { enabled: false },
    },
    perimeterDimensions: {
      facadeCount: 1,
      insulatedWalls: false,
      sharedWalls: false,
      exposures: { north: false, south: false, east: false, west: false },
    },
  });
  
  // Step 4: Composition for non-immeuble (simplified pieces)
  const [simplePieces, setSimplePieces] = useState<PieceAppartement[]>([]);
  const [showAddSimplePiece, setShowAddSimplePiece] = useState(false);
  
  // Step 5: Additional info & Documents
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Always 6 steps for all property types
  const totalSteps = 6;
  
  // Handle address input change
  const handleAddressChange = (value: string) => {
    setAddress(value);
    setIsAddressVerified(false);
    if (value.length >= 3) {
      searchAddresses(value);
      setShowSuggestions(true);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  };

  // Handle address selection
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.label.split(',')[0] || suggestion.street || suggestion.label);
    setPostalCode(suggestion.postcode);
    setCity(suggestion.city);
    setAddressLat(suggestion.lat);
    setAddressLon(suggestion.lon);
    setIsAddressVerified(true);
    setShowSuggestions(false);
    clearSuggestions();
  };
  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return propertyType !== null;
      case 2: return address.trim() !== '' && isAddressVerified;
      case 3: return isAddressVerified; // Address 360 - just need verified address
      case 4: 
        if (propertyType === 'immeuble') {
          return true; // Composition is optional
        }
        return true; // Documents step for non-immeuble
      case 5:
        if (propertyType === 'immeuble') {
          return true; // Documents step
        }
        return true; // Recap step for non-immeuble
      case 6: return true; // Recap for immeuble
      default: return true;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return propertyType !== null;
      case 2: return address.trim() !== '';
      case 3: 
        if (propertyType === 'immeuble') {
          return true; // Composition optional
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

  const getStepRequirementMessage = (step: number): string => {
    switch (step) {
      case 1: return "Veuillez d'abord sélectionner le type de bien";
      case 2: return "Veuillez d'abord renseigner et valider l'adresse";
      case 3: return "Veuillez d'abord consulter les informations Adresse 360°";
      case 4: return "Veuillez d'abord définir la composition du bien";
      case 5: return "Veuillez d'abord ajouter vos documents (ou passer cette étape)";
      default: return `Veuillez d'abord compléter l'étape ${step}`;
    }
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
      toast.warning(getStepRequirementMessage(firstIncomplete), {
        description: `Étape ${firstIncomplete} requise avant de continuer`,
        duration: 4000,
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
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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

  // Document upload handlers
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 MB)');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${docType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(fileName);

      const newDoc: ProjectDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        type: docType,
        url: publicUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      setProjectDocuments(prev => [...prev, newDoc]);
      toast.success(`${file.name} ajouté`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploadingDoc(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: ProjectDocument) => {
    try {
      setProjectDocuments(prev => prev.filter(d => d.id !== doc.id));
      
      const fileName = doc.url.split('/').pop();
      if (fileName) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.storage
            .from('project-documents')
            .remove([`${user.id}/${fileName}`]);
        }
      }
      toast.success('Document supprimé');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async () => {
    console.log('[ProjectCreationWizard] handleSubmit called');
    console.log('[ProjectCreationWizard] Form data:', { propertyType, address, postalCode, city });
    
    setIsSubmitting(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('[ProjectCreationWizard] Auth error:', authError);
        toast.error('Erreur d\'authentification: ' + authError.message);
        return;
      }
      
      if (!user) {
        console.error('[ProjectCreationWizard] No user found');
        toast.error('Vous devez être connecté pour créer un projet');
        return;
      }

      console.log('[ProjectCreationWizard] User authenticated:', user.id);

      // Validate required fields
      if (!propertyType) {
        toast.error('Type de bien requis');
        return;
      }
      if (!address.trim()) {
        toast.error('Adresse requise');
        return;
      }

      // Map property type to database format
      const dbPropertyType = propertyType === 'immeuble' ? 'building' 
        : propertyType === 'maison' ? 'house'
        : propertyType === 'appartement' ? 'apartment'
        : 'commercial';

      // Générer un nom pour le projet
      const projectName = address 
        ? `${address}${city ? `, ${city}` : ''}${postalCode ? ` ${postalCode}` : ''}`
        : `${propertyType === 'immeuble' ? 'Immeuble' : propertyType === 'maison' ? 'Maison' : 'Appartement'} - ${new Date().toLocaleDateString()}`;

      console.log('[ProjectCreationWizard] Creating project with data:', {
        user_id: user.id,
        name: projectName,
        property_type: dbPropertyType,
        address,
        postal_code: postalCode,
        city,
      });

      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('edl_projects')
        .insert({
          user_id: user.id,
          name: projectName,
          property_type: dbPropertyType,
          address: address,
          postal_code: postalCode,
          city: city,
          additional_info: additionalInfo,
          archived: false,
          project_documents: projectDocuments.length > 0 ? projectDocuments as any : null
        })
        .select()
        .single();

      if (projectError) {
        console.error('[ProjectCreationWizard] Project creation error:', JSON.stringify(projectError, null, 2));
        console.error('[ProjectCreationWizard] Error details:', {
          message: projectError.message,
          code: projectError.code,
          details: projectError.details,
          hint: projectError.hint
        });
        throw projectError;
      }

      console.log('[ProjectCreationWizard] Project created successfully:', project.id);

      // If it's a building, create the composition and parts
      if (propertyType === 'immeuble' && project) {
        // Create property composition with technical characteristics
        const { error: compError } = await supabase
          .from('property_composition')
          .insert({
            project_id: project.id,
            type_bien: 'immeuble',
            nb_apartments: partiesPrivatives.filter(p => p.type === 'appartement').length,
            nb_parking_spots: partiesPrivatives.filter(p => p.type === 'parking').length,
            nb_boxes: partiesPrivatives.filter(p => p.type === 'box').length,
            nb_caves: partiesPrivatives.filter(p => p.type === 'cave').length,
            nb_gardens: partiesPrivatives.filter(p => p.type === 'jardin').length,
            technical_characteristics: technicalCharacteristics as any,
          });

        if (compError) console.error('[ProjectCreationWizard] Composition error:', compError);

        // Create Partie Commune
        if (partiesCommunes.length > 0) {
          const { data: communePart } = await supabase
            .from('property_parts')
            .insert({
              project_id: project.id,
              part_type: 'commune',
              name: 'Parties Communes',
              order_index: 0
            })
            .select()
            .single();

          if (communePart) {
            // Create locations for each partie commune
            for (let i = 0; i < partiesCommunes.length; i++) {
              const partie = partiesCommunes[i];
              await supabase
                .from('property_locations')
                .insert({
                  project_id: project.id,
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
              project_id: project.id,
              part_type: 'privative',
              name: 'Parties Privatives',
              order_index: 1
            })
            .select()
            .single();

          if (privativePart) {
            // Create locations for each partie privative
            for (let i = 0; i < partiesPrivatives.length; i++) {
              const partie = partiesPrivatives[i];
              const locationName = partie.type === 'appartement' && partie.numero 
                ? `Appartement ${partie.numero}` 
                : partie.name;
              
              await supabase
                .from('property_locations')
                .insert({
                  project_id: project.id,
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

      toast.success('Projet créé avec succès ! Vous pouvez maintenant ajouter des photos/vidéos.');
      console.log('[ProjectCreationWizard] Calling onComplete with project id:', project.id);
      onComplete(project.id);
    } catch (error: any) {
      console.error('[ProjectCreationWizard] Error creating project:', error);
      console.error('[ProjectCreationWizard] Error details:', JSON.stringify(error, null, 2));
      
      // Afficher un message d'erreur détaillé
      let errorMessage = 'Erreur inconnue';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Erreur ${error.code}: ${error.message || error.details || 'Erreur lors de la création'}`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.details) {
        errorMessage = error.details;
      }
      
      toast.error('Erreur lors de la création du projet: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick add multiple apartments
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Progress Header - Apple Style */}
      <div className="px-6 py-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Nouveau projet</h2>
            <p className="text-xs text-muted-foreground mt-0.5">en {totalSteps} étapes</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
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
                  "flex-1 h-1 rounded-full transition-all",
                  index + 1 < currentStep ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Step Label */}
        <p className="text-sm text-muted-foreground mt-3">
          {currentStep === 1 && "Type de bien"}
          {currentStep === 2 && "Localisation"}
          {currentStep === 3 && "Adresse 360°"}
          {currentStep === 4 && "Composition du bien"}
          {currentStep === 5 && "Documents"}
          {currentStep === 6 && "Récapitulatif"}
        </p>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-8">
          {/* Step 1: Property Type */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1 mb-6">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 1</p>
                <p className="text-muted-foreground">
                  Quel type de bien allez-vous inspecter ?
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
                        {type.label}
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

          {/* Step 2: Location with Autocomplete */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1 mb-6">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 2</p>
                <p className="text-muted-foreground">
                  Où se situe le bien ?
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" />
                    Rechercher une adresse *
                  </Label>
                  <div className="relative">
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Tapez une adresse..."
                      className={cn(
                        "text-lg pr-10",
                        isAddressVerified && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                      )}
                    />
                    {isSearchingAddress && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                    )}
                    {isAddressVerified && !isSearchingAddress && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  
                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 flex items-start gap-3"
                          onClick={() => handleAddressSelect(suggestion)}
                        >
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{suggestion.label}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.context}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isAddressVerified && (
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">{address}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{postalCode} {city}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!isAddressVerified && address.length > 0 && address.length < 3 && (
                  <p className="text-xs text-muted-foreground">
                    Tapez au moins 3 caractères pour rechercher
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Address 360° */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Header fusionné : Globe + Adresse 360° + Adresse + Refresh */}
              <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Globe className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Étape 3</p>
                  <h3 className="text-xl font-bold text-foreground leading-tight">Adresse 360°</h3>
                  {isAddressVerified && address && (
                    <p className="text-base text-muted-foreground mt-2">
                      {address}
                    </p>
                  )}
                </div>
                {isAddressVerified && addressLat && addressLon && (
                  <button
                    onClick={() => address360RefreshFn?.()}
                    disabled={address360Refreshing}
                    className="w-10 h-10 rounded-full bg-background/80 border border-border/50 flex items-center justify-center flex-shrink-0 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {address360Refreshing ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              
              {isAddressVerified && addressLat && addressLon ? (
                <Address360Section 
                  address={address}
                  postalCode={postalCode}
                  city={city}
                  lat={addressLat}
                  lon={addressLon}
                  onRefreshStateChange={(isRefreshing, refreshFn) => {
                    setAddress360Refreshing(isRefreshing);
                    setAddress360RefreshFn(() => refreshFn);
                  }}
                />
              ) : (
                <div className="text-center py-12 border rounded-xl border-dashed">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Veuillez d'abord sélectionner une adresse à l'étape 2
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setCurrentStep(2)}
                  >
                    Retour à l'étape 2
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Composition (for Immeuble) */}
          {currentStep === 4 && propertyType === 'immeuble' && (
            <div className="space-y-6">
              <div className="space-y-1 mb-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 4</p>
                <p className="text-muted-foreground">
                  Définissez la structure de l'immeuble
                </p>
              </div>

              {/* Technical Characteristics Button */}
              <button
                type="button"
                onClick={() => setShowTechnicalCharacteristics(true)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800 hover:from-indigo-500/20 hover:to-purple-500/20 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-foreground">Caractéristiques techniques</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Arrivées, évacuations, équipements collectifs, dimensions
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Technical Characteristics Sheet */}
              <TechnicalCharacteristicsSheet
                open={showTechnicalCharacteristics}
                onOpenChange={setShowTechnicalCharacteristics}
                value={technicalCharacteristics}
                onChange={setTechnicalCharacteristics}
              />

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
                  <span>Communes</span>
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
                  <span>Privatives</span>
                  {partiesPrivatives.length > 0 && (
                    <Badge variant="secondary" className={cn(
                      "ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full",
                      compositionMode === 'privatives'
                        ? "bg-white/20 text-white"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
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
                  <h3 className="font-semibold flex items-center gap-2 text-foreground">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Détails des parties communes
                  </h3>
                  <Button 
                    size="icon" 
                    className="h-9 w-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                    onClick={() => setShowAddCommune(true)}
                  >
                    <Plus className="w-5 h-5" />
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
                        Ajouter une partie commune
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground mt-1">Sélectionnez un type</p>
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
                        Fermer
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
                      <Card key={partie.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          {isEditing ? (
                            <Input
                              value={partie.name}
                              onChange={(e) => updatePartieCommuneName(partie.id, e.target.value)}
                              onBlur={() => setEditingCommune(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingCommune(null)}
                              autoFocus
                              placeholder="Nom de la partie commune"
                              className="flex-1"
                            />
                          ) : (
                            <span className="flex-1 font-medium">{partie.name || 'Autre'}</span>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => setEditingCommune(partie.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => removePartieCommune(partie.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg border-dashed">
                    Aucune partie commune ajoutée
                  </p>
                )}
              </div>
              )}

              {/* Parties Privatives */}
              {compositionMode === 'privatives' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2 text-foreground">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Home className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Détails des parties privatives
                  </h3>
                  <Button 
                    size="icon" 
                    className="h-9 w-9 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                    onClick={() => setShowAddPrivative(true)}
                  >
                    <Plus className="w-5 h-5" />
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
                        Ajouter une partie privative
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground mt-1">Sélectionnez un type</p>
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
                        Fermer
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                {partiesPrivatives.length > 0 ? (
                  <div className="space-y-2">
                    {partiesPrivatives.map((partie) => {
                      const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === partie.type);
                      const isAppartement = partie.type === 'appartement';
                      const typeAppartLabel = isAppartement && partie.typeAppartement 
                        ? TYPES_APPARTEMENT.find(t => t.value === partie.typeAppartement)?.label 
                        : null;
                      const piecesCount = isAppartement && partie.pieces ? partie.pieces.length : 0;
                      return (
                        <Card key={partie.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <span className="text-xl">{typeInfo?.emoji}</span>
                            <div className="flex-1">
                              <span className="font-medium">
                                {isAppartement && partie.numero 
                                  ? `Appartement ${partie.numero}`
                                  : partie.name}
                              </span>
                              {isAppartement && typeAppartLabel && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({typeAppartLabel})
                                </span>
                              )}
                              {isAppartement && (partie.nbChambres || partie.nbSallesDeBain || piecesCount > 0) && (
                                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                  {partie.nbChambres && (
                                    <span className="flex items-center gap-1">
                                      <BedDouble className="w-3 h-3" /> {partie.nbChambres}
                                    </span>
                                  )}
                                  {partie.nbSallesDeBain && (
                                    <span className="flex items-center gap-1">
                                      <Bath className="w-3 h-3" /> {partie.nbSallesDeBain}
                                    </span>
                                  )}
                                  {partie.surfaceM2 && (
                                    <span className="flex items-center gap-1">
                                      <Square className="w-3 h-3" /> {partie.surfaceM2}m²
                                    </span>
                                  )}
                                  {piecesCount > 0 && (
                                    <span className="flex items-center gap-1 text-primary">
                                      📍 {piecesCount} pièce{piecesCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => isAppartement 
                                ? setEditingAppartementDetails(partie.id)
                                : setEditingPrivative(partie.id)
                              }
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => removePartiePrivative(partie.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg border-dashed">
                    Aucune partie privative ajoutée
                  </p>
                )}

                {/* Sheet for editing apartment details */}
                <Sheet open={!!editingAppartementDetails} onOpenChange={(open) => !open && setEditingAppartementDetails(null)}>
                  <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col overflow-hidden">
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                      <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                    </div>
                    
                    <SheetHeader className="px-6 py-3 border-b flex-shrink-0">
                      <SheetTitle className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                          <span className="text-xl">🏠</span>
                        </div>
                        Détails de l'appartement
                      </SheetTitle>
                    </SheetHeader>
                    
                    {editingAppartementDetails && (() => {
                      const appt = partiesPrivatives.find(p => p.id === editingAppartementDetails);
                      if (!appt) return null;
                      
                      return (
                        <ScrollArea className="flex-1">
                          <div className="px-6 py-5 space-y-6 pb-8">
                            {/* Informations de base */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations</h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Numéro</Label>
                                  <Input
                                    value={appt.numero || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { numero: e.target.value })}
                                    placeholder="1, 2A, ..."
                                    className="h-11 rounded-xl bg-accent/30"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Type</Label>
                                  <Select
                                    value={appt.typeAppartement || ''}
                                    onValueChange={(value) => updatePartiePrivative(appt.id, { typeAppartement: value })}
                                  >
                                    <SelectTrigger className="h-11 rounded-xl bg-accent/30">
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
                            </div>

                            {/* Caractéristiques */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caractéristiques</h3>
                              <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <BedDouble className="w-3 h-3" /> Ch.
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={appt.nbChambres || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { nbChambres: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="h-11 rounded-xl bg-accent/30 text-center"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Bath className="w-3 h-3" /> SdB
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={appt.nbSallesDeBain || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { nbSallesDeBain: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="h-11 rounded-xl bg-accent/30 text-center"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Square className="w-3 h-3" /> m²
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={appt.surfaceM2 || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { surfaceM2: parseFloat(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="h-11 rounded-xl bg-accent/30 text-center"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Étage</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={appt.etage || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { etage: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="h-11 rounded-xl bg-accent/30 text-center"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Équipements */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Équipements</h3>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { key: 'hasBalcon', label: 'Balcon', emoji: '🌅' },
                                  { key: 'hasTerrasse', label: 'Terrasse', emoji: '☀️' },
                                  { key: 'hasJardin', label: 'Jardin', emoji: '🌳' },
                                ].map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => updatePartiePrivative(appt.id, { [item.key]: !(appt as any)[item.key] })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                      (appt as any)[item.key] 
                                        ? 'bg-primary/10 border-primary text-primary' 
                                        : 'bg-accent/30 border-transparent'
                                    }`}
                                  >
                                    <span>{item.emoji}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Annexes associées */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annexes associées</h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Parking</Label>
                                  <Input
                                    value={appt.parkingAssocie || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { parkingAssocie: e.target.value })}
                                    placeholder="P12"
                                    className="h-11 rounded-xl bg-accent/30"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Box / Garage</Label>
                                  <Input
                                    value={appt.boxAssocie || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { boxAssocie: e.target.value })}
                                    placeholder="Box 5"
                                    className="h-11 rounded-xl bg-accent/30"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Cave</Label>
                                  <Input
                                    value={appt.caveAssociee || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { caveAssociee: e.target.value })}
                                    placeholder="Cave C3"
                                    className="h-11 rounded-xl bg-accent/30"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Cellier</Label>
                                  <Input
                                    value={appt.cellierAssocie || ''}
                                    onChange={(e) => updatePartiePrivative(appt.id, { cellierAssocie: e.target.value })}
                                    placeholder="Cellier 2"
                                    className="h-11 rounded-xl bg-accent/30"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Pièces de l'appartement */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pièces de l'appartement</h3>
                              
                              {/* Grid of all room types */}
                              <div className="grid grid-cols-5 gap-2">
                                {PIECES_APPARTEMENT_TYPES.map((pieceType) => {
                                  const existingOfType = (appt.pieces || []).filter(p => p.type === pieceType.value);
                                  const count = existingOfType.length;
                                  return (
                                    <button
                                      key={pieceType.value}
                                      type="button"
                                      className="relative flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-accent/50 transition-all active:scale-95 border border-border/50 bg-accent/20"
                                      onClick={() => {
                                        const pieces = appt.pieces || [];
                                        const isAutre = 'isPlus' in pieceType && pieceType.isPlus;
                                        const newPieceId = crypto.randomUUID();
                                        const newPiece: PieceAppartement = {
                                          id: newPieceId,
                                          type: pieceType.value,
                                          name: isAutre ? '' : (count > 0 ? `${pieceType.label} ${count + 1}` : pieceType.label),
                                        };
                                        let updatedPieces = [...pieces];
                                        if (!isAutre && count === 1) {
                                          updatedPieces = updatedPieces.map(p => 
                                            p.type === pieceType.value 
                                              ? { ...p, name: `${pieceType.label} 1` }
                                              : p
                                          );
                                        }
                                        updatePartiePrivative(appt.id, { 
                                          pieces: [...updatedPieces, newPiece]
                                        });
                                        // Auto-focus on editing for "Autre" type
                                        if (isAutre) {
                                          setTimeout(() => setEditingPieceId(newPieceId), 50);
                                        }
                                      }}
                                    >
                                      {'isPlus' in pieceType && pieceType.isPlus ? (
                                        <Plus className="w-5 h-5 text-primary" />
                                      ) : (
                                        <span className="text-xl">{pieceType.emoji}</span>
                                      )}
                                      <span className="text-[9px] font-medium text-center leading-tight line-clamp-1">{pieceType.label}</span>
                                      {count > 0 && (
                                        <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
                                          {count}
                                        </Badge>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* List of added rooms */}
                              {(appt.pieces || []).length > 0 && (
                                <div className="space-y-3 pt-3 border-t">
                                  <p className="text-xs text-muted-foreground">
                                    {appt.pieces?.length} pièce{(appt.pieces?.length || 0) > 1 ? 's' : ''} définie{(appt.pieces?.length || 0) > 1 ? 's' : ''}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(appt.pieces || []).map((piece) => {
                                      const pieceTypeInfo = PIECES_APPARTEMENT_TYPES.find(t => t.value === piece.type);
                                      const isAutreType = 'isPlus' in (pieceTypeInfo || {}) && (pieceTypeInfo as any)?.isPlus;
                                      const isEditing = editingPieceId === piece.id || (isAutreType && !piece.name);
                                      return (
                                        <div 
                                          key={piece.id} 
                                          className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-accent/50 rounded-full border transition-all hover:bg-accent"
                                        >
                                          {isAutreType ? (
                                            <Plus className="w-4 h-4 text-primary" />
                                          ) : (
                                            <span className="text-sm">{pieceTypeInfo?.emoji}</span>
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
                                              placeholder="Nom de la pièce"
                                              className="h-6 w-32 text-sm px-2 rounded-full"
                                            />
                                          ) : (
                                            <>
                                              <span className="text-sm font-medium">{piece.name || 'Autre'}</span>
                                              <button
                                                type="button"
                                                onClick={() => setEditingPieceId(piece.id)}
                                                className="w-6 h-6 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors"
                                              >
                                                <Edit2 className="w-3 h-3 text-muted-foreground" />
                                              </button>
                                            </>
                                          )}
                                          <button
                                            type="button"
                                            className="w-6 h-6 rounded-full hover:bg-destructive/20 flex items-center justify-center transition-colors"
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
                                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </ScrollArea>
                      );
                    })()}
                    
                    <div className="p-4 border-t bg-background/95 backdrop-blur-sm flex-shrink-0">
                      <Button 
                        className="w-full h-12 rounded-xl text-base font-semibold" 
                        onClick={() => setEditingAppartementDetails(null)}
                      >
                        Terminé
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

              </div>
              )}

              {/* Summary */}
              {(partiesCommunes.length > 0 || partiesPrivatives.length > 0) && (
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Résumé</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Parties communes : {partiesCommunes.length}</div>
                    <div>Appartements : {partiesPrivatives.filter(p => p.type === 'appartement').length}</div>
                    <div>Parkings : {partiesPrivatives.filter(p => p.type === 'parking').length}</div>
                    <div>Boxes : {partiesPrivatives.filter(p => p.type === 'box').length}</div>
                    <div>Caves : {partiesPrivatives.filter(p => p.type === 'cave').length}</div>
                    <div>Jardins : {partiesPrivatives.filter(p => p.type === 'jardin').length}</div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Composition for non-immeuble (Apple-style) */}
          {currentStep === 4 && propertyType && propertyType !== 'immeuble' && (
            <div className="space-y-6">
              <div className="space-y-1 mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 4</p>
                <p className="text-muted-foreground">
                  {propertyType === 'maison' && "Définissez les pièces de la maison"}
                  {propertyType === 'appartement' && "Définissez les pièces de l'appartement"}
                  {propertyType === 'commerce' && "Définissez les zones du local"}
                </p>
              </div>

              {/* Apple-style category buttons */}
              <div className="space-y-3">
                {/* Pièces principales */}
                <button
                  type="button"
                  onClick={() => setShowAddSimplePiece(true)}
                  className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border hover:border-primary/30 hover:bg-accent/50 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">
                        {propertyType === 'commerce' ? 'Zones du local' : 'Pièces du bien'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {simplePieces.length === 0 
                          ? 'Aucune pièce ajoutée' 
                          : `${simplePieces.length} pièce${simplePieces.length > 1 ? 's' : ''} définie${simplePieces.length > 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {simplePieces.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        {simplePieces.length}
                      </Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>

                {/* Preview des pièces ajoutées */}
                {simplePieces.length > 0 && (
                  <div className="bg-card rounded-2xl border overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b">
                      <p className="text-sm font-medium text-muted-foreground">
                        {propertyType === 'commerce' ? 'Zones ajoutées' : 'Pièces ajoutées'}
                      </p>
                    </div>
                    <div className="divide-y">
                      {simplePieces.map((piece, index) => {
                        const pieceType = PIECES_APPARTEMENT_TYPES.find(p => p.value === piece.type);
                        return (
                          <div
                            key={piece.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{pieceType?.emoji || '📦'}</span>
                              <div>
                                <p className="font-medium text-sm">{piece.name}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSimplePieces(simplePieces.filter(p => p.id !== piece.id));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Apple-style Sheet for adding pieces */}
              <Sheet open={showAddSimplePiece} onOpenChange={setShowAddSimplePiece}>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 flex flex-col">
                  {/* Handle bar iOS style */}
                  <div className="flex justify-center pt-2 pb-1">
                    <div className="w-9 h-1 bg-muted-foreground/40 rounded-full" />
                  </div>
                  
                  <SheetHeader className="px-5 pb-4 flex-shrink-0">
                    <SheetTitle className="text-center text-lg font-semibold">
                      {propertyType === 'commerce' ? 'Ajouter une zone' : 'Ajouter une pièce'}
                    </SheetTitle>
                    <p className="text-center text-sm text-muted-foreground">
                      Sélectionnez les éléments à ajouter
                    </p>
                  </SheetHeader>
                  
                  <ScrollArea className="flex-1">
                    <div className="px-5 pb-6 space-y-6">
                      {/* Pièces principales */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Pièces principales
                        </p>
                        <div className="bg-card rounded-2xl border overflow-hidden divide-y">
                          {PIECES_APPARTEMENT_TYPES.filter(t => ['entree', 'sejour', 'salon', 'cuisine', 'chambre', 'couloir', 'bureau'].includes(t.value)).map((type) => {
                            const count = simplePieces.filter(p => p.type === type.value).length;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                                onClick={() => {
                                  const existingCount = simplePieces.filter(p => p.type === type.value).length;
                                  const newName = existingCount > 0 ? `${type.label} ${existingCount + 1}` : type.label;
                                  setSimplePieces([...simplePieces, { id: crypto.randomUUID(), type: type.value, name: newName }]);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{type.emoji}</span>
                                  <span className="font-medium">{type.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {count > 0 && (
                                    <Badge className="bg-primary text-primary-foreground">{count}</Badge>
                                  )}
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sanitaires */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Sanitaires
                        </p>
                        <div className="bg-card rounded-2xl border overflow-hidden divide-y">
                          {PIECES_APPARTEMENT_TYPES.filter(t => ['sdb', 'wc', 'buanderie'].includes(t.value)).map((type) => {
                            const count = simplePieces.filter(p => p.type === type.value).length;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                                onClick={() => {
                                  const existingCount = simplePieces.filter(p => p.type === type.value).length;
                                  const newName = existingCount > 0 ? `${type.label} ${existingCount + 1}` : type.label;
                                  setSimplePieces([...simplePieces, { id: crypto.randomUUID(), type: type.value, name: newName }]);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{type.emoji}</span>
                                  <span className="font-medium">{type.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {count > 0 && (
                                    <Badge className="bg-primary text-primary-foreground">{count}</Badge>
                                  )}
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Rangements */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Rangements
                        </p>
                        <div className="bg-card rounded-2xl border overflow-hidden divide-y">
                          {PIECES_APPARTEMENT_TYPES.filter(t => ['dressing', 'cave', 'garage'].includes(t.value)).map((type) => {
                            const count = simplePieces.filter(p => p.type === type.value).length;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                                onClick={() => {
                                  const existingCount = simplePieces.filter(p => p.type === type.value).length;
                                  const newName = existingCount > 0 ? `${type.label} ${existingCount + 1}` : type.label;
                                  setSimplePieces([...simplePieces, { id: crypto.randomUUID(), type: type.value, name: newName }]);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{type.emoji}</span>
                                  <span className="font-medium">{type.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {count > 0 && (
                                    <Badge className="bg-primary text-primary-foreground">{count}</Badge>
                                  )}
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Extérieurs */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Extérieurs
                        </p>
                        <div className="bg-card rounded-2xl border overflow-hidden divide-y">
                          {PIECES_APPARTEMENT_TYPES.filter(t => ['balcon', 'terrasse', 'jardin'].includes(t.value)).map((type) => {
                            const count = simplePieces.filter(p => p.type === type.value).length;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                                onClick={() => {
                                  const existingCount = simplePieces.filter(p => p.type === type.value).length;
                                  const newName = existingCount > 0 ? `${type.label} ${existingCount + 1}` : type.label;
                                  setSimplePieces([...simplePieces, { id: crypto.randomUUID(), type: type.value, name: newName }]);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{type.emoji}</span>
                                  <span className="font-medium">{type.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {count > 0 && (
                                    <Badge className="bg-primary text-primary-foreground">{count}</Badge>
                                  )}
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Autre */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          Autre
                        </p>
                        <div className="bg-card rounded-2xl border overflow-hidden">
                          {PIECES_APPARTEMENT_TYPES.filter(t => t.value === 'autre').map((type) => {
                            const count = simplePieces.filter(p => p.type === type.value).length;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 transition-colors active:bg-accent"
                                onClick={() => {
                                  const existingCount = simplePieces.filter(p => p.type === type.value).length;
                                  const newName = existingCount > 0 ? `Autre ${existingCount + 1}` : 'Autre';
                                  setSimplePieces([...simplePieces, { id: crypto.randomUUID(), type: type.value, name: newName }]);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{type.emoji}</span>
                                  <span className="font-medium">Autre pièce</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {count > 0 && (
                                    <Badge className="bg-primary text-primary-foreground">{count}</Badge>
                                  )}
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 border-t bg-background flex-shrink-0 pb-8">
                    <Button 
                      className="w-full h-12 rounded-xl text-base font-semibold"
                      onClick={() => setShowAddSimplePiece(false)}
                    >
                      Terminé ({simplePieces.length} pièce{simplePieces.length !== 1 ? 's' : ''})
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Step 5: Additional Info & Documents */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-1 mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Étape 5
                </p>
                <p className="text-muted-foreground">
                  Ajoutez des documents pour enrichir l'analyse IA
                </p>
              </div>
              
              {/* Document Upload Buttons */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Documents de préparation</Label>
                <div className="space-y-2">
                  {DOCUMENT_TYPES.map(({ value, label, icon: Icon }) => {
                    const docsOfType = projectDocuments.filter(d => d.type === value);
                    return (
                      <div key={value} className="relative">
                        <input
                          type="file"
                          id={`upload-${value}`}
                          ref={el => { fileInputRefs.current[value] = el; }}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(e, value)}
                          disabled={isUploadingDoc}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-12 text-left",
                            docsOfType.length > 0 && "border-primary/50 bg-primary/5"
                          )}
                          onClick={() => fileInputRefs.current[value]?.click()}
                          disabled={isUploadingDoc}
                        >
                          {isUploadingDoc ? (
                            <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4 mr-3" />
                          )}
                          <span className="flex-1">{label}</span>
                          {docsOfType.length > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                              {docsOfType.length}
                            </Badge>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Uploaded Documents List */}
              {projectDocuments.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Documents ajoutés ({projectDocuments.length})
                  </Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    {projectDocuments.map((doc) => {
                      const docTypeInfo = DOCUMENT_TYPES.find(t => t.value === doc.type);
                      const Icon = docTypeInfo?.icon || FileText;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-background hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Icon className="w-4 h-4 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {docTypeInfo?.label} • {formatFileSize(doc.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ces documents seront analysés par l'IA pour extraire automatiquement les tâches
                  </p>
                </div>
              )}

              {/* Additional Notes */}
              <div className="pt-4 border-t">
                <Label htmlFor="additionalInfo" className="mb-2 block text-sm font-medium">
                  Notes supplémentaires (optionnel)
                </Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Ajoutez des informations utiles pour la visite..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 6: Récapitulatif */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-1 mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Étape 6
                </p>
                <p className="text-muted-foreground">
                  Vérifiez les informations avant de créer le projet
                </p>
              </div>
              
              {/* Hero Header */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                    {propertyType && (() => {
                      const PropertyIcon = PROPERTY_TYPES.find(t => t.value === propertyType)?.icon || Building2;
                      return <PropertyIcon className="w-8 h-8 text-primary-foreground" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">
                      {PROPERTY_TYPES.find(t => t.value === propertyType)?.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Prêt pour l'état des lieux
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold">Localisation</span>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{address}</p>
                      {(postalCode || city) && (
                        <p className="text-sm text-muted-foreground">{postalCode} {city}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Composition Card - For Immeuble */}
              {propertyType === 'immeuble' && (partiesCommunes.length > 0 || partiesPrivatives.length > 0) && (
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5" />
                      <span className="font-semibold">Composition du bien</span>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    {/* Parties Communes */}
                    {partiesCommunes.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium">Parties Communes</span>
                          <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {partiesCommunes.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-10">
                          {partiesCommunes.map((partie) => (
                            <Badge 
                              key={partie.id} 
                              variant="outline" 
                              className="bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                            >
                              {partie.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Separator */}
                    {partiesCommunes.length > 0 && partiesPrivatives.length > 0 && (
                      <div className="border-t" />
                    )}

                    {/* Parties Privatives */}
                    {partiesPrivatives.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                            <Home className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="font-medium">Parties Privatives</span>
                          <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            {partiesPrivatives.length}
                          </Badge>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 pl-10">
                          {[
                            { type: 'appartement', label: 'Appartements', icon: Building, color: 'emerald' },
                            { type: 'parking', label: 'Parkings', icon: Car, color: 'sky' },
                            { type: 'box', label: 'Boxes', icon: Warehouse, color: 'amber' },
                            { type: 'cave', label: 'Caves', icon: Warehouse, color: 'slate' },
                            { type: 'jardin', label: 'Jardins', icon: TreePine, color: 'green' },
                          ].map(({ type, label, icon: Icon, color }) => {
                            const count = partiesPrivatives.filter(p => p.type === type).length;
                            if (count === 0) return null;
                            return (
                              <div 
                                key={type}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-xl",
                                  `bg-${color}-50 dark:bg-${color}-950/30`
                                )}
                              >
                                <Icon className={cn("w-4 h-4", `text-${color}-600 dark:text-${color}-400`)} />
                                <span className="text-sm font-medium">{count}</span>
                                <span className="text-xs text-muted-foreground">{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Composition Card - For non-Immeuble */}
              {propertyType && propertyType !== 'immeuble' && simplePieces.length > 0 && (
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5" />
                      <span className="font-semibold">
                        {propertyType === 'commerce' ? 'Zones du local' : 'Pièces'}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {simplePieces.map((piece) => {
                        const pieceType = PIECES_APPARTEMENT_TYPES.find(p => p.value === piece.type);
                        return (
                          <Badge 
                            key={piece.id} 
                            variant="outline" 
                            className="bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center gap-1.5 py-1.5 px-3"
                          >
                            <span>{pieceType?.emoji}</span>
                            {piece.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info Card */}
              {additionalInfo && (
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
                    <div className="flex items-center gap-3">
                      <Edit2 className="w-5 h-5" />
                      <span className="font-semibold">Notes complémentaires</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{additionalInfo}</p>
                  </CardContent>
                </Card>
              )}

              {/* Big Validate Button */}
              <div className="pt-4">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-xl shadow-green-500/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Check className="w-6 h-6 mr-3" />
                      ✅ Valider le projet
                    </>
                  )}
                </Button>
              </div>

              {/* Info Message */}
              <div className="p-4 rounded-2xl bg-muted/50 border space-y-2">
                <p className="text-sm font-medium">Après validation :</p>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">1</span>
                    Le projet sera ajouté à "Mes EDLs en cours"
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">2</span>
                    Vous pourrez ajouter des photos/vidéos
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">3</span>
                    L'IA extraira automatiquement les tâches
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className={cn(
        "px-6 py-4 border-t flex items-center justify-between sticky bottom-0",
        currentStep === totalSteps 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800" 
          : "bg-card/50"
      )}>
        <Button 
          variant="ghost" 
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        
        {currentStep === totalSteps ? (
          <Button 
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[180px] h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Créer le projet
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="min-w-[140px]"
          >
            Suivant
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectCreationWizard;
