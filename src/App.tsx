import { useEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppModeProvider } from "@/contexts/AppModeContext";
import { MyHomeProvider } from "@/contexts/MyHomeContext";
import { UserModeProvider } from "@/contexts/UserModeContext";
import { ConfidentialModeProvider } from "@/contexts/ConfidentialModeContext";
import { MyAladinFloatingButton } from "@/components/MyAladinFloatingButton";
import { NetworkStatusIndicator } from "@/components/offline";
import { FloatingConfidentialIndicator } from "@/components/security";
import { useTaskClassificationTracking } from "@/hooks/useTaskClassificationTracking";
import { useParentAuth } from "@/hooks/useParentAuth";
import { useMyHomeBridge } from "@/hooks/useMyHomeBridge";
import { EmbeddedWrapper } from "@/components/EmbeddedWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { TestTube } from "lucide-react";
import { toast } from "sonner";

// Pages principales - chargées immédiatement
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy loading pour toutes les autres pages
const Auth = lazy(() => import("./pages/Auth"));
const Project = lazy(() => import("./pages/Project"));
const ProjectNewPage = lazy(() => import("./pages/ProjectNewPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Settings = lazy(() => import("./pages/Settings"));
const Library = lazy(() => import("./pages/Library"));
const DSCAdmin = lazy(() => import("./pages/DSCAdmin"));
const Admin = lazy(() => import("./pages/Admin"));
const QuickExtraction = lazy(() => import("./pages/QuickExtraction"));
const VisitWorkflow = lazy(() => import("./pages/VisitWorkflow"));
const Bureau = lazy(() => import("./pages/Bureau"));
const Client = lazy(() => import("./pages/Client"));
const CaptureHubPage = lazy(() => import("./pages/CaptureHubPage"));
const EDLStorylinePage = lazy(() => import("./pages/EDLStorylinePage"));
const RoomChecklistPage = lazy(() => import("./pages/RoomChecklistPage"));
const SupervisoryDashboardPage = lazy(() => import("./pages/SupervisoryDashboardPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const AcademyPage = lazy(() => import("./pages/AcademyPage"));
const QualityDashboardPage = lazy(() => import("./pages/QualityDashboardPage"));

// Pages mobiles - lazy loading
const MobileHome = lazy(() => import("./pages/mobile/Home").then(module => ({ default: module.MobileHome })));
const MobileNewProject = lazy(() => import("./pages/mobile/NewProject").then(module => ({ default: module.MobileNewProject })));
const MobileVisit = lazy(() => import("./pages/mobile/Visit").then(module => ({ default: module.MobileVisit })));
const MobileTimeline = lazy(() => import("./pages/mobile/Timeline").then(module => ({ default: module.MobileTimeline })));
const MobileBlockDetail = lazy(() => import("./pages/mobile/BlockDetail").then(module => ({ default: module.MobileBlockDetail })));
const MobileCorrection = lazy(() => import("./pages/mobile/Correction").then(module => ({ default: module.MobileCorrection })));
const MobileExport = lazy(() => import("./pages/mobile/Export").then(module => ({ default: module.MobileExport })));

// Composant de chargement pour les routes lazy
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

function AppContent() {
  useParentAuth(); // Écoute les messages d'auth MyHome en mode embedded
  useTaskClassificationTracking();
  const { user: myHomeUser, context: myHomeContext, notifyEvent } = useMyHomeBridge();
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get('embedded') === 'true';
  const prevContextRef = useRef(myHomeContext);

  // Global crash capture (helps diagnose blank page on mobile)
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error('[GlobalError]', event.error || event.message);
      toast.error(`Erreur: ${String(event.message || event.error || 'Inconnue')}`);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      console.error('[UnhandledRejection]', event.reason);
      toast.error(`Erreur: ${String(event.reason || 'Promise rejetée')}`);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // Toast when context changes
  useEffect(() => {
    if (prevContextRef.current !== null && myHomeContext !== null) {
      const prevProjectId = prevContextRef.current?.activeProjectId;
      const newProjectId = myHomeContext?.activeProjectId;
      if (prevProjectId !== newProjectId) {
        toast.info(`Context changé : projet ${newProjectId || 'aucun'}`);
        console.log("[MyHomeBridge] Context changed:", myHomeContext);
      }
    }
    prevContextRef.current = myHomeContext;
  }, [myHomeContext]);

  const handleTestEvent = () => {
    notifyEvent("edls.created", { test: true });
    toast.success("Event 'edls.created' envoyé à MyHome");
    console.log("[MyHomeBridge] Event sent:", { type: "edls.created", payload: { test: true } });
  };
  
  return (
    <ErrorBoundary>
      <EmbeddedWrapper>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Main MyEDLs routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/project/new" element={<ProjectNewPage />} />
            <Route path="/projects" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/library" element={<Library />} />
            <Route path="/dsc-admin" element={<DSCAdmin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/project/:id" element={<Project />} />
            <Route path="/project/:id/reportage" element={<Project />} />
            <Route path="/project/:id/tasks" element={<Project />} />
            <Route path="/project/:id/report" element={<Project />} />
            <Route path="/project/:id/bim" element={<Project />} />
            <Route path="/project/:id/capture" element={<CaptureHubPage />} />
            <Route path="/project/:id/storyline" element={<EDLStorylinePage />} />
            <Route path="/project/:id/room/:roomId" element={<RoomChecklistPage />} />
            <Route path="/extract/:id" element={<QuickExtraction />} />
            <Route path="/visit/:projectId" element={<VisitWorkflow />} />
            <Route path="/bureau" element={<Bureau />} />
            <Route path="/client" element={<Client />} />
            <Route path="/supervisory" element={<SupervisoryDashboardPage />} />
            <Route path="/control-tower" element={<SupervisoryDashboardPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/academy" element={<AcademyPage />} />
            <Route path="/project/:id/quality" element={<QualityDashboardPage />} />

            {/* MyEDLs module routes (for MyHome integration) */}
            <Route path="/myedls" element={<Index />} />
            <Route path="/myedls/dashboard" element={<Dashboard />} />
            <Route path="/myedls/edl/:id" element={<Project />} />
            <Route path="/myedls/edl/:id/reportage" element={<Project />} />
            <Route path="/myedls/edl/:id/tasks" element={<Project />} />
            <Route path="/myedls/edl/:id/report" element={<Project />} />
            <Route path="/myedls/report/:id" element={<Project />} />
            <Route path="/myedls/capture" element={<VisitWorkflow />} />
            <Route path="/myedls/capture/guided" element={<VisitWorkflow />} />
            <Route path="/myedls/capture/ultra-guided" element={<VisitWorkflow />} />
            <Route path="/myedls/capture/libre" element={<VisitWorkflow />} />
            <Route path="/myedls/tasks" element={<Dashboard />} />
            <Route path="/myedls/kanban" element={<Dashboard />} />
            <Route path="/myedls/bureau" element={<Bureau />} />
            <Route path="/myedls/client" element={<Client />} />
            <Route path="/myedls/admin" element={<Admin />} />

            {/* Mobile routes */}
            <Route path="/mobile" element={<MobileHome />} />
            <Route path="/mobile/new-project" element={<MobileNewProject />} />
            <Route path="/mobile/visit/:projectId" element={<MobileVisit />} />
            <Route path="/mobile/project/:id/reportage" element={<MobileVisit />} />
            <Route path="/mobile/timeline/:sessionId" element={<MobileTimeline />} />
            <Route path="/mobile/block/:blockId" element={<MobileBlockDetail />} />
            <Route path="/mobile/correction/:blockId" element={<MobileCorrection />} />
            <Route path="/mobile/export/:sessionId" element={<MobileExport />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* MyHome Bridge Debug Panel - Fixed position */}
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
          <div className="px-3 py-2 text-xs bg-background/95 backdrop-blur-sm shadow-lg border border-border rounded-md">
            <span className="text-muted-foreground">Projet actif : </span>
            <span className="font-medium text-foreground">
              {myHomeContext?.activeProjectId || 'aucun'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestEvent}
            className="gap-2 bg-background/95 backdrop-blur-sm shadow-lg border-primary/20"
          >
            <TestTube className="w-4 h-4" />
            Test event
          </Button>
        </div>

        {!isEmbedded && (
          <>
            <NetworkStatusIndicator />
            <FloatingConfidentialIndicator />
            <MyAladinFloatingButton />
          </>
        )}
      </EmbeddedWrapper>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppModeProvider>
          <MyHomeProvider>
            <UserModeProvider>
              <ConfidentialModeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppContent />
                  </BrowserRouter>
                </TooltipProvider>
              </ConfidentialModeProvider>
            </UserModeProvider>
          </MyHomeProvider>
        </AppModeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
