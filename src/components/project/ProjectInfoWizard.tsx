import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Building2, Home, Building, Store, MapPin, Plus, Trash2, 
  ChevronRight, ChevronLeft, Check, GripVertical, Edit2,
  Layers, Users, Car, Warehouse, TreePine, Trees, DoorOpen, X,
  ArrowUpDown, Trash, Bike, Flame, Box, Sun, Boxes, FileText, 
  Upload, Loader2, FileCheck, Globe, Search, CheckCircle2, RefreshCw, Save, Square,
  Bed, Bath, ShowerHead, Toilet, UtensilsCrossed, Sofa, Armchair, BriefcaseBusiness, DoorClosed,
  MoveVertical, Waypoints, HomeIcon as HouseIcon, Triangle, Archive, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFrenchAddressSearch, AddressSuggestion } from '@/hooks/useFrenchAddressSearch';
import { Address360Section } from './Address360Section';

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

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
  additional_info?: string;
  project_documents?: ProjectDocument[];
  template_data?: any;
}

type WizardProgress = {
  completedSteps: number[];
  currentStep: number;
};
interface PartieCommune {
  id: string;
  name: string;
  type: string;
  surface?: number;
  etat?: 'neuf' | 'bon' | 'moyen' | 'mauvais';
  notes?: string;
  // Ascenseur specific
  marque?: string;
  anneeInstallation?: number;
  capacitePersonnes?: number;
  chargeMaxKg?: number;
  nombreEtagesDesservis?: number;
  typeAscenseur?: 'hydraulique' | 'electrique' | 'cables';
  dateVisiteTechnique?: string;
  contratMaintenance?: string;
  carnetEntretienAJour?: boolean;
  accessibilitePMR?: boolean;
  alarmeSecours?: boolean;
  eclairageSecours?: boolean;
  // Facade specific
  exposition?: 'nord' | 'sud' | 'est' | 'ouest';
  materiauFacade?: string;
  isolationExterieure?: boolean;
  // Toiture specific
  typeCouverture?: string;
  isolationToiture?: boolean;
  presenceCheminee?: boolean;
  gouttieresEtat?: 'neuf' | 'bon' | 'moyen' | 'mauvais';
  // Escalier specific
  nombreMarches?: number;
  typeRevetement?: string;
  mainCourante?: boolean;
  eclairage?: boolean;
  // Parking specific
  nombrePlaces?: number;
  eclairageParking?: boolean;
  ventilation?: boolean;
  portailAutomatique?: boolean;
  // Hall specific
  interphone?: boolean;
  digicode?: boolean;
  boitesLettres?: number;
  accessHandicape?: boolean;
  revetementSol?: string;
  // Local technique specific
  typeLocalTechnique?: string;
  compteurElectrique?: boolean;
  compteurEau?: boolean;
  compteurGaz?: boolean;
  localClos?: boolean;
  ventilationLocalTechnique?: boolean;
  // Chaufferie specific
  typeChauffage?: 'gaz' | 'fioul' | 'electrique' | 'pompe_chaleur' | 'reseau_chaleur';
  puissanceKw?: number;
  anneeChaudiere?: number;
  marqueChaudiere?: string;
  contratEntretienChaufferie?: string;
  cuveFioul?: boolean;
  capaciteCuve?: number;
  // Terrasse commune specific
  gardeCorp?: boolean;
  etancheite?: 'neuf' | 'bon' | 'moyen' | 'mauvais';
  accesSecurise?: boolean;
  mobilierUrbain?: boolean;
  // Combles specific
  accessible?: boolean;
  amenageable?: boolean;
  isolationCombles?: boolean;
  hauteurSousToiture?: number;
  charpente?: 'bois' | 'metal' | 'beton';
  // Local poubelles specific
  nombreBacs?: number;
  triSelectif?: boolean;
  pointEau?: boolean;
  aerationPoubelles?: boolean;
  nettoyageRegulier?: boolean;
  // Espaces verts / Jardin specific
  surfaceVerte?: number;
  arrosageAuto?: boolean;
  cloture?: boolean;
  eclairageJardin?: boolean;
  aireJeux?: boolean;
  // Local vélos specific
  nombreEmplacements?: number;
  localSecurise?: boolean;
  priseRecharge?: boolean;
  // Couloir / Palier specific
  nombreNiveaux?: number;
  largeurPassage?: number;
  eclairageCouloir?: boolean;
  detecteurMouvement?: boolean;
  // Cave commune specific
  humidite?: 'sec' | 'leger' | 'important';
  eclairageCave?: boolean;
  aerationCave?: boolean;
}

interface Piece {
  id: string;
  type: string;
  name: string;
}

interface AnnexeItem {
  id: string;
  numero?: string;
}

interface PartiePrivative {
  id: string;
  name: string;
  type: string;
  numero?: string;
  surfaceHabitable?: number;
  surfaceUtile?: number;
  nombrePieces?: number;
  etage?: string;
  orientation?: string;
  positionPalier?: 'gauche' | 'droite' | 'face' | 'fond';
  cote?: 'rue' | 'cour' | 'jardin';
  repereVisuel?: string;
  balcons?: number;
  terrasses?: number;
  caves?: AnnexeItem[];
  parkings?: AnnexeItem[];
  celliers?: number;
  boxGarages?: AnnexeItem[];
  surfaceCommerciale?: number;
  vitrine?: boolean;
  surfacePlateau?: number;
  hauteurSousPlafond?: number;
  pieces?: Piece[];
  etat?: 'neuf' | 'bon' | 'moyen' | 'mauvais';
  notes?: string;
  // Parking specific
  typeParking?: 'interieur' | 'exterieur' | 'souterrain';
  numeroPlace?: string;
  niveauParking?: string;
  largeurPlace?: number;
  longueurPlace?: number;
  borneRecharge?: boolean;
  // Box / Garage specific
  surfaceBox?: number;
  porteAutomatique?: boolean;
  eclairageBox?: boolean;
  pointEauBox?: boolean;
  priseElectrique?: boolean;
  // Cave specific
  surfaceCave?: number;
  numeroCave?: string;
  niveauCave?: string;
  humiditeConstatee?: 'sec' | 'leger' | 'important';
  eclairageCave?: boolean;
  aerationCave?: boolean;
  accessibilite?: 'facile' | 'moyenne' | 'difficile';
  // Jardin privatif specific
  surfaceJardin?: number;
  cloture?: boolean;
  arrosageAutomatique?: boolean;
  abriJardin?: boolean;
  terrasse?: boolean;
  piscineSpa?: boolean;
  eclairageExterieur?: boolean;
  expositionJardin?: 'nord' | 'sud' | 'est' | 'ouest';
  // Plateau à aménager specific
  destinationPlateau?: 'bureaux' | 'commerce' | 'restaurant' | 'showroom' | 'atelier' | 'autre';
  arriveeEau?: boolean;
  arriveeElectricite?: boolean;
  puissanceElectrique?: number;
  arriveeGaz?: boolean;
  arriveeFibre?: boolean;
  evacuationsEuEv?: boolean;
  vmcVentilation?: boolean;
  compteursSepares?: boolean;
  colonneMontante?: boolean;
}

type PropertyType = 'building' | 'house' | 'apartment' | 'commercial';

const PROPERTY_TYPES = [
  { value: 'building' as PropertyType, label: 'Immeuble', icon: Building2, emoji: '🏢' },
  { value: 'house' as PropertyType, label: 'Maison', icon: Home, emoji: '🏠' },
  { value: 'apartment' as PropertyType, label: 'Appartement', icon: Building, emoji: '🏠' },
  { value: 'commercial' as PropertyType, label: 'Local commercial', icon: Store, emoji: '🏪' },
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

const PIECE_TYPES = [
  { value: 'chambre', label: 'Chambre', icon: Bed, emoji: '🛏️' },
  { value: 'sejour', label: 'Séjour', icon: Sofa, emoji: '🛋️' },
  { value: 'salon', label: 'Salon', icon: Armchair, emoji: '🪑' },
  { value: 'cuisine_ouverte', label: 'Cuisine ouverte', icon: UtensilsCrossed, emoji: '🍳' },
  { value: 'cuisine_fermee', label: 'Cuisine fermée', icon: UtensilsCrossed, emoji: '🍽️' },
  { value: 'sdb', label: 'Salle de bain', icon: Bath, emoji: '🛁' },
  { value: 'sdo', label: 'Salle d\'eau', icon: ShowerHead, emoji: '🚿' },
  { value: 'wc', label: 'WC séparé', icon: Toilet, emoji: '🚽' },
  { value: 'bureau', label: 'Bureau', icon: BriefcaseBusiness, emoji: '💼' },
  { value: 'entree', label: 'Entrée', icon: DoorClosed, emoji: '🚪' },
  { value: 'couloir', label: 'Couloir', icon: DoorOpen, emoji: '🚶' },
  { value: 'dressing', label: 'Dressing', icon: Warehouse, emoji: '👕' },
  { value: 'buanderie', label: 'Buanderie', icon: Box, emoji: '🧺' },
];

interface ProjectInfoWizardProps {
  project: Project;
  onSave: () => void;
  onCancel: () => void;
  onAutoSaveDocuments?: (documents: ProjectDocument[]) => Promise<void>;
  onAutoSaveProgress?: (progress: WizardProgress) => Promise<void>;
  propertyType: string;
  setPropertyType: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  additionalInfo: string;
  setAdditionalInfo: (value: string) => void;
  projectDocuments: ProjectDocument[];
  setProjectDocuments: (value: ProjectDocument[]) => void;
  partiesCommunes: PartieCommune[];
  setPartiesCommunes: (value: PartieCommune[]) => void;
  partiesPrivatives: PartiePrivative[];
  setPartiesPrivatives: (value: PartiePrivative[]) => void;
  isSaving: boolean;
  // Optional: initial tab for deep linking from reportage
  initialTab?: string | null;
  initialPartie?: string | null;
}

export const ProjectInfoWizard: React.FC<ProjectInfoWizardProps> = ({
  project,
  onSave,
  onCancel,
  onAutoSaveDocuments,
  onAutoSaveProgress,
  propertyType,
  setPropertyType,
  address,
  setAddress,
  postalCode,
  setPostalCode,
  city,
  setCity,
  additionalInfo,
  setAdditionalInfo,
  projectDocuments,
  setProjectDocuments,
  partiesCommunes,
  setPartiesCommunes,
  partiesPrivatives,
  setPartiesPrivatives,
  isSaving,
  initialTab,
  initialPartie,
}) => {
  // Calculate initial step based on initialTab
  const getInitialStep = () => {
    if (!initialTab) return 1;
    const isBuilding = propertyType === 'building';
    const tabToStepMap: Record<string, number> = {
      type: 1,
      localisation: 2,
      adresse360: isBuilding ? 3 : 2,
      composition: isBuilding ? 4 : 3,
      documents: isBuilding ? 5 : 4,
      recapitulatif: isBuilding ? 6 : 5,
    };
    return tabToStepMap[initialTab] || 1;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Restore progress when reopening the wizard (unless we deep-link to a specific tab)
  // Progress is saved permanently - once steps are validated, they stay validated.
  useEffect(() => {
    if (initialTab) return;

    const saved = (project?.template_data as any)?.project_info_wizard?.progress as WizardProgress | undefined;

    if (saved && Array.isArray(saved.completedSteps) && saved.completedSteps.length > 0) {
      // We have saved progress - use it as the source of truth
      const safeCompleted = saved.completedSteps.filter((n) => typeof n === 'number');
      
      // If all 6 steps are completed, show step 6 (recap) directly
      if (safeCompleted.includes(1) && safeCompleted.includes(2) && 
          safeCompleted.includes(3) && safeCompleted.includes(4) && 
          safeCompleted.includes(5) && safeCompleted.includes(6)) {
        setCompletedSteps(new Set(safeCompleted));
        setCurrentStep(6);
        return;
      }
      
      const safeCurrent = typeof saved.currentStep === 'number' ? saved.currentStep : 1;
      setCompletedSteps(new Set(safeCompleted));
      setCurrentStep(safeCurrent);
      return;
    }

    // No saved progress yet - infer from existing data for first-time users
    const inferred = new Set<number>();

    // Step 1: property type
    if (propertyType) inferred.add(1);

    // Step 2: localisation (address)
    if ((address || project?.address) && (city || project?.city)) inferred.add(2);

    // Step 4: composition (has at least one element)
    if (partiesCommunes.length > 0 || partiesPrivatives.length > 0) inferred.add(4);

    // Step 5: documents
    if (projectDocuments.length > 0 || (project?.project_documents?.length ?? 0) > 0) inferred.add(5);

    // Compute the first incomplete step (keep step 3 optional because it depends on live address 360 fetching)
    const inferredCurrent = (() => {
      for (const step of [1, 2, 4, 5, 6]) {
        if (!inferred.has(step)) return Math.min(step, totalSteps);
      }
      return totalSteps;
    })();

    setCompletedSteps(inferred);
    setCurrentStep(inferredCurrent);
  // Only run once on mount - don't re-run when data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, initialTab]);


  // Location state
  const [addressLat, setAddressLat] = useState<number | undefined>();
  const [addressLon, setAddressLon] = useState<number | undefined>();
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);

  // Address autocomplete
  const { suggestions, isLoading: isSearchingAddress, searchAddresses, clearSuggestions } = useFrenchAddressSearch();

  // Address 360 state
  const [address360Refreshing, setAddress360Refreshing] = useState(false);
  const [address360RefreshFn, setAddress360RefreshFn] = useState<(() => void) | null>(null);

  // Composition state
  const [showAddCommune, setShowAddCommune] = useState(false);
  const [showAddPrivative, setShowAddPrivative] = useState(false);
  const [editingCommune, setEditingCommune] = useState<string | null>(null);
  const [editingCommuneDetail, setEditingCommuneDetail] = useState<PartieCommune | null>(null);
  const [editingPrivative, setEditingPrivative] = useState<PartiePrivative | null>(null);
  const [compositionMode, setCompositionMode] = useState<'communes' | 'privatives'>('communes');
  const [privativeEditTab, setPrivativeEditTab] = useState<'identification' | 'localisation' | 'annexes' | 'pieces'>('identification');
  const [renamingPartiePrivative, setRenamingPartiePrivative] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Documents state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isImmeuble = propertyType === 'building' || propertyType === 'immeuble';
  const totalSteps = 6;

  // Auto-fetch coordinates for existing address on mount
  useEffect(() => {
    const fetchCoordinates = async () => {
      if (address && postalCode && city && !addressLat && !addressLon) {
        setIsLoadingCoordinates(true);
        try {
          const fullAddress = `${address}, ${postalCode} ${city}`;
          const response = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            setAddressLat(lat);
            setAddressLon(lon);
            setIsAddressVerified(true);
          }
        } catch (error) {
          console.error('Error fetching coordinates:', error);
        } finally {
          setIsLoadingCoordinates(false);
        }
      } else if (address && !postalCode && !city && !addressLat && !addressLon) {
        // Try with just the address
        setIsLoadingCoordinates(true);
        try {
          const response = await fetch(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            setAddressLat(lat);
            setAddressLon(lon);
            setIsAddressVerified(true);
          }
        } catch (error) {
          console.error('Error fetching coordinates:', error);
        } finally {
          setIsLoadingCoordinates(false);
        }
      }
    };

    fetchCoordinates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistProgress = async (nextProgress: WizardProgress) => {
    if (!onAutoSaveProgress) return;
    try {
      setIsAutoSaving(true);
      await onAutoSaveProgress(nextProgress);
    } catch (error) {
      console.error('Error auto-saving wizard progress:', error);
      toast.error('Impossible de sauvegarder cette étape');
    } finally {
      setIsAutoSaving(false);
    }
  };

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

  const handleNext = () => {
    if (currentStep >= totalSteps) return;

    const nextCompleted = new Set([...completedSteps, currentStep]);
    const nextStep = currentStep + 1;

    setCompletedSteps(nextCompleted);
    setCurrentStep(nextStep);

    void persistProgress({
      completedSteps: Array.from(nextCompleted),
      currentStep: nextStep,
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Composition functions
  const addPartieCommune = (type: string) => {
    const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === type);
    const isAutre = typeInfo && 'isPlus' in typeInfo && typeInfo.isPlus;
    const existingOfType = partiesCommunes.filter(p => p.type === type);
    
    let updatedParties = [...partiesCommunes];
    
    if (!isAutre && existingOfType.length === 1) {
      updatedParties = updatedParties.map(p => {
        if (p.id === existingOfType[0].id) {
          return { ...p, name: `${typeInfo?.label} A` };
        }
        return p;
      });
    }
    
    const newSuffix = isAutre ? '' : (existingOfType.length === 0 ? '' : ` ${String.fromCharCode(65 + existingOfType.length)}`);
    const newId = crypto.randomUUID();
    
    const newPartie: PartieCommune = {
      id: newId,
      name: isAutre ? '' : `${typeInfo?.label}${newSuffix}`,
      type
    };
    
    setPartiesCommunes([...updatedParties, newPartie]);
    
    if (isAutre) {
      setTimeout(() => setEditingCommune(newId), 50);
    }
  };

  const addPartiePrivative = (type: string) => {
    const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === type);
    const existingOfType = partiesPrivatives.filter(p => p.type === type);
    
    let updatedParties = [...partiesPrivatives];
    
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
  };

  const removePartieCommune = (id: string) => {
    const toRemove = partiesCommunes.find(p => p.id === id);
    const newParties = partiesCommunes.filter(p => p.id !== id);
    
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

  const updatePartieCommune = (updated: PartieCommune) => {
    setPartiesCommunes(partiesCommunes.map(p => 
      p.id === updated.id ? updated : p
    ));
    setEditingCommuneDetail(null);
  };

  const updatePartiePrivative = (updated: PartiePrivative) => {
    setPartiesPrivatives(partiesPrivatives.map(p => 
      p.id === updated.id ? updated : p
    ));
    setEditingPrivative(null);
  };

  const updatePartiePrivativeName = (id: string, name: string) => {
    setPartiesPrivatives(partiesPrivatives.map(p => 
      p.id === id ? { ...p, name } : p
    ));
    setRenamingPartiePrivative(null);
    setRenameValue('');
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

      const newDocuments = [...projectDocuments, newDoc];
      setProjectDocuments(newDocuments);
      
      // Auto-save documents to database
      if (onAutoSaveDocuments) {
        await onAutoSaveDocuments(newDocuments);
      }
      
      toast.success(`${file.name} ajouté et sauvegardé`);
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
      const newDocuments = projectDocuments.filter(d => d.id !== doc.id);
      setProjectDocuments(newDocuments);
      
      // Auto-save documents to database
      if (onAutoSaveDocuments) {
        await onAutoSaveDocuments(newDocuments);
      }
      
      toast.success('Document supprimé et sauvegardé');
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Progress Header - Apple Style */}
      <div className="px-6 py-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Informations du projet</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Modifier en {totalSteps} étapes</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg z-50 relative"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isDone = completedSteps.has(stepNumber) || stepNumber < currentStep;
            const isActive = stepNumber === currentStep;
            const isFuture = stepNumber > currentStep;

            return (
              <React.Fragment key={index}>
                <button
                  type="button"
                  onClick={() => {
                    const targetStep = stepNumber;

                    // Allow navigation to any completed step or current step freely
                    if (completedSteps.has(targetStep) || targetStep <= currentStep) {
                      setCurrentStep(targetStep);
                      return;
                    }

                    // Block jumping to future incomplete steps
                    if (targetStep > currentStep && !completedSteps.has(targetStep)) {
                      toast.error("Veuillez d'abord valider les étapes précédentes");
                      return;
                    }

                    setCurrentStep(targetStep);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground scale-110 cursor-pointer hover:scale-105 active:scale-95"
                      : isDone
                        ? "bg-success text-success-foreground cursor-pointer hover:bg-success/90 hover:scale-105 active:scale-95"
                        : "bg-muted text-muted-foreground",
                    isFuture && !completedSteps.has(stepNumber) && "cursor-not-allowed"
                  )}
                  disabled={isFuture && !completedSteps.has(stepNumber)}
                  aria-label={`Aller à l'étape ${stepNumber}`}
                >
                  {isDone && !isActive ? <Check className="w-4 h-4" /> : stepNumber}
                </button>
                {index < totalSteps - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 rounded-full transition-all",
                      stepNumber < currentStep ? "bg-success" : "bg-muted"
                    )}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
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
      {/* pb-[180px] ensures content is not hidden by the footer (100px bottom) + navigation bar (80px) */}
      <div className="flex-1 overflow-y-auto pb-[180px] sm:pb-8">
        <div className="p-6">
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
              
              {isLoadingCoordinates ? (
                <div className="text-center py-12 border rounded-xl border-dashed">
                  <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">
                    Chargement des données de localisation...
                  </p>
                </div>
              ) : isAddressVerified && addressLat && addressLon ? (
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
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-1 mb-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 4</p>
                <p className="text-muted-foreground">
                  {isImmeuble ? "Définissez la structure de l'immeuble" : "Composition du bien (optionnel)"}
                </p>
              </div>

              {isImmeuble ? (
                <>
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

                      <Sheet open={showAddCommune} onOpenChange={setShowAddCommune}>
                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
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

                      {/* Sheet for editing commune details */}
                      <Sheet open={!!editingCommuneDetail} onOpenChange={(open) => !open && setEditingCommuneDetail(null)}>
                        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-0 flex flex-col">
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                          </div>
                          
                          <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
                            <SheetTitle className="flex items-center gap-3 text-lg">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              Détails - {editingCommuneDetail?.name}
                            </SheetTitle>
                          </SheetHeader>
                          
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {editingCommuneDetail && (
                              <>
                                {/* Nom */}
                                <div className="space-y-2">
                                  <Label>Nom</Label>
                                  <Input
                                    value={editingCommuneDetail.name}
                                    onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, name: e.target.value})}
                                    placeholder="Nom de la partie commune"
                                  />
                                </div>
                                
                                {/* Surface - pour tous sauf ascenseur */}
                                {editingCommuneDetail.type !== 'ascenseur' && (
                                  <div className="space-y-2">
                                    <Label>Surface (m²)</Label>
                                    <Input
                                      type="number"
                                      value={editingCommuneDetail.surface || ''}
                                      onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, surface: e.target.value ? parseFloat(e.target.value) : undefined})}
                                      placeholder="Surface en m²"
                                    />
                                  </div>
                                )}

                                {/* === ASCENSEUR === */}
                                {editingCommuneDetail.type === 'ascenseur' && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Marque</Label>
                                        <Input
                                          value={editingCommuneDetail.marque || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, marque: e.target.value})}
                                          placeholder="Ex: Otis, Schindler..."
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Année installation</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.anneeInstallation || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, anneeInstallation: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 2015"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label>Capacité (pers.)</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.capacitePersonnes || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, capacitePersonnes: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 8"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Charge max (kg)</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.chargeMaxKg || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, chargeMaxKg: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 630"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Étages desservis</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.nombreEtagesDesservis || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombreEtagesDesservis: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 6"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Type</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'hydraulique', label: 'Hydraulique' },
                                          { value: 'electrique', label: 'Électrique' },
                                          { value: 'cables', label: 'À câbles' },
                                        ].map((t) => (
                                          <Button
                                            key={t.value}
                                            type="button"
                                            variant={editingCommuneDetail.typeAscenseur === t.value ? 'default' : 'outline'}
                                            className="h-10"
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, typeAscenseur: t.value as any})}
                                          >
                                            {t.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Contrat maintenance</Label>
                                      <Input
                                        value={editingCommuneDetail.contratMaintenance || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, contratMaintenance: e.target.value})}
                                        placeholder="Société de maintenance..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'carnetEntretienAJour', label: 'Carnet entretien à jour' },
                                        { key: 'accessibilitePMR', label: 'Accessibilité PMR' },
                                        { key: 'alarmeSecours', label: 'Alarme de secours' },
                                        { key: 'eclairageSecours', label: 'Éclairage de secours' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === FACADE === */}
                                {editingCommuneDetail.type === 'facade' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Exposition</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'nord', label: 'Nord' },
                                          { value: 'sud', label: 'Sud' },
                                          { value: 'est', label: 'Est' },
                                          { value: 'ouest', label: 'Ouest' },
                                        ].map((exp) => (
                                          <Button
                                            key={exp.value}
                                            type="button"
                                            variant={editingCommuneDetail.exposition === exp.value ? 'default' : 'outline'}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, exposition: exp.value as any})}
                                          >
                                            {exp.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Matériau</Label>
                                      <Input
                                        value={editingCommuneDetail.materiauFacade || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, materiauFacade: e.target.value})}
                                        placeholder="Ex: Pierre, Brique, Enduit..."
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                      <Label>Isolation extérieure (ITE)</Label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={editingCommuneDetail.isolationExterieure ? 'default' : 'outline'}
                                        className={cn("w-12", editingCommuneDetail.isolationExterieure && "bg-emerald-500 hover:bg-emerald-600")}
                                        onClick={() => setEditingCommuneDetail({...editingCommuneDetail, isolationExterieure: !editingCommuneDetail.isolationExterieure})}
                                      >
                                        {editingCommuneDetail.isolationExterieure ? 'Oui' : 'Non'}
                                      </Button>
                                    </div>
                                  </>
                                )}

                                {/* === TOITURE === */}
                                {editingCommuneDetail.type === 'toiture' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Type de couverture</Label>
                                      <Input
                                        value={editingCommuneDetail.typeCouverture || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, typeCouverture: e.target.value})}
                                        placeholder="Ex: Tuiles, Ardoises, Zinc..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>État des gouttières</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingCommuneDetail.gouttieresEtat === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingCommuneDetail.gouttieresEtat === etat.value && etat.color)}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, gouttieresEtat: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'isolationToiture', label: 'Isolation toiture' },
                                        { key: 'presenceCheminee', label: 'Présence cheminée' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === ESCALIER === */}
                                {editingCommuneDetail.type === 'escalier' && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Nombre de marches</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.nombreMarches || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombreMarches: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 50"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Revêtement</Label>
                                        <Input
                                          value={editingCommuneDetail.typeRevetement || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, typeRevetement: e.target.value})}
                                          placeholder="Ex: Carrelage, Béton..."
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'mainCourante', label: 'Main courante' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === PARKING === */}
                                {editingCommuneDetail.type === 'parking_commun' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Nombre de places</Label>
                                      <Input
                                        type="number"
                                        value={editingCommuneDetail.nombrePlaces || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombrePlaces: e.target.value ? parseInt(e.target.value) : undefined})}
                                        placeholder="Ex: 20"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'eclairageParking', label: 'Éclairage' },
                                        { key: 'ventilation', label: 'Ventilation' },
                                        { key: 'portailAutomatique', label: 'Portail automatique' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === HALL D'ENTRÉE === */}
                                {editingCommuneDetail.type === 'hall' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Revêtement sol</Label>
                                      <Input
                                        value={editingCommuneDetail.revetementSol || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, revetementSol: e.target.value})}
                                        placeholder="Ex: Carrelage, Marbre..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Nombre de boîtes aux lettres</Label>
                                      <Input
                                        type="number"
                                        value={editingCommuneDetail.boitesLettres || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, boitesLettres: e.target.value ? parseInt(e.target.value) : undefined})}
                                        placeholder="Ex: 12"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'interphone', label: 'Interphone' },
                                        { key: 'digicode', label: 'Digicode' },
                                        { key: 'accessHandicape', label: 'Accès handicapé' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === LOCAL TECHNIQUE === */}
                                {editingCommuneDetail.type === 'local_technique' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Type de local</Label>
                                      <Input
                                        value={editingCommuneDetail.typeLocalTechnique || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, typeLocalTechnique: e.target.value})}
                                        placeholder="Ex: Électrique, Télécom..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'compteurElectrique', label: 'Compteur électrique' },
                                        { key: 'compteurEau', label: 'Compteur eau' },
                                        { key: 'compteurGaz', label: 'Compteur gaz' },
                                        { key: 'localClos', label: 'Local clos' },
                                        { key: 'ventilationLocalTechnique', label: 'Ventilation' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === CHAUFFERIE === */}
                                {editingCommuneDetail.type === 'chaufferie' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Type de chauffage</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'gaz', label: 'Gaz' },
                                          { value: 'fioul', label: 'Fioul' },
                                          { value: 'electrique', label: 'Électrique' },
                                          { value: 'pompe_chaleur', label: 'Pompe à chaleur' },
                                          { value: 'reseau_chaleur', label: 'Réseau chaleur' },
                                        ].map((t) => (
                                          <Button
                                            key={t.value}
                                            type="button"
                                            variant={editingCommuneDetail.typeChauffage === t.value ? 'default' : 'outline'}
                                            className="h-10 text-xs"
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, typeChauffage: t.value as any})}
                                          >
                                            {t.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Puissance (kW)</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.puissanceKw || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, puissanceKw: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 200"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Année chaudière</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.anneeChaudiere || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, anneeChaudiere: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 2018"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Marque chaudière</Label>
                                      <Input
                                        value={editingCommuneDetail.marqueChaudiere || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, marqueChaudiere: e.target.value})}
                                        placeholder="Ex: Viessmann, De Dietrich..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Contrat entretien</Label>
                                      <Input
                                        value={editingCommuneDetail.contratEntretienChaufferie || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, contratEntretienChaufferie: e.target.value})}
                                        placeholder="Société de maintenance..."
                                      />
                                    </div>
                                    {editingCommuneDetail.typeChauffage === 'fioul' && (
                                      <>
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">Cuve fioul</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={editingCommuneDetail.cuveFioul ? 'default' : 'outline'}
                                            className={cn("w-12", editingCommuneDetail.cuveFioul && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, cuveFioul: !editingCommuneDetail.cuveFioul})}
                                          >
                                            {editingCommuneDetail.cuveFioul ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                        {editingCommuneDetail.cuveFioul && (
                                          <div className="space-y-2">
                                            <Label>Capacité cuve (litres)</Label>
                                            <Input
                                              type="number"
                                              value={editingCommuneDetail.capaciteCuve || ''}
                                              onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, capaciteCuve: e.target.value ? parseInt(e.target.value) : undefined})}
                                              placeholder="Ex: 2000"
                                            />
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}

                                {/* === TERRASSE COMMUNE === */}
                                {editingCommuneDetail.type === 'terrasse_commune' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>État étanchéité</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingCommuneDetail.etancheite === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingCommuneDetail.etancheite === etat.value && etat.color)}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, etancheite: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'gardeCorp', label: 'Garde-corps' },
                                        { key: 'accesSecurise', label: 'Accès sécurisé' },
                                        { key: 'mobilierUrbain', label: 'Mobilier urbain' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === COMBLES === */}
                                {editingCommuneDetail.type === 'combles' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Hauteur sous toiture (m)</Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        value={editingCommuneDetail.hauteurSousToiture || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, hauteurSousToiture: e.target.value ? parseFloat(e.target.value) : undefined})}
                                        placeholder="Ex: 2.5"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Type charpente</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'bois', label: 'Bois' },
                                          { value: 'metal', label: 'Métal' },
                                          { value: 'beton', label: 'Béton' },
                                        ].map((t) => (
                                          <Button
                                            key={t.value}
                                            type="button"
                                            variant={editingCommuneDetail.charpente === t.value ? 'default' : 'outline'}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, charpente: t.value as any})}
                                          >
                                            {t.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'accessible', label: 'Accessible' },
                                        { key: 'amenageable', label: 'Aménageable' },
                                        { key: 'isolationCombles', label: 'Isolation' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === LOCAL POUBELLES === */}
                                {editingCommuneDetail.type === 'local_poubelles' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Nombre de bacs</Label>
                                      <Input
                                        type="number"
                                        value={editingCommuneDetail.nombreBacs || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombreBacs: e.target.value ? parseInt(e.target.value) : undefined})}
                                        placeholder="Ex: 5"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'triSelectif', label: 'Tri sélectif' },
                                        { key: 'pointEau', label: 'Point d\'eau' },
                                        { key: 'aerationPoubelles', label: 'Aération' },
                                        { key: 'nettoyageRegulier', label: 'Nettoyage régulier' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === ESPACES VERTS / JARDIN === */}
                                {(editingCommuneDetail.type === 'espaces_verts' || editingCommuneDetail.type === 'jardin_commun') && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Surface végétalisée (m²)</Label>
                                      <Input
                                        type="number"
                                        value={editingCommuneDetail.surfaceVerte || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, surfaceVerte: e.target.value ? parseFloat(e.target.value) : undefined})}
                                        placeholder="Ex: 500"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'arrosageAuto', label: 'Arrosage auto' },
                                        { key: 'cloture', label: 'Clôture' },
                                        { key: 'eclairageJardin', label: 'Éclairage' },
                                        { key: 'aireJeux', label: 'Aire de jeux' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === LOCAL VÉLOS === */}
                                {editingCommuneDetail.type === 'local_velos' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Nombre d'emplacements</Label>
                                      <Input
                                        type="number"
                                        value={editingCommuneDetail.nombreEmplacements || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombreEmplacements: e.target.value ? parseInt(e.target.value) : undefined})}
                                        placeholder="Ex: 20"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'localSecurise', label: 'Local sécurisé' },
                                        { key: 'priseRecharge', label: 'Prise recharge' },
                                        { key: 'eclairage', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === COULOIR / PALIER === */}
                                {editingCommuneDetail.type === 'couloir' && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Nombre de niveaux</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.nombreNiveaux || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, nombreNiveaux: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 5"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Largeur passage (cm)</Label>
                                        <Input
                                          type="number"
                                          value={editingCommuneDetail.largeurPassage || ''}
                                          onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, largeurPassage: e.target.value ? parseInt(e.target.value) : undefined})}
                                          placeholder="Ex: 120"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Revêtement sol</Label>
                                      <Input
                                        value={editingCommuneDetail.revetementSol || ''}
                                        onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, revetementSol: e.target.value})}
                                        placeholder="Ex: Carrelage, Lino..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'eclairageCouloir', label: 'Éclairage' },
                                        { key: 'detecteurMouvement', label: 'Détecteur mouvement' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {/* === CAVE COMMUNE === */}
                                {editingCommuneDetail.type === 'cave_commune' && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Niveau d'humidité</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'sec', label: 'Sec', color: 'bg-emerald-500' },
                                          { value: 'leger', label: 'Léger', color: 'bg-amber-500' },
                                          { value: 'important', label: 'Important', color: 'bg-red-500' },
                                        ].map((h) => (
                                          <Button
                                            key={h.value}
                                            type="button"
                                            variant={editingCommuneDetail.humidite === h.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingCommuneDetail.humidite === h.value && h.color)}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, humidite: h.value as any})}
                                          >
                                            {h.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {[
                                        { key: 'eclairageCave', label: 'Éclairage' },
                                        { key: 'aerationCave', label: 'Aération' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingCommuneDetail as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingCommuneDetail as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingCommuneDetail({...editingCommuneDetail, [item.key]: !(editingCommuneDetail as any)[item.key]})}
                                          >
                                            {(editingCommuneDetail as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                
                                {/* État - pour tous les types */}
                                <div className="space-y-2">
                                  <Label>État général</Label>
                                  <div className="grid grid-cols-4 gap-2">
                                    {[
                                      { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                      { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                      { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                      { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                    ].map((etat) => (
                                      <Button
                                        key={etat.value}
                                        type="button"
                                        variant={editingCommuneDetail.etat === etat.value ? 'default' : 'outline'}
                                        className={cn(
                                          "flex-col h-auto py-2 gap-1",
                                          editingCommuneDetail.etat === etat.value && etat.color
                                        )}
                                        onClick={() => setEditingCommuneDetail({...editingCommuneDetail, etat: etat.value as any})}
                                      >
                                        <span className="text-xs">{etat.label}</span>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Notes - pour tous les types */}
                                <div className="space-y-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    value={editingCommuneDetail.notes || ''}
                                    onChange={(e) => setEditingCommuneDetail({...editingCommuneDetail, notes: e.target.value})}
                                    placeholder="Notes supplémentaires..."
                                    rows={3}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="p-6 border-t flex gap-3 flex-shrink-0">
                            <Button 
                              className="flex-1" 
                              onClick={() => editingCommuneDetail && updatePartieCommune(editingCommuneDetail)}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Enregistrer
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setEditingCommuneDetail(null)}
                            >
                              Annuler
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
                              <Card 
                                key={partie.id} 
                                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => !isEditing && setEditingCommuneDetail({ ...partie })}
                              >
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
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <>
                                      <span className="flex-1 font-medium">
                                        {partie.name || 'Autre'}
                                        {partie.surface && (
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {partie.surface} m²
                                          </span>
                                        )}
                                        {partie.etat && (
                                          <Badge 
                                            variant="outline" 
                                            className={cn(
                                              "ml-2 text-xs",
                                              partie.etat === 'neuf' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                                              partie.etat === 'bon' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                                              partie.etat === 'moyen' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                                              partie.etat === 'mauvais' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                            )}
                                          >
                                            {partie.etat}
                                          </Badge>
                                        )}
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </>
                                  )}
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCommune(partie.id);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePartieCommune(partie.id);
                                    }}
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

                      <Sheet open={showAddPrivative} onOpenChange={setShowAddPrivative}>
                        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
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

                      {/* Edit Partie Privative Sheet */}
                      <Sheet open={!!editingPrivative} onOpenChange={(open) => !open && setEditingPrivative(null)}>
                        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 flex flex-col overflow-hidden">
                          <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                          </div>
                          
                          <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
                            <SheetTitle className="flex items-center gap-3 text-lg">
                              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                <span className="text-xl">
                                  {PARTIES_PRIVATIVES_TYPES.find(t => t.value === editingPrivative?.type)?.emoji}
                                </span>
                              </div>
                              Détails - {editingPrivative?.name}
                            </SheetTitle>
                          </SheetHeader>
                          
                          {editingPrivative && (
                            <div className="flex-1 min-h-0 flex flex-col">
                              {/* Navigation tabs for appartement/combles types */}
                              {(editingPrivative.type === 'appartement' || editingPrivative.type === 'combles') && (
                                <div className="px-6 pt-4 pb-2 border-b bg-background flex-shrink-0">
                                  <div className="grid grid-cols-4 gap-2">
                                    {[
                                      { id: 'identification', label: 'Identification', icon: '🏷️' },
                                      { id: 'localisation', label: 'Localisation', icon: '📍' },
                                      { id: 'annexes', label: 'Annexes', icon: '🏠' },
                                      { id: 'pieces', label: 'Pièces', icon: '🚪' },
                                    ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setPrivativeEditTab(tab.id as 'identification' | 'localisation' | 'annexes' | 'pieces')}
                                        className={cn(
                                          "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                          privativeEditTab === tab.id
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "bg-muted/50 hover:bg-accent/50"
                                        )}
                                      >
                                        <span className="text-lg">{tab.icon}</span>
                                        <span className="text-[10px] font-medium">{tab.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
                                <div className="space-y-4">
                                  {/* Identification Section - Always shown for non-appartement, or when tab selected */}
                                  {((editingPrivative.type !== 'appartement' && editingPrivative.type !== 'combles') || privativeEditTab === 'identification') && (
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🏷️ Identification</Label>
                                      <div className="space-y-2">
                                        <Label>Nom / Numéro</Label>
                                        <Input
                                          value={editingPrivative.name}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, name: e.target.value })}
                                          placeholder="Ex: Appartement 1, Local A..."
                                        />
                                      </div>
                                      {/* Fields for Identification tab */}
                                      {(editingPrivative.type === 'appartement' || editingPrivative.type === 'combles') && (
                                        <>
                                          {/* Surfaces */}
                                          <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="space-y-2">
                                              <Label>🏠 Surface habitable (m²)</Label>
                                              <Input
                                                type="number"
                                                value={editingPrivative.surfaceHabitable || ''}
                                                onChange={(e) => setEditingPrivative({ ...editingPrivative, surfaceHabitable: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Ex: 65"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>📏 Surface utile (m²)</Label>
                                              <Input
                                                type="number"
                                                value={editingPrivative.surfaceUtile || ''}
                                                onChange={(e) => setEditingPrivative({ ...editingPrivative, surfaceUtile: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Ex: 75"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              />
                                            </div>
                                          </div>
                                          {/* Nombre de pièces & Étage */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                              <Label>Nombre de pièces</Label>
                                              <Input
                                                type="number"
                                                value={editingPrivative.nombrePieces || ''}
                                                onChange={(e) => setEditingPrivative({ 
                                                  ...editingPrivative, 
                                                  nombrePieces: e.target.value ? Number(e.target.value) : undefined 
                                                })}
                                                placeholder="Ex: 3"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Étage</Label>
                                              <Input
                                                value={editingPrivative.etage || ''}
                                                onChange={(e) => setEditingPrivative({ ...editingPrivative, etage: e.target.value })}
                                                placeholder="Ex: 2ème, RDC..."
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Orientation</Label>
                                            <Input
                                              value={editingPrivative.orientation || ''}
                                              onChange={(e) => setEditingPrivative({ ...editingPrivative, orientation: e.target.value })}
                                              placeholder="Ex: Sud, Est..."
                                            />
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {/* Localisation Tab Content */}
                                  {(editingPrivative.type === 'appartement' || editingPrivative.type === 'combles') && privativeEditTab === 'localisation' && (
                                    <div className="space-y-4">
                                      {/* Position Section */}
                                      <div className="space-y-3">
                                        <Label className="text-sm font-medium text-muted-foreground">📍 Position dans l'immeuble</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label>Position sur palier</Label>
                                            <select
                                              value={editingPrivative.positionPalier || ''}
                                              onChange={(e) => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                positionPalier: e.target.value as 'gauche' | 'droite' | 'face' | 'fond' || undefined 
                                              })}
                                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                            >
                                              <option value="">Sélectionner...</option>
                                              <option value="gauche">↰ Gauche</option>
                                              <option value="droite">↱ Droite</option>
                                              <option value="face">↑ Face</option>
                                              <option value="fond">↓ Fond</option>
                                            </select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Côté</Label>
                                            <select
                                              value={editingPrivative.cote || ''}
                                              onChange={(e) => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                cote: e.target.value as 'rue' | 'cour' | 'jardin' || undefined 
                                              })}
                                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                            >
                                              <option value="">Sélectionner...</option>
                                              <option value="rue">🏙️ Rue</option>
                                              <option value="cour">🏠 Cour</option>
                                              <option value="jardin">🌳 Jardin</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Repère visuel</Label>
                                          <Input
                                            value={editingPrivative.repereVisuel || ''}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, repereVisuel: e.target.value })}
                                            placeholder="Ex: Porte bleue, face ascenseur, à côté local poubelles..."
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Annexes Tab Content */}
                                  {(editingPrivative.type === 'appartement' || editingPrivative.type === 'combles') && privativeEditTab === 'annexes' && (
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🏠 Annexes</Label>
                                      
                                      {/* Balcons & Terrasses */}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                          <span className="text-sm">🌸 Balcon</span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                balcons: Math.max(0, (editingPrivative.balcons || 0) - 1)
                                              })}
                                              className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                            >−</button>
                                            <span className="w-6 text-center font-medium">{editingPrivative.balcons || 0}</span>
                                            <button
                                              type="button"
                                              onClick={() => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                balcons: (editingPrivative.balcons || 0) + 1
                                              })}
                                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                            >+</button>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                          <span className="text-sm">☀️ Terrasse</span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                terrasses: Math.max(0, (editingPrivative.terrasses || 0) - 1)
                                              })}
                                              className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                            >−</button>
                                            <span className="w-6 text-center font-medium">{editingPrivative.terrasses || 0}</span>
                                            <button
                                              type="button"
                                              onClick={() => setEditingPrivative({ 
                                                ...editingPrivative, 
                                                terrasses: (editingPrivative.terrasses || 0) + 1
                                              })}
                                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                            >+</button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Cellier */}
                                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                        <span className="text-sm">🚪 Cellier</span>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              celliers: Math.max(0, (editingPrivative.celliers || 0) - 1)
                                            })}
                                            className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                          >−</button>
                                          <span className="w-6 text-center font-medium">{editingPrivative.celliers || 0}</span>
                                          <button
                                            type="button"
                                            onClick={() => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              celliers: (editingPrivative.celliers || 0) + 1
                                            })}
                                            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                          >+</button>
                                        </div>
                                      </div>

                                      {/* Caves avec numéros */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                          <span className="text-sm">🪨 Cave</span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const caves = editingPrivative.caves || [];
                                                if (caves.length > 0) {
                                                  setEditingPrivative({ 
                                                    ...editingPrivative, 
                                                    caves: caves.slice(0, -1)
                                                  });
                                                }
                                              }}
                                              className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                            >−</button>
                                            <span className="w-6 text-center font-medium">{editingPrivative.caves?.length || 0}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const caves = editingPrivative.caves || [];
                                                setEditingPrivative({ 
                                                  ...editingPrivative, 
                                                  caves: [...caves, { id: crypto.randomUUID() }]
                                                });
                                              }}
                                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                            >+</button>
                                          </div>
                                        </div>
                                        {editingPrivative.caves && editingPrivative.caves.length > 0 && (
                                          <div className="grid grid-cols-2 gap-2 pl-4">
                                            {editingPrivative.caves.map((cave, idx) => (
                                              <Input
                                                key={cave.id}
                                                placeholder={`N° cave ${idx + 1}`}
                                                value={cave.numero || ''}
                                                onChange={(e) => {
                                                  const updatedCaves = editingPrivative.caves?.map(c =>
                                                    c.id === cave.id ? { ...c, numero: e.target.value } : c
                                                  );
                                                  setEditingPrivative({ ...editingPrivative, caves: updatedCaves });
                                                }}
                                                className="h-9 text-sm"
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Parkings avec numéros */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                          <span className="text-sm">🅿️ Parking</span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const parkings = editingPrivative.parkings || [];
                                                if (parkings.length > 0) {
                                                  setEditingPrivative({ 
                                                    ...editingPrivative, 
                                                    parkings: parkings.slice(0, -1)
                                                  });
                                                }
                                              }}
                                              className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                            >−</button>
                                            <span className="w-6 text-center font-medium">{editingPrivative.parkings?.length || 0}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const parkings = editingPrivative.parkings || [];
                                                setEditingPrivative({ 
                                                  ...editingPrivative, 
                                                  parkings: [...parkings, { id: crypto.randomUUID() }]
                                                });
                                              }}
                                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                            >+</button>
                                          </div>
                                        </div>
                                        {editingPrivative.parkings && editingPrivative.parkings.length > 0 && (
                                          <div className="grid grid-cols-2 gap-2 pl-4">
                                            {editingPrivative.parkings.map((parking, idx) => (
                                              <Input
                                                key={parking.id}
                                                placeholder={`N° parking ${idx + 1}`}
                                                value={parking.numero || ''}
                                                onChange={(e) => {
                                                  const updatedParkings = editingPrivative.parkings?.map(p =>
                                                    p.id === parking.id ? { ...p, numero: e.target.value } : p
                                                  );
                                                  setEditingPrivative({ ...editingPrivative, parkings: updatedParkings });
                                                }}
                                                className="h-9 text-sm"
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Box/Garage avec numéros */}
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                          <span className="text-sm">🚗 Box / Garage</span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const boxes = editingPrivative.boxGarages || [];
                                                if (boxes.length > 0) {
                                                  setEditingPrivative({ 
                                                    ...editingPrivative, 
                                                    boxGarages: boxes.slice(0, -1)
                                                  });
                                                }
                                              }}
                                              className="w-7 h-7 rounded-full bg-background border flex items-center justify-center hover:bg-accent"
                                            >−</button>
                                            <span className="w-6 text-center font-medium">{editingPrivative.boxGarages?.length || 0}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const boxes = editingPrivative.boxGarages || [];
                                                setEditingPrivative({ 
                                                  ...editingPrivative, 
                                                  boxGarages: [...boxes, { id: crypto.randomUUID() }]
                                                });
                                              }}
                                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                                            >+</button>
                                          </div>
                                        </div>
                                        {editingPrivative.boxGarages && editingPrivative.boxGarages.length > 0 && (
                                          <div className="grid grid-cols-2 gap-2 pl-4">
                                            {editingPrivative.boxGarages.map((box, idx) => (
                                              <Input
                                                key={box.id}
                                                placeholder={`N° box ${idx + 1}`}
                                                value={box.numero || ''}
                                                onChange={(e) => {
                                                  const updatedBoxes = editingPrivative.boxGarages?.map(b =>
                                                    b.id === box.id ? { ...b, numero: e.target.value } : b
                                                  );
                                                  setEditingPrivative({ ...editingPrivative, boxGarages: updatedBoxes });
                                                }}
                                                className="h-9 text-sm"
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Pièces Tab Content */}
                                  {(editingPrivative.type === 'appartement' || editingPrivative.type === 'combles') && privativeEditTab === 'pieces' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold">🚪 Pièces</Label>
                                        <Badge variant="outline">{editingPrivative.pieces?.length || 0}</Badge>
                                      </div>
                                      
                                      <div className="grid grid-cols-4 gap-2">
                                        {PIECE_TYPES.map((pieceType) => {
                                          const count = editingPrivative.pieces?.filter(p => p.type === pieceType.value).length || 0;
                                          return (
                                            <button
                                              key={pieceType.value}
                                              type="button"
                                              className="relative flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/50 hover:bg-accent/50 transition-all active:scale-95"
                                              onClick={() => {
                                                const existingPieces = editingPrivative.pieces || [];
                                                const sameTypePieces = existingPieces.filter(p => p.type === pieceType.value);
                                                const suffix = sameTypePieces.length === 0 ? '' : ` ${sameTypePieces.length + 1}`;
                                                const newPiece: Piece = {
                                                  id: crypto.randomUUID(),
                                                  type: pieceType.value,
                                                  name: `${pieceType.label}${suffix}`
                                                };
                                                setEditingPrivative({
                                                  ...editingPrivative,
                                                  pieces: [...existingPieces, newPiece]
                                                });
                                              }}
                                            >
                                              <span className="text-xl">{pieceType.emoji}</span>
                                              <span className="text-[9px] font-medium text-center leading-tight line-clamp-2">{pieceType.label}</span>
                                              {count > 0 && (
                                                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground rounded-full">
                                                  {count}
                                                </Badge>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {editingPrivative.pieces && editingPrivative.pieces.length > 0 && (
                                        <div className="space-y-1 max-h-[250px] overflow-y-auto">
                                          {editingPrivative.pieces.map((piece) => {
                                            const pieceTypeInfo = PIECE_TYPES.find(t => t.value === piece.type);
                                            return (
                                              <div 
                                                key={piece.id} 
                                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 group"
                                              >
                                                <span className="text-lg">{pieceTypeInfo?.emoji}</span>
                                                <Input
                                                  value={piece.name}
                                                  onChange={(e) => {
                                                    const updatedPieces = editingPrivative.pieces?.map(p =>
                                                      p.id === piece.id ? { ...p, name: e.target.value } : p
                                                    );
                                                    setEditingPrivative({
                                                      ...editingPrivative,
                                                      pieces: updatedPieces
                                                    });
                                                  }}
                                                  className="flex-1 h-8 text-sm"
                                                />
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                  onClick={() => {
                                                    const updatedPieces = editingPrivative.pieces?.filter(p => p.id !== piece.id);
                                                    setEditingPrivative({
                                                      ...editingPrivative,
                                                      pieces: updatedPieces
                                                    });
                                                  }}
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                {/* Fields for Local Commercial */}
                                {editingPrivative.type === 'local_commercial' && (
                                  <>
                                    {/* Surfaces & Étage Section */}
                                    <div className="space-y-3 pt-2">
                                      <Label className="text-sm font-medium text-muted-foreground">📐 Surfaces & Étage</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label>Surface commerciale (m²)</Label>
                                          <Input
                                            type="number"
                                            value={editingPrivative.surfaceCommerciale || ''}
                                            onChange={(e) => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              surfaceCommerciale: e.target.value ? Number(e.target.value) : undefined 
                                            })}
                                            placeholder="Ex: 120"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Étage</Label>
                                          <Input
                                            value={editingPrivative.etage || ''}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, etage: e.target.value })}
                                            placeholder="Ex: RDC..."
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editingPrivative.vitrine || false}
                                        onChange={(e) => setEditingPrivative({ ...editingPrivative, vitrine: e.target.checked })}
                                        className="rounded"
                                      />
                                      <span className="text-sm">Vitrine sur rue</span>
                                    </label>
                                  </>
                                )}

                                {/* Fields for Plateau */}
                                {editingPrivative.type === 'plateau' && (
                                  <div className="space-y-4 pt-2">
                                    {/* Dimensions */}
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">📐 Dimensions</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label>Surface (m²)</Label>
                                          <Input
                                            type="number"
                                            value={editingPrivative.surfacePlateau || ''}
                                            onChange={(e) => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              surfacePlateau: e.target.value ? Number(e.target.value) : undefined 
                                            })}
                                            placeholder="Ex: 200"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Hauteur sous plafond (m)</Label>
                                          <Input
                                            type="number"
                                            step="0.1"
                                            value={editingPrivative.hauteurSousPlafond || ''}
                                            onChange={(e) => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              hauteurSousPlafond: e.target.value ? Number(e.target.value) : undefined 
                                            })}
                                            placeholder="Ex: 2.5"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Destination */}
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🎯 Destination prévue</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'bureaux', label: 'Bureaux' },
                                          { value: 'commerce', label: 'Commerce' },
                                          { value: 'restaurant', label: 'Restaurant' },
                                          { value: 'showroom', label: 'Showroom' },
                                          { value: 'atelier', label: 'Atelier' },
                                          { value: 'autre', label: 'Autre' },
                                        ].map((d) => (
                                          <Button
                                            key={d.value}
                                            type="button"
                                            variant={editingPrivative.destinationPlateau === d.value ? 'default' : 'outline'}
                                            className="h-9 text-xs"
                                            onClick={() => setEditingPrivative({...editingPrivative, destinationPlateau: d.value as any})}
                                          >
                                            {d.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Arrivées */}
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🔌 Arrivées existantes</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.arriveeEau || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, arriveeEau: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">💧 Eau</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.arriveeElectricite || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, arriveeElectricite: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">⚡ Électricité</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.arriveeGaz || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, arriveeGaz: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">🔥 Gaz</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.arriveeFibre || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, arriveeFibre: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">📡 Fibre/Télécom</span>
                                        </label>
                                      </div>
                                      {editingPrivative.arriveeElectricite && (
                                        <div className="space-y-2">
                                          <Label>Puissance électrique (kVA)</Label>
                                          <Input
                                            type="number"
                                            value={editingPrivative.puissanceElectrique || ''}
                                            onChange={(e) => setEditingPrivative({ 
                                              ...editingPrivative, 
                                              puissanceElectrique: e.target.value ? Number(e.target.value) : undefined 
                                            })}
                                            placeholder="Ex: 36"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Évacuations */}
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🚿 Évacuations</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.evacuationsEuEv || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, evacuationsEuEv: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">EU/EV disponible</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.vmcVentilation || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, vmcVentilation: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">VMC/Ventilation</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Infrastructure */}
                                    <div className="space-y-3">
                                      <Label className="text-sm font-medium text-muted-foreground">🏗️ Infrastructure</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.compteursSepares || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, compteursSepares: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">Compteurs séparés</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                          <input
                                            type="checkbox"
                                            checked={editingPrivative.colonneMontante || false}
                                            onChange={(e) => setEditingPrivative({ ...editingPrivative, colonneMontante: e.target.checked })}
                                            className="rounded"
                                          />
                                          <span className="text-sm">Colonne montante accessible</span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Fields for Parking */}
                                {editingPrivative.type === 'parking' && (
                                  <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Numéro de place</Label>
                                        <Input
                                          value={editingPrivative.numeroPlace || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, numeroPlace: e.target.value })}
                                          placeholder="Ex: P12"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Niveau</Label>
                                        <Input
                                          value={editingPrivative.niveauParking || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, niveauParking: e.target.value })}
                                          placeholder="Ex: -1, -2..."
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Type de parking</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'interieur', label: 'Intérieur' },
                                          { value: 'exterieur', label: 'Extérieur' },
                                          { value: 'souterrain', label: 'Souterrain' },
                                        ].map((t) => (
                                          <Button
                                            key={t.value}
                                            type="button"
                                            variant={editingPrivative.typeParking === t.value ? 'default' : 'outline'}
                                            className="h-10 text-xs"
                                            onClick={() => setEditingPrivative({...editingPrivative, typeParking: t.value as any})}
                                          >
                                            {t.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Largeur (m)</Label>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          value={editingPrivative.largeurPlace || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, largeurPlace: e.target.value ? parseFloat(e.target.value) : undefined })}
                                          placeholder="Ex: 2.5"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Longueur (m)</Label>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          value={editingPrivative.longueurPlace || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, longueurPlace: e.target.value ? parseFloat(e.target.value) : undefined })}
                                          placeholder="Ex: 5"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                      <Label className="text-sm">Borne de recharge</Label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={editingPrivative.borneRecharge ? 'default' : 'outline'}
                                        className={cn("w-12", editingPrivative.borneRecharge && "bg-emerald-500 hover:bg-emerald-600")}
                                        onClick={() => setEditingPrivative({...editingPrivative, borneRecharge: !editingPrivative.borneRecharge})}
                                      >
                                        {editingPrivative.borneRecharge ? 'Oui' : 'Non'}
                                      </Button>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>État général</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingPrivative.etat === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingPrivative.etat === etat.value && etat.color)}
                                            onClick={() => setEditingPrivative({...editingPrivative, etat: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={editingPrivative.notes || ''}
                                        onChange={(e) => setEditingPrivative({...editingPrivative, notes: e.target.value})}
                                        placeholder="Notes supplémentaires..."
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Fields for Box / Garage */}
                                {editingPrivative.type === 'box' && (
                                  <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Numéro</Label>
                                        <Input
                                          value={editingPrivative.numero || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, numero: e.target.value })}
                                          placeholder="Ex: B5"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Surface (m²)</Label>
                                        <Input
                                          type="number"
                                          value={editingPrivative.surfaceBox || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, surfaceBox: e.target.value ? parseFloat(e.target.value) : undefined })}
                                          placeholder="Ex: 15"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Étage / Niveau</Label>
                                      <Input
                                        value={editingPrivative.etage || ''}
                                        onChange={(e) => setEditingPrivative({ ...editingPrivative, etage: e.target.value })}
                                        placeholder="Ex: RDC, -1..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { key: 'porteAutomatique', label: 'Porte automatique' },
                                        { key: 'eclairageBox', label: 'Éclairage' },
                                        { key: 'pointEauBox', label: 'Point d\'eau' },
                                        { key: 'priseElectrique', label: 'Prise électrique' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingPrivative as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingPrivative as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingPrivative({...editingPrivative, [item.key]: !(editingPrivative as any)[item.key]})}
                                          >
                                            {(editingPrivative as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <Label>État général</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingPrivative.etat === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingPrivative.etat === etat.value && etat.color)}
                                            onClick={() => setEditingPrivative({...editingPrivative, etat: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={editingPrivative.notes || ''}
                                        onChange={(e) => setEditingPrivative({...editingPrivative, notes: e.target.value})}
                                        placeholder="Notes supplémentaires..."
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Fields for Cave */}
                                {editingPrivative.type === 'cave' && (
                                  <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="space-y-2">
                                        <Label>Numéro cave</Label>
                                        <Input
                                          value={editingPrivative.numeroCave || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, numeroCave: e.target.value })}
                                          placeholder="Ex: C12"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Surface (m²)</Label>
                                        <Input
                                          type="number"
                                          value={editingPrivative.surfaceCave || ''}
                                          onChange={(e) => setEditingPrivative({ ...editingPrivative, surfaceCave: e.target.value ? parseFloat(e.target.value) : undefined })}
                                          placeholder="Ex: 8"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Niveau</Label>
                                      <Input
                                        value={editingPrivative.niveauCave || ''}
                                        onChange={(e) => setEditingPrivative({ ...editingPrivative, niveauCave: e.target.value })}
                                        placeholder="Ex: -1, -2..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Niveau d'humidité</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'sec', label: 'Sec', color: 'bg-emerald-500' },
                                          { value: 'leger', label: 'Léger', color: 'bg-amber-500' },
                                          { value: 'important', label: 'Important', color: 'bg-red-500' },
                                        ].map((h) => (
                                          <Button
                                            key={h.value}
                                            type="button"
                                            variant={editingPrivative.humiditeConstatee === h.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingPrivative.humiditeConstatee === h.value && h.color)}
                                            onClick={() => setEditingPrivative({...editingPrivative, humiditeConstatee: h.value as any})}
                                          >
                                            {h.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Accessibilité</Label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { value: 'facile', label: 'Facile' },
                                          { value: 'moyenne', label: 'Moyenne' },
                                          { value: 'difficile', label: 'Difficile' },
                                        ].map((a) => (
                                          <Button
                                            key={a.value}
                                            type="button"
                                            variant={editingPrivative.accessibilite === a.value ? 'default' : 'outline'}
                                            onClick={() => setEditingPrivative({...editingPrivative, accessibilite: a.value as any})}
                                          >
                                            {a.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { key: 'eclairageCave', label: 'Éclairage' },
                                        { key: 'aerationCave', label: 'Aération' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingPrivative as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingPrivative as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingPrivative({...editingPrivative, [item.key]: !(editingPrivative as any)[item.key]})}
                                          >
                                            {(editingPrivative as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <Label>État général</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingPrivative.etat === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingPrivative.etat === etat.value && etat.color)}
                                            onClick={() => setEditingPrivative({...editingPrivative, etat: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={editingPrivative.notes || ''}
                                        onChange={(e) => setEditingPrivative({...editingPrivative, notes: e.target.value})}
                                        placeholder="Notes supplémentaires..."
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Fields for Jardin privatif */}
                                {editingPrivative.type === 'jardin' && (
                                  <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                      <Label>Surface (m²)</Label>
                                      <Input
                                        type="number"
                                        value={editingPrivative.surfaceJardin || ''}
                                        onChange={(e) => setEditingPrivative({ ...editingPrivative, surfaceJardin: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        placeholder="Ex: 100"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Exposition</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'nord', label: 'Nord' },
                                          { value: 'sud', label: 'Sud' },
                                          { value: 'est', label: 'Est' },
                                          { value: 'ouest', label: 'Ouest' },
                                        ].map((exp) => (
                                          <Button
                                            key={exp.value}
                                            type="button"
                                            variant={editingPrivative.expositionJardin === exp.value ? 'default' : 'outline'}
                                            onClick={() => setEditingPrivative({...editingPrivative, expositionJardin: exp.value as any})}
                                          >
                                            {exp.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { key: 'cloture', label: 'Clôture' },
                                        { key: 'arrosageAutomatique', label: 'Arrosage auto' },
                                        { key: 'abriJardin', label: 'Abri de jardin' },
                                        { key: 'terrasse', label: 'Terrasse' },
                                        { key: 'piscineSpa', label: 'Piscine / Spa' },
                                        { key: 'eclairageExterieur', label: 'Éclairage' },
                                      ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                                          <Label className="text-sm">{item.label}</Label>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant={(editingPrivative as any)[item.key] ? 'default' : 'outline'}
                                            className={cn("w-12", (editingPrivative as any)[item.key] && "bg-emerald-500 hover:bg-emerald-600")}
                                            onClick={() => setEditingPrivative({...editingPrivative, [item.key]: !(editingPrivative as any)[item.key]})}
                                          >
                                            {(editingPrivative as any)[item.key] ? 'Oui' : 'Non'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-2">
                                      <Label>État général</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { value: 'neuf', label: 'Neuf', color: 'bg-emerald-500' },
                                          { value: 'bon', label: 'Bon', color: 'bg-blue-500' },
                                          { value: 'moyen', label: 'Moyen', color: 'bg-amber-500' },
                                          { value: 'mauvais', label: 'Mauvais', color: 'bg-red-500' },
                                        ].map((etat) => (
                                          <Button
                                            key={etat.value}
                                            type="button"
                                            variant={editingPrivative.etat === etat.value ? 'default' : 'outline'}
                                            className={cn("text-xs", editingPrivative.etat === etat.value && etat.color)}
                                            onClick={() => setEditingPrivative({...editingPrivative, etat: etat.value as any})}
                                          >
                                            {etat.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Notes</Label>
                                      <Textarea
                                        value={editingPrivative.notes || ''}
                                        onChange={(e) => setEditingPrivative({...editingPrivative, notes: e.target.value})}
                                        placeholder="Notes supplémentaires..."
                                        rows={2}
                                      />
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-4 border-t bg-background flex-shrink-0 space-y-2">
                            <Button 
                              className="w-full h-12 rounded-xl" 
                              onClick={() => editingPrivative && updatePartiePrivative(editingPrivative)}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Enregistrer
                            </Button>
                            <Button 
                              className="w-full h-10 rounded-xl" 
                              variant="ghost"
                              onClick={() => setEditingPrivative(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>

                      {partiesPrivatives.length > 0 ? (
                        <div className="space-y-2">
                          {partiesPrivatives.map((partie) => {
                            const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === partie.type);
                            const isRenaming = renamingPartiePrivative === partie.id;
                            
                            return (
                              <Card 
                                key={partie.id} 
                                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => !isRenaming && setEditingPrivative({ ...partie })}
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                  <span className="text-xl">{typeInfo?.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    {isRenaming ? (
                                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          className="h-8 text-sm"
                                          placeholder="Nouveau nom"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && renameValue.trim()) {
                                              updatePartiePrivativeName(partie.id, renameValue.trim());
                                            } else if (e.key === 'Escape') {
                                              setRenamingPartiePrivative(null);
                                              setRenameValue('');
                                            }
                                          }}
                                        />
                                        <Button 
                                          size="icon" 
                                          variant="ghost"
                                          className="h-8 w-8 text-primary"
                                          onClick={() => {
                                            if (renameValue.trim()) {
                                              updatePartiePrivativeName(partie.id, renameValue.trim());
                                            }
                                          }}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          size="icon" 
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={() => {
                                            setRenamingPartiePrivative(null);
                                            setRenameValue('');
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium">{partie.name}</span>
                                        {partie.surfaceHabitable && (
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {partie.surfaceHabitable} m²
                                          </span>
                                        )}
                                        {partie.surfaceCommerciale && (
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {partie.surfaceCommerciale} m²
                                          </span>
                                        )}
                                        {partie.surfacePlateau && (
                                          <span className="text-sm text-muted-foreground ml-2">
                                            {partie.surfacePlateau} m²
                                          </span>
                                        )}
                                        {partie.pieces && partie.pieces.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {partie.pieces.slice(0, 4).map((piece) => {
                                              const pieceInfo = PIECE_TYPES.find(t => t.value === piece.type);
                                              return (
                                                <span key={piece.id} className="text-xs" title={piece.name}>
                                                  {pieceInfo?.emoji}
                                                </span>
                                              );
                                            })}
                                            {partie.pieces.length > 4 && (
                                              <span className="text-xs text-muted-foreground">+{partie.pieces.length - 4}</span>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {!isRenaming && (
                                    <>
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="text-muted-foreground hover:text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameValue(partie.name);
                                          setRenamingPartiePrivative(partie.id);
                                        }}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removePartiePrivative(partie.id);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
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
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border rounded-xl border-dashed">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    La composition détaillée n'est pas disponible pour ce type de bien
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-1 mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Étape 5</p>
                <p className="text-muted-foreground">
                  Ajoutez des documents pour enrichir l'analyse IA
                </p>
              </div>
              
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
                </div>
              )}

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

          {/* Step 6: Récapitulatif - Apple Premium Design */}
          {currentStep === 6 && (
            <div className="space-y-5">
              {/* Header */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Étape 6</p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez les informations avant d'enregistrer
                </p>
              </div>
              
              {/* Type de bien */}
              <div className="rounded-2xl bg-card border p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                    {(() => {
                      const PropertyIcon = PROPERTY_TYPES.find(t => t.value === propertyType)?.icon || Building2;
                      return <PropertyIcon className="w-6 h-6 text-foreground" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Type de bien</p>
                    <p className="text-lg font-semibold text-foreground">
                      {PROPERTY_TYPES.find(t => t.value === propertyType)?.label || 'Non défini'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div className="rounded-2xl bg-card border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Localisation</p>
                    {address ? (
                      <>
                        <p className="text-base font-semibold text-foreground truncate">{address}</p>
                        {(postalCode || city) && (
                          <p className="text-sm text-muted-foreground mt-0.5">{postalCode} {city}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Non renseignée</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Structure du bien */}
              {isImmeuble && (
                <div className="rounded-2xl bg-card border p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Structure du bien</p>
                      
                      {partiesCommunes.length === 0 && partiesPrivatives.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Aucune composition définie</p>
                      ) : (
                        <div className="space-y-3">
                          {partiesCommunes.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-medium text-foreground">Parties communes</span>
                                <span className="text-xs text-muted-foreground">({partiesCommunes.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {partiesCommunes.map((partie) => (
                                  <span 
                                    key={partie.id}
                                    className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/60 text-foreground"
                                  >
                                    {partie.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {partiesPrivatives.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-medium text-foreground">Parties privatives</span>
                                <span className="text-xs text-muted-foreground">({partiesPrivatives.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {partiesPrivatives.map((partie) => (
                                  <span 
                                    key={partie.id}
                                    className="inline-flex px-2.5 py-1 text-xs font-medium rounded-lg bg-muted/60 text-foreground"
                                  >
                                    {partie.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="rounded-2xl bg-card border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Documents</p>
                    {projectDocuments && projectDocuments.length > 0 ? (
                      <div className="space-y-1.5 mt-1">
                        {projectDocuments.map((doc, idx) => (
                          <div key={doc.id || idx} className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground truncate">{doc.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Aucun document ajouté</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className={cn(
        // On mobile, keep this footer ABOVE the fixed bottom menu bar (100px = ~80px nav bar + 20px spacing)
        "px-6 py-4 border-t flex items-center justify-between fixed bottom-[100px] left-0 right-0 z-[10000] sm:sticky sm:bottom-0 bg-background shadow-lg",
        currentStep === totalSteps 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800" 
          : "bg-card/95 backdrop-blur-sm"
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
            onClick={onSave}
            disabled={isSaving}
            className="min-w-[180px] h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            className="min-w-[140px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          >
            <Check className="w-4 h-4 mr-1" />
            Valider
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectInfoWizard;
