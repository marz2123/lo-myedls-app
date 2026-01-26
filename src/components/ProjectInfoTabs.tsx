import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicTemplateFields } from "@/components/DynamicTemplateFields";
import { AdditionalInfoInput } from "@/components/AdditionalInfoInput";
import { Address360AppleStyle } from "@/components/project/Address360AppleStyle";
import { 
  Building2, FileText, Loader2, Trash2, X as XIcon, ChevronRight, MapPin, Car, ImageIcon, Info, Hash, Settings2,
  Plus, GripVertical, Edit2, Layers, Users, Home, Warehouse, TreePine, Trees, DoorOpen,
  ArrowUpDown, Trash, Bike, Flame, Box, Sun, Boxes, FileCheck, Upload, Check, Square, Globe, Store,
  MoveVertical, Waypoints, Building, HomeIcon as HouseIcon, Triangle, Archive, Wrench
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  template_data?: Record<string, string>;
  pdf_files?: Array<{
    name: string;
    path: string;
    uploaded_at: string;
    size: number;
    processed?: boolean;
  }>;
  project_documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    uploadedAt: string;
  }>;
  created_at: string;
  archived: boolean;
}

interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: string;
}

interface PartieCommune {
  id: string;
  name: string;
  type: string;
}

interface PartiePrivative {
  id: string;
  name: string;
  type: string;
  numero?: string;
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

const PROPERTY_TYPES = [
  { value: 'building', label: 'Immeuble', icon: Building2, emoji: '🏢' },
  { value: 'house', label: 'Maison', icon: Home, emoji: '🏠' },
  { value: 'apartment', label: 'Appartement', icon: Building2, emoji: '🏠' },
  { value: 'commercial', label: 'Local commercial', icon: Building2, emoji: '🏪' },
];

interface ProjectInfoTabsProps {
  project: Project;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  isSaving: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  propertyType: string;
  setPropertyType: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  numberOfUnits: string;
  setNumberOfUnits: (value: string) => void;
  hasParking: boolean;
  setHasParking: (value: boolean) => void;
  hasBox: boolean;
  setHasBox: (value: boolean) => void;
  hasGarage: boolean;
  setHasGarage: (value: boolean) => void;
  templateMode: string;
  templateData: Record<string, string>;
  setTemplateData: (value: Record<string, string>) => void;
  additionalInfo: string;
  setAdditionalInfo: (value: string) => void;
  projectDocuments: any[];
  setProjectDocuments: (value: any[]) => void;
  lastUsedTemplateId: string | null;
  handleDissociateTemplate: () => void;
  setPreviewOpen: (value: boolean) => void;
  setCustomTemplateOpen: (value: boolean) => void;
  handleReanalyzePdf: (path: string) => void;
  reanalyzingPdf: string | null;
  setPdfToDelete: (value: { name: string; path: string } | null) => void;
  partiesCommunes: Array<{id: string; name: string; type: string}>;
  setPartiesCommunes: (value: Array<{id: string; name: string; type: string}>) => void;
  partiesPrivatives: Array<{id: string; name: string; type: string; numero?: string}>;
  setPartiesPrivatives: (value: Array<{id: string; name: string; type: string; numero?: string}>) => void;
  t: (key: string) => string;
}

type SectionType = 'property-type' | 'address' | 'address-360' | 'composition' | 'additional-info' | 'photos' | 'documents' | null;

export const ProjectInfoTabs = ({
  project,
  isEditing,
  setIsEditing,
  isSaving,
  onSave,
  onCancelEdit,
  propertyType,
  setPropertyType,
  address,
  setAddress,
  postalCode,
  setPostalCode,
  city,
  setCity,
  numberOfUnits,
  setNumberOfUnits,
  hasParking,
  setHasParking,
  hasBox,
  setHasBox,
  hasGarage,
  setHasGarage,
  templateMode,
  templateData,
  setTemplateData,
  additionalInfo,
  setAdditionalInfo,
  projectDocuments,
  setProjectDocuments,
  lastUsedTemplateId,
  handleDissociateTemplate,
  setPreviewOpen,
  setCustomTemplateOpen,
  handleReanalyzePdf,
  reanalyzingPdf,
  setPdfToDelete,
  partiesCommunes,
  setPartiesCommunes,
  partiesPrivatives,
  setPartiesPrivatives,
  t,
}: ProjectInfoTabsProps) => {
  const { toast: toastHook } = useToast();
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  
  // Coordinates state for Address 360°
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number; codeInsee?: string } | null>(null);
  
  // Composition UI state
  const [showAddCommune, setShowAddCommune] = useState(false);
  const [showAddPrivative, setShowAddPrivative] = useState(false);
  const [editingCommune, setEditingCommune] = useState<string | null>(null);
  const [compositionMode, setCompositionMode] = useState<'communes' | 'privatives'>('communes');
  
  // Document upload state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch coordinates when address changes
  useEffect(() => {
    const fetchCoordinates = async () => {
      if (!address || address.length < 5) {
        setCoordinates(null);
        return;
      }
      
      try {
        const fullAddress = `${address}${postalCode ? ` ${postalCode}` : ''}${city ? ` ${city}` : ''}`;
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            setCoordinates({
              lat: feature.geometry.coordinates[1],
              lon: feature.geometry.coordinates[0],
              codeInsee: feature.properties.citycode,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching coordinates:', error);
      }
    };
    
    fetchCoordinates();
  }, [address, postalCode, city]);

  const isFrench = t('cancel') === 'Annuler';
  const isImmeuble = propertyType === 'building' || propertyType === 'immeuble';

  const propertyTypeLabels: Record<string, string> = {
    building: isFrench ? 'Immeuble' : 'Building',
    house: isFrench ? 'Maison' : 'House',
    apartment: isFrench ? 'Appartement' : 'Apartment',
    commercial: isFrench ? 'Local commercial' : 'Commercial property',
  };

  const photoCount = (project.template_data as any)?.photos?.length || 0;
  const docCount = projectDocuments.length;
  const compositionCount = partiesCommunes.length + partiesPrivatives.length;

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
    
    const newParties = [...updatedParties, newPartie];
    setPartiesCommunes(newParties);
    updateTemplateDataWithComposition(newParties, partiesPrivatives);
    
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
    
    const newParties = [...updatedParties, newPartie];
    setPartiesPrivatives(newParties);
    updateTemplateDataWithComposition(partiesCommunes, newParties);
  };

  const removePartieCommune = (id: string) => {
    const toRemove = partiesCommunes.find(p => p.id === id);
    const newParties = partiesCommunes.filter(p => p.id !== id);
    
    if (toRemove) {
      const remainingOfType = newParties.filter(p => p.type === toRemove.type);
      if (remainingOfType.length === 1) {
        const typeInfo = PARTIES_COMMUNES_TYPES.find(t => t.value === toRemove.type);
        const finalParties = newParties.map(p => {
          if (p.id === remainingOfType[0].id) {
            return { ...p, name: typeInfo?.label || p.name };
          }
          return p;
        });
        setPartiesCommunes(finalParties);
        updateTemplateDataWithComposition(finalParties, partiesPrivatives);
        return;
      }
    }
    
    setPartiesCommunes(newParties);
    updateTemplateDataWithComposition(newParties, partiesPrivatives);
  };

  const removePartiePrivative = (id: string) => {
    const newParties = partiesPrivatives.filter(p => p.id !== id);
    setPartiesPrivatives(newParties);
    updateTemplateDataWithComposition(partiesCommunes, newParties);
  };

  const updatePartieCommuneName = (id: string, name: string) => {
    const newParties = partiesCommunes.map(p => p.id === id ? { ...p, name } : p);
    setPartiesCommunes(newParties);
    updateTemplateDataWithComposition(newParties, partiesPrivatives);
  };

  const updateTemplateDataWithComposition = (communes: PartieCommune[], privatives: PartiePrivative[]) => {
    setTemplateData({ 
      ...templateData, 
      partiesCommunes: communes,
      partiesPrivatives: privatives 
    } as any);
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

      setProjectDocuments([...projectDocuments, newDoc]);
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
      setProjectDocuments(projectDocuments.filter(d => d.id !== doc.id));
      
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

  const handleSaveSection = async () => {
    onSave();
    setActiveSection(null);
  };

  const totalSteps = isImmeuble ? 6 : 5;

  const getStepData = () => {
    if (isImmeuble) {
      return [
        { step: 1, label: 'Type de bien', section: 'property-type' as SectionType },
        { step: 2, label: 'Localisation', section: 'address' as SectionType },
        { step: 3, label: 'Adresse 360°', section: 'address-360' as SectionType },
        { step: 4, label: 'Composition', section: 'composition' as SectionType },
        { step: 5, label: 'Documents', section: 'documents' as SectionType },
        { step: 6, label: 'Récapitulatif', section: null as SectionType },
      ];
    }
    return [
      { step: 1, label: 'Type de bien', section: 'property-type' as SectionType },
      { step: 2, label: 'Localisation', section: 'address' as SectionType },
      { step: 3, label: 'Adresse 360°', section: 'address-360' as SectionType },
      { step: 4, label: 'Documents', section: 'documents' as SectionType },
      { step: 5, label: 'Récapitulatif', section: null as SectionType },
    ];
  };

  const steps = getStepData();

  return (
    <div className="w-full space-y-6">
      {/* Header with project summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-xs font-medium text-primary border-primary/30 bg-primary/5"
          >
            {propertyTypeLabels[project.property_type]}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {project.address}
        </h1>
        {(project.postal_code || project.city) && (
          <p className="text-base text-muted-foreground">
            {[project.postal_code, project.city].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <Separator />

      {/* Step 1: Type de bien */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Type de bien</span>
        </div>
        
        <button
          onClick={() => setActiveSection('property-type')}
          className="w-full apple-button group"
        >
          <div className="apple-button-icon bg-blue-500/10">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-base font-semibold text-foreground leading-tight">
              {propertyTypeLabels[propertyType] || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isFrench ? 'Cliquer pour modifier' : 'Click to edit'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </div>

      <Separator />

      {/* Step 2: Localisation */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Localisation</span>
        </div>
        
        <button
          onClick={() => setActiveSection('address')}
          className="w-full apple-button group"
        >
          <div className="apple-button-icon bg-emerald-500/10">
            <MapPin className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-base font-semibold text-foreground leading-tight">
              {address || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {[postalCode, city].filter(Boolean).join(' · ') || 'Adresse complète'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </div>

      <Separator />

      {/* Step 3: Adresse 360° */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Adresse 360°</span>
        </div>
        
        <button
          onClick={() => setActiveSection('address-360')}
          className="w-full apple-button group"
        >
          <div className="apple-button-icon bg-purple-500/10">
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-base font-semibold text-foreground leading-tight">
              Données enrichies
            </p>
            <p className="text-sm text-muted-foreground">
              Carte, cadastre, risques, climat, analyse IA
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </div>

      <Separator />

      {/* Step 4: Composition (only for Immeuble) */}
      {isImmeuble && (
        <>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                compositionCount > 0 ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
              )}>
                {compositionCount > 0 ? <Check className="w-4 h-4" /> : '4'}
              </div>
              <span className="text-sm font-medium text-muted-foreground">Composition de l'immeuble</span>
            </div>
            
            <button
              onClick={() => setActiveSection('composition')}
              className="w-full apple-button group"
            >
              <div className="apple-button-icon bg-indigo-500/10">
                <Building2 className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-base font-semibold text-foreground leading-tight">
                  {isFrench ? 'Composition de l\'immeuble' : 'Building Composition'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {compositionCount > 0 
                    ? `${partiesCommunes.length} communes · ${partiesPrivatives.length} privatives`
                    : isFrench ? 'Définir les parties' : 'Define parts'}
                </p>
              </div>
              {compositionCount > 0 && (
                <Badge className="bg-primary text-primary-foreground">{compositionCount}</Badge>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          </div>
          <Separator />
        </>
      )}

      {/* Step 5: Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
            docCount > 0 ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
          )}>
            {docCount > 0 ? <Check className="w-4 h-4" /> : (isImmeuble ? '5' : '4')}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Documents</span>
        </div>
        
        <button
          onClick={() => setActiveSection('documents')}
          className="w-full apple-button group"
        >
          <div className="apple-button-icon bg-slate-500/10">
            <FileText className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-base font-semibold text-foreground leading-tight">
              {isFrench ? 'Documents du projet' : 'Project Documents'}
            </p>
            <p className="text-sm text-muted-foreground">
              {docCount > 0 
                ? `${docCount} document(s)`
                : isFrench ? 'Plans, diagnostics, permis...' : 'Plans, diagnostics, permits...'}
            </p>
          </div>
          {docCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{docCount}</Badge>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </div>

      <Separator />

      {/* Step 5: Récapitulatif (Additional Info & Photos) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
            {isImmeuble ? '5' : '4'}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Récapitulatif</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveSection('additional-info')}
            className="apple-button group"
          >
            <div className="apple-button-icon bg-cyan-500/10">
              <Info className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {isFrench ? 'Infos +' : 'More Info'}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {additionalInfo ? (isFrench ? 'Renseigné' : 'Filled') : (isFrench ? 'Vide' : 'Empty')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setActiveSection('photos')}
            className="apple-button group"
          >
            <div className="apple-button-icon bg-pink-500/10">
              <ImageIcon className="w-5 h-5 text-pink-500" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {isFrench ? 'Photos' : 'Photos'}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {photoCount > 0 ? `${photoCount}` : (isFrench ? 'Aucune' : 'None')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        </div>
      </div>

      {/* Property Type Dialog */}
      <Dialog open={activeSection === 'property-type'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              {isFrench ? 'Type de bien' : 'Property Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Property Type Cards */}
            <div className="grid grid-cols-2 gap-3">
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPropertyType(type.value)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                    propertyType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <span className="text-4xl">{type.emoji}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>

            <Separator />

            {/* Template Format Button */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {isFrench ? 'Format template' : 'Template Format'}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setActiveSection(null);
                  setPreviewOpen(true);
                }}
                className="w-full h-14 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all justify-start px-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">
                    {isFrench ? 'Choisir template' : 'Choose Template'}
                  </span>
                </div>
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveSection(null)} className="flex-1 h-12 rounded-xl">
                {isFrench ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveSection} disabled={isSaving} className="flex-1 gap-2 h-12 rounded-xl">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFrench ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={activeSection === 'address'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              {isFrench ? 'Adresse' : 'Address'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {isFrench ? 'Adresse *' : 'Address *'}
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isFrench ? '15 rue de la République' : '123 Main Street'}
                className="h-12 text-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isFrench ? 'Code postal' : 'Postal Code'}</Label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="75001"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>{isFrench ? 'Ville' : 'City'}</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  className="h-12"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveSection(null)} className="flex-1 h-12 rounded-xl">
                {isFrench ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveSection} disabled={isSaving} className="flex-1 gap-2 h-12 rounded-xl">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFrench ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Address 360° Sheet */}
      <Sheet open={activeSection === 'address-360'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              Adresse 360°
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(90vh-80px)] overflow-y-auto">
            <Address360AppleStyle
              address={address}
              postalCode={postalCode}
              city={city}
              lat={coordinates?.lat}
              lon={coordinates?.lon}
              codeInsee={coordinates?.codeInsee}
              projectId={project.id}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Composition Dialog */}
      <Dialog open={activeSection === 'composition'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {isFrench ? 'Composition de l\'immeuble' : 'Building Composition'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Mode Switch Toggle - Apple Style */}
            <div className="flex bg-muted rounded-xl p-1">
              <button
                type="button"
                onClick={() => setCompositionMode('communes')}
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
                onClick={() => setCompositionMode('privatives')}
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

                {partiesPrivatives.length > 0 ? (
                  <div className="space-y-2">
                    {partiesPrivatives.map((partie) => {
                      const typeInfo = PARTIES_PRIVATIVES_TYPES.find(t => t.value === partie.type);
                      return (
                        <Card key={partie.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <span className="text-xl">{typeInfo?.emoji}</span>
                            <span className="flex-1 font-medium">{partie.name}</span>
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
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveSection(null)} className="flex-1 h-12 rounded-xl">
                {isFrench ? 'Fermer' : 'Close'}
              </Button>
              <Button onClick={handleSaveSection} disabled={isSaving} className="flex-1 gap-2 h-12 rounded-xl">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFrench ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet for adding Parties Communes */}
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

      {/* Sheet for adding Parties Privatives */}
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

      {/* Additional Info Dialog */}
      <Dialog open={activeSection === 'additional-info'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-500" />
              {isFrench ? 'Informations complémentaires' : 'Additional Information'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <AdditionalInfoInput
              value={additionalInfo}
              onChange={setAdditionalInfo}
              projectId={project.id}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveSection(null)} className="flex-1 h-12 rounded-xl">
                {isFrench ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={handleSaveSection} disabled={isSaving} className="flex-1 gap-2 h-12 rounded-xl">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFrench ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photos Dialog */}
      <Dialog open={activeSection === 'photos'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-pink-500" />
              {isFrench ? 'Photos' : 'Photos'}
            </DialogTitle>
            <DialogDescription>
              {isFrench ? 'Ajoutez des photos du bien' : 'Add photos of the property'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <PhotosSection 
              project={project} 
              templateData={templateData}
              setTemplateData={setTemplateData}
              isFrench={isFrench}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveSection(null)} className="flex-1 h-12 rounded-xl">
                {isFrench ? 'Fermer' : 'Close'}
              </Button>
              <Button onClick={handleSaveSection} disabled={isSaving} className="flex-1 gap-2 h-12 rounded-xl">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFrench ? 'Enregistrer' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={activeSection === 'documents'} onOpenChange={(open) => !open && setActiveSection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              {isFrench ? 'Documents du projet' : 'Project Documents'}
            </DialogTitle>
            <DialogDescription>
              {isFrench 
                ? 'Plans, diagnostics, permis et autres documents pour l\'extraction de tâches' 
                : 'Plans, diagnostics, permits and other documents for task extraction'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Document Type Buttons - Same as Wizard */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCUMENT_TYPES.map((docType) => {
                const count = projectDocuments.filter(d => d.type === docType.value).length;
                return (
                  <div key={docType.value} className="relative">
                    <input
                      ref={(el) => fileInputRefs.current[docType.value] = el}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleDocumentUpload(e, docType.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-auto py-3 px-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                      onClick={() => fileInputRefs.current[docType.value]?.click()}
                      disabled={isUploadingDoc}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        {isUploadingDoc ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <docType.icon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-center">{docType.label}</span>
                    </Button>
                    {count > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {count}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Uploaded Documents List */}
            {projectDocuments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {isFrench ? 'Documents téléchargés' : 'Uploaded documents'}
                </p>
                <div className="space-y-2">
                  {projectDocuments.map((doc) => {
                    const typeInfo = DOCUMENT_TYPES.find(t => t.value === doc.type);
                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeInfo?.label} · {formatFileSize(doc.size)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {projectDocuments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {isFrench 
                    ? 'Aucun document. Cliquez sur une catégorie pour ajouter.' 
                    : 'No documents. Click a category to add.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Photos section component
const PhotosSection = ({ 
  project, 
  templateData,
  setTemplateData,
  isFrench
}: { 
  project: Project; 
  templateData: Record<string, string>;
  setTemplateData: (value: Record<string, string>) => void;
  isFrench: boolean;
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>((templateData as any)?.photos || []);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const result = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      newPhotos.push(result);
    }

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    setTemplateData({ ...templateData, photos: updatedPhotos } as any);
    setUploading(false);

    toast({
      title: isFrench ? '✅ Photos ajoutées' : '✅ Photos added',
      description: `${newPhotos.length} photo(s)`,
    });
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    setTemplateData({ ...templateData, photos: updatedPhotos } as any);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoUpload}
      />
      
      {/* Upload area */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30"
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isFrench ? 'Cliquez pour ajouter des photos' : 'Click to add photos'}
            </span>
          </>
        )}
      </button>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {photos.length} photo(s)
        </p>
      )}
    </div>
  );
};

export default ProjectInfoTabs;
