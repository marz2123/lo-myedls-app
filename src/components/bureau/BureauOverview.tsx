import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  FileText,
  LayoutGrid,
  Image,
  Users,
  TrendingUp,
  Zap,
  Building2,
  MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
}

interface BureauOverviewProps {
  project: Project;
}

interface TaskStats {
  total: number;
  urgent: number;
  inProgress: number;
  validated: number;
  pending: number;
}

interface AIAlert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
}

export function BureauOverview({ project }: BureauOverviewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    urgent: 0,
    inProgress: 0,
    validated: 0,
    pending: 0,
  });
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  useEffect(() => {
    if (project?.id) {
      loadStats();
      generateAIAlerts();
    }
  }, [project?.id]);

  const loadStats = async () => {
    try {
      // Load problem_tasks stats
      const { data: tasks, error } = await supabase
        .from('problem_tasks')
        .select('status, priority')
        .eq('project_id', project.id);

      if (error) throw error;

      const taskStats: TaskStats = {
        total: tasks?.length || 0,
        urgent: tasks?.filter(t => t.priority === 'urgente' || t.priority === 'haute').length || 0,
        inProgress: tasks?.filter(t => t.status === 'en cours').length || 0,
        validated: tasks?.filter(t => t.status === 'validé' || t.status === 'validée').length || 0,
        pending: tasks?.filter(t => t.status === 'à faire' || t.status === 'pending').length || 0,
      };

      setStats(taskStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIAlerts = async () => {
    setLoadingAlerts(true);
    try {
      // Fetch project data for AI analysis
      const { data: tasks } = await supabase
        .from('problem_tasks')
        .select('*')
        .eq('project_id', project.id);

      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', project.id);

      // Call AI for alerts
      const { data, error } = await supabase.functions.invoke('myaladin-orchestrator', {
        body: {
          action: 'analyze_project_risks',
          projectId: project.id,
          context: {
            tasksCount: tasks?.length || 0,
            sequencesCount: sequences?.length || 0,
            address: project.address,
            propertyType: project.property_type,
          }
        }
      });

      if (error) throw error;

      // Parse AI response into alerts
      const aiAlerts: AIAlert[] = data?.alerts || [
        {
          id: '1',
          type: 'info',
          title: 'Projet en cours d\'analyse',
          description: 'MyAladin analyse les données du projet pour détecter les risques potentiels.',
        }
      ];

      setAlerts(aiAlerts);
    } catch (error) {
      console.error('Error generating AI alerts:', error);
      // Fallback alerts
      setAlerts([
        {
          id: '1',
          type: 'info',
          title: 'Analyse en attente',
          description: 'Ajoutez des séquences de visite pour activer l\'analyse IA.',
        }
      ]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const progressPercentage = stats.total > 0 
    ? Math.round((stats.validated / stats.total) * 100) 
    : 0;

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'immeuble':
      case 'building': return 'Immeuble';
      case 'maison':
      case 'house': return 'Maison';
      case 'commerce':
      case 'commercial': return 'Commerce';
      case 'appartement':
      case 'apartment': return 'Appartement';
      default: return type;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'warning': return 'border-amber-500 bg-amber-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Zap className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 overflow-auto pb-6">
      {/* Project Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{project.address}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3" />
                  {project.postal_code} {project.city}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {getPropertyTypeLabel(project.property_type)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avancement global</span>
                <span className="text-sm font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <Badge variant={progressPercentage === 100 ? "default" : "outline"}>
              {progressPercentage === 100 ? "Terminé" : "En cours"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total tâches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.validated}</p>
                <p className="text-xs text-muted-foreground">Validées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Alertes IA
              </CardTitle>
              <CardDescription>
                Risques et recommandations détectés par MyAladin
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateAIAlerts}
              disabled={loadingAlerts}
            >
              {loadingAlerts ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Actualiser"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAlerts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune alerte détectée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate(`/project/${project.id}`)}
        >
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-sm">Ouvrir EDL</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate(`/bureau?project=${project.id}&tab=tasks`)}
        >
          <LayoutGrid className="h-6 w-6 text-primary" />
          <span className="text-sm">Kanban</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate(`/project/${project.id}?tab=visits`)}
        >
          <Image className="h-6 w-6 text-primary" />
          <span className="text-sm">Médias</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate(`/bureau?project=${project.id}&tab=tasks`)}
        >
          <Users className="h-6 w-6 text-primary" />
          <span className="text-sm">Assignation</span>
        </Button>
      </div>
    </div>
  );
}
