import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, FileText, Settings, Video, FolderOpen, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { OfflineStatusBar } from "@/components/mobile/OfflineStatusBar";

export const MobileHome = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentVisits();
  }, []);

  const loadRecentVisits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('visit_sessions')
        .select(`
          *,
          projects (
            id,
            address,
            property_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentVisits(data || []);
    } catch (error) {
      console.error('Error loading recent visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'recording': { variant: 'destructive', label: 'En cours' },
      'processing': { variant: 'secondary', label: 'Traitement' },
      'completed': { variant: 'default', label: 'Terminée' },
      'failed': { variant: 'destructive', label: 'Échec' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const mainActions = [
    {
      icon: Plus,
      label: t('cancel') === 'Annuler' ? 'Nouvelle visite' : 'New Visit',
      description: t('cancel') === 'Annuler' ? 'Démarrer une inspection' : 'Start an inspection',
      onClick: () => navigate('/mobile/new-project'),
      primary: true,
      color: 'text-primary-foreground',
      bgColor: 'bg-primary',
    },
    {
      icon: FolderOpen,
      label: t('cancel') === 'Annuler' ? 'Mes projets' : 'My Projects',
      description: t('cancel') === 'Annuler' ? 'Voir tous les EDLs' : 'View all reports',
      onClick: () => navigate('/projects'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const quickActions = [
    {
      icon: FileText,
      label: t('cancel') === 'Annuler' ? 'Visites' : 'Visits',
      onClick: () => navigate('/projects'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: BarChart3,
      label: t('cancel') === 'Annuler' ? 'Dashboard' : 'Dashboard',
      onClick: () => navigate('/dashboard'),
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Settings,
      label: t('cancel') === 'Annuler' ? 'Paramètres' : 'Settings',
      onClick: () => navigate('/settings'),
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 pt-2">
        <h1 className="text-3xl font-bold text-foreground mb-1">MyEDLS</h1>
        <p className="text-sm text-muted-foreground">
          {t('cancel') === 'Annuler' ? 'Visite IA • Terrain' : 'AI Visit • Field'}
        </p>
      </div>

      {/* Offline Status */}
      <div className="mb-6">
        <OfflineStatusBar />
      </div>

      {/* Main Actions - Apple Style */}
      <div className="space-y-3 mb-6">
        {mainActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={action.primary 
                ? "apple-action-button-primary group" 
                : "apple-action-button group"
              }
            >
              <div className={`w-14 h-14 rounded-xl ${action.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className={`w-7 h-7 ${action.color}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-lg font-semibold ${action.primary ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {action.label}
                </p>
                <p className={`text-sm ${action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions Grid - Apple Style */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="apple-button group"
            >
              <div className={`apple-button-icon ${action.bgColor} group-hover:scale-105 transition-transform`}>
                <Icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Recent Visits - Apple Style Cards */}
      {!loading && recentVisits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {t('cancel') === 'Annuler' ? 'Visites récentes' : 'Recent Visits'}
            </h2>
            <Badge variant="secondary" className="rounded-full">
              {recentVisits.length}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {recentVisits.map((visit) => (
              <button
                key={visit.id}
                onClick={() => navigate(`/mobile/timeline/${visit.id}`)}
                className="apple-button group h-24"
              >
                <div className="apple-button-icon bg-primary/10 group-hover:bg-primary/20 !mb-2 !w-10 !h-10">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight truncate w-full text-center">
                  {visit.projects?.address?.split(',')[0] || 'Projet'}
                </span>
                <div className="mt-1">
                  {getStatusBadge(visit.status)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && recentVisits.length === 0 && (
        <div className="text-center py-8 bg-muted/30 rounded-2xl border border-border/50">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('cancel') === 'Annuler' 
              ? 'Aucune visite récente' 
              : 'No recent visits'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('cancel') === 'Annuler' 
              ? 'Démarrez votre première visite' 
              : 'Start your first visit'}
          </p>
        </div>
      )}
    </div>
  );
};
