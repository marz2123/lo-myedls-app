import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Video,
  FileText,
  Building2,
  ChevronRight,
  Play,
  Sparkles,
  Clock,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useGestureNavigation } from '@/hooks/useGestureNavigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { OfflineStatusBar } from '@/components/mobile/OfflineStatusBar';
import { MyAladinDock } from '@/components/myaladin/MyAladinDock';

interface Project {
  id: string;
  address: string;
  property_type: string;
  created_at: string;
  archived: boolean;
}

const propertyTypeIcons: Record<string, string> = {
  building: '🏢',
  house: '🏠',
  apartment: '🏬',
  commercial: '🏪',
};

export const MobileHomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });
  const [lastSession, setLastSession] = useState<any>(null);
  const { trigger } = useHapticFeedback();

  useGestureNavigation({
    onSwipeRight: () => {
      trigger('zone_complete');
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (projectsData) {
        setProjects(projectsData);
        setStats({
          total: projectsData.length,
          inProgress: projectsData.filter(p => !p.archived).length,
          completed: projectsData.filter(p => p.archived).length
        });
      }

      // Load last session
      const { data: sessions } = await supabase
        .from('visit_sessions')
        .select('*, projects(address)')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (sessions?.length) setLastSession(sessions[0]);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (path: string) => {
    trigger('zone_complete');
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4 pb-24">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-32">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="pt-2 animate-fade-in">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-foreground">MyEDLs</h1>
            <Badge className="bg-primary/10 text-primary border-0 rounded-full">
              <Sparkles className="w-3 h-3 mr-1" />
              Pro
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            États des lieux intelligents
          </p>
        </div>

        {/* Offline Status */}
        <OfflineStatusBar />

        {/* Main CTA */}
        <Button
          onClick={() => handleAction('/project/new')}
          className={cn(
            "w-full h-20 rounded-2xl gap-4 text-lg font-semibold",
            "bg-gradient-to-r from-primary to-primary/80",
            "shadow-lg shadow-primary/20",
            "hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]",
            "transition-all duration-200"
          )}
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span>Nouvel EDL</span>
        </Button>

        {/* Continue Banner */}
        {lastSession && (
          <Card
            className={cn(
              "p-4 border-amber-200 dark:border-amber-900",
              "bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-transparent",
              "animate-fade-in cursor-pointer"
            )}
            onClick={() => handleAction(`/project/${lastSession.project_id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Play className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Reprendre la visite</p>
                <p className="text-sm text-muted-foreground truncate">
                  {lastSession.projects?.address || 'Projet en cours'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Building2 className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">En cours</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Terminés</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-5 flex-col gap-2 rounded-2xl"
            onClick={() => projects[0] && handleAction(`/project/${projects[0].id}/reportage`)}
          >
            <Video className="w-7 h-7 text-blue-600" />
            <span className="text-sm font-medium">Visite vidéo</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-5 flex-col gap-2 rounded-2xl"
            onClick={() => handleAction('/projects')}
          >
            <FileText className="w-7 h-7 text-purple-600" />
            <span className="text-sm font-medium">Mes EDLs</span>
          </Button>
        </div>

        {/* Projects List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Projets récents</h2>
            <Button variant="ghost" size="sm" onClick={() => handleAction('/projects')}>
              Voir tout
            </Button>
          </div>

          <div className="space-y-2">
            {projects.slice(0, 4).map((project, index) => (
              <Card
                key={project.id}
                className={cn(
                  "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleAction(`/project/${project.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-xl">
                    {propertyTypeIcons[project.property_type] || '🏠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {project.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <Badge 
                    variant={project.archived ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {project.archived ? 'Terminé' : 'En cours'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun projet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Créez votre premier EDL
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* MyAladin Dock */}
      <MyAladinDock />
    </div>
  );
};
