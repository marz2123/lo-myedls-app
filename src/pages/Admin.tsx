import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ClassificationReviewPanel } from "@/components/admin/ClassificationReviewPanel";
import { PredictionAnalyticsDashboard } from "@/components/admin/PredictionAnalyticsDashboard";
import { ABTestingDashboard } from "@/components/admin/ABTestingDashboard";
import { ApiDashboard } from "@/components/admin/ApiDashboard";
import { ApiIntegrationAudit } from "@/components/admin/ApiIntegrationAudit";
import { AdminOnboardingTour } from "@/components/admin/AdminOnboardingTour";
import { AdminOverviewDashboard } from "@/components/admin/AdminOverviewDashboard";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { TaxonomyStatsPanel } from "@/components/admin/TaxonomyStatsPanel";
import { TaxonomyEditor } from "@/components/admin/TaxonomyEditor";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, FlaskConical, ShieldAlert, LayoutDashboard, ChevronDown, ChevronUp, Database, PieChart, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxonomyImporter } from "@/components/TaxonomyImporter";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

type AdminSection = 'panel-admin';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  icon: any;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ id, title, description, icon: Icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className="scroll-mt-20 md:scroll-mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-xl font-semibold truncate">{title}</h2>
                  {description && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2 md:line-clamp-none">{description}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2">
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0">
              {children}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}


function AdminSidebar() {
  const { t } = useLanguage();
  const location = useLocation();

  const menuItems = [
    {
      id: 'panel-admin',
      title: t('cancel') === 'Annuler' ? 'Panel Admin' : 'Admin Panel',
      hash: '#panel-admin',
      icon: LayoutDashboard,
    },
  ];

  const currentHash = location.hash || '#panel-admin';

  return (
    <Sidebar className="w-60 border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {t('cancel') === 'Annuler' ? 'Panels Admin' : 'Admin Panels'}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentHash === item.hash;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={`/admin${item.hash}`}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSetupAdmin, setHasSetupAdmin] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const location = useLocation();

  // Enable real-time notifications for admins
  useAdminNotifications(isAdmin);

  useEffect(() => {
    checkAdminAccess();
  }, [navigate]);

  const checkAdminAccess = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check admin status
    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    setIsAdmin(hasAdminRole || false);
    setIsLoading(false);

    if (!hasAdminRole) {
      toast.error(t('cancel') === 'Annuler' 
        ? "Accès refusé. Cette page est réservée aux administrateurs."
        : "Access denied. This page is for administrators only."
      );
      navigate("/");
    }
  };

  const setupAdminRole = async () => {
    try {
      const { error } = await supabase.rpc('add_current_user_as_admin');
      
      if (error) throw error;

      toast.success(t('cancel') === 'Annuler'
        ? "✅ Rôle admin activé avec succès !"
        : "✅ Admin role activated successfully!"
      );

      setHasSetupAdmin(true);
      setIsAdmin(true);
    } catch (error) {
      console.error('Error setting up admin role:', error);
      toast.error(t('cancel') === 'Annuler'
        ? "Erreur lors de l'activation du rôle admin"
        : "Error activating admin role"
      );
    }
  };

  // Get current section from hash
  const currentSection = (location.hash.replace('#', '') || 'panel-admin') as AdminSection;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin && !hasSetupAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center space-y-4 p-8 max-w-md">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold">
              {t('cancel') === 'Annuler' ? 'Configuration Admin Requise' : 'Admin Setup Required'}
            </h1>
            <p className="text-muted-foreground">
              {t('cancel') === 'Annuler'
                ? 'Vous devez activer votre rôle administrateur pour accéder à cette page.'
                : 'You need to activate your administrator role to access this page.'}
            </p>
            <Button onClick={setupAdminRole} size="lg">
              {t('cancel') === 'Annuler' ? 'Activer le rôle Admin' : 'Activate Admin Role'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
          <Navbar />
          <div className="h-12 md:h-14 flex items-center px-2 md:px-4 border-t">
            <SidebarTrigger className="mr-2" />
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
              <h1 className="text-base md:text-lg font-semibold truncate">
                {t('cancel') === 'Annuler' ? 'Administration' : 'Administration'}
              </h1>
            </div>
          </div>
        </header>

        <div className="flex w-full pt-[7.5rem] md:pt-[8.5rem]">
          <AdminSidebar />

          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <AdminOnboardingTour />

            {currentSection === 'panel-admin' && (
              <div className="animate-fade-in space-y-4 md:space-y-6">
                {/* Global Search */}
                <div className="flex justify-center mb-4 md:mb-6">
                  <AdminGlobalSearch />
                </div>
                {/* Quick Navigation */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 md:pt-6 pb-4">
                    {/* Mobile: Horizontal Scroll */}
                    <div className="md:hidden overflow-x-auto pb-2 -mx-2 px-2">
                      <div className="flex gap-2 min-w-max">
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          {t('cancel') === 'Annuler' ? 'Tableau de bord' : 'Overview'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('structure-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          {t('cancel') === 'Annuler' ? 'Structure' : 'Structure'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          {t('cancel') === 'Annuler' ? 'Statistiques' : 'Statistics'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('dsc-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          {t('cancel') === 'Annuler' ? 'Admin DSC' : 'DSC Admin'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          {t('cancel') === 'Annuler' ? 'Analytics' : 'Analytics'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('ab-testing-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          A/B Testing
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap text-xs"
                          onClick={() => document.getElementById('data-apis-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Data APIs
                        </Button>
                      </div>
                    </div>
                    {/* Desktop: Wrap */}
                    <div className="hidden md:flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Tableau de bord' : 'Overview'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('structure-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Structure DSC' : 'DSC Structure'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Statistiques DSC' : 'DSC Statistics'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('dsc-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Admin DSC' : 'DSC Admin'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Analytics Prédictions' : 'Prediction Analytics'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('ab-testing-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        A/B Testing
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('data-apis-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        {t('cancel') === 'Annuler' ? 'Data APIs' : 'Data APIs'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Overview Section */}
                <CollapsibleSection
                  id="overview"
                  title={t('cancel') === 'Annuler' ? 'Tableau de bord' : 'Overview'}
                  description={t('cancel') === 'Annuler' 
                    ? 'Vue d\'ensemble des métriques clés et de l\'activité du système'
                    : 'Overview of key metrics and system activity'}
                  icon={LayoutDashboard}
                  defaultOpen={false}
                >
                  <AdminOverviewDashboard />
                </CollapsibleSection>

                {/* DSC Structure Section */}
                <CollapsibleSection
                  id="structure-section"
                  title={t('cancel') === 'Annuler' ? 'Structure DSC' : 'DSC Structure'}
                  description={t('cancel') === 'Annuler'
                    ? 'Importez et gérez la structure de classification DSC (familles, catégories, sous-catégories)'
                    : 'Import and manage DSC classification structure (families, categories, subcategories)'}
                  icon={Database}
                  defaultOpen={false}
                >
                  <TaxonomyImporter />
                </CollapsibleSection>

                {/* DSC Statistics Section */}
                <CollapsibleSection
                  id="stats-section"
                  title={t('cancel') === 'Annuler' ? 'Statistiques DSC' : 'DSC Statistics'}
                  description={t('cancel') === 'Annuler'
                    ? 'Visualisez la répartition des tâches par familles, catégories et sous-catégories'
                    : 'Visualize task distribution across families, categories and subcategories'}
                  icon={PieChart}
                  defaultOpen={false}
                >
                  <div className="space-y-6">
                    <TaxonomyEditor />
                    <TaxonomyStatsPanel />
                  </div>
                </CollapsibleSection>

                {/* DSC Admin Section */}
                <CollapsibleSection
                  id="dsc-section"
                  title={t('cancel') === 'Annuler' ? 'Admin DSC' : 'DSC Admin'}
                  description={t('cancel') === 'Annuler'
                    ? 'Révisez et corrigez les classifications DSC à faible confiance'
                    : 'Review and correct low-confidence DSC classifications'}
                  icon={BarChart3}
                  defaultOpen={false}
                >
                  <ClassificationReviewPanel />
                </CollapsibleSection>

                {/* Prediction Analytics Section */}
                <CollapsibleSection
                  id="analytics-section"
                  title={t('cancel') === 'Annuler' ? 'Analytics Prédictions' : 'Prediction Analytics'}
                  description={t('cancel') === 'Annuler'
                    ? 'Analysez les performances du système de prédiction de tâches'
                    : 'Analyze task prediction system performance'}
                  icon={BarChart3}
                  defaultOpen={false}
                >
                  <PredictionAnalyticsDashboard />
                </CollapsibleSection>

                {/* A/B Testing Section */}
                <CollapsibleSection
                  id="ab-testing-section"
                  title="A/B Testing"
                  description={t('cancel') === 'Annuler'
                    ? 'Comparez et optimisez différentes stratégies de prédiction'
                    : 'Compare and optimize different prediction strategies'}
                  icon={FlaskConical}
                  defaultOpen={false}
                >
                  <ABTestingDashboard />
                </CollapsibleSection>

                {/* Data APIs Section - Combined Dashboard & Audit */}
                <CollapsibleSection
                  id="data-apis-section"
                  title={t('cancel') === 'Annuler' ? 'Data APIs' : 'Data APIs'}
                  description={t('cancel') === 'Annuler'
                    ? 'Tableau de bord des APIs, découverte IA et audit des intégrations avec statut Marche/Arrêt'
                    : 'API dashboard, AI discovery and integration audit with status'}
                  icon={Globe}
                  defaultOpen={false}
                >
                  <Tabs defaultValue="dashboard" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="dashboard">
                        {t('cancel') === 'Annuler' ? 'Tableau de bord' : 'Dashboard'}
                      </TabsTrigger>
                      <TabsTrigger value="audit">
                        {t('cancel') === 'Annuler' ? 'Audit Intégrations' : 'Integration Audit'}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard">
                      <ApiDashboard />
                    </TabsContent>
                    <TabsContent value="audit">
                      <ApiIntegrationAudit />
                    </TabsContent>
                  </Tabs>
                </CollapsibleSection>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
