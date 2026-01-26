import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { TaskList, ExtractedTask } from "@/components/TaskList";
import { InspectionDialog } from "@/components/InspectionDialog";
import { PDFExporter } from "@/components/PDFExporter";
import { AdditionalInfoInput } from "@/components/AdditionalInfoInput";
import { TemplatePreviewDialog } from "@/components/TemplatePreviewDialog";
import { CustomTemplateDialog } from "@/components/CustomTemplateDialog";
import { DynamicTemplateFields } from "@/components/DynamicTemplateFields";
import { ReclassifyTasksButton } from "@/components/ReclassifyTasksButton";
import { AIPredictionsPanel } from "@/components/AIPredictionsPanel";
import { MissingTaskDetector } from "@/components/MissingTaskDetector";
import { VisitRecorder } from "@/components/visit/VisitRecorder";
import { VisitTimeline } from "@/components/visit/VisitTimeline";
import { BlockDetailDialog } from "@/components/visit/BlockDetailDialog";
import { BlockCorrectionDialog } from "@/components/visit/BlockCorrectionDialog";
import { EDLExportDialog } from "@/components/visit/EDLExportDialog";
import { EDLReportEditor } from "@/components/visit/EDLReportEditor";
import { EDLReportEditorSplitView } from "@/components/visit/EDLReportEditorSplitView";
import { VisitSequencesList } from "@/components/visit/VisitSequencesList";
import { ProjectDocumentUploader } from "@/components/ProjectDocumentUploader";
import { VisitPreparationPanel } from "@/components/VisitPreparationPanel";
import { ProjectInfoWizard } from "@/components/project/ProjectInfoWizard";
import { ProjectMenuBar, ProjectMenuSection } from "@/components/project/ProjectMenu";
import { VideoReportageDialog } from "@/components/visit/VideoReportageDialog";
import { QuickReportageButton } from "@/components/visit/QuickReportageButton";
import { KanbanBoard } from "@/components/kanban";
import { useKanbanTasks } from "@/hooks/useKanbanTasks";
import { ReportageHub } from "@/components/visit/reportage-hub";
import { SequencesModule } from "@/components/project/modules";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, ArrowLeft, Plus, Save, Edit, X, FileText, Trash2, RefreshCw, Archive, Eye, XCircle, Video, ClipboardList, History, CheckCircle2, Clock, MapPin, Image as ImageIcon, Ruler, ChevronRight, Camera, LayoutGrid, Clapperboard, Lightbulb } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Session } from "@supabase/supabase-js";
import { TEMPLATES } from "@/utils/templateData";

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

type ProjectSection = 'info' | 'actions' | 'tasks' | 'kanban' | 'predictions' | 'preparation' | 'report' | 'reportage-hub' | 'sequences-tasks' | null;

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isInIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);
  const menuBottomOffsetClass = isMobile && isInIframe ? "bottom-[72px]" : "bottom-0";
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Track initial tab from URL
  const [initialTab, setInitialTab] = useState<string | null>(null);
  const [initialPartie, setInitialPartie] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<{ name: string; path: string } | null>(null);
  const [reanalyzingPdf, setReanalyzingPdf] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customTemplateOpen, setCustomTemplateOpen] = useState(false);
  const [customTemplateBaseContent, setCustomTemplateBaseContent] = useState("");
  const [customTemplateBaseLevel, setCustomTemplateBaseLevel] = useState("");
  const [visitRecorderOpen, setVisitRecorderOpen] = useState(false);
  const [currentVisitSessionId, setCurrentVisitSessionId] = useState<string | null>(null);
  const [visitSessions, setVisitSessions] = useState<any[]>([]);
  const [blockDetailOpen, setBlockDetailOpen] = useState(false);
  const [blockCorrectionOpen, setBlockCorrectionOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [edlExportOpen, setEdlExportOpen] = useState(false);
  const [exportSessionId, setExportSessionId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<ProjectSection>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [videoReportageOpen, setVideoReportageOpen] = useState(false);
  const [initialReportageMode, setInitialReportageMode] = useState<'guided' | 'free' | null>(null);
  const [initialReportageLocation, setInitialReportageLocation] = useState<{
    locationId: string | null;
    endroitName: string | null;
    zoneType: string | null;
    description: string | null;
    sequenceId: string | null;
  }>({ locationId: null, endroitName: null, zoneType: null, description: null, sequenceId: null });

  // Return-to context (e.g. coming from "vidéo à la volée")
  const [returnToFreeVideo, setReturnToFreeVideo] = useState(false);
  const [sequencesFromVideo, setSequencesFromVideo] = useState(false);

  // Form state
  const [propertyType, setPropertyType] = useState<string>("building");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [numberOfUnits, setNumberOfUnits] = useState("");
  const [hasParking, setHasParking] = useState(false);
  const [hasBox, setHasBox] = useState(false);
  const [hasGarage, setHasGarage] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [templateMode, setTemplateMode] = useState<'simplified' | 'detailed' | 'very-detailed' | 'exhaustive'>('simplified');
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [lastUsedTemplateId, setLastUsedTemplateId] = useState<string | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  
  // Composition state
  const [partiesCommunes, setPartiesCommunes] = useState<Array<{id: string; name: string; type: string}>>([]);
  const [partiesPrivatives, setPartiesPrivatives] = useState<Array<{id: string; name: string; type: string; numero?: string; pieces?: Array<{id: string; type: string; name: string}>}>>([]);
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Kanban tasks hook
  const { 
    tasks: kanbanTasks, 
    loading: kanbanLoading, 
    refresh: refreshKanban, 
    updateTaskStatus 
  } = useKanbanTasks({ projectId: id });

  // Check authentication
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setCheckingAuth(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validate UUID format before loading
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Load project and tasks
  useEffect(() => {
    if (user && id) {
      // Validate that id is a valid UUID (not a number like "5" or "6")
      if (!isValidUUID(id)) {
        console.error('[Project] Invalid project ID format:', id);
        toast({
          title: "Erreur",
          description: "ID de projet invalide",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      loadProject();
      loadTasks();
      loadVisitSessions();
      
      // Store as last visited project
      localStorage.setItem('lastVisitedProject', id);
    }
  }, [user, id, navigate, toast]);

  // Handle URL query params for deep linking to sections
  useEffect(() => {
    const tab = searchParams.get('tab');
    const partie = searchParams.get('partie');
    const section = searchParams.get('section');
    const from = searchParams.get('from');

    if (section) {
      if (section === 'sequences' || section === 'sequences-tasks') {
        setOpenSection('sequences-tasks');
        if (from === 'video') {
          setSequencesFromVideo(true);
          setReturnToFreeVideo(true);
        }
      } else if (section === 'reportage-hub') {
        setOpenSection('reportage-hub');
      } else if (section === 'tasks') {
        setOpenSection('sequences-tasks');  // Rediriger vers sequences-tasks
      } else if (section === 'report') {
        setOpenSection('report');
      } else if (section === 'info') {
        setOpenSection('info');
      }

      // Clear the query params after processing
      setSearchParams({}, { replace: true });
      return;
    }

    if (tab) {
      // Store the initial tab/partie for ProjectInfoWizard
      setInitialTab(tab);
      setInitialPartie(partie);

      // Open the info section if tab is composition or other project info tabs
      if (['composition', 'type', 'localisation', 'adresse360', 'documents', 'recapitulatif'].includes(tab)) {
        setOpenSection('info');
      }

      // Clear the query params after processing
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadVisitSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitSessions(data || []);
    } catch (error) {
      console.error('Error loading visit sequences:', error);
    }
  };

  const handleVisitComplete = (sessionId: string) => {
    setCurrentVisitSessionId(sessionId);
    setVisitRecorderOpen(false);
    loadVisitSessions();
    loadTasks();
  };

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const projectData = {
        ...data,
        pdf_files: data.pdf_files ? JSON.parse(JSON.stringify(data.pdf_files)) : [],
        project_documents: data.project_documents ? JSON.parse(JSON.stringify(data.project_documents)) : []
      } as Project;
      
      setProject(projectData);
      setPropertyType(data.property_type);
      setAddress(data.address);
      setPostalCode(data.postal_code || "");
      setCity(data.city || "");
      setNumberOfUnits(data.number_of_units?.toString() || "");
      setHasParking(data.has_parking);
      setHasBox(data.has_box);
      setHasGarage(data.has_garage);
      setAdditionalInfo(data.additional_info || "");
      setTemplateData((data as any).template_data || {});
      setLastUsedTemplateId((data as any).last_used_template_id || null);
      setProjectDocuments((data as any).project_documents || []);
      
      // Load composition data from property_parts and property_locations
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*, property_locations(*)')
        .eq('project_id', id)
        .order('order_index');
      
      if (partsData) {
        type PrivativeType = {
          id: string;
          name: string;
          type: string;
          numero?: string;
          pieces?: Array<{id: string; type: string; name: string}>;
        };
        const communes: Array<{id: string; name: string; type: string}> = [];
        const privatives: PrivativeType[] = [];
        
        partsData.forEach((part: any) => {
          if (part.part_type === 'commune') {
            // Check if it has locations (actual communes) or is a container
            if (part.property_locations && part.property_locations.length > 0) {
              part.property_locations.forEach((loc: any) => {
                communes.push({
                  id: loc.id,
                  name: loc.name,
                  type: loc.location_type || 'autre'
                });
              });
            }
          } else if (part.part_type === 'privative') {
            if (part.property_locations && part.property_locations.length > 0) {
              part.property_locations.forEach((loc: any) => {
                privatives.push({
                  id: loc.id,
                  name: loc.name,
                  type: loc.location_type || 'appartement',
                  numero: loc.numero_lot,
                  pieces: loc.pieces_json ? JSON.parse(loc.pieces_json) : undefined
                });
              });
            }
          }
        });
        
        setPartiesCommunes(communes);
        setPartiesPrivatives(privatives);
      }
    } catch (error) {
      console.error('[Project] Error loading project:', JSON.stringify(error, null, 2));
      console.error('[Project] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      toast({
        title: "Erreur",
        description: `Impossible de charger le projet: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      // Load tasks (sans JOIN sur users car la FK peut ne pas exister)
      const { data: tasksData, error: tasksError } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error loading tasks:', tasksError);
        toast({
          title: "Erreur",
          description: "Impossible de charger les tâches",
          variant: "destructive",
        });
        return;
      }

      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        return;
      }

      // Load DTC taxonomy data
      const [ftResult, ctResult, scResult] = await Promise.all([
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label')
      ]);

      const ftMap = new Map(ftResult.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctResult.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scResult.data?.map(sc => [sc.id, sc]) || []);

      // Transform tasks with DTC data
      const transformedData = tasksData.map((task: any) => {
        const ft = task.family_id ? ftMap.get(task.family_id) : null;
        const ct = task.category_id ? ctMap.get(task.category_id) : null;
        const sc = task.subcategory_id ? scMap.get(task.subcategory_id) : null;
        
        return {
          ...task,
          // Map DTC to old structure for compatibility
          task_families: ft ? { code: ft.ft_code, name: ft.ft_label } : null,
          task_categories: ct ? { code: ct.ct_code, name: ct.ct_label } : null,
          task_subcategories: sc ? { code: sc.sc_code, name: sc.sc_label } : null,
        };
      });
      
      setTasks(transformedData as unknown as ExtractedTask[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Templates should not auto-fill additionalInfo - removed auto-load functionality
  // additionalInfo is always empty for user to fill freely

  const handleDissociateTemplate = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('edl_projects')
        .update({ last_used_template_id: null })
        .eq('id', id);

      if (error) throw error;

      setLastUsedTemplateId(null);
      
      toast({
        title: t('cancel') === 'Annuler' ? '✅ Template dissocié' : '✅ Template dissociated',
        description: t('cancel') === 'Annuler' 
          ? 'Vous pouvez maintenant utiliser les templates par défaut' 
          : 'You can now use the default templates',
      });
    } catch (error) {
      console.error('Error dissociating template:', error);
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: t('cancel') === 'Annuler' 
          ? 'Impossible de dissocier le template' 
          : 'Failed to dissociate template',
        variant: "destructive",
      });
    }
  };

  // Sync composition to property_parts and property_locations tables
  const syncCompositionToDatabase = async () => {
    if (!id) return;
    
    try {
      // First, get or create commune and privative parts
      const { data: existingParts } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', id);
      
      let communePart = existingParts?.find((p: any) => p.part_type === 'commune');
      let privativePart = existingParts?.find((p: any) => p.part_type === 'privative');
      
      // Create commune part if it doesn't exist
      if (!communePart) {
        const { data: newPart, error } = await supabase
          .from('property_parts')
          .insert({
            project_id: id,
            part_type: 'commune',
            name: 'Parties Communes',
            order_index: 0
          })
          .select()
          .single();
        if (!error) communePart = newPart;
      }
      
      // Create privative part if it doesn't exist
      if (!privativePart) {
        const { data: newPart, error } = await supabase
          .from('property_parts')
          .insert({
            project_id: id,
            part_type: 'privative',
            name: 'Parties Privatives',
            order_index: 1
          })
          .select()
          .single();
        if (!error) privativePart = newPart;
      }
      
      // Get existing locations
      const { data: existingLocations } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', id);
      
      const existingLocIds = new Set((existingLocations || []).map((l: any) => l.id));
      
      // Sync communes
      if (communePart) {
        for (let i = 0; i < partiesCommunes.length; i++) {
          const pc = partiesCommunes[i];
          if (existingLocIds.has(pc.id)) {
            // Update existing
            await supabase
              .from('property_locations')
              .update({
                name: pc.name,
                location_type: pc.type,
                order_index: i
              })
              .eq('id', pc.id);
          } else {
            // Create new
            await supabase
              .from('property_locations')
              .insert({
                id: pc.id,
                project_id: id,
                part_id: communePart.id,
                name: pc.name,
                location_type: pc.type,
                order_index: i
              });
          }
        }
        
        // Delete removed communes
        const currentCommuneIds = new Set(partiesCommunes.map(p => p.id));
        const communesToDelete = (existingLocations || [])
          .filter((l: any) => l.part_id === communePart.id && !currentCommuneIds.has(l.id))
          .map((l: any) => l.id);
        
        if (communesToDelete.length > 0) {
          await supabase
            .from('property_locations')
            .delete()
            .in('id', communesToDelete);
        }
      }
      
      // Sync privatives
      if (privativePart) {
        for (let i = 0; i < partiesPrivatives.length; i++) {
          const pp = partiesPrivatives[i];
          if (existingLocIds.has(pp.id)) {
            // Update existing
            await supabase
              .from('property_locations')
              .update({
                name: pp.name,
                location_type: pp.type,
                numero_lot: pp.numero,
                order_index: i
              })
              .eq('id', pp.id);
          } else {
            // Create new
            await supabase
              .from('property_locations')
              .insert({
                id: pp.id,
                project_id: id,
                part_id: privativePart.id,
                name: pp.name,
                location_type: pp.type,
                numero_lot: pp.numero,
                order_index: i
              });
          }
        }
        
        // Delete removed privatives
        const currentPrivativeIds = new Set(partiesPrivatives.map(p => p.id));
        const privativesToDelete = (existingLocations || [])
          .filter((l: any) => l.part_id === privativePart.id && !currentPrivativeIds.has(l.id))
          .map((l: any) => l.id);
        
        if (privativesToDelete.length > 0) {
          await supabase
            .from('property_locations')
            .delete()
            .in('id', privativesToDelete);
        }
      }
      
      console.log('Composition synced successfully');
    } catch (error) {
      console.error('Error syncing composition:', error);
      throw error;
    }
  };

  const handleSaveProject = async () => {
    if (!address.trim()) {
      toast({
        title: "Adresse requise",
        description: "Veuillez saisir l'adresse du bien",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Mark all wizard steps as permanently completed
      const allStepsCompleted = {
        ...((templateData as any) || {}),
        project_info_wizard: {
          progress: {
            completedSteps: [1, 2, 3, 4, 5, 6],
            currentStep: 6,
          },
        },
      };
      
      setTemplateData(allStepsCompleted);

      // Save project data with all steps marked complete
      const { error } = await supabase
        .from('edl_projects')
        .update({
          property_type: propertyType,
          address,
          postal_code: postalCode || null,
          city: city || null,
          number_of_units: numberOfUnits ? parseInt(numberOfUnits) : null,
          has_parking: hasParking,
          has_box: hasBox,
          has_garage: hasGarage,
          additional_info: additionalInfo || null,
          template_data: allStepsCompleted,
          project_documents: projectDocuments as any,
        })
        .eq('id', id);

      if (error) {
        console.error('[Project] Update error:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Sync composition to property_parts and property_locations
      await syncCompositionToDatabase();

      toast({
        title: "✅ Projet mis à jour",
        description: "Les modifications ont été enregistrées",
      });
      
      setIsEditing(false);
      setHasUnsavedChanges(false);
      loadProject();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Auto-save documents to database
  const handleAutoSaveDocuments = async (documents: any[]) => {
    if (!id) return;
    try {
      await supabase
        .from('edl_projects')
        .update({ project_documents: documents as any })
        .eq('id', id);
    } catch (error) {
      console.error('Error auto-saving documents:', error);
    }
  };

  // Auto-save the 6-step wizard progress (and current form values) so reopening the project restores the wizard state
  const handleAutoSaveProjectInfoProgress = async (progress: { completedSteps: number[]; currentStep: number }) => {
    if (!id) return;

    try {
      const nextTemplateData = {
        // Merge with the latest project template_data to avoid overwriting unrelated keys
        ...((project?.template_data as any) || {}),
        ...(templateData as any),
        project_info_wizard: {
          ...((((project?.template_data as any) || (templateData as any))?.project_info_wizard) || {}),
          progress,
        },
      };

      setTemplateData(nextTemplateData);

      await supabase
        .from('edl_projects')
        .update({
          property_type: propertyType,
          address,
          postal_code: postalCode || null,
          city: city || null,
          number_of_units: numberOfUnits ? parseInt(numberOfUnits) : null,
          has_parking: hasParking,
          has_box: hasBox,
          has_garage: hasGarage,
          additional_info: additionalInfo || null,
          template_data: nextTemplateData as any,
          project_documents: projectDocuments as any,
        })
        .eq('id', id);

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error auto-saving project info progress:', error);
      throw error;
    }
  };
  
  // Track composition changes and auto-sync
  const handlePartiesCommunesChange = async (newParties: Array<{id: string; name: string; type: string}>) => {
    setPartiesCommunes(newParties);
    setHasUnsavedChanges(true);
    
    // Auto-sync to database
    try {
      // Get or create commune part
      const { data: existingParts } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', id);
      
      let communePart = existingParts?.find((p: any) => p.part_type === 'commune');
      
      if (!communePart) {
        const { data: newPart } = await supabase
          .from('property_parts')
          .insert({
            project_id: id,
            part_type: 'commune',
            name: 'Parties Communes',
            order_index: 0
          })
          .select()
          .single();
        communePart = newPart;
      }
      
      if (communePart) {
        // Get existing locations
        const { data: existingLocations } = await supabase
          .from('property_locations')
          .select('*')
          .eq('part_id', communePart.id);
        
        const existingLocIds = new Set((existingLocations || []).map((l: any) => l.id));
        
        // Sync communes
        for (let i = 0; i < newParties.length; i++) {
          const pc = newParties[i];
          if (existingLocIds.has(pc.id)) {
            await supabase
              .from('property_locations')
              .update({ name: pc.name, location_type: pc.type, order_index: i })
              .eq('id', pc.id);
          } else {
            await supabase
              .from('property_locations')
              .insert({
                id: pc.id,
                project_id: id,
                part_id: communePart.id,
                name: pc.name,
                location_type: pc.type,
                order_index: i
              });
          }
        }
        
        // Delete removed communes
        const currentCommuneIds = new Set(newParties.map(p => p.id));
        const communesToDelete = (existingLocations || [])
          .filter((l: any) => !currentCommuneIds.has(l.id))
          .map((l: any) => l.id);
        
        if (communesToDelete.length > 0) {
          await supabase
            .from('property_locations')
            .delete()
            .in('id', communesToDelete);
        }
      }
    } catch (error) {
      console.error('Error auto-syncing communes:', error);
    }
  };
  
  const handlePartiesPrivativesChange = async (newParties: Array<{id: string; name: string; type: string; numero?: string; pieces?: Array<{id: string; type: string; name: string}>}>) => {
    setPartiesPrivatives(newParties);
    setHasUnsavedChanges(true);
    
    // Auto-sync to database
    try {
      // Get or create privative part
      const { data: existingParts } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', id);
      
      let privativePart = existingParts?.find((p: any) => p.part_type === 'privative');
      
      if (!privativePart) {
        const { data: newPart } = await supabase
          .from('property_parts')
          .insert({
            project_id: id,
            part_type: 'privative',
            name: 'Parties Privatives',
            order_index: 1
          })
          .select()
          .single();
        privativePart = newPart;
      }
      
      if (privativePart) {
        // Get existing locations
        const { data: existingLocations } = await supabase
          .from('property_locations')
          .select('*')
          .eq('part_id', privativePart.id);
        
        const existingLocIds = new Set((existingLocations || []).map((l: any) => l.id));
        
        // Sync privatives
        for (let i = 0; i < newParties.length; i++) {
          const pp = newParties[i];
          const piecesJson = pp.pieces ? JSON.stringify(pp.pieces) : null;
          
          if (existingLocIds.has(pp.id)) {
            await supabase
              .from('property_locations')
              .update({ 
                name: pp.name, 
                location_type: pp.type, 
                numero_lot: pp.numero, 
                order_index: i,
                pieces_json: piecesJson
              })
              .eq('id', pp.id);
          } else {
            await supabase
              .from('property_locations')
              .insert({
                id: pp.id,
                project_id: id,
                part_id: privativePart.id,
                name: pp.name,
                location_type: pp.type,
                numero_lot: pp.numero,
                order_index: i,
                pieces_json: piecesJson
              });
          }
        }
        
        // Delete removed privatives
        const currentPrivativeIds = new Set(newParties.map(p => p.id));
        const privativesToDelete = (existingLocations || [])
          .filter((l: any) => !currentPrivativeIds.has(l.id))
          .map((l: any) => l.id);
        
        if (privativesToDelete.length > 0) {
          await supabase
            .from('property_locations')
            .delete()
            .in('id', privativesToDelete);
        }
      }
    } catch (error) {
      console.error('Error auto-syncing privatives:', error);
    }
  };
  
  // Handle save prompt
  const handleSaveAndContinue = async () => {
    await handleSaveProject();
    setSavePromptOpen(false);
    if (pendingNavigation) {
      if (pendingNavigation === 'video-reportage') {
        setVideoReportageOpen(true);
      }
      setPendingNavigation(null);
    }
  };
  
  const handleDiscardChanges = () => {
    setSavePromptOpen(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      if (pendingNavigation === 'video-reportage') {
        setVideoReportageOpen(true);
      }
      setPendingNavigation(null);
    }
  };
  
  const handleOpenVideoReportage = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation('video-reportage');
      setSavePromptOpen(true);
    } else {
      setVideoReportageOpen(true);
    }
  };

  const processContent = async (content: string, contentType: 'text' | 'image', imageFile?: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-tasks', {
        body: { content, contentType, imageFile, projectId: id }
      });

      if (error) throw error;

      if (data?.tasks) {
        setTasks(prev => [...data.tasks, ...prev]);
        console.log('Tasks extracted:', data.tasks.length);
        
        toast({
          title: `✅ ${t('extractionSuccess')}`,
          description: `${data.tasks.length} ${t('extractedTasksDesc')}`,
        });
      }
    } catch (error) {
      console.error('Error processing content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast({
        title: `❌ ${t('extractionError')}`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await processContent(base64, 'image', base64);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = async (files: FileList) => {
    toast({
      title: `🎥 ${t('videoProcessing')}`,
      description: "Extraction d'images clés de la vidéo en cours...",
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadeddata = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const duration = video.duration;
        const frameInterval = Math.min(5, duration / 3);
        
        for (let time = 0; time < duration; time += frameInterval) {
          video.currentTime = time;
          
          await new Promise((resolve) => {
            video.onseeked = async () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              await processContent(base64, 'image', base64);
              resolve(null);
            };
          });
        }
      };
      
      video.src = URL.createObjectURL(file);
    }
  };

  const handleTextSubmit = async (text: string) => {
    await processContent(text, 'text');
  };

  const handleDeletePdf = async (pdfPath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('project-pdfs')
        .remove([pdfPath]);

      if (storageError) throw storageError;

      // Update project to remove PDF reference
      if (project) {
        const updatedPdfFiles = (project.pdf_files || []).filter(pdf => pdf.path !== pdfPath);
        
        const { error: updateError } = await supabase
          .from('edl_projects')
          .update({ pdf_files: updatedPdfFiles })
          .eq('id', project.id);

        if (updateError) throw updateError;

        await loadProject();
        
        toast({
          title: "✅ PDF supprimé",
          description: "Le PDF a été supprimé avec succès",
        });
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le PDF",
        variant: "destructive",
      });
    } finally {
      setPdfToDelete(null);
    }
  };

  const handleReanalyzePdf = async (pdfPath: string) => {
    setReanalyzingPdf(pdfPath);
    
    toast({
      title: `📄 ${t('cancel') === 'Annuler' ? 'Ré-analyse du PDF' : 'Re-analyzing PDF'}`,
      description: t('cancel') === 'Annuler' 
        ? "Extraction des tâches depuis le PDF..." 
        : "Extracting tasks from PDF...",
    });

    try {
      // Download PDF from storage
      const { data: pdfBlob, error: downloadError } = await supabase
        .storage
        .from('project-pdfs')
        .download(pdfPath);

      if (downloadError) throw downloadError;

      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64File = reader.result as string;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      
      // Call extract-from-pdf function
      const { data, error } = await supabase.functions.invoke('extract-from-pdf', {
        body: { 
          pdfFile: base64File,
          projectId: id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw error;
      }

      await loadTasks();
      
      toast({
        title: "✅ PDF ré-analysé avec succès",
        description: `${data?.tasks?.length || 0} tâche(s) extraite(s)`,
      });
    } catch (error) {
      console.error('Error reanalyzing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast({
        title: `❌ ${t('extractionError')}`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setReanalyzingPdf(null);
    }
  };

  const handleArchiveClick = () => {
    if (project?.archived) {
      // Unarchive doesn't need confirmation
      handleArchiveConfirm();
    } else {
      // Archive needs confirmation
      setArchiveConfirmOpen(true);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!project) return;
    
    setArchiveConfirmOpen(false);
    setIsArchiving(true);
    try {
      const newArchivedState = !project.archived;
      
      const { error } = await supabase
        .from('edl_projects')
        .update({ archived: newArchivedState })
        .eq('id', project.id);

      if (error) throw error;

      // Log archiving for analytics
      if (newArchivedState) {
        console.log('Project archived successfully');
      }

      await loadProject();
      
      toast({
        title: newArchivedState ? "📦 Projet archivé" : "📂 Projet désarchivé",
        description: newArchivedState 
          ? "Le projet a été déplacé dans les archives"
          : "Le projet est de nouveau actif",
      });
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le statut du projet",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePdfUpload = async (file: File, selectedPages?: number[]) => {
    setIsProcessing(true);
    toast({
      title: `📄 ${t('cancel') === 'Annuler' ? 'Traitement du PDF' : 'Processing PDF'}`,
      description: t('cancel') === 'Annuler' 
        ? "Extraction des tâches et informations du projet depuis le PDF..." 
        : "Extracting tasks and project information from PDF...",
    });

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64File = reader.result as string;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      
      // Call extract-from-pdf function
      const { data, error } = await supabase.functions.invoke('extract-from-pdf', {
        body: { 
          pdfFile: base64File,
          projectId: id,
          selectedPages: selectedPages
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw error;
      }

      // Check if project info was extracted
      if (data?.projectInfo) {
        const projectInfo = data.projectInfo;
        const updates: string[] = [];
        
        if (projectInfo.address && (!project?.address || project.address !== projectInfo.address)) {
          updates.push(`Adresse: ${projectInfo.address}`);
        }
        if (projectInfo.city && (!project?.city || project.city !== projectInfo.city)) {
          updates.push(`Ville: ${projectInfo.city}`);
        }
        if (projectInfo.postal_code && (!project?.postal_code || project.postal_code !== projectInfo.postal_code)) {
          updates.push(`Code postal: ${projectInfo.postal_code}`);
        }
        
        if (updates.length > 0) {
          toast({
            title: "📋 Informations détectées dans le PDF",
            description: `${updates.join(', ')}. Les champs ont été pré-remplis, vous pouvez les modifier et sauvegarder.`,
            duration: 10000,
          });
          
          // Auto-fill form
          if (projectInfo.property_type) setPropertyType(projectInfo.property_type);
          if (projectInfo.address) setAddress(projectInfo.address);
          if (projectInfo.city) setCity(projectInfo.city);
          if (projectInfo.postal_code) setPostalCode(projectInfo.postal_code);
          if (projectInfo.number_of_units) setNumberOfUnits(projectInfo.number_of_units.toString());
          if (projectInfo.has_parking !== undefined) setHasParking(projectInfo.has_parking);
          if (projectInfo.has_box !== undefined) setHasBox(projectInfo.has_box);
          if (projectInfo.has_garage !== undefined) setHasGarage(projectInfo.has_garage);
          if (projectInfo.additional_info) setAdditionalInfo(projectInfo.additional_info);
          
          // Switch to edit mode
          setIsEditing(true);
        }
      }

      await loadTasks();
      
      toast({
        title: "✅ PDF traité avec succès",
        description: `${data?.tasks?.length || 0} tâche(s) extraite(s)`,
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast({
        title: `❌ ${t('extractionError')}`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const propertyTypeLabels: Record<string, string> = {
    building: t('cancel') === 'Annuler' ? 'Immeuble' : 'Building',
    house: t('cancel') === 'Annuler' ? 'Maison' : 'House',
    apartment: t('cancel') === 'Annuler' ? 'Appartement' : 'Apartment',
    commercial: t('cancel') === 'Annuler' ? 'Local commercial' : 'Commercial property',
  };

  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeMenuSection: ProjectMenuSection = (() => {
    const section = openSection;
    if (
      section === 'info' ||
      section === 'reportage-hub' ||
      section === 'sequences-tasks' ||
      section === 'report'
    ) {
      return section;
    }
    // Map old sections to new combined section
    if (section === 'sequences' || section === 'tasks') {
      return 'sequences-tasks';
    }
    return 'home';
  })();

  const handleMenuSectionChange = (section: ProjectMenuSection) => {
    console.log('[Project] handleMenuSectionChange called with:', section);
    switch (section) {
      case 'home':
        setOpenSection(null);
        return;
      case 'info':
      case 'reportage-hub':
      case 'sequences-tasks':
      case 'report':
        setOpenSection(section);
        return;
      default:
        // Non géré dans cette page (ex: BIM)
        setOpenSection(null);
        return;
    }
  };

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-16 sm:pt-20 overflow-y-auto pb-28">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('cancel') === 'Annuler' ? 'Retour' : 'Back'}
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {project.address}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {propertyTypeLabels[project.property_type]}
                {project.archived && (
                  <span className="ml-2 text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Archivé' : 'Archived'}
                  </span>
                )}
              </p>
            </div>
          </div>
          
        </div>

        <Separator className="mb-8" />

        {/* Onboarding Guide */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="max-w-md w-full bg-gradient-to-br from-primary/5 via-background to-primary/5 rounded-3xl p-6 border border-primary/20 shadow-sm">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <Camera className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-center text-foreground mb-4">
              {t('cancel') === 'Annuler' ? 'Bienvenue sur votre projet !' : 'Welcome to your project!'}
            </h2>

            {/* Steps */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('cancel') === 'Annuler' 
                    ? 'Le menu est en bas de l\'écran 👇' 
                    : 'The menu is at the bottom of the screen 👇'}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('cancel') === 'Annuler' 
                    ? 'Va dans "Reportage" pour décrire un problème avec des préconisations éventuelles 📸' 
                    : 'Go to "Reporting" to describe a problem with recommendations 📸'}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('cancel') === 'Annuler' 
                    ? 'Fais autant de séquences que tu veux ! Elles serviront à extraire des tâches et générer un rapport 📋' 
                    : 'Create as many sequences as you want! They will be used to extract tasks and generate a report 📋'}
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-amber-600">
                    {t('cancel') === 'Annuler' ? 'Astuce : ' : 'Tip: '}
                  </span>
                  {t('cancel') === 'Annuler' 
                    ? 'Pour chaque reportage, choisis où tu te trouves depuis "Projet" pour bien localiser tes observations !' 
                    : 'For each report, choose your location from "Project" to properly locate your observations!'}
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mb-8">
            <div className="bg-card rounded-lg p-8 text-center shadow-card border-2 border-primary/20">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">🔍 {t('analyzing')}</h3>
              <p className="text-muted-foreground text-lg mb-2">
                {t('analyzingDesc')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('analyzingSubDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Video Reportage Dialog - New Apple-style */}
        <VideoReportageDialog
          open={videoReportageOpen}
          onOpenChange={(open) => {
            setVideoReportageOpen(open);
            if (!open) {
              setInitialReportageLocation({ locationId: null, endroitName: null, zoneType: null, description: null, sequenceId: null });
              setInitialReportageMode(null);
            }
          }}
          projectId={id!}
          partiesCommunes={partiesCommunes}
          partiesPrivatives={partiesPrivatives}
          initialLocationId={initialReportageLocation.locationId}
          initialEndroitName={initialReportageLocation.endroitName}
          initialZoneType={initialReportageLocation.zoneType}
          initialDescription={initialReportageLocation.description}
          initialSequenceId={initialReportageLocation.sequenceId}
          initialMode={initialReportageMode}
        />


        {/* Extracted Tasks Dialog */}
        <Dialog open={openSection === 'tasks'} onOpenChange={(open) => !open && setOpenSection(null)}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'Extraction des tâches' : 'Task Extraction'}
              </DialogTitle>
              <DialogDescription>
                {tasks.length} {t('cancel') === 'Annuler' ? 'tâche(s) extraite(s)' : 'extracted task(s)'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* AI Extraction from Sequences Button */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={async () => {
                    setIsExtracting(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('extract-tasks-from-sequences', {
                        body: { projectId: id }
                      });
                      
                      if (error) throw error;
                      
                      if (data?.success) {
                        toast({
                          title: "Extraction terminée",
                          description: `${data.summary?.totalTasks || 0} tâche(s) extraite(s) depuis ${data.summary?.totalSequences || 0} séquence(s)`,
                        });
                        await loadTasks();
                      } else {
                        throw new Error(data?.error || 'Erreur inconnue');
                      }
                    } catch (error: any) {
                      console.error('Extraction error:', error);
                      toast({
                        title: "Erreur d'extraction",
                        description: error.message || "Impossible d'extraire les tâches",
                        variant: "destructive",
                      });
                    } finally {
                      setIsExtracting(false);
                    }
                  }}
                  disabled={isExtracting}
                  className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extraction IA en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('cancel') === 'Annuler' ? 'Extraire depuis les séquences (IA)' : 'Extract from sequences (AI)'}
                    </>
                  )}
                </Button>
                <ReclassifyTasksButton
                  projectId={id!}
                  onSuccess={() => loadTasks()}
                />
              </div>
              <Separator />
              
              {/* Split tasks by source */}
              <Tabs defaultValue="sequences" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="documents" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Tâches Documents
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                      {tasks.filter(t => t.source_type === 'document' || t.source_type === 'pdf').length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="sequences" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Tâches Séquences
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                      {tasks.filter(t => t.source_type !== 'document' && t.source_type !== 'pdf').length}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="documents" className="mt-4">
                  <div className="text-sm text-muted-foreground mb-3">
                    Tâches extraites des documents téléchargés (étape 5 - Informations projet)
                  </div>
                  <TaskList
                    tasks={tasks.filter(t => t.source_type === 'document' || t.source_type === 'pdf')}
                    onTaskUpdate={() => loadTasks()}
                  />
                  {tasks.filter(t => t.source_type === 'document' || t.source_type === 'pdf').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Aucune tâche extraite des documents</p>
                      <p className="text-xs mt-1">Téléchargez des documents dans les informations projet</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="sequences" className="mt-4">
                  <div className="text-sm text-muted-foreground mb-3">
                    Tâches extraites des séquences de visite (reportage terrain)
                  </div>
                  <TaskList
                    tasks={tasks.filter(t => t.source_type !== 'document' && t.source_type !== 'pdf')}
                    onTaskUpdate={() => loadTasks()}
                  />
                  {tasks.filter(t => t.source_type !== 'document' && t.source_type !== 'pdf').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                      <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Aucune tâche extraite des séquences</p>
                      <p className="text-xs mt-1">Créez des séquences dans le reportage terrain</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>

        {/* Visit Preparation Dialog */}
        <Dialog open={openSection === 'preparation'} onOpenChange={(open) => !open && setOpenSection(null)}>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'Préparation de la visite' : 'Visit Preparation'}
              </DialogTitle>
              <DialogDescription>
                {t('cancel') === 'Annuler' 
                  ? 'Structure du bâtiment et tâches pré-extraites depuis les documents'
                  : 'Building structure and tasks pre-extracted from documents'}
              </DialogDescription>
            </DialogHeader>
            {project.template_data && (project.template_data as any).visit_preparation && (
              <VisitPreparationPanel 
                projectId={id!} 
                visitPreparation={(project.template_data as any).visit_preparation}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* AI Predictions Dialog */}
        <Dialog open={openSection === 'predictions'} onOpenChange={(open) => !open && setOpenSection(null)}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto p-0 bg-transparent border-0">
            <AIPredictionsPanel
              projectId={id!}
              propertyType={project.property_type}
              address={project.address}
              numberOfUnits={project.number_of_units}
              projectDocuments={projectDocuments}
              buildingComposition={(project?.template_data as any)?.building_composition}
              onCompositionSave={async (composition) => {
                const newTemplateData = { ...templateData, building_composition: composition } as any;
                setTemplateData(newTemplateData);
                await supabase.from('edl_projects').update({ template_data: newTemplateData as any }).eq('id', id);
                loadProject();
              }}
              onTaskAdded={() => loadTasks()}
            />
          </DialogContent>
        </Dialog>

        {/* Kanban Tâches Chantier - Full Screen Sheet */}
        <Sheet open={openSection === 'kanban'} onOpenChange={(open) => !open && setOpenSection(null)}>
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl" hideCloseButton>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setOpenSection(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="font-semibold text-lg">Kanban Tâches Chantier</h2>
                    <p className="text-xs text-muted-foreground">{project?.address}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpenSection(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Kanban Board */}
              <div className="flex-1 overflow-hidden p-4">
                <KanbanBoard
                  tasks={kanbanTasks}
                  onTaskUpdate={(taskId, updates) => updateTaskStatus(taskId, updates)}
                  onRefresh={refreshKanban}
                  loading={kanbanLoading}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* EDL Report Editor - Split View */}
        <Sheet open={openSection === 'report'} onOpenChange={(open) => !open && setOpenSection(null)}>
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl" hideCloseButton>
            <EDLReportEditorSplitView
              projectId={id!}
              visitSessionId={visitSessions.length > 0 ? visitSessions[0].id : null}
              onBack={() => setOpenSection(null)}
            />
          </SheetContent>
        </Sheet>

        {/* Reportage - Pour créer de nouvelles séquences */}
        <Sheet open={openSection === 'reportage-hub'} onOpenChange={(open) => {
          if (!open) {
            setOpenSection(null);
            setReturnToFreeVideo(false);
            setSequencesFromVideo(false);
          }
        }}>
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl" hideCloseButton>
            <ReportageHub 
              projectId={id!} 
              sessionId={visitSessions.length > 0 ? visitSessions[0].id : undefined}
              onClose={() => {
                setOpenSection(null);
                setReturnToFreeVideo(false);
                setSequencesFromVideo(false);
              }}
              title="Reportage"
              subtitle={project?.address}
              initialOpenFreeVideo={returnToFreeVideo}
              onOpenVideoReportage={(mode) => {
                setOpenSection(null);
                setTimeout(() => {
                  setInitialReportageMode(mode);
                  setVideoReportageOpen(true);
                }, 200);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Séquences & Tâches - Combiné comme lo-myhome */}
        <Sheet 
          open={openSection === 'sequences-tasks'} 
          modal={false}
          onOpenChange={(open) => {
            if (!open) {
              if (sequencesFromVideo || returnToFreeVideo) {
                // Return to reportage hub and reopen free video capture
                setOpenSection('reportage-hub');
                setTimeout(() => {
                  setReturnToFreeVideo(true);
                  setSequencesFromVideo(false);
                }, 0);
              } else {
                setOpenSection(null);
              }
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-navigation-bar]')) {
              e.preventDefault();
            }
          }}
        >
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl z-50" hideCloseButton>
            <SequencesModule
              projectId={id!}
              projectName={project?.address}
              onClose={() => {
                if (sequencesFromVideo || returnToFreeVideo) {
                  setOpenSection('reportage-hub');
                  setTimeout(() => {
                    setReturnToFreeVideo(true);
                    setSequencesFromVideo(false);
                  }, 0);
                } else {
                  setOpenSection(null);
                }
              }}
            />
          </SheetContent>
        </Sheet>


        <Sheet open={openSection === 'info'} onOpenChange={(open) => {
          if (!open) {
            setOpenSection(null);
            // Clear initial tab when closing
            setInitialTab(null);
            setInitialPartie(null);
          }
        }}>
          <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl" hideCloseButton>
            <ProjectInfoWizard
              project={project}
              onSave={handleSaveProject}
              onAutoSaveDocuments={handleAutoSaveDocuments}
              onAutoSaveProgress={handleAutoSaveProjectInfoProgress}
              onCancel={() => {
                setOpenSection(null);
                setInitialTab(null);
                setInitialPartie(null);
                loadProject();
              }}
              propertyType={propertyType}
              setPropertyType={setPropertyType}
              address={address}
              setAddress={setAddress}
              postalCode={postalCode}
              setPostalCode={setPostalCode}
              city={city}
              setCity={setCity}
              additionalInfo={additionalInfo}
              setAdditionalInfo={setAdditionalInfo}
              projectDocuments={projectDocuments}
              setProjectDocuments={setProjectDocuments}
              partiesCommunes={partiesCommunes}
              setPartiesCommunes={handlePartiesCommunesChange}
              partiesPrivatives={partiesPrivatives}
              setPartiesPrivatives={handlePartiesPrivativesChange}
              isSaving={isSaving}
              initialTab={initialTab}
              initialPartie={initialPartie}
            />
          </SheetContent>
        </Sheet>

        {/* Other Dialogs */}
        <InspectionDialog
          open={inspectionDialogOpen}
          onOpenChange={setInspectionDialogOpen}
          onTextSubmit={handleTextSubmit}
          onImageUpload={handleImageUpload}
          onVideoUpload={handleVideoUpload}
          onPdfUpload={handlePdfUpload}
          propertyType={project?.property_type}
          numberOfUnits={project?.number_of_units}
          projectId={id}
          buildingComposition={(project?.template_data as any)?.building_composition}
        />

        <AlertDialog open={!!pdfToDelete} onOpenChange={() => setPdfToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('cancel') === 'Annuler' ? 'Supprimer ce PDF ?' : 'Delete this PDF?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('cancel') === 'Annuler' 
                  ? `Êtes-vous sûr de vouloir supprimer "${pdfToDelete?.name}" ? Cette action est irréversible.`
                  : `Are you sure you want to delete "${pdfToDelete?.name}"? This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('cancel') === 'Annuler' ? 'Annuler' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pdfToDelete && handleDeletePdf(pdfToDelete.path)}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('cancel') === 'Annuler' ? 'Supprimer' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Visit Recorder Dialog */}
        <Dialog open={visitRecorderOpen} onOpenChange={setVisitRecorderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {t('cancel') === 'Annuler' ? 'Visite IA - Capture Intelligente' : 'AI Visit - Smart Capture'}
              </DialogTitle>
            </DialogHeader>
            {project && (
              <VisitRecorder
                projectId={project.id}
                onVisitComplete={handleVisitComplete}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Block Detail Dialog */}
        <BlockDetailDialog
          blockId={selectedBlockId}
          open={blockDetailOpen}
          onOpenChange={setBlockDetailOpen}
          onEditRequest={(blockId) => {
            setSelectedBlockId(blockId);
            setBlockCorrectionOpen(true);
          }}
        />

        {/* Block Correction Dialog */}
        <BlockCorrectionDialog
          blockId={selectedBlockId}
          open={blockCorrectionOpen}
          onOpenChange={setBlockCorrectionOpen}
          onSaveComplete={() => {
            setBlockCorrectionOpen(false);
            loadVisitSessions();
          }}
        />

        {/* EDL Export Dialog */}
        {project && (
          <EDLExportDialog
            visitSessionId={exportSessionId}
            projectAddress={project.address}
            open={edlExportOpen}
            onOpenChange={setEdlExportOpen}
          />
        )}

        {propertyType && TEMPLATES[propertyType as keyof typeof TEMPLATES] && (
          <>
            <TemplatePreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              propertyType={propertyType}
              currentLevel={templateMode}
              onLevelChange={setTemplateMode}
              onSelectTemplate={(level) => {
                // Template selection only affects templateMode, not additionalInfo
                // additionalInfo stays empty for user to fill freely
                setTemplateMode(level);
                setPreviewOpen(false);
              }}
              onCreateCustomTemplate={(level) => {
                const language = t('cancel') === 'Annuler' ? 'fr' : 'en';
                const template = TEMPLATES[propertyType as keyof typeof TEMPLATES][level][language];
                const levelLabels = {
                  'simplified': language === 'fr' ? 'Simplifié' : 'Simplified',
                  'detailed': language === 'fr' ? 'Détaillé' : 'Detailed',
                  'very-detailed': language === 'fr' ? 'Très détaillé' : 'Very Detailed',
                  'exhaustive': language === 'fr' ? 'Exhaustif' : 'Exhaustive',
                };
                setCustomTemplateBaseContent(template);
                setCustomTemplateBaseLevel(levelLabels[level]);
                setPreviewOpen(false);
                setCustomTemplateOpen(true);
              }}
              templates={TEMPLATES[propertyType as keyof typeof TEMPLATES]}
            />
            <CustomTemplateDialog
              open={customTemplateOpen}
              onOpenChange={setCustomTemplateOpen}
              propertyType={propertyType}
              currentContent={additionalInfo}
              baseContent={customTemplateBaseContent}
              baseLevel={customTemplateBaseLevel}
              projectInfo={{
                address,
                city,
                postal_code: postalCode,
                number_of_units: numberOfUnits ? parseInt(numberOfUnits) : undefined,
                has_parking: hasParking,
                has_garage: hasGarage,
                has_box: hasBox,
              }}
              onLoadTemplate={(content, templateId) => {
                // Custom templates should not fill additionalInfo either
                // Only save the template association
                setLastUsedTemplateId(templateId);
                // Update project with last used template
                if (id && templateId) {
                  supabase
                    .from('edl_projects')
                    .update({ last_used_template_id: templateId })
                    .eq('id', id)
                    .then(() => {
                      toast({
                        title: t('cancel') === 'Annuler' ? '✅ Template associé' : '✅ Template associated',
                        description: t('cancel') === 'Annuler' 
                          ? 'Ce template sera chargé automatiquement la prochaine fois' 
                          : 'This template will be loaded automatically next time',
                      });
                    });
                }
              }}
            />
          </>
        )}

        {/* Archive Confirmation Dialog */}
        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('cancel') === 'Annuler' ? 'Archiver ce projet ?' : 'Archive this project?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('cancel') === 'Annuler' 
                  ? 'Le projet sera déplacé dans les archives. Vous pourrez le désarchiver à tout moment.'
                  : 'The project will be moved to archives. You can unarchive it at any time.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('cancel') === 'Annuler' ? 'Annuler' : 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveConfirm}>
                {t('cancel') === 'Annuler' ? 'Archiver' : 'Archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Changes Prompt Dialog */}
        <AlertDialog open={savePromptOpen} onOpenChange={setSavePromptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('cancel') === 'Annuler' ? 'Modifications non enregistrées' : 'Unsaved changes'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('cancel') === 'Annuler' 
                  ? 'Vous avez des modifications non enregistrées. Voulez-vous les sauvegarder avant de continuer ?'
                  : 'You have unsaved changes. Would you like to save them before continuing?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={handleDiscardChanges}>
                {t('cancel') === 'Annuler' ? 'Ne pas enregistrer' : 'Discard changes'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleSaveAndContinue} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('cancel') === 'Annuler' ? 'Sauvegarde...' : 'Saving...'}
                  </>
                ) : (
                  t('cancel') === 'Annuler' ? 'Sauvegarder' : 'Save'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Quick Reportage Floating Button */}
        {id && partiesCommunes.length + partiesPrivatives.length > 0 && (
          <QuickReportageButton
            projectId={id}
            partiesCommunes={partiesCommunes}
            partiesPrivatives={partiesPrivatives}
          />
        )}
      </div>

      {/* Menu bas de page (visible sur mobile ET desktop) */}
      <div className={`fixed left-0 right-0 ${menuBottomOffsetClass} z-[60] border-t border-border/50 bg-background/95 backdrop-blur pb-safe`}>
        <ProjectMenuBar
          activeSection={activeMenuSection}
          onSectionChange={handleMenuSectionChange}
          stats={{
            sequences: visitSessions?.length || 0,
            tasks: tasks?.length || 0,
          }}
        />
      </div>
    </div>
  );
};

export default Project;
