import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Loader2, FileText, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Components
import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { ProjectMenuSection } from "@/components/project/ProjectMenu";
import { ProjectMediasSection } from "@/components/project/ProjectMediasSection";
import { ProjectInfoWizard } from "@/components/project/ProjectInfoWizard";
import { TaskList, ExtractedTask } from "@/components/TaskList";
import { ProjectMenuBar } from "@/components/project/ProjectMenu";
import { ReclassifyTasksButton } from "@/components/ReclassifyTasksButton";
import { VideoReportageDialog } from "@/components/visit/VideoReportageDialog";
import { VisitSequencesList } from "@/components/visit/VisitSequencesList";
import { EDLReportEditorSplitView } from "@/components/visit/EDLReportEditorSplitView";
import { AIPredictionsPanel } from "@/components/AIPredictionsPanel";
import { VisitPreparationPanel } from "@/components/VisitPreparationPanel";
import { ProjectHomeSection } from "@/components/project/ProjectHomeSection";
import { ProjectInfoSection } from "@/components/project/ProjectInfoSection";
import { ReportageHub } from "@/components/visit/reportage-hub";
import { MyAladinDock } from "@/components/myaladin/MyAladinDock";
import { BIMDashboard } from "@/components/bim";
import { SequencesModule } from "@/components/project/modules";

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

const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Determine context based on current route
  const aladdinContext = useMemo(() => {
    if (location.pathname.includes('/reportage')) return 'reportage';
    if (location.pathname.includes('/tasks')) return 'tasks';
    if (location.pathname.includes('/report')) return 'report';
    return 'project';
  }, [location.pathname]) as 'project' | 'reportage' | 'tasks' | 'report';

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [visitSessions, setVisitSessions] = useState<any[]>([]);

  // Active section state (menu navigation)
  const [activeSection, setActiveSection] = useState<ProjectMenuSection>('home');
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showReportageHubSheet, setShowReportageHubSheet] = useState(false);
  const [showSequencesTasksSheet, setShowSequencesTasksSheet] = useState(false);  // Combiné comme lo-myhome
  const [showBIMSheet, setShowBIMSheet] = useState(false);

  // Reportage state
  const [videoReportageOpen, setVideoReportageOpen] = useState(false);
  const [initialReportageMode, setInitialReportageMode] = useState<'guided' | 'free' | null>(null);
  const [returnToAfterReportage, setReturnToAfterReportage] = useState<'sequences-tasks' | 'reportageHub' | null>(null);
  const [initialReportageLocation, setInitialReportageLocation] = useState<{
    locationId: string | null;
    endroitName: string | null;
    zoneType: string | null;
    description: string | null;
    sequenceId: string | null;
  }>({ locationId: null, endroitName: null, zoneType: null, description: null, sequenceId: null });

  // Task extraction state
  const [isExtracting, setIsExtracting] = useState(false);

  // Form state for project info
  const [propertyType, setPropertyType] = useState<string>("building");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [partiesCommunes, setPartiesCommunes] = useState<Array<{id: string; name: string; type: string}>>([]);
  const [partiesPrivatives, setPartiesPrivatives] = useState<Array<{id: string; name: string; type: string; numero?: string; pieces?: Array<{id: string; type: string; name: string}>}>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initial tab from URL
  const [initialTab, setInitialTab] = useState<string | null>(null);
  const [initialPartie, setInitialPartie] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setCheckingAuth(false);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load project data
  // Validate UUID format before loading
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  useEffect(() => {
    if (user && id) {
      // Validate that id is a valid UUID (not a number like "5" or "6")
      if (!isValidUUID(id)) {
        console.error('[ProjectNew] Invalid project ID format:', id);
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
      localStorage.setItem('lastVisitedProject', id);
    }
  }, [user, id, navigate, toast]);

  // Handle URL query params for deep linking
  useEffect(() => {
    const tab = searchParams.get('tab');
    const partie = searchParams.get('partie');
    const section = searchParams.get('section');
    
    if (section === 'sequences' || section === 'sequences-tasks') {
      setActiveSection('sequences-tasks');
      setShowSequencesTasksSheet(true);
      setSearchParams({}, { replace: true });
      return;
    }
    
    if (tab) {
      setInitialTab(tab);
      setInitialPartie(partie);
      
      if (['composition', 'type', 'localisation', 'adresse360', 'documents', 'recapitulatif'].includes(tab)) {
        setActiveSection('info');
        setShowInfoSheet(true);
      }
      
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-open sheets based on route
  useEffect(() => {
    if (location.pathname.includes('/reportage')) {
      setActiveSection('reportage-hub');
      setShowReportageHubSheet(true);
    } else if (location.pathname.includes('/tasks') || location.pathname.includes('/sequences')) {
      setActiveSection('sequences-tasks');
      setShowSequencesTasksSheet(true);
    } else if (location.pathname.includes('/report')) {
      setActiveSection('report');
      setShowReportSheet(true);
    }
  }, [location.pathname]);

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
      setAdditionalInfo(data.additional_info || "");
      setProjectDocuments((data as any).project_documents || []);
      
      // Load composition
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*, property_locations(*)')
        .eq('project_id', id)
        .order('order_index');
      
      if (partsData) {
        const communes: Array<{id: string; name: string; type: string}> = [];
        const privatives: Array<{id: string; name: string; type: string; numero?: string; pieces?: Array<{id: string; type: string; name: string}>}> = [];
        
        partsData.forEach((part: any) => {
          if (part.part_type === 'commune' && part.property_locations) {
            part.property_locations.forEach((loc: any) => {
              communes.push({ id: loc.id, name: loc.name, type: loc.location_type || 'autre' });
            });
          } else if (part.part_type === 'privative' && part.property_locations) {
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
        });
        
        setPartiesCommunes(communes);
        setPartiesPrivatives(privatives);
      }
    } catch (error) {
      console.error('[ProjectNew] Error loading project:', JSON.stringify(error, null, 2));
      console.error('[ProjectNew] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      // Charger les tâches sans jointure (FK peut ne pas exister)
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

      // Charger la taxonomie DTC pour mapper les IDs -> codes/labels
      const [ftResult, ctResult, scResult] = await Promise.all([
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label')
      ]);

      const ftMap = new Map(ftResult.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctResult.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scResult.data?.map(sc => [sc.id, sc]) || []);

      const transformedData = tasksData.map((task: any) => {
        const ft = task.family_id ? ftMap.get(task.family_id) : null;
        const ct = task.category_id ? ctMap.get(task.category_id) : null;
        const sc = task.subcategory_id ? scMap.get(task.subcategory_id) : null;

        return {
          ...task,
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

  const loadVisitSessions = async () => {
    const { data, error } = await supabase
      .from('visit_sequences')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (!error) {
      setVisitSessions(data || []);
    }
  };

  const handleSectionChange = (section: ProjectMenuSection) => {
    console.log('[ProjectNew] handleSectionChange called with:', section);
    
    // Close all sheets first (so the bottom menu always works)
    setShowInfoSheet(false);
    setShowReportSheet(false);
    setShowReportageHubSheet(false);
    setShowSequencesTasksSheet(false);
    setShowBIMSheet(false);

    // Update active section
    setActiveSection(section);

    // Open the requested sheet (home = none)
    if (section === 'info') {
      setShowInfoSheet(true);
    } else if (section === 'report') {
      setShowReportSheet(true);
    } else if (section === 'reportage-hub') {
      setShowReportageHubSheet(true);
    } else if (section === 'sequences-tasks') {
      console.log('[ProjectNew] Opening sequences-tasks sheet');
      setShowSequencesTasksSheet(true);
    } else if (section === 'bim') {
      setShowBIMSheet(true);
    }
  };

  const handleExtractTasks = async () => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-tasks-from-sequences', {
        body: { projectId: id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Extraction terminée",
        description: `${data?.summary?.totalTasks || 0} tâche(s) extraite(s)`,
      });
      await loadTasks();
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
  };

  const handleSaveProject = async (data: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('edl_projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Projet sauvegardé" });
      await loadProject();
      setShowInfoSheet(false);
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le projet",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  // Calculate stats for menu
  const menuStats = {
    sequences: visitSessions.length,
    tasks: tasks.length,
    photos: visitSessions.reduce((acc, s) => acc + (s.photos?.length || 0), 0),
    videos: visitSessions.filter(s => s.video_url).length,
    documents: projectDocuments.length + (project.pdf_files?.length || 0)
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <ProjectHomeSection
            project={project}
            stats={menuStats}
            onNavigate={handleSectionChange}
          />
        );

      case 'info':
        return (
          <ProjectInfoSection
            project={project}
            partiesCommunes={partiesCommunes}
            partiesPrivatives={partiesPrivatives}
            onEditClick={() => {
              setShowInfoSheet(true);
              setInitialTab('composition');
            }}
          />
        );

      case 'reportage-hub':
        return (
          <ProjectHomeSection
            project={project}
            stats={menuStats}
            onNavigate={handleSectionChange}
          />
        );

      case 'sequences-tasks':
        // Sheet is opened directly, show home content behind
        return (
          <ProjectHomeSection
            project={project}
            stats={menuStats}
            onNavigate={handleSectionChange}
          />
        );

      case 'report':
        // Sheet is opened directly, show home content behind
        return (
          <ProjectHomeSection
            project={project}
            stats={menuStats}
            onNavigate={handleSectionChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <ProjectPageLayout
        projectName={project.address}
        projectType={project.property_type}
        isArchived={project.archived}
        stats={menuStats}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        hideBottomMenu={false}
      >
        {renderSectionContent()}
      </ProjectPageLayout>

      {/* Video Reportage Dialog */}
      <VideoReportageDialog
        open={videoReportageOpen}
        onOpenChange={(open) => {
          setVideoReportageOpen(open);
          if (!open) {
            // Return to the previous screen if user came from sequences or reportage hub
            const returnTo = returnToAfterReportage;
            setReturnToAfterReportage(null);
            setInitialReportageLocation({ locationId: null, endroitName: null, zoneType: null, description: null, sequenceId: null });
            setInitialReportageMode(null);
            loadVisitSessions();
            
            if (returnTo === 'sequences-tasks') {
              setShowSequencesTasksSheet(true);
              setActiveSection('sequences-tasks');
            } else if (returnTo === 'reportageHub') {
              setShowReportageHubSheet(true);
              setActiveSection('reportage-hub');
            } else {
              setActiveSection('home');
            }
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

      {/* Project Info Sheet */}
      <Sheet 
        open={showInfoSheet} 
        onOpenChange={(open) => {
        setShowInfoSheet(open);
        if (!open) {
          setInitialTab(null);
          setInitialPartie(null);
          setActiveSection('home');
        }
        }}
        onInteractOutside={(e) => {
          // Allow clicks on bottom navigation bar (z-[9999])
          const target = e.target as HTMLElement;
          if (target.closest('[data-navigation-bar]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetContent side="bottom" className="h-[calc(100vh-100px)] p-0 rounded-t-3xl z-[9998] mb-[80px]" hideCloseButton>
          <ProjectInfoWizard
            project={project}
            onSave={() => {
              loadProject();
              setShowInfoSheet(false);
            }}
            onAutoSaveDocuments={async (docs) => {
              await supabase.from('edl_projects').update({ project_documents: docs as any }).eq('id', id);
            }}
            onCancel={() => {
              setShowInfoSheet(false);
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
            setPartiesCommunes={setPartiesCommunes}
            partiesPrivatives={partiesPrivatives}
            setPartiesPrivatives={setPartiesPrivatives}
            isSaving={isSaving}
            initialTab={initialTab}
            initialPartie={initialPartie}
          />
        </SheetContent>
      </Sheet>

      {/* EDL Report Editor Sheet */}
      <Sheet 
        open={showReportSheet} 
        onOpenChange={(open) => {
        setShowReportSheet(open);
        if (!open) {
          setActiveSection('home');
        }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-navigation-bar]')) {
            e.preventDefault();
          }
        }}
      >
        <SheetContent side="bottom" className="h-[calc(100vh-80px)] p-0 rounded-t-3xl z-50">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Rapport EDL</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <EDLReportEditorSplitView
                projectId={id!}
                visitSessionId={visitSessions.length > 0 ? visitSessions[0].id : null}
                onBack={() => setShowReportSheet(false)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reportage Hub Sheet */}
      <Sheet 
        open={showReportageHubSheet} 
        onOpenChange={(open) => {
        setShowReportageHubSheet(open);
        if (!open) {
          setActiveSection('home');
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
          <ReportageHub
            projectId={id!}
            sessionId={visitSessions.length > 0 ? visitSessions[0].id : undefined}
            onClose={() => {
              setShowReportageHubSheet(false);
              setActiveSection('home');
            }}
            title="Reportage Hub"
            subtitle={project?.address}
            onOpenVideoReportage={(mode) => {
              setReturnToAfterReportage('reportageHub'); // Remember to return here
              setShowReportageHubSheet(false);
              setTimeout(() => {
                setInitialReportageMode(mode);
                setVideoReportageOpen(true);
              }, 200);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Séquences & Tâches Sheet - Combiné comme lo-myhome */}
      <Sheet 
        open={showSequencesTasksSheet}
        modal={false}  // Permettre les clics sur le menu bottom
        onOpenChange={(open) => {
          setShowSequencesTasksSheet(open);
          if (!open) {
            setActiveSection('home');
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
              setShowSequencesTasksSheet(false);
              setActiveSection('home');
            }}
          />
        </SheetContent>
      </Sheet>

      {/* BIM Dashboard Sheet */}
      <Sheet 
        open={showBIMSheet} 
        onOpenChange={(open) => {
        setShowBIMSheet(open);
        if (!open) {
          setActiveSection('home');
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
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Maquette BIM 3D</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowBIMSheet(false)}>
                Fermer
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BIMDashboard projectId={id!} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* MyAladin Dock - Context Aware */}
      <MyAladinDock projectId={id} context={aladdinContext} />
    </div>
  );
};

export default ProjectPage;
