import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  FileText,
  Video,
  ListChecks,
  ChevronRight,
  Building2,
  Clock,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MyEdlsEntryProps {
  onNavigateToEDL?: (projectId: string) => void;
  embedded?: boolean;
}

interface EDLProject {
  id: string;
  address: string;
  property_type: string;
  created_at: string;
  archived: boolean;
  status?: 'preparation' | 'visite' | 'extraction' | 'rapport' | 'termine';
}

interface EDLStats {
  total: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
}

export const MyEdlsEntry: React.FC<MyEdlsEntryProps> = ({ 
  onNavigateToEDL,
  embedded = false 
}) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<EDLProject[]>([]);
  const [stats, setStats] = useState<EDLStats>({ total: 0, inProgress: 0, completed: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

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
        .from('edl_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectsData) {
        setProjects(projectsData);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        setStats({
          total: projectsData.length,
          inProgress: projectsData.filter(p => !p.archived).length,
          completed: projectsData.filter(p => p.archived).length,
          thisMonth: projectsData.filter(p => new Date(p.created_at) >= startOfMonth).length
        });
      }

      // Load recent visits
      const { data: visitsData } = await supabase
        .from('visit_sessions')
        .select('*, projects(address)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (visitsData) setRecentVisits(visitsData);

      // Load recent tasks
      const { data: tasksData } = await supabase
        .from('extracted_tasks')
        .select('*, projects(address)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (tasksData) setRecentTasks(tasksData);

    } catch (error) {
      console.error('Error loading EDL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string, projectId?: string) => {
    if (embedded && onNavigateToEDL && projectId) {
      onNavigateToEDL(projectId);
    } else {
      navigate(path);
    }
  };

  const getPropertyIcon = (type: string) => {
    const icons: Record<string, string> = {
      building: '🏢',
      house: '🏠',
      apartment: '🏬',
      commercial: '🏪',
    };
    return icons[type] || '🏠';
  };

  const getStatusConfig = (project: EDLProject) => {
    if (project.archived) {
      return { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 };
    }
    return { label: 'En cours', color: 'bg-amber-500/10 text-amber-600', icon: AlertCircle };
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">MyEDLs</h2>
          <p className="text-sm text-muted-foreground">États des Lieux Intelligents</p>
        </div>
        <Button 
          onClick={() => handleNavigate('/project/new')}
          className="gap-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Nouvel EDL
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total EDLs</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Terminés</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 rounded-xl hover:bg-primary/5 hover:border-primary/30"
          onClick={() => handleNavigate('/project/new')}
        >
          <Plus className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Créer EDL</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 rounded-xl hover:bg-blue-500/5 hover:border-blue-500/30"
          onClick={() => recentVisits[0] && handleNavigate(`/project/${recentVisits[0].project_id}/reportage`)}
        >
          <Video className="w-6 h-6 text-blue-600" />
          <span className="text-xs font-medium">Reportage</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 rounded-xl hover:bg-emerald-500/5 hover:border-emerald-500/30"
          onClick={() => projects[0] && handleNavigate(`/project/${projects[0].id}/tasks`)}
        >
          <ListChecks className="w-6 h-6 text-emerald-600" />
          <span className="text-xs font-medium">Tâches</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 rounded-xl hover:bg-purple-500/5 hover:border-purple-500/30"
          onClick={() => projects[0] && handleNavigate(`/project/${projects[0].id}/report`)}
        >
          <FileText className="w-6 h-6 text-purple-600" />
          <span className="text-xs font-medium">Rapport</span>
        </Button>
      </div>

      {/* Recent Projects */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Projets EDL récents</h3>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleNavigate('/projects')}>
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-border">
            {projects.slice(0, 5).map((project) => {
              const status = getStatusConfig(project);
              return (
                <button
                  key={project.id}
                  onClick={() => handleNavigate(`/project/${project.id}`, project.id)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl">
                    {getPropertyIcon(project.property_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{project.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <Badge className={cn("text-xs", status.color)}>
                    {status.label}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Tâches extraites récentes
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recentTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListChecks className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.projects?.address}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
