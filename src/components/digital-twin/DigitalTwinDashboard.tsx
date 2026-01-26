import { useState } from 'react';
import { 
  RefreshCw, 
  Download, 
  Camera, 
  Plus,
  Maximize2,
  Activity,
  Clock,
  Wifi,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDigitalTwin } from '@/hooks/useDigitalTwin';
import { useBIMModel } from '@/hooks/useBIMModel';
import { DigitalTwinViewer } from './DigitalTwinViewer';
import { TwinViewModeSelector } from './TwinViewModeSelector';
import { TwinUpdatesFeed } from './TwinUpdatesFeed';
import { TwinHealthScore } from './TwinHealthScore';
import { TwinTimeline } from './TwinTimeline';
import { TwinViewMode } from '@/types/digital-twin';
import { Skeleton } from '@/components/ui/skeleton';

interface DigitalTwinDashboardProps {
  projectId: string;
}

export function DigitalTwinDashboard({ projectId }: DigitalTwinDashboardProps) {
  const {
    twin,
    updates,
    iotSensors,
    snapshots,
    isLoading,
    isSyncing,
    viewerState,
    setViewerState,
    createTwin,
    syncTwin,
    createSnapshot,
  } = useDigitalTwin(projectId);

  const { objects, surfaces } = useBIMModel(projectId);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleModeChange = (mode: TwinViewMode) => {
    setViewerState((prev) => ({ ...prev, mode }));
  };

  const handleElementSelect = (elementId: string) => {
    setSelectedElement(elementId);
    setViewerState((prev) => ({ ...prev, selectedElement: elementId }));
  };

  const handleTimelineChange = (date: string) => {
    setViewerState((prev) => ({ ...prev, timelineDate: date }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] lg:col-span-2" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
        <div className="text-center space-y-2">
          <Sparkles className="h-16 w-16 mx-auto text-primary/50" />
          <h2 className="text-2xl font-bold">Jumeau Numérique</h2>
          <p className="text-muted-foreground max-w-md">
            Créez un jumeau numérique de votre bien pour suivre son état en temps réel,
            visualiser les anomalies et planifier la maintenance.
          </p>
        </div>
        <Button onClick={() => createTwin()} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Créer le Jumeau Numérique
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Jumeau Numérique
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={twin.sync_status === 'completed' ? 'default' : 'secondary'}>
              {twin.sync_status === 'syncing' ? 'Synchronisation...' : 
               twin.sync_status === 'completed' ? 'Synchronisé' : 'En attente'}
            </Badge>
            {twin.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                Dernière sync: {new Date(twin.last_sync_at).toLocaleString('fr-FR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncTwin}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Synchroniser
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => createSnapshot('Snapshot manuel', false)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Snapshot
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* View mode selector */}
      <TwinViewModeSelector currentMode={viewerState.mode} onModeChange={handleModeChange} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <DigitalTwinViewer
                twin={twin}
                surfaces={surfaces}
                objects={objects}
                iotSensors={iotSensors}
                viewerState={viewerState}
                onElementSelect={handleElementSelect}
              />
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {/* Health Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                État du bien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TwinHealthScore twin={twin} />
            </CardContent>
          </Card>

          {/* Tabs for Updates, Timeline, IoT */}
          <Card>
            <Tabs defaultValue="updates">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="updates" className="text-xs">
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    Mises à jour
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="iot" className="text-xs">
                    <Wifi className="h-3.5 w-3.5 mr-1" />
                    IoT
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-4">
                <TabsContent value="updates" className="m-0">
                  <TwinUpdatesFeed 
                    updates={updates} 
                    onUpdateClick={(update) => {
                      if (update.object_id) {
                        handleElementSelect(update.object_id);
                      }
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="timeline" className="m-0">
                  <TwinTimeline
                    snapshots={snapshots}
                    currentDate={viewerState.timelineDate}
                    onDateChange={handleTimelineChange}
                  />
                </TabsContent>
                
                <TabsContent value="iot" className="m-0">
                  {iotSensors.length > 0 ? (
                    <div className="space-y-3">
                      {iotSensors.map((sensor) => (
                        <div 
                          key={sensor.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {sensor.sensor_name || sensor.sensor_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sensor.object_id.slice(0, 8)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {sensor.last_value ?? '-'}{sensor.unit}
                            </p>
                            <Badge 
                              variant={
                                sensor.alert_status === 'critical' ? 'destructive' :
                                sensor.alert_status === 'warning' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {sensor.alert_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Wifi className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Aucun capteur IoT</p>
                      <Button variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un capteur
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Fullscreen viewer */}
      <Sheet open={isFullscreen} onOpenChange={setIsFullscreen}>
        <SheetContent side="bottom" className="h-screen p-0">
          <SheetHeader className="absolute top-4 left-4 z-10">
            <SheetTitle className="text-white drop-shadow-lg">
              Jumeau Numérique - Vue immersive
            </SheetTitle>
          </SheetHeader>
          <div className="absolute top-4 right-16 z-10">
            <TwinViewModeSelector currentMode={viewerState.mode} onModeChange={handleModeChange} />
          </div>
          <DigitalTwinViewer
            twin={twin}
            surfaces={surfaces}
            objects={objects}
            iotSensors={iotSensors}
            viewerState={viewerState}
            onElementSelect={handleElementSelect}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
