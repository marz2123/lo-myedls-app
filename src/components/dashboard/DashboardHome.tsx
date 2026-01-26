import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Video,
  FileText,
  Upload,
  Clapperboard,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Trophy,
  Target,
  Timer,
  ChevronRight,
  Sparkles,
  Play,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MyAladinDock } from '@/components/myaladin/MyAladinDock';

interface Project {
  id: string;
  address: string;
  property_type: string;
  created_at: string;
  archived: boolean;
}

interface Stats {
  totalEDL: number;
  completedThisMonth: number;
  avgTimePerEDL: number;
  inProgress: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
}

const BADGES: Badge[] = [
  { id: 'fast', name: 'Rapide & précis', icon: '⚡', unlocked: false },
  { id: 'master', name: 'Maître du reportage', icon: '🎬', unlocked: false },
  { id: 'ontime', name: 'Zéro EDL en retard', icon: '⏰', unlocked: false },
  { id: 'expert', name: 'Expert IA', icon: '🤖', unlocked: false },
];

const propertyTypeIcons: Record<string, string> = {
  building: '🏢',
  house: '🏠',
  apartment: '🏬',
  commercial: '🏪',
};

export const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({ totalEDL: 0, completedThisMonth: 0, avgTimePerEDL: 0, inProgress: 0 });
  const [badges, setBadges] = useState<Badge[]>(BADGES);
  const [continueItems, setContinueItems] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load projects
      const { data: projectsData } = await supabase
        .from('edl_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectsData) {
        setProjects(projectsData);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        setStats({
          totalEDL: projectsData.length,
          completedThisMonth: projectsData.filter(p => p.archived && new Date(p.created_at) >= startOfMonth).length,
          avgTimePerEDL: 45, // Mock value
          inProgress: projectsData.filter(p => !p.archived).length
        });
      }

      // Load incomplete sessions for "continue" section
      const { data: sessions } = await supabase
        .from('visit_sessions')
        .select('*, projects(address, property_type)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (sessions) setContinueItems(sessions);

      // Check badges - simplified without user_achievements lookup
      // Badges will be based on stats instead
      setBadges(prev => prev.map((badge, index) => ({
        ...badge,
        unlocked: index < Math.min(stats.totalEDL, 2) // Mock: unlock based on EDL count
      })));

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProjectStatus = (project: Project) => {
    if (project.archived) {
      return { label: 'Terminé', color: 'bg-emerald-500', progress: 100 };
    }
    // Mock progress based on time
    const daysSinceCreation = Math.floor((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const progress = Math.min(90, 20 + daysSinceCreation * 10);
    
    if (progress < 30) return { label: 'Préparation', color: 'bg-blue-500', progress };
    if (progress < 50) return { label: 'Visite', color: 'bg-amber-500', progress };
    if (progress < 80) return { label: 'Extraction', color: 'bg-purple-500', progress };
    return { label: 'Rapport', color: 'bg-emerald-500', progress };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 md:p-8 text-primary-foreground">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <Badge className="bg-white/20 text-primary-foreground border-0 mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              MyEDLs Pro
            </Badge>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Bonjour ! 👋
            </h1>
            <p className="text-primary-foreground/80 text-lg mb-6">
              Prêt à créer des états des lieux exceptionnels ?
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate('/project/new')}
                className="bg-white text-primary hover:bg-white/90 gap-2 rounded-xl shadow-lg"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                Nouvel EDL
              </Button>
              <Button
                onClick={() => projects[0] && navigate(`/project/${projects[0].id}/reportage`)}
                variant="secondary"
                className="bg-white/20 text-primary-foreground hover:bg-white/30 border-0 gap-2 rounded-xl"
                size="lg"
              >
                <Video className="w-5 h-5" />
                Démarrer visite
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.totalEDL}</p>
                <p className="text-xs text-muted-foreground">EDLs total</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.completedThisMonth}</p>
                <p className="text-xs text-muted-foreground">Ce mois-ci</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Timer className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.avgTimePerEDL}<span className="text-lg">min</span></p>
                <p className="text-xs text-muted-foreground">Temps moyen</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Continue Section */}
        {continueItems.length > 0 && (
          <Card className="overflow-hidden border-amber-200 dark:border-amber-900 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Reprendre là où tu t'es arrêté</h3>
                <p className="text-xs text-muted-foreground">{continueItems.length} visites en attente</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="px-4 pb-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {continueItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="shrink-0 h-auto py-3 px-4 rounded-xl flex-col items-start gap-1 min-w-40"
                    onClick={() => navigate(`/project/${item.project_id}`)}
                  >
                    <span className="text-sm font-medium truncate w-full text-left">
                      {item.projects?.address?.split(',')[0] || 'Projet'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: fr })}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-3 rounded-2xl hover:bg-primary/5 hover:border-primary/30 group"
            onClick={() => navigate('/project/new')}
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <span className="font-medium">Créer un EDL</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-3 rounded-2xl hover:bg-blue-500/5 hover:border-blue-500/30 group"
            onClick={() => projects[0] && navigate(`/project/${projects[0].id}/reportage`)}
          >
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Video className="w-7 h-7 text-blue-600" />
            </div>
            <span className="font-medium">Visite vidéo</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-3 rounded-2xl hover:bg-purple-500/5 hover:border-purple-500/30 group"
            onClick={() => navigate('/quick-extraction')}
          >
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Upload className="w-7 h-7 text-purple-600" />
            </div>
            <span className="font-medium">Importer PDF</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-6 flex-col gap-3 rounded-2xl hover:bg-emerald-500/5 hover:border-emerald-500/30 group"
            onClick={() => projects[0] && navigate(`/project/${projects[0].id}`)}
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Clapperboard className="w-7 h-7 text-emerald-600" />
            </div>
            <span className="font-medium">Reportage</span>
          </Button>
        </div>

        {/* Projects List */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Mes Projets EDL</h3>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/projects')}>
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border">
              {projects.slice(0, 6).map((project) => {
                const status = getProjectStatus(project);
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                      {propertyTypeIcons[project.property_type] || '🏠'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {project.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", `bg-${status.color.replace('bg-', '')}/10`)}>
                          {status.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Progress value={status.progress} className="h-1.5" />
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* KPI & Gamification */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Badges & Accomplissements
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "text-center p-4 rounded-xl border transition-all",
                    badge.unlocked
                      ? "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800"
                      : "bg-muted/30 border-border/50 opacity-50"
                  )}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className={cn(
                    "text-xs font-medium mt-2",
                    badge.unlocked ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                  )}>
                    {badge.name}
                  </p>
                  {badge.unlocked && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      Débloqué
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* MyAladin Dock */}
      <MyAladinDock />
    </div>
  );
};
