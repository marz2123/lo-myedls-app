import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Calendar,
  ArrowLeft,
  Building2
} from "lucide-react";
import { BureauOverview } from "@/components/bureau/BureauOverview";
import { BureauEDLs } from "@/components/bureau/BureauEDLs";
import { BureauTasks } from "@/components/bureau/BureauTasks";
import { BureauDailyLog } from "@/components/bureau/BureauDailyLog";
import { BureauSidebar } from "@/components/bureau/BureauSidebar";
import { BureauProjectSelector } from "@/components/bureau/BureauProjectSelector";
import { MyAladinFloatingButton } from "@/components/MyAladinFloatingButton";
import type { User } from "@supabase/supabase-js";

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
  created_at: string;
  archived: boolean;
}

export default function Bureau() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load projects
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Handle project from URL
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [searchParams]);

  // Load selected project details
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      setSelectedProject(project || null);
    }
  }, [selectedProjectId, projects]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('id, property_type, address, postal_code, city, created_at, archived')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Chargement du Mode Bureau...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <BureauSidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Mode Bureau — Coach Travaux</h1>
            </div>
          </div>

          <BureauProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Aucun projet sélectionné
              </h2>
              <p className="text-muted-foreground mb-4">
                Sélectionnez un projet pour accéder au tableau de bord
              </p>
              <Button onClick={() => navigate("/")}>
                Créer un projet
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="edls" className="gap-2">
                  <FileText className="h-4 w-4" />
                  EDLs & Rapports
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Tâches & Assignation
                </TabsTrigger>
                <TabsTrigger value="daily" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Suivi Chantier
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 h-[calc(100%-60px)]">
                <BureauOverview project={selectedProject} />
              </TabsContent>

              <TabsContent value="edls" className="mt-0 h-[calc(100%-60px)]">
                <BureauEDLs projectId={selectedProject.id} />
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 h-[calc(100%-60px)]">
                <BureauTasks projectId={selectedProject.id} />
              </TabsContent>

              <TabsContent value="daily" className="mt-0 h-[calc(100%-60px)]">
                <BureauDailyLog projectId={selectedProject.id} />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* MyAladin Floating Button */}
      <MyAladinFloatingButton />
    </div>
  );
}
