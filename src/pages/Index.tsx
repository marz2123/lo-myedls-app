import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProjectListDialog } from "@/components/ProjectListDialog";
import { ModeSelector } from "@/components/ModeSelector";
import { useAppMode } from "@/contexts/AppModeContext";
import { useMyHomeBridge } from "@/hooks/useMyHomeBridge";

import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Building2, MapPin, TestTube } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User, Session } from "@supabase/supabase-js";

const Index = () => {
  const { t } = useLanguage();
  const { appMode, setAppMode } = useAppMode();
  const { user: myHomeUser, context: myHomeContext, notifyEvent } = useMyHomeBridge();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [projectListDialogOpen, setProjectListDialogOpen] = useState(false);
  const [lastProject, setLastProject] = useState<any>(null);
  const [loadingLastProject, setLoadingLastProject] = useState(false);
  const navigate = useNavigate();

  // Log MyHome bridge status
  useEffect(() => {
    if (myHomeUser) {
      console.log("[MyHomeBridge] Connected user:", myHomeUser);
    }
    if (myHomeContext) {
      console.log("[MyHomeBridge] Context:", myHomeContext);
    }
  }, [myHomeUser, myHomeContext]);

  const handleTestEvent = () => {
    notifyEvent("edls.created", { edlsId: "demo-edls-1" });
    toast.success("Event 'edls.created' envoyé à MyHome");
  };

  // Check authentication avec timeout agressif pour éviter le freeze
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    let hasResolved = false;

    // Timeout très court (3 secondes) pour éviter le freeze de l'émulateur
    timeoutId = setTimeout(() => {
      if (isMounted && !hasResolved) {
        console.warn('[Index] Auth check timeout (3s) - déblocage immédiat');
        hasResolved = true;
        setCheckingAuth(false);
        setSession(null);
        setUser(null);
        // Redirection immédiate sans délai
        navigate("/auth", { replace: true });
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted || hasResolved) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Tentative de récupération de session avec timeout très court
    const sessionPromise = supabase.auth.getSession();
    
    // Race condition : timeout ou réponse, le premier gagne
    Promise.race([
      sessionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2500)
      )
    ])
      .then((result: any) => {
        if (hasResolved || !isMounted) return;
        hasResolved = true;
        clearTimeout(timeoutId);
        
        const { data: { session }, error } = result;

        if (error) {
          console.error('[Index] Error getting session:', error);
          setCheckingAuth(false);
          navigate("/auth", { replace: true });
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setCheckingAuth(false);
        
        if (!session) {
          navigate("/auth", { replace: true });
        }
      })
      .catch((error) => {
        if (hasResolved || !isMounted) return;
        hasResolved = true;
        clearTimeout(timeoutId);
        
        console.error('[Index] Failed to get session (network/timeout):', error.message);
        setCheckingAuth(false);
        // Redirection immédiate en cas d'erreur
        navigate("/auth", { replace: true });
      });

    return () => {
      isMounted = false;
      hasResolved = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Load last visited project
  useEffect(() => {
    if (user && appMode === 'classic') {
      loadLastProject();
    }
  }, [user, appMode]);

  const loadLastProject = async () => {
    setLoadingLastProject(true);
    try {
      const lastProjectId = localStorage.getItem('lastVisitedProject');
      
      if (lastProjectId) {
        const { data, error } = await supabase
          .from('edl_projects')
          .select('*')
          .eq('id', lastProjectId)
          .maybeSingle();
        
        if (!error && data) {
          setLastProject(data);
        }
      }
    } catch (error) {
      console.error('Error loading last project:', error);
    } finally {
      setLoadingLastProject(false);
    }
  };

  const handleSelectClassic = () => {
    setAppMode('classic');
  };

  const handleSelectMyAladin = () => {
    setAppMode('aladin');
  };

  const handleBackToSelector = () => {
    setAppMode('selector');
  };

  const handleStartInspection = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/project/new");
  };

  const handleViewProjects = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setProjectListDialogOpen(true);
  };

  const handleProjectSelected = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const propertyTypeLabels: Record<string, string> = {
    building: t('cancel') === 'Annuler' ? 'Immeuble' : 'Building',
    house: t('cancel') === 'Annuler' ? 'Maison' : 'House',
    apartment: t('cancel') === 'Annuler' ? 'Appartement' : 'Apartment',
    commercial: t('cancel') === 'Annuler' ? 'Local commercial' : 'Commercial property',
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Connexion en cours...
        </p>
        <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
          Si cette page reste affichée, vérifiez votre connexion Internet
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCheckingAuth(false);
            setSession(null);
            setUser(null);
            navigate("/auth", { replace: true });
          }}
          className="mt-4"
        >
          Passer à l'authentification
        </Button>
      </div>
    );
  }

  // Mode Selector Screen
  if (appMode === 'selector') {
    return (
      <ModeSelector 
        onSelectClassic={handleSelectClassic}
        onSelectMyAladin={handleSelectMyAladin}
        onLogout={handleLogout}
      />
    );
  }

  // MyAladin Full Experience - temporarily disabled
  if (appMode === 'aladin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">MyAladin Mode</h1>
          <Button onClick={handleBackToSelector}>Retour</Button>
        </div>
      </div>
    );
  }

  // Classic Experience
  return (
    <div className="min-h-screen bg-background pt-16 sm:pt-20 overflow-y-auto pb-safe">
      <Navbar />
      <Hero 
        onStartInspection={handleStartInspection}
        onViewProjects={handleViewProjects}
        onChangeMode={handleBackToSelector}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-6">
          {/* Last Visited Project */}
          {lastProject && !loadingLastProject && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" />
                    {t('cancel') === 'Annuler' ? 'Dernier projet consulté' : 'Last Visited Project'}
                  </h2>
                </div>
                
                <button
                  onClick={() => navigate(`/project/${lastProject.id}`)}
                  className="w-full text-left p-3 sm:p-4 rounded-lg border-2 border-border hover:border-primary transition-all duration-300 bg-card hover:bg-accent/50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group animate-fade-in"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-semibold text-base sm:text-lg">
                          {propertyTypeLabels[lastProject.property_type]}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-1 flex-shrink-0 group-hover:text-primary transition-colors duration-300" />
                        <div>
                          <p className="font-medium text-sm sm:text-base text-foreground group-hover:text-primary transition-colors duration-300">{lastProject.address}</p>
                          {(lastProject.postal_code || lastProject.city) && (
                            <p className="text-sm">
                              {[lastProject.postal_code, lastProject.city].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      {t('cancel') === 'Annuler' ? 'Ouvrir' : 'Open'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </div>
                </button>
              </CardContent>
            </Card>
          )}

          {/* MyHome Bridge Test Button */}
          <Card className="border border-dashed border-muted-foreground/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">MyHome Bridge Test</p>
                  <p className="text-xs text-muted-foreground">
                    {myHomeUser ? `Connecté: ${myHomeUser.email || myHomeUser.id}` : "Non connecté à MyHome"}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestEvent}
                  className="gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  Test event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProjectListDialog
        open={projectListDialogOpen}
        onOpenChange={setProjectListDialogOpen}
        onProjectSelected={handleProjectSelected}
        onCreateNew={() => toast.info("Création de projet")}
      />
    </div>
  );
};

export default Index;
