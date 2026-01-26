import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PersonalStats } from "@/components/settings/PersonalStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, Archive, CheckCircle, TrendingUp, Calendar, Trophy, Star, BarChart3, Activity, Target, Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useUserLevel } from "@/hooks/useUserLevel";
import type { User, Session } from "@supabase/supabase-js";
import { Separator } from "@/components/ui/separator";

interface TopProject {
  id: string;
  address: string;
  property_type: string;
  task_count: number;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';
type DashboardSection = 'stats' | 'heatmap' | 'projects' | null;

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeProjects, setActiveProjects] = useState(0);
  const [archivedProjects, setArchivedProjects] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [openSection, setOpenSection] = useState<DashboardSection>(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: string[][] }>({ headers: [], rows: [] });
  const [showDSCPreview, setShowDSCPreview] = useState(false);
  const [dscPreviewData, setDscPreviewData] = useState<string[][]>([]);
  const [dscSearchQuery, setDscSearchQuery] = useState("");
  const [dscTypeFilter, setDscTypeFilter] = useState<string>("all");
  
  const { toast } = useToast();
  
  const { userLevel, loading: levelLoading } = useUserLevel();

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

  // Load statistics
  useEffect(() => {
    if (user) {
      loadStatistics();
    }
  }, [user, periodFilter]);

  const exportDSCStructure = async () => {
    setExportingCSV(true);
    try {
      const { data: families, error: familiesError } = await supabase
        .from('task_families')
        .select('*')
        .order('code');

      const { data: categories, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*, task_families(code, name)')
        .order('code');

      const { data: subcategories, error: subcategoriesError } = await supabase
        .from('task_subcategories')
        .select('*, task_categories(code, name, task_families(code, name))')
        .order('code');

      if (familiesError || categoriesError || subcategoriesError) {
        throw new Error('Erreur lors de la récupération de la structure DSC');
      }

      const csvHeaders = ['Type', 'Code Famille (FT)', 'Nom Famille', 'Code Catégorie (CT)', 'Nom Catégorie', 'Code Sous-catégorie (ST)', 'Nom Sous-catégorie'];
      const csvRows: string[][] = [csvHeaders];

      // Ajouter les familles
      families?.forEach(family => {
        csvRows.push(['Famille', family.code, family.name, '', '', '', '']);
      });

      // Ajouter les catégories
      categories?.forEach(category => {
        csvRows.push([
          'Catégorie',
          (category.task_families as any)?.code || '',
          (category.task_families as any)?.name || '',
          category.code,
          category.name,
          '',
          ''
        ]);
      });

      // Ajouter les sous-catégories
      subcategories?.forEach(subcategory => {
        const category = subcategory.task_categories as any;
        const family = category?.task_families;
        csvRows.push([
          'Sous-catégorie',
          family?.code || '',
          family?.name || '',
          category?.code || '',
          category?.name || '',
          subcategory.code,
          subcategory.name
        ]);
      });

      setDscPreviewData(csvRows);
      setShowDSCPreview(true);
      setDscSearchQuery("");
      setDscTypeFilter("all");

      toast({
        title: "Prévisualisation prête",
        description: `${csvRows.length - 1} éléments DSC chargés`,
      });
    } catch (error) {
      console.error('Erreur export Structure DSC:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter la structure DSC",
        variant: "destructive",
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const confirmDownloadDSC = () => {
    const csvContent = dscPreviewData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `structure_dsc_complete_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Export réussi",
      description: `${dscPreviewData.length - 1} éléments DSC exportés`,
    });

    setShowDSCPreview(false);
  };

  const filteredDSCData = useMemo(() => {
    let filtered = dscPreviewData;
    
    // Filtre par type
    if (dscTypeFilter !== "all") {
      filtered = filtered.filter((row, index) => {
        if (index === 0) return true; // Garder l'en-tête
        const typeCell = row[0]; // La colonne "Type" est la première
        return typeCell === dscTypeFilter;
      });
    }
    
    // Filtre par recherche textuelle
    if (dscSearchQuery.trim()) {
      const query = dscSearchQuery.toLowerCase();
      filtered = filtered.filter((row, index) => {
        if (index === 0) return true; // Garder l'en-tête
        return row.some(cell => cell.toLowerCase().includes(query));
      });
    }
    
    return filtered;
  }, [dscPreviewData, dscSearchQuery, dscTypeFilter]);

  const confirmDownloadCSV = () => {
    const csvContent = [
      previewData.headers.join(','),
      ...previewData.rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mes_taches_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    setShowPreview(false);
    toast({
      title: "Export réussi",
      description: `${previewData.rows.length} tâche(s) exportée(s) en CSV`,
    });
  };

  const exportTasksAsCSV = async () => {
    setExportingCSV(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: tasks, error } = await supabase
        .from('extracted_tasks')
        .select(`
          *,
          projects (address, property_type),
          task_families (name, code),
          task_categories (name, code),
          task_subcategories (name, code)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!tasks || tasks.length === 0) {
        toast({
          title: "Aucune tâche réelle",
          description: "Vous n'avez pas encore de tâches extraites.",
        });
        setExportingCSV(false);
        return;
      }

      const csvHeaders = [
        'Projet',
        'Type de bien',
        'Zone/Bloc',
        'FT',
        'FT Libellé',
        'CT',
        'CT Libellé',
        'ST',
        'ST Libellé',
        'Titre',
        'Description',
        'Localisation',
        'Priorité',
        'Type de travail',
        'Quantité',
        'Unité',
        'Confiance IA (%)',
        'Source',
        'Date de création'
      ];

      const csvRows = tasks.map((task: any) => [
        task.projects?.address || '',
        task.projects?.property_type || '',
        task.location || '',
        task.task_families?.code || '',
        task.task_families?.name || '',
        task.task_categories?.code || '',
        task.task_categories?.name || '',
        task.task_subcategories?.code || '',
        task.task_subcategories?.name || '',
        task.title || '',
        task.description || '',
        task.location || '',
        task.priority || '',
        task.work_type || '',
        task.area || '',
        'm²',
        task.detection_confidence ? Math.round(task.detection_confidence * 100) : '',
        task.source_type || 'auto',
        new Date(task.created_at).toLocaleDateString('fr-FR')
      ]);

      setPreviewData({ headers: csvHeaders, rows: csvRows });
      setShowPreview(true);
    } catch (error) {
      console.error('Erreur export CSV:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les tâches",
        variant: "destructive",
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      // Load projects count
      const { data: projects } = await supabase
        .from('edl_projects')
        .select('archived');
      
      const active = projects?.filter(p => !p.archived).length || 0;
      const archived = projects?.filter(p => p.archived).length || 0;
      
      setActiveProjects(active);
      setArchivedProjects(archived);

      // Load total tasks
      const { count: tasksCount } = await supabase
        .from('extracted_tasks')
        .select('*', { count: 'exact', head: true });
      
      setTotalTasks(tasksCount || 0);

      // Load recent achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('unlocked', true)
        .order('unlocked_at', { ascending: false })
        .limit(3);
      
      if (achievements) {
        setRecentAchievements(achievements);
      }

      // Load top projects by task count
      const { data: tasksData } = await supabase
        .from('extracted_tasks')
        .select('project_id');

      const projectTaskCounts: Record<string, number> = {};
      tasksData?.forEach(task => {
        if (task.project_id) {
          projectTaskCounts[task.project_id] = (projectTaskCounts[task.project_id] || 0) + 1;
        }
      });

      const topProjectIds = Object.entries(projectTaskCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([projectId]) => projectId);

      if (topProjectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from('edl_projects')
          .select('id, address, property_type')
          .in('id', topProjectIds);

        if (projectsData) {
          const topProjectsWithCounts: TopProject[] = projectsData.map(project => ({
            ...project,
            task_count: projectTaskCounts[project.id] || 0
          })).sort((a, b) => b.task_count - a.task_count);

          setTopProjects(topProjectsWithCounts);
        }
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardCards = [
    {
      id: 'stats' as DashboardSection,
      icon: BarChart3,
      title: t('cancel') === 'Annuler' ? 'Statistiques personnelles' : 'Personal Statistics',
      description: t('cancel') === 'Annuler' ? 'Activité et progression' : 'Activity and progress',
    },
    {
      id: 'heatmap' as DashboardSection,
      icon: Activity,
      title: t('cancel') === 'Annuler' ? 'Heatmap d\'activité' : 'Activity Heatmap',
      description: t('cancel') === 'Annuler' ? 'Heures productives' : 'Productive hours',
    },
    {
      id: 'projects' as DashboardSection,
      icon: Target,
      title: t('cancel') === 'Annuler' ? 'Projets productifs' : 'Productive Projects',
      description: t('cancel') === 'Annuler' ? 'Top 5 projets' : 'Top 5 projects',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 overflow-y-auto pb-safe">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                {t('cancel') === 'Annuler' ? '📊 Tableau de bord' : '📊 Dashboard'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('cancel') === 'Annuler' 
                  ? 'Vue d\'ensemble de vos projets et tâches'
                  : 'Overview of your projects and tasks'}
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                onClick={exportDSCStructure}
                disabled={exportingCSV}
                size="default"
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingCSV ? "Export en cours..." : "Toute la Structure DSC"}
              </Button>
              <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">
                    {t('cancel') === 'Annuler' ? 'Aujourd\'hui' : 'Today'}
                  </SelectItem>
                  <SelectItem value="week">
                    {t('cancel') === 'Annuler' ? 'Cette semaine' : 'This week'}
                  </SelectItem>
                  <SelectItem value="month">
                    {t('cancel') === 'Annuler' ? 'Ce mois' : 'This month'}
                  </SelectItem>
                  <SelectItem value="all">
                    {t('cancel') === 'Annuler' ? 'Tout' : 'All time'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Level and Achievements Section */}
        {userLevel && !levelLoading && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 mb-6 sm:mb-8">
            <Card className={`md:col-span-2 bg-gradient-to-r ${userLevel.color} text-white border-none`}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-white">
                  <span className="text-3xl sm:text-4xl">{userLevel.icon}</span>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold">
                      Niveau {userLevel.level}
                    </div>
                    <p className="text-white/90 text-sm">
                      {userLevel.points} points
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progression vers {userLevel.levelNumber < 5 ? 'le niveau suivant' : 'le niveau maximum'}</span>
                    <span className="font-medium">
                      {userLevel.points} / {userLevel.nextLevelPoints}
                    </span>
                  </div>
                  <Progress value={userLevel.progress} className="h-3 bg-white/30" />
                  {userLevel.levelNumber < 5 && (
                    <p className="text-xs text-white/80 mt-2">
                      Encore {userLevel.nextLevelPoints - userLevel.points} points pour atteindre le niveau suivant !
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  {t('cancel') === 'Annuler' ? 'Badges récents' : 'Recent Badges'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentAchievements.length > 0 ? (
                  <div className="space-y-3">
                    {recentAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-2">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{achievement.achievement_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                          <Star className="h-3 w-3" />
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('cancel') === 'Annuler' 
                      ? 'Commencez à utiliser l\'app pour débloquer des badges !'
                      : 'Start using the app to unlock badges!'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Statistics Cards - Apple Style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8">
          <button
            type="button"
            className="apple-button group"
          >
            <div className="apple-button-icon bg-primary/10 group-hover:bg-primary/20">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{activeProjects}</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center leading-tight mt-1">
              {t('cancel') === 'Annuler' ? 'Projets actifs' : 'Active Projects'}
            </span>
          </button>

          <button
            type="button"
            className="apple-button group"
          >
            <div className="apple-button-icon bg-muted group-hover:bg-muted/80">
              <Archive className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{archivedProjects}</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center leading-tight mt-1">
              {t('cancel') === 'Annuler' ? 'Archivés' : 'Archived'}
            </span>
          </button>

          <button
            type="button"
            className="apple-button group"
          >
            <div className="apple-button-icon bg-green-500/10 group-hover:bg-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{totalTasks}</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center leading-tight mt-1">
              {t('cancel') === 'Annuler' ? 'Tâches' : 'Tasks'}
            </span>
          </button>

          <button
            type="button"
            className="apple-button group"
          >
            <div className="apple-button-icon bg-blue-500/10 group-hover:bg-blue-500/20">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-foreground">{activeProjects + archivedProjects}</span>
            <span className="text-xs sm:text-sm text-muted-foreground text-center leading-tight mt-1">
              {t('cancel') === 'Annuler' ? 'Total projets' : 'Total Projects'}
            </span>
          </button>
        </div>

        <Separator className="mb-8" />

        {/* Dashboard Sections Grid - Apple Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="region" aria-label={t('cancel') === 'Annuler' ? 'Sections du tableau de bord' : 'Dashboard sections'}>
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                className="apple-button group animate-fade-in"
                onClick={() => setOpenSection(card.id)}
                aria-label={`${t('cancel') === 'Annuler' ? 'Ouvrir' : 'Open'} ${card.title}`}
              >
                <div className="apple-button-icon bg-primary/10 group-hover:bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-foreground text-center leading-tight">
                  {card.title}
                </span>
                <span className="text-xs text-muted-foreground text-center leading-tight mt-1">
                  {card.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personal Statistics Dialog */}
      <Dialog open={openSection === 'stats'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto animate-scale-in" aria-describedby="stats-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Statistiques personnelles' : 'Personal Statistics'}
            </DialogTitle>
            <DialogDescription id="stats-description">
              {t('cancel') === 'Annuler'
                ? 'Suivez votre activité et progression au fil du temps'
                : 'Track your activity and progress over time'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <PersonalStats />
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Heatmap Dialog */}
      <Dialog open={openSection === 'heatmap'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto animate-scale-in" aria-describedby="heatmap-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Heatmap d\'activité' : 'Activity Heatmap'}
            </DialogTitle>
            <DialogDescription id="heatmap-description">
              {t('cancel') === 'Annuler'
                ? 'Visualisez vos jours et heures les plus productifs'
                : 'Visualize your most productive days and hours'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ActivityHeatmap />
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Projects Dialog */}
      <Dialog open={openSection === 'projects'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in" aria-describedby="projects-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Projets les plus productifs' : 'Most Productive Projects'}
            </DialogTitle>
            <DialogDescription id="projects-description">
              {t('cancel') === 'Annuler'
                ? 'Vos 5 projets avec le plus de tâches extraites'
                : 'Your 5 projects with the most extracted tasks'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {topProjects.length > 0 ? (
              <div className="space-y-3">
                {topProjects.map((project, index) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      setOpenSection(null);
                      navigate(`/project/${project.id}`);
                    }}
                    className="flex items-center justify-between p-4 rounded-lg border-2 border-border hover:border-primary transition-all cursor-pointer group bg-card hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {project.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('cancel') === 'Annuler' 
                            ? (project.property_type === 'building' ? 'Immeuble' :
                               project.property_type === 'house' ? 'Maison' :
                               project.property_type === 'apartment' ? 'Appartement' :
                               'Local commercial')
                            : (project.property_type === 'building' ? 'Building' :
                               project.property_type === 'house' ? 'House' :
                               project.property_type === 'apartment' ? 'Apartment' :
                               'Commercial property')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{project.task_count}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('cancel') === 'Annuler' ? 'tâche(s)' : 'task(s)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                {t('cancel') === 'Annuler' 
                  ? 'Aucun projet avec tâches'
                  : 'No projects with tasks'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-[95vw] max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Prévisualisation de l'export CSV
            </DialogTitle>
            <DialogDescription>
              {previewData.rows.length} tâche(s) prête(s) à être exportée(s)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewData.headers.map((header, idx) => (
                    <TableHead key={idx} className="whitespace-nowrap font-bold bg-muted/50 sticky top-0">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.rows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="whitespace-nowrap max-w-[200px] truncate">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Annuler
            </Button>
            <Button onClick={confirmDownloadCSV}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DSC Structure Preview Dialog */}
      <Dialog open={showDSCPreview} onOpenChange={setShowDSCPreview}>
        <DialogContent className="w-[95vw] max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Prévisualisation Structure DSC Complète
            </DialogTitle>
            <DialogDescription>
              {filteredDSCData.length - 1} éléments affichés sur {dscPreviewData.length - 1} au total
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher dans la structure DSC (type, code, nom)..."
                  value={dscSearchQuery}
                  onChange={(e) => setDscSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={dscTypeFilter} onValueChange={setDscTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Famille">Familles uniquement</SelectItem>
                  <SelectItem value="Catégorie">Catégories uniquement</SelectItem>
                  <SelectItem value="Sous-catégorie">Sous-catégories uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="flex-1 max-h-[55vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {filteredDSCData[0]?.map((header, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap font-bold bg-muted/50 sticky top-0">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDSCData.slice(1).map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={cellIdx} className="whitespace-nowrap max-w-[200px] truncate">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDSCPreview(false)}>
              Annuler
            </Button>
            <Button onClick={confirmDownloadDSC}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
