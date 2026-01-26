import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Video,
  Camera,
  Mic,
  ChevronRight,
  Home,
  Building2,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  X,
  FileText,
  Edit2,
  Eye,
  Info,
  Plus,
  Layers,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  DoorOpen,
  Mail,
  Bed,
  Sofa,
  UtensilsCrossed,
  Bath,
  WashingMachine,
  Briefcase,
  Warehouse,
  Car,
  TreePine,
  Sun,
  CloudRain,
  MoveVertical,
  Package,
  ShoppingBag,
  ClipboardList,
  Zap,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { useVisitSequences } from '@/hooks/useVisitSequences';
import { getPartieIcon, getPartieEmoji } from '@/lib/partieIcons';
import { VisitSequenceRecorder } from '@/components/visit/VisitSequenceRecorder';
import { TextVoiceRecorder } from '@/components/visit/TextVoiceRecorder';
import { ZoneProblemCapture } from '@/components/visit/ZoneProblemCapture';
import { VideoContinueCapture } from '@/components/visit/VideoContinueCapture';
import { ReportageEnhanced } from '@/components/visit/ReportageEnhanced';
import { AITaskExtractionStatus } from '@/components/visit/AITaskExtractionStatus';
import { ReportageBreadcrumbs } from '@/components/visit/ReportageBreadcrumbs';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { ZONE_TYPE_LABELS, type ZoneType } from '@/types/businessModel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============= TYPE DEFINITIONS =============

interface Piece {
  id: string;
  type: string;
  name: string;
}

interface Lieu {
  id: string;
  name: string;
  type: string;
  partType: 'commune' | 'privative';
  partId: string;
  pieces?: Piece[];
}

interface VideoReportageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  partiesCommunes: Array<{ id: string; name: string; type: string }>;
  partiesPrivatives: Array<{ id: string; name: string; type: string; numero?: string; pieces?: Piece[] }>;
  initialLocationId?: string | null;
  initialEndroitName?: string | null;
  initialZoneType?: string | null;
  initialDescription?: string | null;
  initialSequenceId?: string | null;
  initialMode?: 'guided' | 'free' | null;
}

// ============= VIEW & RECORDING STATES =============

type ReportageMode = 'select-mode' | 'guided' | 'free';

type ViewState = 
  | 'select-partie'      // Niveau 1: Commune ou Privative
  | 'select-lieu'        // Niveau 2: Liste des lieux
  | 'select-endroit'     // Niveau 3: Pièces/Endroits dans un lieu
  | 'select-zone'        // Niveau 4: Zones + modes capture
  | 'recording';         // Capture en cours

type RecordingMode = 'video' | 'photo' | 'text' | null;

// ============= CONSTANTS =============

// Types d'endroits (pièces) - icônes Lucide pour style Apple
const ENDROIT_TYPE_INFO: Record<string, { icon: any; emoji: string; gradient: string; label: string }> = {
  // Pièces privatives
  chambre: { icon: Bed, emoji: '🛏️', gradient: 'from-blue-500 to-blue-600', label: 'Chambre' },
  sejour: { icon: Sofa, emoji: '🛋️', gradient: 'from-emerald-500 to-emerald-600', label: 'Séjour' },
  salon: { icon: Sofa, emoji: '🪑', gradient: 'from-purple-500 to-purple-600', label: 'Salon' },
  cuisine: { icon: UtensilsCrossed, emoji: '🍳', gradient: 'from-orange-500 to-orange-600', label: 'Cuisine' },
  cuisine_ouverte: { icon: UtensilsCrossed, emoji: '🍳', gradient: 'from-orange-500 to-orange-600', label: 'Cuisine ouverte' },
  cuisine_fermee: { icon: UtensilsCrossed, emoji: '🍽️', gradient: 'from-pink-500 to-pink-600', label: 'Cuisine fermée' },
  sdb: { icon: Bath, emoji: '🛁', gradient: 'from-cyan-500 to-cyan-600', label: 'Salle de bain' },
  sdo: { icon: Bath, emoji: '🚿', gradient: 'from-teal-500 to-teal-600', label: 'Salle d\'eau' },
  wc: { icon: Bath, emoji: '🚽', gradient: 'from-gray-500 to-gray-600', label: 'WC' },
  entree: { icon: DoorOpen, emoji: '🚪', gradient: 'from-indigo-500 to-indigo-600', label: 'Entrée' },
  couloir: { icon: MoveVertical, emoji: '🚶', gradient: 'from-slate-500 to-slate-600', label: 'Couloir' },
  bureau: { icon: Briefcase, emoji: '💼', gradient: 'from-blue-600 to-blue-700', label: 'Bureau' },
  dressing: { icon: Warehouse, emoji: '👕', gradient: 'from-purple-600 to-purple-700', label: 'Dressing' },
  cellier: { icon: Package, emoji: '📦', gradient: 'from-amber-500 to-amber-600', label: 'Cellier' },
  buanderie: { icon: WashingMachine, emoji: '🧺', gradient: 'from-lime-500 to-lime-600', label: 'Buanderie' },
  balcon: { icon: Sun, emoji: '☀️', gradient: 'from-yellow-500 to-yellow-600', label: 'Balcon' },
  terrasse: { icon: Sun, emoji: '🌅', gradient: 'from-orange-600 to-orange-700', label: 'Terrasse' },
  
  // Parties communes - Hall d'entrée
  sas: { icon: DoorOpen, emoji: '🚪', gradient: 'from-blue-500 to-blue-600', label: 'Sas d\'entrée' },
  local_boites: { icon: Mail, emoji: '📬', gradient: 'from-emerald-500 to-emerald-600', label: 'Local boîtes aux lettres' },
  acces: { icon: ArrowUp, emoji: '🛗', gradient: 'from-purple-500 to-purple-600', label: 'Accès ascenseur' },
  local: { icon: Warehouse, emoji: '🗄️', gradient: 'from-orange-500 to-orange-600', label: 'Local' },
  
  // Parties communes - Cage d'escalier
  palier: { icon: Layers, emoji: '🚶', gradient: 'from-gray-600 to-gray-700', label: 'Palier' },
  volee: { icon: MoveVertical, emoji: '🪜', gradient: 'from-indigo-500 to-indigo-600', label: 'Volées d\'escalier' },
  
  // Parties communes - Autres
  cave: { icon: Warehouse, emoji: '🍷', gradient: 'from-purple-700 to-purple-800', label: 'Cave' },
  garage: { icon: Car, emoji: '🚗', gradient: 'from-slate-600 to-slate-700', label: 'Garage' },
  jardin: { icon: TreePine, emoji: '🌳', gradient: 'from-green-500 to-green-600', label: 'Jardin' },
  
  // Parties communes - Façade
  facade_rue: { icon: Building2, emoji: '🏢', gradient: 'from-blue-500 to-blue-600', label: 'Façade rue' },
  facade_cour: { icon: Building2, emoji: '🏠', gradient: 'from-emerald-500 to-emerald-600', label: 'Façade cour' },
  pignon: { icon: Building2, emoji: '🏛️', gradient: 'from-purple-500 to-purple-600', label: 'Pignon' },
  
  // Parties communes - Autres types
  circulation: { icon: MoveVertical, emoji: '🚗', gradient: 'from-slate-500 to-slate-600', label: 'Circulation' },
  places: { icon: Car, emoji: '🅿️', gradient: 'from-blue-600 to-blue-700', label: 'Places' },
  allee: { icon: MoveVertical, emoji: '🛤️', gradient: 'from-gray-500 to-gray-600', label: 'Allées' },
  equipements: { icon: Package, emoji: '🔧', gradient: 'from-amber-500 to-amber-600', label: 'Équipements' },
  zone: { icon: MapPin, emoji: '📍', gradient: 'from-indigo-500 to-indigo-600', label: 'Zone' },
  garde_corps: { icon: Building2, emoji: '🛡️', gradient: 'from-red-500 to-red-600', label: 'Garde-corps' },
  gaine: { icon: MoveVertical, emoji: '⬆️', gradient: 'from-gray-600 to-gray-700', label: 'Gaine' },
  machinerie: { icon: Package, emoji: '⚙️', gradient: 'from-slate-600 to-slate-700', label: 'Machinerie' },
  cabine: { icon: ArrowUp, emoji: '🛗', gradient: 'from-blue-600 to-blue-700', label: 'Cabine' },
  global: { icon: Eye, emoji: '👁️', gradient: 'from-purple-500 to-purple-600', label: 'Vue d\'ensemble' },
  
  // Parties communes - Toiture
  versant: { icon: TrendingUp, emoji: '📐', gradient: 'from-pink-500 to-pink-600', label: 'Versant' },
  faitage: { icon: TrendingUp, emoji: '🔺', gradient: 'from-red-500 to-red-600', label: 'Faîtage' },
  noues: { icon: CloudRain, emoji: '💧', gradient: 'from-cyan-500 to-cyan-600', label: 'Noues/Rives' },
  souches: { icon: Building2, emoji: '🏭', gradient: 'from-gray-500 to-gray-600', label: 'Souches cheminées' },
};

// Zones de base disponibles - icônes optimisées et représentatives
const ALL_ZONES = {
  // Zones intérieures générales
  mur: { id: 'mur', label: 'Mur', emoji: '🧱' },
  sol: { id: 'sol', label: 'Sol', emoji: '🪨' },
  plafond: { id: 'plafond', label: 'Plafond', emoji: '⬜' },
  fenetre: { id: 'fenetre', label: 'Fenêtre', emoji: '🪟' },
  porte: { id: 'porte', label: 'Porte', emoji: '🚪' },
  radiateur: { id: 'radiateur', label: 'Radiateur', emoji: '♨️' },
  vmc: { id: 'vmc', label: 'VMC', emoji: '🌀' },
  electricite: { id: 'electricite', label: 'Électricité', emoji: '⚡' },
  equipement: { id: 'equipement', label: 'Équipement', emoji: '🔧' },
  sanitaires: { id: 'sanitaires', label: 'Sanitaires', emoji: '🚿' },
  
  // Zones façade
  revetement_facade: { id: 'revetement_facade', label: 'Revêtement façade', emoji: '🏛️' },
  menuiseries_ext: { id: 'menuiseries_ext', label: 'Menuiseries ext.', emoji: '🪟' },
  balcons: { id: 'balcons', label: 'Balcons', emoji: '🏠' },
  garde_corps: { id: 'garde_corps', label: 'Garde-corps', emoji: '🛡️' },
  volets: { id: 'volets', label: 'Volets/Stores', emoji: '🪵' },
  
  // Zones toiture spécifiques
  couverture: { id: 'couverture', label: 'Couverture', emoji: '🏠' },
  charpente: { id: 'charpente', label: 'Charpente', emoji: '🪵' },
  gouttieres: { id: 'gouttieres', label: 'Gouttières', emoji: '🌧️' },
  faitage: { id: 'faitage', label: 'Faîtage', emoji: '🔺' },
  cheminee: { id: 'cheminee', label: 'Cheminée', emoji: '🏭' },
  velux: { id: 'velux', label: 'Velux/Fenêtre', emoji: '🔳' },
  etancheite: { id: 'etancheite', label: 'Étanchéité', emoji: '💧' },
  isolation_toiture: { id: 'isolation_toiture', label: 'Isolation', emoji: '🧤' },
  zinguerie: { id: 'zinguerie', label: 'Zinguerie', emoji: '🔩' },
  panneaux_solaires: { id: 'panneaux_solaires', label: 'Panneaux solaires', emoji: '☀️' },
  toit_terrasse: { id: 'toit_terrasse', label: 'Toit terrasse', emoji: '🏗️' },
  trappe_desenfumage: { id: 'trappe_desenfumage', label: 'Trappe désenfumage', emoji: '🚒' },
  antenne: { id: 'antenne', label: 'Antenne', emoji: '📡' },
  
  // Zones parties communes
  eclairage: { id: 'eclairage', label: 'Éclairage', emoji: '💡' },
  signalisation: { id: 'signalisation', label: 'Signalisation', emoji: '🪧' },
  escalier: { id: 'escalier', label: 'Escalier', emoji: '🪜' },
  rampe: { id: 'rampe', label: 'Rampe', emoji: '📏' },
  boites_lettres: { id: 'boites_lettres', label: 'Boîtes aux lettres', emoji: '📬' },
  interphone: { id: 'interphone', label: 'Interphone', emoji: '🔔' },
  ascenseur: { id: 'ascenseur', label: 'Ascenseur', emoji: '🛗' },
  
  // Zones cuisine
  plan_travail: { id: 'plan_travail', label: 'Plan de travail', emoji: '🍽️' },
  meuble: { id: 'meuble', label: 'Meuble', emoji: '🗄️' },
  credence: { id: 'credence', label: 'Crédence', emoji: '🔲' },
  evier: { id: 'evier', label: 'Évier', emoji: '🚰' },
  
  // Zones extérieures
  cloture: { id: 'cloture', label: 'Clôture/Portail', emoji: '🚪' },
  allee: { id: 'allee', label: 'Allée/Chemin', emoji: '🛤️' },
  vegetation: { id: 'vegetation', label: 'Végétation', emoji: '🌳' },
};

// Zones contextuelles par type de lieu
const getZonesForContext = (lieuName: string, endroitName?: string): typeof ALL_ZONES[keyof typeof ALL_ZONES][] => {
  const name = (endroitName || lieuName).toLowerCase();
  
  // TOITURE - zones spécifiques toit (extérieur)
  if ((name.includes('toiture') || name.includes('toit')) && !name.includes('comble')) {
    return [ALL_ZONES.couverture, ALL_ZONES.charpente, ALL_ZONES.gouttieres, ALL_ZONES.faitage, ALL_ZONES.cheminee, ALL_ZONES.velux, ALL_ZONES.etancheite, ALL_ZONES.zinguerie, ALL_ZONES.isolation_toiture, ALL_ZONES.panneaux_solaires, ALL_ZONES.toit_terrasse, ALL_ZONES.trappe_desenfumage, ALL_ZONES.antenne];
  }
  
  // COMBLES - zones spécifiques combles (intérieur)
  if (name.includes('comble')) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.charpente, ALL_ZONES.isolation_toiture, ALL_ZONES.velux, ALL_ZONES.electricite, ALL_ZONES.vmc];
  }
  
  // FAÇADE - zones spécifiques façade
  if (['facade', 'façade', 'pignon'].some(k => name.includes(k))) {
    return [ALL_ZONES.revetement_facade, ALL_ZONES.menuiseries_ext, ALL_ZONES.volets, ALL_ZONES.balcons, ALL_ZONES.garde_corps, ALL_ZONES.eclairage];
  }
  
  // Hall d'entrée / Entrée commune
  if (['hall', 'entrée commune', 'entree commune', 'accès', 'acces'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.boites_lettres, ALL_ZONES.interphone, ALL_ZONES.eclairage];
  }
  
  // Cage d'escalier
  if (['cage', 'escalier'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.escalier, ALL_ZONES.rampe, ALL_ZONES.garde_corps, ALL_ZONES.electricite, ALL_ZONES.eclairage];
  }
  
  // Couloir / Palier
  if (['couloir', 'palier', 'dégagement', 'degagement'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.eclairage];
  }
  
  // Cave / Local technique / Chaufferie
  if (['cave', 'local technique', 'chaufferie', 'sous-sol'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.equipement, ALL_ZONES.vmc];
  }
  
  // Parking / Garage / Box
  if (['parking', 'garage', 'box', 'stationnement'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.signalisation, ALL_ZONES.eclairage];
  }
  
  // Jardin / Espace vert
  if (['jardin', 'espace vert', 'parc'].some(k => name.includes(k))) {
    return [ALL_ZONES.sol, ALL_ZONES.cloture, ALL_ZONES.allee, ALL_ZONES.vegetation, ALL_ZONES.eclairage, ALL_ZONES.equipement];
  }
  
  // Cour
  if (name.includes('cour')) {
    return [ALL_ZONES.sol, ALL_ZONES.mur, ALL_ZONES.cloture, ALL_ZONES.eclairage, ALL_ZONES.allee];
  }
  
  // Terrasse commune
  if (name.includes('terrasse commune')) {
    return [ALL_ZONES.sol, ALL_ZONES.garde_corps, ALL_ZONES.etancheite, ALL_ZONES.eclairage, ALL_ZONES.equipement];
  }
  
  // Cuisine
  if (['cuisine', 'kitchenette'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.fenetre, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.vmc, ALL_ZONES.plan_travail, ALL_ZONES.credence, ALL_ZONES.evier, ALL_ZONES.meuble];
  }
  
  // Salle de bain / Salle d'eau
  if (['sdb', 'salle de bain', 'sdo', 'salle d\'eau', 'salle d eau'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.sanitaires, ALL_ZONES.vmc, ALL_ZONES.meuble];
  }
  
  // WC
  if (['wc', 'toilette', 'cabinet'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.sanitaires, ALL_ZONES.vmc];
  }
  
  // Buanderie / Cellier
  if (['buanderie', 'cellier', 'lingerie'].some(k => name.includes(k))) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.equipement, ALL_ZONES.vmc];
  }
  
  // Balcon / Terrasse privative / Loggia
  if (['balcon', 'terrasse', 'loggia'].some(k => name.includes(k)) && !name.includes('commune')) {
    return [ALL_ZONES.sol, ALL_ZONES.garde_corps, ALL_ZONES.mur, ALL_ZONES.etancheite];
  }
  
  // Entrée privative
  if (['entrée', 'entree'].some(k => name.includes(k)) && !name.includes('hall')) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite];
  }
  
  // Dressing
  if (name.includes('dressing')) {
    return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.porte, ALL_ZONES.electricite, ALL_ZONES.meuble];
  }
  
  // Pièces de vie par défaut (Chambre, Séjour, Salon, Bureau)
  return [ALL_ZONES.mur, ALL_ZONES.sol, ALL_ZONES.plafond, ALL_ZONES.fenetre, ALL_ZONES.porte, ALL_ZONES.radiateur, ALL_ZONES.electricite];
};

// ============= MAIN COMPONENT =============

export const VideoReportageDialog = ({
  open,
  onOpenChange,
  projectId,
  partiesCommunes,
  partiesPrivatives,
  initialLocationId,
  initialEndroitName,
  initialZoneType,
  initialDescription,
  initialSequenceId,
  initialMode,
}: VideoReportageDialogProps) => {
  // Navigation
  const navigate = useNavigate();
  
  // Mode state
  const [reportageMode, setReportageMode] = useState<ReportageMode>('select-mode');
  const [showFreeCapture, setShowFreeCapture] = useState(false);
  const [showVideoContinueInfo, setShowVideoContinueInfo] = useState(false);
  const [showEnhancedMode, setShowEnhancedMode] = useState(false);
  
  // Navigation state
  const [viewState, setViewState] = useState<ViewState>('select-partie');
  const [selectedPartie, setSelectedPartie] = useState<'commune' | 'privative' | null>(null);
  const [selectedLieu, setSelectedLieu] = useState<Lieu | null>(null);
  const [selectedEndroit, setSelectedEndroit] = useState<Piece | null>(null);
  const [selectedZone, setSelectedZone] = useState<{ id: string; label: string; emoji: string } | null>(null);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(null);
  const [showLieuDetails, setShowLieuDetails] = useState(false);
  const [showProblemCapture, setShowProblemCapture] = useState(false);
  const [showAddZoneDialog, setShowAddZoneDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [customZones, setCustomZones] = useState<Array<{ id: string; label: string; emoji: string }>>([]);
  const [enhancedCompletedZones, setEnhancedCompletedZones] = useState(0);
  const [lastSavedSequenceId, setLastSavedSequenceId] = useState<string | null>(null);
  
  // Hooks
  const { parts, loadStructure } = usePropertyStructure(projectId);
  const { sequences, problems, tasks } = useVisitSequences(projectId);
  const { addToQueue, isOnline, queueSize, isSyncing, forceSync } = useOfflineQueue();

  // Apply initial mode when dialog opens
  useEffect(() => {
    if (open && initialMode) {
      setReportageMode(initialMode);
      if (initialMode === 'free') {
        setShowFreeCapture(true);
      }
    } else if (!open) {
      // Reset state when closing
      setReportageMode('select-mode');
      setShowFreeCapture(false);
    }
  }, [open, initialMode]);

  // Update info dialog visibility when mode changes
  useEffect(() => {
    if (reportageMode === 'guided') {
      const dismissed = localStorage.getItem('myedls_reportage_info_dismissed');
      setShowInfoDialog(dismissed !== 'true');
    } else if (reportageMode === 'free') {
      const dismissed = localStorage.getItem('myedls_reportage_free_info_dismissed');
      setShowInfoDialog(dismissed !== 'true');
    }
    setDontShowAgain(false);
  }, [reportageMode]);

  useEffect(() => {
    if (open) {
      loadStructure();
    }
  }, [open, loadStructure]);

  // Pre-navigate to location when initial props are provided
  useEffect(() => {
    if (!open || !initialLocationId || !parts.length) return;

    // Find the location and its partie type
    const communeLocation = partiesCommunes.find(loc => loc.id === initialLocationId);
    const privativeLocation = partiesPrivatives.find(loc => loc.id === initialLocationId);
    
    if (communeLocation) {
      setSelectedPartie('commune');
      const lieu: Lieu = {
        id: communeLocation.id,
        name: communeLocation.name,
        type: communeLocation.type,
        partType: 'commune',
        partId: parts.find(p => p.part_type === 'commune')?.id || '',
      };
      setSelectedLieu(lieu);
      
      if (initialEndroitName) {
        setSelectedEndroit({ id: 'initial', type: 'global', name: initialEndroitName });
      }
      
      if (initialZoneType) {
        const zone = ALL_ZONES[initialZoneType as keyof typeof ALL_ZONES];
        if (zone) {
          setSelectedZone(zone);
        }
      }
      
      setViewState(initialZoneType ? 'select-zone' : (initialEndroitName ? 'select-zone' : 'select-endroit'));
      
      // Auto-open problem capture if we have an existing description
      if (initialDescription && initialEndroitName && initialZoneType) {
        setRecordingMode('text');
        setShowProblemCapture(true);
      }
    } else if (privativeLocation) {
      setSelectedPartie('privative');
      const lieu: Lieu = {
        id: privativeLocation.id,
        name: privativeLocation.name,
        type: privativeLocation.type,
        partType: 'privative',
        partId: parts.find(p => p.part_type === 'privative')?.id || '',
        pieces: privativeLocation.pieces,
      };
      setSelectedLieu(lieu);
      
      if (initialEndroitName) {
        setSelectedEndroit({ id: 'initial', type: 'global', name: initialEndroitName });
      }
      
      if (initialZoneType) {
        const zone = ALL_ZONES[initialZoneType as keyof typeof ALL_ZONES];
        if (zone) {
          setSelectedZone(zone);
        }
      }
      
      setViewState(initialZoneType ? 'select-zone' : (initialEndroitName ? 'select-zone' : 'select-endroit'));
      
      // Auto-open problem capture if we have an existing description
      if (initialDescription && initialEndroitName && initialZoneType) {
        setRecordingMode('text');
        setShowProblemCapture(true);
      }
    }
  }, [open, initialLocationId, initialEndroitName, initialZoneType, initialDescription, parts, partiesCommunes, partiesPrivatives]);

  // Load custom zones when location is selected
  useEffect(() => {
    const loadCustomZones = async () => {
      if (!selectedLieu) {
        setCustomZones([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('location_zones')
          .select('id, custom_name, zone_type')
          .eq('location_id', selectedLieu.id)
          .eq('zone_type', 'autre')
          .order('order_index');
        
        if (error) throw error;
        
        const zones = (data || []).map(z => ({
          id: z.id,
          label: z.custom_name || 'Zone personnalisée',
          emoji: '📍'
        }));
        
        setCustomZones(zones);
      } catch (error) {
        console.error('Error loading custom zones:', error);
      }
    };
    
    loadCustomZones();
  }, [selectedLieu]);

  // ============= NAVIGATION HANDLERS =============

  const resetState = () => {
    setViewState('select-partie');
    setSelectedPartie(null);
    setSelectedLieu(null);
    setSelectedEndroit(null);
    setSelectedZone(null);
    setRecordingMode(null);
    setReportageMode('select-mode');
    setShowEnhancedMode(false);
    setEnhancedCompletedZones(0);
  };

  // Enhanced mode handlers
  const handleEnhancedNext = useCallback(() => {
    // Move to next zone or endroit
    if (selectedLieu && selectedEndroit) {
      const zones = getZonesForContext(selectedLieu.name, selectedEndroit.name);
      const currentIndex = selectedZone ? zones.findIndex(z => z.id === selectedZone.id) : -1;
      if (currentIndex < zones.length - 1) {
        setSelectedZone(zones[currentIndex + 1]);
        setEnhancedCompletedZones(prev => prev + 1);
      } else {
        // All zones done, go back to select-zone
        setShowEnhancedMode(false);
        setViewState('select-zone');
        toast.success('Toutes les zones sont terminées !');
      }
    }
  }, [selectedLieu, selectedEndroit, selectedZone]);

  const handleEnhancedBack = useCallback(() => {
    // Go back to zone selection
    setShowEnhancedMode(false);
    setViewState('select-zone');
  }, []);

  const handleEnhancedPhoto = useCallback(async () => {
    toast.info('📸 Photo capturée');
    // In a real implementation, this would trigger camera
  }, []);

  const handleEnhancedZoneSelect = useCallback((zoneId: string) => {
    const zone = Object.values(ALL_ZONES).find(z => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
    }
  }, []);

  const handleEnhancedSave = useCallback(async (data: any) => {
    try {
      // Create sequence from enhanced recording
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        toast.error('Non authentifié');
        return;
      }

      // Structure comme lo-myhome : endroit_name, zone_type dans metadata JSONB
      const sequenceData = {
        project_id: projectId,
        user_id: session.session.user.id,
        location_id: selectedLieu?.id,
        part_id: selectedLieu?.partId,
        status: 'completed',
        photos: [],
        detected_zones: selectedZone?.id ? [selectedZone.id] : [],
        transcription: data.transcript || '',
        metadata: {
          endroit_name: selectedEndroit?.name || null,
          zone_type: selectedZone?.id || 'autre',
          partie_type: selectedPartie,
          lieu_name: selectedLieu?.name,
          capture_mode: 'step_by_step',
        },
      };

      // Essayer de sauvegarder directement si en ligne
      if (isOnline) {
        const { data: insertedSequence, error } = await supabase
          .from('visit_sequences')
          .insert(sequenceData)
          .select()
          .single();
        
        if (error) {
          // Si erreur réseau, ajouter à la queue offline
          if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
            await addToQueue('sequence', sequenceData);
            toast.info('Séquence sauvegardée localement. Synchronisation automatique dès reconnexion.');
            setEnhancedCompletedZones(prev => prev + 1);
            handleEnhancedNext();
            return;
          }
          throw error;
        }

        if (insertedSequence) {
          setLastSavedSequenceId(insertedSequence.id);
        }

        setEnhancedCompletedZones(prev => prev + 1);
        toast.success('Séquence enregistrée !');
        
        // Move to next zone
        handleEnhancedNext();
      } else {
        // Mode offline : ajouter à la queue
        await addToQueue('sequence', sequenceData);
        toast.info('Séquence sauvegardée localement. Synchronisation automatique dès reconnexion.');
        setEnhancedCompletedZones(prev => prev + 1);
        handleEnhancedNext();
      }
    } catch (error) {
      console.error('Error saving enhanced sequence:', error);
      // En cas d'erreur, essayer quand même la queue offline
      try {
        const fallbackData = {
          project_id: projectId,
          user_id: (await supabase.auth.getSession()).data.session?.user?.id,
          location_id: selectedLieu?.id,
          part_id: selectedLieu?.partId,
          status: 'completed',
          photos: [],
          detected_zones: selectedZone?.id ? [selectedZone.id] : [],
          transcription: data.transcript || '',
          metadata: {
            endroit_name: selectedEndroit?.name || null,
            zone_type: selectedZone?.id || 'autre',
            partie_type: selectedPartie,
            lieu_name: selectedLieu?.name,
            capture_mode: 'step_by_step',
          },
        };
        await addToQueue('sequence', fallbackData);
        toast.info('Séquence sauvegardée localement suite à une erreur réseau.');
        setEnhancedCompletedZones(prev => prev + 1);
        handleEnhancedNext();
      } catch (queueError) {
        toast.error('Erreur lors de l\'enregistrement');
      }
    }
  }, [projectId, selectedLieu, selectedPartie, selectedEndroit, selectedZone, handleEnhancedNext, isOnline, addToQueue]);

  // Navigation handler for breadcrumbs
  const handleBreadcrumbNavigate = useCallback((level: 'partie' | 'lieu' | 'endroit' | 'zone', id?: string) => {
    switch (level) {
      case 'partie':
        setViewState('select-partie');
        setSelectedPartie(null);
        setSelectedLieu(null);
        setSelectedEndroit(null);
        setSelectedZone(null);
        break;
      case 'lieu':
        setViewState('select-lieu');
        setSelectedLieu(null);
        setSelectedEndroit(null);
        setSelectedZone(null);
        break;
      case 'endroit':
        setViewState('select-endroit');
        setSelectedEndroit(null);
        setSelectedZone(null);
        break;
      case 'zone':
        setViewState('select-zone');
        setSelectedZone(null);
        break;
    }
  }, []);

  const handleBack = () => {
    switch (viewState) {
      case 'recording':
        setViewState('select-zone');
        setRecordingMode(null);
        break;
      case 'select-zone':
        if (selectedEndroit) {
          setViewState('select-endroit');
          setSelectedZone(null);
        } else if (selectedLieu?.pieces?.length) {
          setViewState('select-endroit');
          setSelectedZone(null);
        } else {
          setViewState('select-lieu');
          setSelectedZone(null);
          setSelectedEndroit(null);
        }
        break;
      case 'select-endroit':
        setViewState('select-lieu');
        setSelectedEndroit(null);
        break;
      case 'select-lieu':
        setViewState('select-partie');
        setSelectedPartie(null);
        setSelectedLieu(null);
        break;
      case 'select-partie':
        // Close dialog when at top level
        onOpenChange(false);
        break;
      default:
        break;
    }
  };

  const handleSelectPartie = (type: 'commune' | 'privative') => {
    // Fermer le dialog d'info s'il est ouvert
    if (showInfoDialog) {
      setShowInfoDialog(false);
      if (dontShowAgain) {
        localStorage.setItem('myedls_reportage_info_dismissed', 'true');
      }
    }
    setSelectedPartie(type);
    setViewState('select-lieu');
  };

  // Pièces par défaut pour les parties privatives sans pièces définies
  const DEFAULT_PIECES_PRIVATIVES: Piece[] = [
    { id: 'default_sejour', type: 'sejour', name: 'Séjour' },
    { id: 'default_cuisine', type: 'cuisine', name: 'Cuisine' },
    { id: 'default_chambre', type: 'chambre', name: 'Chambre' },
    { id: 'default_sdb', type: 'sdb', name: 'Salle de bain' },
    { id: 'default_wc', type: 'wc', name: 'WC' },
    { id: 'default_entree', type: 'entree', name: 'Entrée' },
  ];

  // Endroits par défaut pour les parties communes selon le type
  const getDefaultPiecesCommunes = (lieuName: string): Piece[] => {
    const name = lieuName.toLowerCase();
    
    // Façade - orientations géographiques
    if (name.includes('facade') || name.includes('façade')) {
      return [
        { id: 'default_facade_rue', type: 'facade_rue', name: 'Façade rue' },
        { id: 'default_facade_cour', type: 'facade_cour', name: 'Façade cour' },
        { id: 'default_pignon', type: 'pignon', name: 'Pignon' },
        { id: 'default_global', type: 'global', name: 'Vue d\'ensemble' },
      ];
    }
    
    // Pignon spécifique
    if (name.includes('pignon')) {
      return [
        { id: 'default_pignon_gauche', type: 'pignon', name: 'Pignon gauche' },
        { id: 'default_pignon_droit', type: 'pignon', name: 'Pignon droit' },
        { id: 'default_global', type: 'global', name: 'Vue d\'ensemble' },
      ];
    }
    
    // Toiture - extérieur du toit
    if (name.includes('toiture') || name.includes('toit')) {
      return [
        { id: 'default_versant_rue', type: 'versant', name: 'Versant rue' },
        { id: 'default_versant_cour', type: 'versant', name: 'Versant cour' },
        { id: 'default_faitage', type: 'faitage', name: 'Faîtage' },
        { id: 'default_noues', type: 'noues', name: 'Noues/Rives' },
        { id: 'default_souches', type: 'souches', name: 'Souches cheminées' },
      ];
    }
    
    // Combles - espace intérieur sous le toit
    if (name.includes('comble')) {
      return [
        { id: 'default_acces_trappe', type: 'acces', name: 'Accès/Trappe' },
        { id: 'default_charpente', type: 'equipements', name: 'Charpente' },
        { id: 'default_isolation', type: 'equipements', name: 'Isolation' },
        { id: 'default_plancher', type: 'sol', name: 'Plancher' },
        { id: 'default_ventilation', type: 'equipements', name: 'Ventilation' },
        { id: 'default_global', type: 'global', name: 'Vue d\'ensemble' },
      ];
    }
    
    // Cage d'escalier
    if (name.includes('cage') || name.includes('escalier')) {
      return [
        { id: 'default_rdc', type: 'palier', name: 'Palier RDC' },
        { id: 'default_etage1', type: 'palier', name: 'Palier 1er' },
        { id: 'default_etage2', type: 'palier', name: 'Palier 2ème' },
        { id: 'default_etage3', type: 'palier', name: 'Palier 3ème' },
        { id: 'default_volees', type: 'volee', name: 'Volées d\'escalier' },
      ];
    }
    
    // Hall d'entrée
    if (name.includes('hall') || name.includes('entrée') || name.includes('entree')) {
      return [
        { id: 'default_sas', type: 'sas', name: 'Sas d\'entrée' },
        { id: 'default_local_boites', type: 'local', name: 'Local boîtes aux lettres' },
        { id: 'default_acces_ascenseur', type: 'acces', name: 'Accès ascenseur' },
      ];
    }
    
    // Parking/Garage
    if (name.includes('parking') || name.includes('garage') || name.includes('box')) {
      return [
        { id: 'default_acces_vehicules', type: 'acces', name: 'Accès véhicules' },
        { id: 'default_circulation', type: 'circulation', name: 'Circulation' },
        { id: 'default_places', type: 'places', name: 'Places de stationnement' },
        { id: 'default_local_technique', type: 'local', name: 'Local technique' },
      ];
    }
    
    // Cave/Sous-sol
    if (name.includes('cave') || name.includes('sous-sol') || name.includes('local')) {
      return [
        { id: 'default_couloir_caves', type: 'couloir', name: 'Couloir caves' },
        { id: 'default_boxes_caves', type: 'boxes', name: 'Boxes/Celliers' },
        { id: 'default_local_poubelle', type: 'local', name: 'Local poubelles' },
        { id: 'default_local_velo', type: 'local', name: 'Local vélos' },
      ];
    }
    
    // Cour/Jardin
    if (name.includes('cour') || name.includes('jardin') || name.includes('espace vert')) {
      return [
        { id: 'default_acces_principal', type: 'acces', name: 'Accès principal' },
        { id: 'default_espace_central', type: 'espace', name: 'Espace central' },
        { id: 'default_locaux_annexes', type: 'annexes', name: 'Locaux annexes' },
      ];
    }
    
    // Couloir - parties distinctes du couloir
    if (name.includes('couloir') || name.includes('dégagement') || name.includes('circulation')) {
      return [
        { id: 'default_partie_centrale', type: 'zone', name: 'Partie centrale' },
        { id: 'default_extremite_ouest', type: 'zone', name: 'Extrémité ouest' },
        { id: 'default_extremite_est', type: 'zone', name: 'Extrémité est' },
        { id: 'default_global', type: 'global', name: 'Vue d\'ensemble' },
      ];
    }
    
    // Palier spécifique
    if (name.includes('palier')) {
      return [
        { id: 'default_zone_ascenseur', type: 'zone', name: 'Zone ascenseur' },
        { id: 'default_zone_escalier', type: 'zone', name: 'Zone escalier' },
        { id: 'default_palier_principal', type: 'zone', name: 'Palier principal' },
        { id: 'default_global', type: 'global', name: 'Vue d\'ensemble' },
      ];
    }
    
    // Par défaut pour parties communes génériques
    return [
      { id: 'default_zone_principale', type: 'zone', name: 'Zone principale' },
      { id: 'default_zone_secondaire', type: 'zone', name: 'Zone secondaire' },
    ];
  };

  // State pour les endroits personnalisés ajoutés par l'utilisateur
  const [customEndroits, setCustomEndroits] = useState<Piece[]>([]);
  const [showAddEndroitDialog, setShowAddEndroitDialog] = useState(false);
  const [newEndroitName, setNewEndroitName] = useState('');

  const handleAddCustomEndroit = () => {
    if (!newEndroitName.trim()) return;
    
    const newEndroit: Piece = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      name: newEndroitName.trim(),
    };
    
    setCustomEndroits(prev => [...prev, newEndroit]);
    setNewEndroitName('');
    setShowAddEndroitDialog(false);
    const label = selectedPartie === 'privative' ? 'Pièce' : 'Endroit';
    toast.success(`${label} "${newEndroitName}" ajouté${selectedPartie === 'privative' ? 'e' : ''}`);
  };

  const handleSelectLieu = (lieu: Lieu) => {
    setSelectedLieu(lieu);
    setCustomEndroits([]); // Reset custom endroits when changing lieu
    // Toujours afficher le niveau endroit pour avoir la hiérarchie complète
    setViewState('select-endroit');
  };

  // Récupérer les pièces d'un lieu (avec fallback sur les pièces par défaut)
  const getPiecesForLieu = (lieu: Lieu | null): { pieces: Piece[]; isDefault: boolean } => {
    if (!lieu) return { pieces: [], isDefault: false };
    if (lieu.pieces && lieu.pieces.length > 0) return { pieces: lieu.pieces, isDefault: false };
    // Pour les parties privatives sans pièces, proposer les pièces par défaut
    if (lieu.partType === 'privative') return { pieces: DEFAULT_PIECES_PRIVATIVES, isDefault: true };
    // Pour les parties communes, proposer les pièces par défaut contextuelles
    return { pieces: getDefaultPiecesCommunes(lieu.name), isDefault: true };
  };

  const handleSelectEndroit = (endroit: Piece) => {
    setSelectedEndroit(endroit);
    setViewState('select-zone');
  };

  const handleRecordingComplete = (sequenceId?: string) => {
    if (sequenceId) {
      setLastSavedSequenceId(sequenceId);
    }
    toast.success('Problème enregistré ! L\'IA génère les tâches...', {
      description: 'Analyse en cours...'
    });
    setViewState('select-zone');
    setSelectedZone(null);
    setRecordingMode(null);
  };

  // ============= DATA GETTERS =============

  const getLieux = (): Lieu[] => {
    if (selectedPartie === 'commune') {
      return partiesCommunes.map(loc => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        partType: 'commune' as const,
        partId: parts.find(p => p.part_type === 'commune')?.id || '',
        pieces: undefined,
      }));
    } else {
      return partiesPrivatives.map(loc => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        partType: 'privative' as const,
        partId: parts.find(p => p.part_type === 'privative')?.id || '',
        pieces: loc.pieces,
      }));
    }
  };

  const getSequencesForLieu = (lieuId: string) => {
    return sequences.filter(s => s.location_id === lieuId);
  };

  const getProblemsForLieu = (lieuId: string) => {
    return problems.filter(p => p.location_id === lieuId);
  };

  // Stats
  const totalSequences = sequences.length;
  const totalProblems = problems.length;
  const totalTasks = tasks.length;

  // ============= BREADCRUMB =============

  const getBreadcrumb = () => {
    const items: string[] = [];
    if (selectedPartie) items.push(selectedPartie === 'commune' ? 'Communes' : 'Privatives');
    if (selectedLieu) items.push(selectedLieu.name);
    if (selectedEndroit) items.push(selectedEndroit.name);
    if (selectedZone) items.push(selectedZone.label);
    return items;
  };

  // ============= LIEU DETAILS POPUP =============

  const LieuDetailsPopup = () => (
    <Dialog open={showLieuDetails} onOpenChange={setShowLieuDetails}>
      <DialogContent className="max-w-sm mx-4 rounded-3xl p-0 overflow-hidden bg-background z-[60]">
        <DialogHeader className="sr-only">
          <DialogTitle>Détails du lieu</DialogTitle>
        </DialogHeader>
        <div className={cn(
          "p-6 text-white",
          selectedPartie === 'commune' 
            ? "bg-gradient-to-br from-blue-500 to-blue-600" 
            : "bg-gradient-to-br from-emerald-500 to-emerald-600"
        )}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
              {selectedPartie === 'commune' ? '🏢' : '🏠'}
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
                Partie {selectedPartie === 'commune' ? 'Commune' : 'Privative'}
              </p>
              <h2 className="text-xl font-bold">{selectedLieu?.name}</h2>
            </div>
          </div>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Endroits/Pièces */}
          {selectedLieu?.pieces && selectedLieu.pieces.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                {selectedPartie === 'privative' ? 'Pièces' : 'Endroits'} ({selectedLieu.pieces.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedLieu.pieces.map((piece) => {
                  const info = ENDROIT_TYPE_INFO[piece.type] || { emoji: '📦', label: piece.name };
                  return (
                    <span 
                      key={piece.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-sm font-medium"
                    >
                      <span>{info.emoji}</span>
                      <span>{piece.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-blue-500/10 text-center">
              <div className="text-xl font-bold text-blue-600">
                {selectedLieu ? getSequencesForLieu(selectedLieu.id).length : 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Séquences</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-center">
              <div className="text-xl font-bold text-amber-600">
                {selectedLieu ? getProblemsForLieu(selectedLieu.id).length : 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Problèmes</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
              <div className="text-xl font-bold text-emerald-600">
                {selectedLieu?.pieces?.length || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Endroits</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-xl gap-2"
              onClick={() => {
                setShowLieuDetails(false);
                onOpenChange(false);
                // Navigate to project info with composition step open
                navigate(`/project/${projectId}?tab=composition&partie=${selectedPartie}`);
              }}
            >
              <Edit2 className="h-4 w-4" />
              Modifier
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Button>
            <Button 
              className={cn(
                "flex-1 h-12 rounded-xl",
                selectedPartie === 'commune' 
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              )}
              onClick={() => {
                setShowLieuDetails(false);
                setViewState('select-endroit');
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Continuer
            </Button>
          </div>

          {/* Source info */}
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground text-center">
              Ce lieu provient de l'étape 4 "Composition" des informations projet
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ============= RENDER =============

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}>
        <SheetContent side="bottom" className="h-[calc(100vh-80px)] rounded-t-3xl p-0 flex flex-col overflow-hidden z-50 bg-background" hideCloseButton>
          {/* Header - Consistent design across all levels */}
          <div className="flex-shrink-0 bg-muted/50 backdrop-blur-xl border-b safe-area-inset-top z-10">
            <SheetHeader className="px-4 py-4">
              <div className="flex items-center">
                {/* Back button */}
                {viewState !== 'select-partie' ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="w-10" />
                )}
                
                {/* Center content */}
                <div className="flex-1 text-center">
                  <SheetTitle className="text-xl font-bold flex items-center justify-between">
                    <span>
                      {viewState === 'select-partie' && 'Nouveau reportage'}
                      {viewState === 'select-lieu' && `Parties ${selectedPartie === 'commune' ? 'Communes' : 'Privatives'}`}
                      {viewState === 'select-endroit' && selectedLieu?.name}
                      {viewState === 'select-zone' && (selectedEndroit?.name || selectedLieu?.name)}
                      {viewState === 'recording' && 'Enregistrement'}
                    </span>
                    {/* Offline queue indicator */}
                    {queueSize > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sync...
                          </>
                        ) : (
                          <>
                            <CloudOff className="w-3 h-3" />
                            {queueSize} en attente
                          </>
                        )}
                      </Badge>
                    )}
                  </SheetTitle>
                  {/* Breadcrumb */}
                  {viewState !== 'select-partie' && viewState !== 'recording' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
                      {getBreadcrumb().map((item, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span>›</span>}
                          <span className={i === getBreadcrumb().length - 1 ? 'text-primary font-medium' : ''}>
                            {item}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </SheetHeader>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 bg-background">
            <div className="p-4 space-y-4 pb-40 min-h-full">{/* Plus de padding pour scroll complet */}
              
              {/* ========== SÉLECTION MODE ========== */}
              {viewState === 'select-partie' && reportageMode === 'select-mode' && (
                <div className="space-y-6">
                  <p className="text-center text-muted-foreground">Choisissez votre méthode de reportage</p>
                  
                  {/* Mode Guidé */}
                  <button
                    onClick={() => setReportageMode('guided')}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-blue-500/5 border-2 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10 active:scale-[0.98] transition-all">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Layers className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Mode Guidé</p>
                        <p className="text-sm text-muted-foreground">Partie → Lieu → Endroit → Zone</p>
                        <p className="text-xs text-blue-600 mt-1">Navigation structurée en 4 niveaux</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Mode Vidéo Continue (Capture Libre) */}
                  <button
                    onClick={() => setShowVideoContinueInfo(true)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-violet-500/5 border-2 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/10 active:scale-[0.98] transition-all">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Video className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg flex items-center gap-2">
                          Vidéo Continue
                          <Badge className="bg-violet-500/20 text-violet-600 text-[10px]">Recommandé</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">Filmez en continu, l'IA segmente</p>
                        <p className="text-xs text-violet-600 mt-1">1 action • Zéro friction • Ultra rapide</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                </div>
              )}

              {/* ========== SÉLECTION PARTIE (Mode Guidé) ========== */}
              {viewState === 'select-partie' && reportageMode === 'guided' && (
                <div className="space-y-6">
                  {/* Bouton retour au choix de mode */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportageMode('select-mode')}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Changer de mode
                  </Button>

                  {/* Navigation en 4 niveaux */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Navigation en 4 niveaux</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                        <span className="text-blue-600 font-medium">Partie</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                        <span className="text-emerald-600 font-medium">Lieu</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                        <span className="text-purple-600 font-medium">Endroit</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                        <span className="text-amber-600 font-medium">Zone</span>
                      </div>
                    </div>
                  </div>

                  {/* Choisir la partie */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">
                      1. Choisir une partie
                    </p>

                    <button
                      type="button"
                      onClick={() => handleSelectPartie('commune')}
                      className="w-full text-left relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/5 border-2 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10 active:scale-[0.98] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">Parties Communes</h4>
                          <p className="text-sm text-muted-foreground">
                            {partiesCommunes.length} lieu{partiesCommunes.length !== 1 ? 'x' : ''} disponible{partiesCommunes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-blue-500" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPartie('privative')}
                      className="w-full text-left relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10 active:scale-[0.98] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                          <Home className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">Parties Privatives</h4>
                          <p className="text-sm text-muted-foreground">
                            {partiesPrivatives.length} lieu{partiesPrivatives.length !== 1 ? 'x' : ''} disponible{partiesPrivatives.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-emerald-500" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ========== NIVEAU 2: SÉLECTION LIEU ========== */}
              {viewState === 'select-lieu' && selectedPartie && (
                <div className="space-y-3">
                  {/* Breadcrumbs */}
                  <ReportageBreadcrumbs
                    partie={{
                      id: parts.find(p => p.part_type === selectedPartie)?.id || '',
                      name: selectedPartie === 'commune' ? 'Parties Communes' : 'Parties Privatives',
                      type: selectedPartie
                    }}
                    onNavigate={handleBreadcrumbNavigate}
                  />
                  
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">
                    2. Choisir un Lieu
                  </p>

                  {getLieux().length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-2xl">
                      <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-2">Aucun lieu défini</h4>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez des lieux dans les informations du projet
                      </p>
                    </div>
                  ) : (
                    getLieux().map((lieu, index) => {
                      const lieuSequences = getSequencesForLieu(lieu.id);
                      const lieuProblems = getProblemsForLieu(lieu.id);
                      const hasActivity = lieuSequences.length > 0 || lieuProblems.length > 0;
                      // Calcul du nombre d'endroits - avec les pièces par défaut contextuelles
                      const definedPieces = lieu.pieces?.length || 0;
                      const defaultPiecesCount = lieu.partType === 'privative' 
                        ? 6 // DEFAULT_PIECES_PRIVATIVES
                        : getDefaultPiecesCommunes(lieu.name).length;
                      const pieces = definedPieces > 0 ? definedPieces : defaultPiecesCount;
                      
                      const Icon = getPartieIcon(lieu.type);
                      
                      // Couleurs Apple-style avec rotation
                      const gradients = [
                        'from-blue-500 to-blue-600',
                        'from-emerald-500 to-emerald-600',
                        'from-purple-500 to-purple-600',
                        'from-orange-500 to-orange-600',
                        'from-pink-500 to-pink-600',
                        'from-indigo-500 to-indigo-600',
                      ];
                      const gradient = gradients[index % gradients.length];
                      
                      return (
                        <div 
                          key={lieu.id}
                          style={{ 
                            animation: `fadeInUp 0.4s ease-out ${index * 0.08}s both`,
                          }}
                        >
                          <button
                            onClick={() => handleSelectLieu(lieu)}
                            className="group w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                          >
                            <div className="flex items-center gap-4 p-4">
                              <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                                <Icon className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-base text-gray-900 mb-0.5">
                                  {lieu.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {pieces > 0 
                                    ? `${pieces} ${lieu.partType === 'privative' ? 'pièce' : 'endroit'}${pieces > 1 ? 's' : ''}`
                                    : 'Vue globale'}
                                  {lieuProblems.length > 0 && ` • ${lieuProblems.length} problème${lieuProblems.length > 1 ? 's' : ''}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasActivity && (
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                  </div>
                                )}
                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ========== NIVEAU 3: SÉLECTION ENDROIT ========== */}
              {viewState === 'select-endroit' && selectedLieu && (
                <div className="space-y-4">
                  {/* Breadcrumbs */}
                  <ReportageBreadcrumbs
                    partie={{
                      id: selectedLieu.partId,
                      name: selectedPartie === 'commune' ? 'Parties Communes' : 'Parties Privatives',
                      type: selectedPartie || 'commune'
                    }}
                    lieu={{
                      id: selectedLieu.id,
                      name: selectedLieu.name
                    }}
                    onNavigate={handleBreadcrumbNavigate}
                  />
                  
                  {/* Lieu context banner */}
                  <div 
                    onClick={() => setShowLieuDetails(true)}
                    className="w-full cursor-pointer"
                  >
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border",
                      selectedPartie === 'commune'
                        ? "bg-blue-500/10 border-blue-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                    )}>
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                        selectedPartie === 'commune' ? "bg-blue-500" : "bg-emerald-500"
                      )}>
                        {selectedPartie === 'commune' ? '🏢' : '🏠'}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">Lieu</p>
                        <h3 className="font-bold text-sm">{selectedLieu.name}</h3>
                      </div>
                      <Info className={cn(
                        "h-4 w-4",
                        selectedPartie === 'commune' ? "text-blue-500" : "text-emerald-500"
                      )} />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">
                    3. Choisir {selectedPartie === 'privative' ? 'une Pièce' : 'un Endroit'}
                  </p>

                  {/* Endroits List */}
                  {(() => {
                    const { pieces, isDefault } = getPiecesForLieu(selectedLieu);
                    
                    return (
                      <div className="space-y-3">
                        {/* Endroits par défaut (admin) */}
                        {pieces.map((endroit, index) => {
                          const info = ENDROIT_TYPE_INFO[endroit.type];
                          const Icon = info?.icon || Building2;
                          const gradient = info?.gradient || 'from-gray-500 to-gray-600';
                          
                          return (
                            <button
                              key={endroit.id}
                              onClick={() => handleSelectEndroit(endroit)}
                              className="group w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                              style={{ 
                                animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                              }}
                            >
                              <div className="flex items-center gap-4 p-4">
                                <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                                  <Icon className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="font-semibold text-base text-gray-900">
                                    {endroit.name || info?.label}
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                              </div>
                            </button>
                          );
                        })}
                        
                        {/* Endroits personnalisés (user) */}
                        {customEndroits.map((endroit, index) => (
                          <button
                            key={endroit.id}
                            onClick={() => handleSelectEndroit(endroit)}
                            className="group w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-2 border-dashed border-gray-300"
                            style={{ 
                              animation: `fadeInUp 0.4s ease-out ${(pieces.length + index) * 0.05}s both`,
                            }}
                          >
                            <div className="flex items-center gap-4 p-4">
                              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm">
                                <MapPin className="h-7 w-7 text-gray-500" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-base text-gray-900">
                                  {endroit.name}
                                </div>
                                <span className="text-xs text-gray-500">Personnalisé</span>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                          </button>
                        ))}
                        
                        {/* Bouton Ajouter une pièce/un endroit */}
                        <button
                          onClick={() => setShowAddEndroitDialog(true)}
                          className="group w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200"
                          style={{ 
                            animation: `fadeInUp 0.4s ease-out ${(pieces.length + customEndroits.length) * 0.05}s both`,
                          }}
                        >
                          <div className="flex items-center gap-4 p-4">
                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm group-hover:from-blue-50 group-hover:to-blue-100 transition-all">
                              <Plus className="h-7 w-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-base text-gray-600 group-hover:text-blue-600 transition-colors">
                                Ajouter {selectedPartie === 'privative' ? 'une pièce' : 'un endroit'}
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Dialog pour ajouter une pièce/un endroit personnalisé */}
              <Dialog open={showAddEndroitDialog} onOpenChange={setShowAddEndroitDialog}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Ajouter {selectedPartie === 'privative' ? 'une pièce' : 'un endroit'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder={selectedPartie === 'privative' ? 'Nom de la pièce (ex: Chambre, Bureau...)' : 'Nom de l\'endroit (ex: Balcon, Zone...)'}
                      value={newEndroitName}
                      onChange={(e) => setNewEndroitName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowAddEndroitDialog(false);
                          setNewEndroitName('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleAddCustomEndroit}
                        disabled={!newEndroitName.trim()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* ========== NIVEAU 4: SÉLECTION ZONE + MODE CAPTURE ========== */}
              {viewState === 'select-zone' && selectedLieu && (
                <div className="space-y-4">
                  {/* Breadcrumbs */}
                  <ReportageBreadcrumbs
                    partie={{
                      id: selectedLieu.partId,
                      name: selectedPartie === 'commune' ? 'Parties Communes' : 'Parties Privatives',
                      type: selectedPartie || 'commune'
                    }}
                    lieu={{
                      id: selectedLieu.id,
                      name: selectedLieu.name
                    }}
                    endroit={selectedEndroit ? {
                      id: selectedEndroit.id,
                      name: selectedEndroit.name,
                      type: selectedEndroit.type
                    } : undefined}
                    zone={selectedZone ? {
                      id: selectedZone.id,
                      label: selectedZone.label
                    } : undefined}
                    onNavigate={handleBreadcrumbNavigate}
                  />
                  
                  {/* Context banners */}
                  <div className="space-y-2">
                    <button onClick={() => setShowLieuDetails(true)} className="w-full">
                      <div className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl",
                        selectedPartie === 'commune' ? "bg-blue-500/10" : "bg-emerald-500/10"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                          selectedPartie === 'commune' ? "bg-blue-500" : "bg-emerald-500"
                        )}>
                          {selectedPartie === 'commune' ? '🏢' : '🏠'}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[9px] text-muted-foreground uppercase">Lieu</p>
                          <h3 className="font-semibold text-xs truncate">{selectedLieu.name}</h3>
                        </div>
                      </div>
                    </button>
                    
                    {selectedEndroit && (
                      <div className="flex items-center gap-2 p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-sm">
                          {ENDROIT_TYPE_INFO[selectedEndroit.type]?.emoji || '📦'}
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] text-muted-foreground uppercase">Endroit</p>
                          <h3 className="font-semibold text-xs truncate">{selectedEndroit.name}</h3>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1">
                    4. Zone → Description rapide
                  </p>

                  {/* AI Task Extraction Status */}
                  {lastSavedSequenceId && (
                    <AITaskExtractionStatus
                      sequenceId={lastSavedSequenceId}
                      projectId={projectId}
                      className="mb-2"
                    />
                  )}

                  {/* Apple-style zone buttons - uniform grid layout with 2-line labels */}
                  <div className="grid grid-cols-3 gap-2">
                    {getZonesForContext(selectedLieu.name, selectedEndroit?.name).map((zone) => (
                      <button
                        key={zone.id}
                        onClick={() => {
                          setSelectedZone(zone);
                          setShowProblemCapture(true);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl min-h-[80px]",
                          "bg-card border border-border",
                          "hover:border-primary hover:bg-primary/10 hover:shadow-sm",
                          "active:scale-[0.97] transition-all"
                        )}
                      >
                        <span className="text-2xl flex-shrink-0">{zone.emoji}</span>
                        <span className="font-medium text-[10px] text-foreground text-center leading-tight w-full px-0.5">{zone.label}</span>
                      </button>
                    ))}
                    
                    {/* Custom zones from database - dashed border to indicate user-added */}
                    {customZones.map((zone) => (
                      <button
                        key={zone.id}
                        onClick={() => {
                          setSelectedZone(zone);
                          setShowProblemCapture(true);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl min-h-[80px]",
                          "bg-card border-2 border-dashed border-muted-foreground/40",
                          "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
                          "active:scale-[0.97] transition-all"
                        )}
                      >
                        <span className="text-2xl flex-shrink-0">📌</span>
                        <span className="font-medium text-[10px] text-foreground text-center leading-tight w-full px-0.5">{zone.label}</span>
                      </button>
                    ))}
                  </div>
                    
                  {/* Add zone button */}
                  <button
                    onClick={() => setShowAddZoneDialog(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Ajouter une zone personnalisée</span>
                  </button>

                  {/* Enhanced Mode Button - Primary CTA for all zones */}
                  <Button
                    onClick={() => {
                      // Start with first zone if none selected
                      if (!selectedZone) {
                        const zones = getZonesForContext(selectedLieu.name, selectedEndroit?.name);
                        if (zones.length > 0) {
                          setSelectedZone(zones[0]);
                        }
                      }
                      setShowEnhancedMode(true);
                    }}
                    className="w-full h-16 text-lg font-bold gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
                    style={{ minHeight: '64px' }}
                  >
                    <Zap className="w-6 h-6" />
                    Mode Amélioré
                    <Badge className="bg-white/20 text-white text-xs">PRO</Badge>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Transcription live • Commandes vocales • Auto-save • IA en arrière-plan
                  </p>
                </div>
              )}

              {/* ========== ENREGISTREMENT ========== */}
              {viewState === 'recording' && selectedLieu && selectedZone && (
                <div className="space-y-4">
                  {/* Full breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs p-3 bg-muted/50 rounded-xl overflow-x-auto">
                    <span className="font-medium whitespace-nowrap text-muted-foreground">
                      {selectedPartie === 'commune' ? 'Communes' : 'Privatives'}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="whitespace-nowrap">{selectedLieu.name}</span>
                    {selectedEndroit && (
                      <>
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="whitespace-nowrap">{selectedEndroit.name}</span>
                      </>
                    )}
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-primary font-bold whitespace-nowrap">{selectedZone.label}</span>
                  </div>

                  {/* Video Recording Interface */}
                  <VisitSequenceRecorder
                    projectId={projectId}
                    partId={selectedLieu.partId}
                    locationId={selectedLieu.id}
                    locationName={`${selectedLieu.name}${selectedEndroit ? ` › ${selectedEndroit.name}` : ''} › ${selectedZone.label}`}
                    endroitName={selectedEndroit?.name}
                    zoneType={selectedZone.id}
                    onSequenceComplete={handleRecordingComplete}
                  />
                </div>
              )}

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Enhanced Reportage Mode - Full screen experience */}
      <Sheet open={showEnhancedMode} onOpenChange={setShowEnhancedMode}>
        <SheetContent side="bottom" className="h-screen rounded-none p-0 flex flex-col overflow-hidden z-[60] bg-background" hideCloseButton>
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white safe-area-inset-top">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setShowEnhancedMode(false)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <h2 className="font-bold text-lg flex items-center gap-2 justify-center">
                  <Zap className="w-5 h-5" />
                  Mode Amélioré
                </h2>
                <p className="text-xs text-white/80">
                  {selectedLieu?.name}{selectedEndroit ? ` › ${selectedEndroit.name}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEnhancedMode(false);
                  onOpenChange(false);
                }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Enhanced Reportage Component */}
          {selectedLieu && (
            <>
              <ReportageEnhanced
                projectId={projectId}
                currentLieu={{
                  id: selectedLieu.id,
                  name: selectedLieu.name,
                  partType: selectedLieu.partType,
                }}
                currentEndroit={selectedEndroit ? {
                  id: selectedEndroit.id,
                  name: selectedEndroit.name,
                  type: selectedEndroit.type,
                } : undefined}
                totalZones={getZonesForContext(selectedLieu.name, selectedEndroit?.name).length}
                completedZones={enhancedCompletedZones}
                onNext={handleEnhancedNext}
                onBack={handleEnhancedBack}
                onPhoto={handleEnhancedPhoto}
                onZoneSelect={handleEnhancedZoneSelect}
                onSave={handleEnhancedSave}
                className="flex-1"
              />
              
              {/* AI Task Extraction Status in Enhanced Mode */}
              {lastSavedSequenceId && (
                <div className="px-4 pb-2">
                  <AITaskExtractionStatus
                    sequenceId={lastSavedSequenceId}
                    projectId={projectId}
                  />
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <LieuDetailsPopup />

      {/* Zone Capture Options Dialog removed - going directly to ZoneProblemCapture */}

      {/* Add Zone Dialog */}
      <Dialog open={showAddZoneDialog} onOpenChange={setShowAddZoneDialog}>
        <DialogContent className="max-w-sm mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nouvelle zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Ex: Mur droit, Sol cuisine, Plafond entrée..."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="h-12 rounded-xl"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => {
                  setShowAddZoneDialog(false);
                  setNewZoneName('');
                }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl"
                disabled={!newZoneName.trim()}
                onClick={async () => {
                  if (newZoneName.trim() && selectedLieu) {
                    try {
                      const { data, error } = await supabase.from('location_zones').insert({
                        project_id: projectId,
                        location_id: selectedLieu.id,
                        zone_type: 'autre' as any,
                        custom_name: newZoneName.trim(),
                        order_index: getZonesForContext(selectedLieu.name, selectedEndroit?.name).length + customZones.length,
                      }).select().single();
                      
                      if (error) throw error;
                      
                      const newZone = { 
                        id: data.id, 
                        label: newZoneName.trim(), 
                        emoji: '📍'
                      };
                      
                      // Add to custom zones list
                      setCustomZones(prev => [...prev, newZone]);
                      
                      toast.success(`Zone "${newZoneName}" créée`);
                      setShowAddZoneDialog(false);
                      
                      // Select the new zone and open problem capture
                      setSelectedZone(newZone);
                      setNewZoneName('');
                      setShowProblemCapture(true);
                    } catch (error) {
                      toast.error('Erreur lors de la création');
                      console.error(error);
                    }
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Dialog - Mode Guidé - Only shown in guided mode */}
      <Dialog open={showInfoDialog && reportageMode === 'guided' && viewState === 'select-partie'} onOpenChange={(open) => {
        if (!open && dontShowAgain) {
          localStorage.setItem('myedls_reportage_info_dismissed', 'true');
        }
        setShowInfoDialog(open);
      }}>
        <DialogContent className="max-w-sm rounded-3xl border-0 bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Information - Mode Guidé</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center pt-2 pb-4">
            {/* Close button */}
            <button
              onClick={() => {
                if (dontShowAgain) {
                  localStorage.setItem('myedls_reportage_info_dismissed', 'true');
                }
                setShowInfoDialog(false);
              }}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
              <Info className="h-8 w-8 text-white" />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold mb-2">Mode Guidé</h3>
            
            {/* Message */}
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              Ce reportage se base sur la structure définie dans{" "}
              <span className="font-semibold text-foreground">l&apos;étape 4 (Composition)</span>{" "}
              des informations du projet.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Vous pouvez modifier la composition via le bouton{" "}
              <span className="font-medium">&quot;Informations du projet&quot;</span>
            </p>
            
            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 mt-4 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-muted-foreground/30"
              />
              Ne plus afficher ce message
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Dialog - Capture Libre - Only shown in free mode */}
      <Dialog open={showInfoDialog && reportageMode === 'free'} onOpenChange={(open) => {
        if (!open && dontShowAgain) {
          localStorage.setItem('myedls_reportage_free_info_dismissed', 'true');
        }
        setShowInfoDialog(open);
      }}>
        <DialogContent className="max-w-sm rounded-3xl border-0 bg-card/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Information - Capture Libre</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center pt-2 pb-4">
            {/* Close button */}
            <button
              onClick={() => {
                if (dontShowAgain) {
                  localStorage.setItem('myedls_reportage_free_info_dismissed', 'true');
                }
                setShowInfoDialog(false);
              }}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold mb-2">Capture Libre</h3>
            
            {/* Message */}
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              Parlez naturellement en décrivant{" "}
              <span className="font-semibold text-foreground">où vous êtes</span>{" "}
              et{" "}
              <span className="font-semibold text-foreground">ce que vous observez</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              L&apos;IA extraira automatiquement la localisation{" "}
              <span className="font-medium">(Partie, Lieu, Endroit, Zone)</span>{" "}
              et le problème.
            </p>
            
            {/* Don't show again checkbox */}
            <label className="flex items-center gap-2 mt-4 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-muted-foreground/30"
              />
              Ne plus afficher ce message
            </label>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Problem Capture Dialog - for Text/Photo modes */}
      {selectedLieu && selectedEndroit && selectedZone && (
        <ZoneProblemCapture
          key={`${initialSequenceId || 'new'}-${initialDescription || ''}`}
          open={showProblemCapture}
          onOpenChange={(open) => {
            setShowProblemCapture(open);
            if (!open) {
              setSelectedZone(null);
              setRecordingMode(null);
            }
          }}
          projectId={projectId}
          locationId={selectedLieu.id}
          locationName={selectedEndroit.name}
          zoneType={(selectedZone.id as ZoneType) || 'autre'}
          customZoneName={selectedZone.label}
          partieType={selectedPartie || 'commune'}
          partieName={selectedPartie === 'commune' ? 'Parties Communes' : 'Parties Privatives'}
          lieuName={selectedLieu.name}
          endroitName={selectedEndroit.name}
          initialDescription={initialDescription}
          sequenceId={initialSequenceId}
          onComplete={() => {
            handleRecordingComplete();
            setShowProblemCapture(false);
          }}
        />
      )}

      {/* Video Continue Info Dialog */}
      <Dialog open={showVideoContinueInfo} onOpenChange={setShowVideoContinueInfo}>
        <DialogContent className="max-w-md mx-auto max-h-[80vh] flex flex-col p-0">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <span>Vidéo Continue</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              <p className="text-muted-foreground text-sm">
                Filmez en continu en parlant naturellement.
              </p>
              
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3 space-y-2">
                <h4 className="font-medium text-violet-800 dark:text-violet-200 text-sm">Comment ça marche ?</h4>
                <ul className="space-y-1.5 text-xs text-violet-700 dark:text-violet-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>1.</strong> Appuyez sur Démarrer et filmez</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>2.</strong> Parlez naturellement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>3.</strong> Arrêtez quand vous avez fini</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span><strong>4.</strong> L'IA segmente automatiquement</span>
                  </li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-xl p-2">
                <p className="text-xs italic text-muted-foreground">
                  💡 Ex: "Je suis dans la cuisine, y'a une fissure sur le mur..."
                </p>
              </div>
            </div>
          </div>

          {/* Fixed bottom buttons */}
          <div className="flex gap-3 p-4 border-t bg-background sticky bottom-0">
            <Button
              variant="outline"
              onClick={() => setShowVideoContinueInfo(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                setShowVideoContinueInfo(false);
                setShowFreeCapture(true);
              }}
              className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              <Video className="h-4 w-4 mr-2" />
              Commencer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Continue Capture Mode */}
      <VideoContinueCapture
        open={showFreeCapture}
        onOpenChange={setShowFreeCapture}
        projectId={projectId}
        partiesCommunes={partiesCommunes}
        partiesPrivatives={partiesPrivatives}
        onCaptureComplete={() => {
          toast.success('Séquence(s) enregistrée(s) !');
        }}
      />
    </>
  );
};
