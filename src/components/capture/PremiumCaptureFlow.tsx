import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { 
  Camera, Video, Mic, MicOff, X, Check, ChevronRight, 
  MapPin, Layers, Image, Sparkles, Send, Trash2,
  Building2, Home, DoorOpen, Bath, UtensilsCrossed, Bed, 
  Sofa, Warehouse, Car, Trees, AlertTriangle, ArrowLeft,
  FileCheck, FileInput, LogIn, LogOut, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PremiumInputCard } from './PremiumInputCard';
import { StepAIProcessing } from './steps/StepAIProcessing';
import { StepReview } from './steps/StepReview';
import type { EDLType, CaptureMode, CaptureData, ExtractedTask, EdlSummary } from './CaptureWizard';

// Location icons mapping
const LOCATION_ICONS: Record<string, React.ComponentType<any>> = {
  'appartement': Building2,
  'hall': DoorOpen,
  'escalier': Layers,
  'facade': Building2,
  'toiture': Home,
  'parking': Car,
  'jardin': Trees,
  'cuisine': UtensilsCrossed,
  'chambre': Bed,
  'sejour': Sofa,
  'sdb': Bath,
  'wc': Bath,
  'cave': Warehouse,
  'default': MapPin,
};

// Contextual zones based on location type
const ZONES_BY_CONTEXT: Record<string, Array<{ id: string; label: string; color: string }>> = {
  // Exterior / Facades
  facade: [
    { id: 'mur_ext', label: 'Murs extérieurs', color: 'from-slate-500 to-slate-600' },
    { id: 'fenetres', label: 'Fenêtres', color: 'from-blue-500 to-blue-600' },
    { id: 'portes_ext', label: 'Portes', color: 'from-amber-500 to-orange-600' },
    { id: 'volets', label: 'Volets', color: 'from-green-500 to-emerald-600' },
    { id: 'balcons', label: 'Balcons/Terrasses', color: 'from-cyan-500 to-teal-600' },
    { id: 'gouttières', label: 'Gouttières', color: 'from-gray-500 to-gray-600' },
  ],
  toiture: [
    { id: 'couverture', label: 'Couverture', color: 'from-red-500 to-rose-600' },
    { id: 'cheminee', label: 'Cheminée', color: 'from-orange-500 to-amber-600' },
    { id: 'gouttières', label: 'Gouttières', color: 'from-gray-500 to-gray-600' },
    { id: 'velux', label: 'Velux/Fenêtres toit', color: 'from-blue-500 to-blue-600' },
    { id: 'zinguerie', label: 'Zinguerie', color: 'from-slate-500 to-slate-600' },
  ],
  // Common areas
  hall: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'eclairage', label: 'Éclairage', color: 'from-yellow-500 to-amber-600' },
    { id: 'portes', label: 'Portes', color: 'from-green-500 to-emerald-600' },
    { id: 'boites_lettres', label: 'Boîtes aux lettres', color: 'from-gray-500 to-slate-600' },
  ],
  escalier: [
    { id: 'marches', label: 'Marches', color: 'from-amber-500 to-orange-600' },
    { id: 'rampe', label: 'Rampe/Garde-corps', color: 'from-slate-500 to-gray-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'eclairage', label: 'Éclairage', color: 'from-yellow-500 to-amber-600' },
    { id: 'palier', label: 'Palier', color: 'from-purple-500 to-violet-600' },
  ],
  parking: [
    { id: 'sol', label: 'Sol/Revêtement', color: 'from-gray-500 to-slate-600' },
    { id: 'marquage', label: 'Marquage', color: 'from-yellow-500 to-amber-600' },
    { id: 'eclairage', label: 'Éclairage', color: 'from-blue-500 to-blue-600' },
    { id: 'portail', label: 'Portail/Accès', color: 'from-green-500 to-emerald-600' },
    { id: 'murs', label: 'Murs', color: 'from-slate-500 to-gray-600' },
  ],
  cave: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'porte', label: 'Porte', color: 'from-green-500 to-emerald-600' },
    { id: 'eclairage', label: 'Éclairage', color: 'from-yellow-500 to-amber-600' },
    { id: 'ventilation', label: 'Ventilation', color: 'from-cyan-500 to-teal-600' },
  ],
  jardin: [
    { id: 'pelouse', label: 'Pelouse/Végétation', color: 'from-green-500 to-emerald-600' },
    { id: 'cloture', label: 'Clôture', color: 'from-amber-500 to-orange-600' },
    { id: 'terrasse', label: 'Terrasse', color: 'from-slate-500 to-gray-600' },
    { id: 'portail', label: 'Portail', color: 'from-blue-500 to-blue-600' },
    { id: 'eclairage', label: 'Éclairage extérieur', color: 'from-yellow-500 to-amber-600' },
  ],
  // Private rooms
  cuisine: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'meubles', label: 'Meubles cuisine', color: 'from-green-500 to-emerald-600' },
    { id: 'electromenager', label: 'Électroménager', color: 'from-red-500 to-rose-600' },
    { id: 'plomberie', label: 'Plomberie/Évier', color: 'from-cyan-500 to-teal-600' },
    { id: 'electricite', label: 'Électricité', color: 'from-yellow-500 to-amber-600' },
  ],
  sdb: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs/Faïence', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'sanitaires', label: 'Sanitaires', color: 'from-cyan-500 to-teal-600' },
    { id: 'robinetterie', label: 'Robinetterie', color: 'from-slate-500 to-gray-600' },
    { id: 'ventilation', label: 'Ventilation', color: 'from-green-500 to-emerald-600' },
    { id: 'electricite', label: 'Électricité', color: 'from-yellow-500 to-amber-600' },
  ],
  wc: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'wc', label: 'WC', color: 'from-cyan-500 to-teal-600' },
    { id: 'lave_mains', label: 'Lave-mains', color: 'from-slate-500 to-gray-600' },
    { id: 'ventilation', label: 'Ventilation', color: 'from-green-500 to-emerald-600' },
  ],
  chambre: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'fenetres', label: 'Fenêtres', color: 'from-cyan-500 to-teal-600' },
    { id: 'placards', label: 'Placards', color: 'from-green-500 to-emerald-600' },
    { id: 'electricite', label: 'Électricité', color: 'from-yellow-500 to-amber-600' },
    { id: 'chauffage', label: 'Chauffage', color: 'from-red-500 to-rose-600' },
  ],
  sejour: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'fenetres', label: 'Fenêtres', color: 'from-cyan-500 to-teal-600' },
    { id: 'menuiseries', label: 'Menuiseries', color: 'from-green-500 to-emerald-600' },
    { id: 'electricite', label: 'Électricité', color: 'from-yellow-500 to-amber-600' },
    { id: 'chauffage', label: 'Chauffage', color: 'from-red-500 to-rose-600' },
  ],
  // Default for any other room
  default: [
    { id: 'sol', label: 'Sol', color: 'from-amber-500 to-orange-600' },
    { id: 'murs', label: 'Murs', color: 'from-blue-500 to-blue-600' },
    { id: 'plafond', label: 'Plafond', color: 'from-purple-500 to-violet-600' },
    { id: 'menuiseries', label: 'Menuiseries', color: 'from-green-500 to-emerald-600' },
    { id: 'electricite', label: 'Électricité', color: 'from-yellow-500 to-amber-600' },
    { id: 'equipements', label: 'Équipements', color: 'from-red-500 to-rose-600' },
  ],
};

// Get contextual zones based on location type
const getZonesForLocation = (locationType: string): Array<{ id: string; label: string; color: string }> => {
  const type = locationType.toLowerCase();
  return ZONES_BY_CONTEXT[type] || ZONES_BY_CONTEXT.default;
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

interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  file?: File;
}

interface PremiumCaptureFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSequenceCreated?: (sequenceId: string) => void;
}

type Step = 'edlType' | 'captureMode' | 'location' | 'capture' | 'aiProcessing' | 'review';

// EDL Types
const EDL_TYPES: Array<{ value: EDLType; label: string; shortLabel: string; icon: any }> = [
  { 
    value: 'avant_travaux', 
    label: 'Avant travaux', 
    shortLabel: 'Avant',
    icon: FileCheck
  },
  { 
    value: 'apres_travaux', 
    label: 'Après travaux', 
    shortLabel: 'Après',
    icon: FileInput
  },
  { 
    value: 'location_entree', 
    label: 'Location – Entrée', 
    shortLabel: 'Entrée',
    icon: LogIn
  },
  { 
    value: 'location_sortie', 
    label: 'Location – Sortie', 
    shortLabel: 'Sortie',
    icon: LogOut
  },
];

// Capture Modes
const CAPTURE_MODES: Array<{
  value: CaptureMode;
  title: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    value: 'photos_voice',
    title: 'Pas à pas',
    description: 'Photos + description par zone. Mode guidé avec sélection lieu → zone → problème.',
    icon: Camera,
  },
  {
    value: 'video_walkthrough',
    title: 'Vidéo complète',
    description: 'Tu filmes en marchant, tu décris à voix haute pièce par pièce. L\'IA s\'occupe du reste.',
    icon: Video,
  },
];

export const PremiumCaptureFlow: React.FC<PremiumCaptureFlowProps> = ({
  open,
  onOpenChange,
  projectId,
  onSequenceCreated
}) => {
  // State
  const [step, setStep] = useState<Step>('edlType');
  const [edlType, setEdlType] = useState<EDLType | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null);
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedPartieType, setSelectedPartieType] = useState<'commune' | 'privative' | null>(null);
  
  // Debug: Log state changes
  useEffect(() => {
    console.log('[PremiumCaptureFlow] selectedPartieType changed to:', selectedPartieType);
  }, [selectedPartieType]);
  const [description, setDescription] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [problemMedia, setProblemMedia] = useState<CapturedMedia[]>([]);
  const [recommendationMedia, setRecommendationMedia] = useState<CapturedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Processing state
  const [captureData, setCaptureData] = useState<CaptureData>({
    projectId,
    projectName: '',
    projectAddress: '',
    edlType: null,
    notes: '',
    captureMode: null,
    videoBlob: null,
    audioBlobs: [],
    photos: [],
    transcript: '',
    segments: [],
    extractedTasks: [],
    edlSummary: null,
  });
  
  // Combined media for validation
  const media = [...problemMedia, ...recommendationMedia];

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

        if (error) {
          console.error('[PremiumCaptureFlow] Error loading structure:', error);
          toast.error('Erreur lors du chargement de la structure');
          throw error;
        }
        
        console.log('[PremiumCaptureFlow] Loaded parts:', data);
        console.log('[PremiumCaptureFlow] Parts count:', data?.length);
        
        // Log details for each part
        data?.forEach((part, index) => {
          console.log(`[PremiumCaptureFlow] Part ${index}:`, {
            id: part.id,
            name: part.name,
            part_type: part.part_type,
            locations_count: part.property_locations?.length || 0,
            locations: part.property_locations
          });
        });
        
        setParts(data || []);
      } catch (error) {
        console.error('[PremiumCaptureFlow] Error loading structure:', error);
        toast.error('Erreur lors du chargement de la structure');
      } finally {
        setLoading(false);
      }
    };

    loadStructure();
  }, [open, projectId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('edlType');
      setEdlType(null);
      setCaptureMode(null);
      setSelectedLocation(null);
      setSelectedZone(null);
      setSelectedPartieType(null);
      setDescription('');
      setRecommendations('');
      setProblemMedia([]);
      setRecommendationMedia([]);
      setCaptureData({
        projectId,
        projectName: '',
        projectAddress: '',
        edlType: null,
        notes: '',
        captureMode: null,
        videoBlob: null,
        audioBlobs: [],
        photos: [],
        transcript: '',
        segments: [],
        extractedTasks: [],
        edlSummary: null,
      });
    }
  }, [open, projectId]);

  const getLocationIcon = (locationType: string) => {
    return LOCATION_ICONS[locationType] || LOCATION_ICONS['default'];
  };

  const getZoneLabel = (zoneId: string, locationType?: string) => {
    const zones = locationType ? getZonesForLocation(locationType) : ZONES_BY_CONTEXT.default;
    return zones.find(z => z.id === zoneId)?.label || zoneId;
  };

  const handleEdlTypeSelect = (type: EDLType) => {
    setEdlType(type);
    setCaptureData(prev => ({ ...prev, edlType: type }));
    setStep('captureMode');
  };

  const handleCaptureModeSelect = (mode: CaptureMode) => {
    setCaptureMode(mode);
    setCaptureData(prev => ({ ...prev, captureMode: mode }));
    setStep('location');
  };

  const handleLocationSelect = (location: PropertyLocation, zone: string) => {
    setSelectedLocation(location);
    setSelectedZone(zone);
    setStep('capture');
  };

  // Media handlers for problem
  const handleProblemMediaAdd = (mediaItem: CapturedMedia) => {
    setProblemMedia(prev => [...prev, mediaItem]);
  };

  const handleProblemMediaRemove = (id: string) => {
    setProblemMedia(prev => prev.filter(m => m.id !== id));
  };

  // Media handlers for recommendations
  const handleRecommendationMediaAdd = (mediaItem: CapturedMedia) => {
    setRecommendationMedia(prev => [...prev, mediaItem]);
  };

  const handleRecommendationMediaRemove = (id: string) => {
    setRecommendationMedia(prev => prev.filter(m => m.id !== id));
  };

  // Prepare capture data for AI processing
  const prepareCaptureData = async (): Promise<CaptureData> => {
    // Upload media files
    const mediaUrls: string[] = [];
    const photos: Array<{ url: string; timestamp: number }> = [];
    
    for (const item of media) {
      if (item.file) {
        const fileName = `${projectId}/${crypto.randomUUID()}.${item.type === 'photo' ? 'jpg' : 'mp4'}`;
        const { data, error } = await supabase.storage
          .from('visit-media')
          .upload(fileName, item.file);

        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('visit-media')
          .getPublicUrl(fileName);
        mediaUrls.push(publicUrl);
        
        if (item.type === 'photo') {
          photos.push({ url: publicUrl, timestamp: Date.now() });
        }
      }
    }

    // Get project info
    const { data: project } = await supabase
      .from('edl_projects')
      .select('address, city')
      .eq('id', projectId)
      .single();

    return {
      ...captureData,
      projectId,
      projectName: project?.address || '',
      projectAddress: `${project?.address || ''}${project?.city ? `, ${project.city}` : ''}`,
      edlType: edlType || null,
      captureMode: captureMode || 'photos_voice',
      notes: description,
      photos,
      videoBlob: null, // For pas à pas mode, we don't have video
      audioBlobs: [],
    };
  };

  // Validate and proceed to AI processing
  const handleValidate = async () => {
    if (!selectedLocation || !selectedZone || (!description && media.length === 0)) {
      toast.error('Ajoutez une description ou des médias');
      return;
    }

    if (!edlType || !captureMode) {
      toast.error('Veuillez compléter toutes les étapes');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const preparedData = await prepareCaptureData();
      setCaptureData(preparedData);
      setStep('aiProcessing');
    } catch (error) {
      console.error('Error preparing data:', error);
      toast.error('Erreur lors de la préparation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI processing complete
  const handleAIProcessingComplete = (updatedData: CaptureData) => {
    setCaptureData(updatedData);
    setStep('review');
  };

  // Handle review complete - save to database
  const handleReviewComplete = async () => {
    setIsSubmitting(true);
    
    try {
      // Upload media files
      const mediaUrls: string[] = [];
      for (const item of media) {
        if (item.file) {
          const fileName = `${projectId}/${crypto.randomUUID()}.${item.type === 'photo' ? 'jpg' : 'mp4'}`;
          const { data, error } = await supabase.storage
            .from('visit-media')
            .upload(fileName, item.file);

          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage
            .from('visit-media')
            .getPublicUrl(fileName);
          mediaUrls.push(publicUrl);
        }
      }

      // Get current user
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        toast.error('Non authentifié');
        return;
      }

      // Create visit sequence
      const { data: sequence, error: seqError } = await supabase
        .from('visit_sequences')
        .insert({
          project_id: projectId,
          user_id: session.session.user.id,
          location_id: selectedLocation?.id || null,
          zone_type: selectedZone || null,
          description,
          metadata: {
            edl_type: edlType,
            capture_mode: captureMode,
            recommendations,
            extracted_tasks_count: captureData.extractedTasks.length,
          },
          photo_urls: mediaUrls.filter(url => url.includes('.jpg')),
          video_url: mediaUrls.find(url => url.includes('.mp4')),
          status: 'completed',
          transcription: captureData.transcript,
          ai_analysis: {
            extractedTasks: captureData.extractedTasks,
            edlSummary: captureData.edlSummary,
          },
        })
        .select()
        .single();

      if (seqError) throw seqError;

      // Save extracted tasks with DTC IDs and link to sequence
      if (captureData.extractedTasks.length > 0) {
        const tasksToInsert = captureData.extractedTasks.map(task => ({
          project_id: projectId,
          user_id: session.session.user.id,
          visit_sequence_id: sequence.id, // Lien direct séquence → tâches (comme lo-myhome)
          title: task.title,
          description: task.description,
          location: task.location,
          area: task.zone,
          priority: task.priority,
          detection_confidence: task.confidence,
          source_type: captureMode === 'video_walkthrough' ? 'video' : 'photo',
          // DTC IDs (if available from edl-ai-pipeline)
          family_id: task.familyId || null,
          category_id: task.categoryId || null,
          subcategory_id: task.subcategoryId || null,
          task_id: task.taskId || task.task_id || null,
          // Metadata with DTC codes for reference
          analysis_metadata: {
            familyCode: task.familyCode || task.family_code,
            categoryCode: task.categoryCode || task.category_code,
            subcategoryCode: task.subcategoryCode || task.subcategory_code,
            taskCode: task.taskCode || task.task_code,
            familyName: task.familyName || task.family_name,
            categoryName: task.categoryName || task.category_name,
            subcategoryName: task.subcategoryName || task.subcategory_name,
            taskName: task.taskName,
            // Legacy fields for backward compatibility
            category: task.category || task.categoryName,
            subCategory: task.subCategory || task.subcategoryName,
            observations: task.observations || null,
            edlType: edlType,
          }
        }));

        const { error: tasksError } = await supabase
          .from('extracted_tasks')
          .insert(tasksToInsert);
        
        if (tasksError) {
          console.error('Error inserting extracted tasks:', tasksError);
          // Continue even if task insertion fails
        } else {
          console.log(`✅ ${tasksToInsert.length} tâches extraites sauvegardées avec classification DTC`);
        }
      }

      toast.success('Séquence enregistrée avec succès !');
      onSequenceCreated?.(sequence.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving sequence:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canValidate = selectedLocation && selectedZone && (description.trim() || media.length > 0) && edlType && captureMode;

  // Progress calculation
  const getProgress = () => {
    const steps = ['edlType', 'captureMode', 'location', 'capture', 'aiProcessing', 'review'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 rounded-t-3xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <Progress value={getProgress()} className="h-full" />
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: EDL Type Selection */}
          {step === 'edlType' && (
            <motion.div
              key="edlType"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div>
                  <h2 className="text-xl font-bold">Type d'EDL</h2>
                  <p className="text-sm text-muted-foreground">Sélectionnez le type d'état des lieux</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-4">
                  {EDL_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = edlType === type.value;
                    
                    return (
                      <Card
                        key={type.value}
                        className={cn(
                          "p-6 cursor-pointer transition-all relative",
                          isSelected 
                            ? "ring-2 ring-primary bg-primary/5" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => handleEdlTypeSelect(type.value)}
                      >
                        {isSelected && (
                          <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div className="flex flex-col items-center gap-3">
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center",
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}>
                            <Icon className="h-7 w-7" />
                          </div>
                          <div className="text-center">
                            <h3 className="font-semibold text-base">{type.label}</h3>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 pt-3 border-t border-border/40 bg-background safe-area-bottom">
                <Button
                  onClick={() => setStep('captureMode')}
                  disabled={!edlType}
                  className="w-full h-14 rounded-2xl text-lg font-semibold"
                >
                  Suivant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Capture Mode Selection */}
          {step === 'captureMode' && (
            <motion.div
              key="captureMode"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <button onClick={() => setStep('edlType')} className="flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm">Retour</span>
                </button>
                <div>
                  <h2 className="text-xl font-bold">Mode de capture</h2>
                  <p className="text-sm text-muted-foreground">Choisissez votre méthode</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  {CAPTURE_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = captureMode === mode.value;
                    
                    return (
                      <Card
                        key={mode.value}
                        className={cn(
                          "p-6 cursor-pointer transition-all relative",
                          isSelected 
                            ? "ring-2 ring-primary bg-primary/5" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => handleCaptureModeSelect(mode.value)}
                      >
                        {isSelected && (
                          <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}>
                            <Icon className="h-7 w-7" />
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-8">
                            <h3 className="font-semibold text-lg mb-2">{mode.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {mode.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 pt-3 border-t border-border/40 bg-background safe-area-bottom">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('edlType')}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Retour
                  </Button>
                  <Button
                    onClick={() => setStep('location')}
                    disabled={!captureMode}
                    className="flex-1 h-14 rounded-2xl text-lg font-semibold"
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Location Selection - Quick Grid */}
          {step === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <button onClick={() => setStep('captureMode')} className="flex items-center gap-2">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm">Retour</span>
                </button>
                <div>
                  <h2 className="text-xl font-bold">Où êtes-vous ?</h2>
                  <p className="text-sm text-muted-foreground">Sélectionnez lieu + zone</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Quick Location Grid */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : selectedPartieType === null ? (
                  // Étape 1: Sélectionner la partie (COMMUNES ou PRIVATIVES)
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[PremiumCaptureFlow] Clicked COMMUNES, parts:', parts);
                        const communePart = parts.find(p => p.part_type === 'commune');
                        console.log('[PremiumCaptureFlow] Commune part found:', communePart);
                        console.log('[PremiumCaptureFlow] Locations:', communePart?.property_locations);
                        setSelectedPartieType('commune');
                      }}
                      className="w-full text-left relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/5 border-2 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10 active:scale-[0.98] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">COMMUNES</h4>
                          <p className="text-sm text-muted-foreground">
                            {parts.find(p => p.part_type === 'commune')?.property_locations?.length || 0} lieu{parts.find(p => p.part_type === 'commune')?.property_locations?.length !== 1 ? 'x' : ''} disponible{parts.find(p => p.part_type === 'commune')?.property_locations?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-blue-500" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[PremiumCaptureFlow] Clicked PRIVATIVES, parts:', parts);
                        const privativePart = parts.find(p => p.part_type === 'privative');
                        console.log('[PremiumCaptureFlow] Privative part found:', privativePart);
                        console.log('[PremiumCaptureFlow] Locations:', privativePart?.property_locations);
                        setSelectedPartieType('privative');
                      }}
                      className="w-full text-left relative z-10 cursor-pointer"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border-2 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-[0.98] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                          <Home className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">PRIVATIVES</h4>
                          <p className="text-sm text-muted-foreground">
                            {parts.find(p => p.part_type === 'privative')?.property_locations?.length || 0} lieu{parts.find(p => p.part_type === 'privative')?.property_locations?.length !== 1 ? 'x' : ''} disponible{parts.find(p => p.part_type === 'privative')?.property_locations?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-amber-500" />
                      </div>
                    </button>
                  </div>
                ) : (
                  // Étape 2: Afficher les lieux de la partie sélectionnée
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[PremiumCaptureFlow] Back button clicked');
                        setSelectedPartieType(null);
                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Retour
                    </button>
                    
                    {(() => {
                      const filteredParts = parts.filter(part => part.part_type === selectedPartieType);
                      console.log('[PremiumCaptureFlow] Selected partie type:', selectedPartieType);
                      console.log('[PremiumCaptureFlow] Filtered parts:', filteredParts);
                      
                      if (filteredParts.length === 0) {
                        return (
                          <div className="p-8 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 text-center">
                            <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                            <h3 className="font-semibold text-lg mb-2">
                              Aucune partie {selectedPartieType === 'commune' ? 'commune' : 'privative'} définie
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Définissez la structure du bâtiment dans les informations du projet
                            </p>
                          </div>
                        );
                      }
                      
                      return filteredParts.map(part => (
                        <div key={part.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              part.part_type === 'commune' ? 'bg-blue-500' : 'bg-amber-500'
                            )} />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {part.part_type === 'commune' ? 'Communes' : 'Privatives'}
                            </span>
                          </div>

                          {part.property_locations && part.property_locations.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                              {part.property_locations.map((loc) => {
                                const IconComponent = getLocationIcon(loc.location_type);
                                return (
                                  <LocationCard
                                    key={loc.id}
                                    location={loc}
                                    Icon={IconComponent}
                                    onSelectZone={(zone) => handleLocationSelect(loc, zone)}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 text-center">
                              <p className="text-sm text-muted-foreground">
                                Aucun lieu défini pour cette partie
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-1">
                                Définissez des lieux dans les informations du projet
                              </p>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {!loading && parts.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="font-semibold text-lg mb-2">Aucun lieu défini</h3>
                    <p className="text-sm text-muted-foreground">
                      Définissez la structure du bâtiment dans les informations du projet
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Capture - Description + Media */}
          {step === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col"
            >
              {/* Header with location */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <button onClick={() => setStep('location')} className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                  )}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{selectedLocation?.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {getZoneLabel(selectedZone || '', selectedLocation?.location_type)}
                      <ChevronRight className="h-3 w-3" />
                      <span className="text-primary">Modifier</span>
                    </p>
                  </div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Capture Content - Premium Apple-style */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Problem Description Card */}
                <PremiumInputCard
                  type="problem"
                  value={description}
                  onChange={setDescription}
                  media={problemMedia}
                  onMediaAdd={handleProblemMediaAdd}
                  onMediaRemove={handleProblemMediaRemove}
                />

                {/* Recommendations Card */}
                <PremiumInputCard
                  type="recommendation"
                  value={recommendations}
                  onChange={setRecommendations}
                  media={recommendationMedia}
                  onMediaAdd={handleRecommendationMediaAdd}
                  onMediaRemove={handleRecommendationMediaRemove}
                />
              </div>

              {/* Validate Button - Fixed at bottom */}
              <div className="p-5 pt-3 border-t border-border/40 bg-background safe-area-bottom">
                <Button
                  onClick={handleValidate}
                  disabled={!canValidate || isSubmitting}
                  className={cn(
                    "w-full h-14 rounded-2xl text-lg font-semibold gap-2",
                    "bg-gradient-to-r from-primary to-primary/80",
                    "shadow-lg shadow-primary/25",
                    "disabled:opacity-50"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Valider la séquence
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  L'IA analysera ensuite vos données
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 5: AI Processing */}
          {step === 'aiProcessing' && (
            <motion.div
              key="aiProcessing"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col"
            >
              <StepAIProcessing
                captureData={captureData}
                updateCaptureData={(updates) => {
                  setCaptureData(prev => ({ ...prev, ...updates }));
                }}
                onNext={() => handleAIProcessingComplete(captureData)}
                onBack={() => setStep('capture')}
              />
            </motion.div>
          )}

          {/* STEP 6: Review */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full flex flex-col"
            >
              <StepReview
                captureData={captureData}
                updateCaptureData={(updates) => {
                  setCaptureData(prev => ({ ...prev, ...updates }));
                }}
                onComplete={handleReviewComplete}
                onBack={() => setStep('aiProcessing')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};

// Location Card with Zone Quick Select
const LocationCard: React.FC<{
  location: PropertyLocation;
  Icon: React.ComponentType<any>;
  onSelectZone: (zone: string) => void;
}> = ({ location, Icon, onSelectZone }) => {
  const [expanded, setExpanded] = useState(false);
  const zones = getZonesForLocation(location.location_type);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full p-4 rounded-2xl border-2 text-left transition-all",
          expanded 
            ? "border-primary bg-primary/5" 
            : "border-border/50 bg-card hover:border-primary/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-muted to-muted/50"
          )}>
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
          <span className="font-medium text-sm flex-1">{location.name}</span>
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )} />
        </div>
      </button>

      {/* Zone Quick Select - Contextual based on location type */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 pt-2">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone(zone.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "bg-gradient-to-r text-white",
                    "hover:opacity-90 active:scale-95 transition-all",
                    zone.color
                  )}
                >
                  {zone.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumCaptureFlow;
