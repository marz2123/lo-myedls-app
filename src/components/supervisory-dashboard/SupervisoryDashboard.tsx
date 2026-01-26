import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  RefreshCw,
  Bell,
  Settings,
  Download
} from 'lucide-react';
import { useSupervisoryDashboard } from '@/hooks/useSupervisoryDashboard';
import { KPICards } from './KPICards';
import { AlertsPanel } from './AlertsPanel';
import { ProjectsView } from './ProjectsView';
import { TechniciansView } from './TechniciansView';
import { ChartsSection } from './ChartsSection';
import { RecentEdlsList } from './RecentEdlsList';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function SupervisoryDashboard() {
  const [activeTab, setActiveTab] = useState('global');
  const navigate = useNavigate();
  
  const {
    kpis,
    recentEdls,
    projects,
    technicians,
    alerts,
    anomalyDistribution,
    taskDistribution,
    loading,
    refreshData,
    markAlertAsRead,
  } = useSupervisoryDashboard();

  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  const handleViewProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleViewEdl = (edlId: string) => {
    // Navigate to EDL details
    console.log('View EDL:', edlId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <LayoutDashboard className="h-7 w-7 text-primary" />
                Suivi EDL — Control Tower
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Supervision en temps réel de tous les EDL
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadAlerts > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <Bell className="h-3 w-3 mr-1" />
                  {unreadAlerts} alertes
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshData()}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Vue Globale
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Projets
            </TabsTrigger>
            <TabsTrigger value="technicians" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Techniciens
            </TabsTrigger>
          </TabsList>

          {/* Global View */}
          <TabsContent value="global" className="space-y-6 animate-in fade-in-50">
            {/* KPIs */}
            <KPICards kpis={kpis} loading={loading} />

            {/* Charts + Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChartsSection 
                  anomalyDistribution={anomalyDistribution}
                  taskDistribution={taskDistribution}
                  loading={loading}
                />
              </div>
              <div>
                <AlertsPanel 
                  alerts={alerts}
                  onMarkAsRead={markAlertAsRead}
                  onViewProject={handleViewProject}
                />
              </div>
            </div>

            {/* Recent EDLs */}
            <RecentEdlsList 
              edls={recentEdls}
              loading={loading}
              onViewEdl={handleViewEdl}
            />
          </TabsContent>

          {/* Projects View */}
          <TabsContent value="projects" className="animate-in fade-in-50">
            <ProjectsView 
              projects={projects}
              loading={loading}
              onViewProject={handleViewProject}
            />
          </TabsContent>

          {/* Technicians View */}
          <TabsContent value="technicians" className="animate-in fade-in-50">
            <TechniciansView 
              technicians={technicians}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
