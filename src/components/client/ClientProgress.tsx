import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Clock, 
  Calendar,
  Wrench,
  PaintBucket,
  Zap,
  Home,
  AlertTriangle
} from 'lucide-react';

interface ClientProgressProps {
  projectId: string;
}

interface WorkCategory {
  name: string;
  icon: React.ReactNode;
  total: number;
  completed: number;
  inProgress: number;
}

interface MainAction {
  title: string;
  status: 'completed' | 'in_progress' | 'planned';
  category: string;
}

export const ClientProgress: React.FC<ClientProgressProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [mainActions, setMainActions] = useState<MainAction[]>([]);
  const [globalProgress, setGlobalProgress] = useState({
    completed: 0,
    inProgress: 0,
    planned: 0
  });

  useEffect(() => {
    loadProgress();
  }, [projectId]);

  const loadProgress = async () => {
    try {
      // Get all tasks for this project
      const { data: tasks, error } = await supabase
        .from('problem_tasks')
        .select('title, status, priority')
        .eq('project_id', projectId);

      if (error) throw error;

      if (tasks && tasks.length > 0) {
        // Calculate global progress
        const completed = tasks.filter(t => t.status === 'validated' || t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const planned = tasks.filter(t => t.status === 'pending' || t.status === 'todo').length;
        
        const total = tasks.length;
        setGlobalProgress({
          completed: Math.round((completed / total) * 100),
          inProgress: Math.round((inProgress / total) * 100),
          planned: Math.round((planned / total) * 100)
        });

        // Categorize tasks by type (simplified categories for clients)
        const categoryMap = categorizeTasksForClient(tasks);
        setCategories(categoryMap);

        // Get main actions (simplified view)
        const actions = tasks.slice(0, 8).map(task => ({
          title: simplifyTaskTitle(task.title),
          status: mapStatus(task.status),
          category: getCategoryFromTitle(task.title)
        }));
        setMainActions(actions);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeTasksForClient = (tasks: any[]): WorkCategory[] => {
    const icons: Record<string, React.ReactNode> = {
      'Gros œuvre': <Home className="h-5 w-5" />,
      'Second œuvre': <PaintBucket className="h-5 w-5" />,
      'Techniques': <Zap className="h-5 w-5" />,
      'Finitions': <Wrench className="h-5 w-5" />
    };

    const categoryGroups: Record<string, any[]> = {
      'Gros œuvre': [],
      'Second œuvre': [],
      'Techniques': [],
      'Finitions': []
    };

    tasks.forEach(task => {
      const category = getMainCategory(task.title);
      if (categoryGroups[category]) {
        categoryGroups[category].push(task);
      } else {
        categoryGroups['Finitions'].push(task);
      }
    });

    return Object.entries(categoryGroups).map(([name, groupTasks]) => ({
      name,
      icon: icons[name],
      total: groupTasks.length,
      completed: groupTasks.filter(t => t.status === 'validated' || t.status === 'done').length,
      inProgress: groupTasks.filter(t => t.status === 'in_progress').length
    }));
  };

  const getMainCategory = (title: string): string => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('fondation') || titleLower.includes('mur porteur') || titleLower.includes('structure')) {
      return 'Gros œuvre';
    }
    if (titleLower.includes('électr') || titleLower.includes('plomb') || titleLower.includes('chauffage') || titleLower.includes('ventilation')) {
      return 'Techniques';
    }
    if (titleLower.includes('cloison') || titleLower.includes('menuiserie') || titleLower.includes('isolation')) {
      return 'Second œuvre';
    }
    return 'Finitions';
  };

  const getCategoryFromTitle = (title: string): string => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('électr')) return 'Électricité';
    if (titleLower.includes('plomb')) return 'Plomberie';
    if (titleLower.includes('menuiserie')) return 'Menuiseries';
    if (titleLower.includes('peinture')) return 'Peinture';
    if (titleLower.includes('sol')) return 'Sols';
    if (titleLower.includes('façade')) return 'Façade';
    return 'Travaux';
  };

  const simplifyTaskTitle = (title: string): string => {
    // Remove technical codes and simplify
    return title.replace(/\[[^\]]*\]/g, '').replace(/F\d+\s*-?\s*/g, '').trim();
  };

  const mapStatus = (status: string): 'completed' | 'in_progress' | 'planned' => {
    if (status === 'validated' || status === 'done') return 'completed';
    if (status === 'in_progress') return 'in_progress';
    return 'planned';
  };

  const getStatusBadge = (status: 'completed' | 'in_progress' | 'planned') => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Terminé</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">En cours</Badge>;
      case 'planned':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Prévu</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Circular Progress Chart Simulation */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Répartition des travaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Simple progress visualization */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="16"
                  className="text-slate-100"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeDasharray={`${globalProgress.completed * 5.02} 502`}
                  className="text-green-500"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="16"
                  strokeDasharray={`${globalProgress.inProgress * 5.02} 502`}
                  strokeDashoffset={`-${globalProgress.completed * 5.02}`}
                  className="text-blue-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{globalProgress.completed}%</span>
                <span className="text-sm text-muted-foreground">Complété</span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="flex-1">Travaux terminés</span>
                <span className="font-semibold">{globalProgress.completed}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="flex-1">Travaux en cours</span>
                <span className="font-semibold">{globalProgress.inProgress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                <span className="flex-1">Travaux à venir</span>
                <span className="font-semibold">{globalProgress.planned}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline by Category */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Avancement par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {category.icon}
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.completed}/{category.total} terminés
                  </span>
                </div>
                <Progress 
                  value={category.total > 0 ? (category.completed / category.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Actions List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Actions principales</CardTitle>
        </CardHeader>
        <CardContent>
          {mainActions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Les actions apparaîtront ici au fur et à mesure de l'avancement.
            </p>
          ) : (
            <div className="space-y-3">
              {mainActions.map((action, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {action.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : action.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Calendar className="h-5 w-5 text-slate-400" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.category}</p>
                    </div>
                  </div>
                  {getStatusBadge(action.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
