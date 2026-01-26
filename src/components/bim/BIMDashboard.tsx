import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Box, 
  RefreshCw,
  Download,
  Eye,
  Layers,
  Palette,
  AlertTriangle,
  ListTodo,
  Ruler
} from 'lucide-react';
import { useBIMModel } from '@/hooks/useBIMModel';
import { BIMViewer3D } from './BIMViewer3D';
import { BIMSurfacesPanel } from './BIMSurfacesPanel';
import { BIMObjectsPanel } from './BIMObjectsPanel';
import { BIMExportDialog } from './BIMExportDialog';
import type { BIMViewerState } from '@/types/bim';

interface BIMDashboardProps {
  projectId: string;
}

export const BIMDashboard: React.FC<BIMDashboardProps> = ({
  projectId
}) => {
  const {
    isLoading,
    isGenerating,
    model,
    objects,
    surfaces,
    metrics,
    generateBIMModel,
    exportModel
  } = useBIMModel(projectId);

  const [viewerState, setViewerState] = useState<BIMViewerState>({
    mode: 'orbit',
    colorBy: 'material',
    visibleLayers: ['structure', 'opening', 'equipment', 'finishing'],
    cameraPosition: { x: 20, y: 20, z: 20 },
    cameraTarget: { x: 0, y: 0, z: 0 }
  });

  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>();
  const [showExportDialog, setShowExportDialog] = useState(false);

  const colorByOptions = [
    { value: 'material', label: 'Matériaux', icon: <Palette className="h-4 w-4" /> },
    { value: 'condition', label: 'État', icon: <Eye className="h-4 w-4" /> },
    { value: 'anomaly', label: 'Anomalies', icon: <AlertTriangle className="h-4 w-4" /> },
    { value: 'task', label: 'Tâches', icon: <ListTodo className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6" />
            EDL → BIM
          </h2>
          <p className="text-muted-foreground">
            Modèle 3D automatique, métrés et export IFC
          </p>
        </div>
        
        <div className="flex gap-2">
          {model && (
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          )}
          <Button
            onClick={() => generateBIMModel()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Box className="h-4 w-4 mr-2" />
                {model ? 'Régénérer' : 'Générer'} le modèle BIM
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-card border rounded-lg p-3 text-center">
            <Ruler className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{metrics.totalSurface}</p>
            <p className="text-xs text-muted-foreground">m² surface</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <Box className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{metrics.totalVolume}</p>
            <p className="text-xs text-muted-foreground">m³ volume</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <Layers className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{metrics.roomCount}</p>
            <p className="text-xs text-muted-foreground">pièces</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <Box className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold">{metrics.objectCount}</p>
            <p className="text-xs text-muted-foreground">objets</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{metrics.anomalyCount}</p>
            <p className="text-xs text-muted-foreground">anomalies</p>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <ListTodo className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-xl font-bold">{metrics.taskCount}</p>
            <p className="text-xs text-muted-foreground">tâches liées</p>
          </div>
        </div>
      )}

      {/* Viewer controls */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Colorier par:</span>
        {colorByOptions.map(option => (
          <Button
            key={option.value}
            size="sm"
            variant={viewerState.colorBy === option.value ? 'default' : 'outline'}
            onClick={() => setViewerState(prev => ({ ...prev, colorBy: option.value as any }))}
          >
            {option.icon}
            <span className="ml-1">{option.label}</span>
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
              <span className="font-medium">Viewer 3D</span>
              {model && (
                <Badge variant="outline">
                  Précision: {(model.accuracy_score || 0).toFixed(0)}%
                </Badge>
              )}
            </div>
            <BIMViewer3D
              objects={objects}
              surfaces={surfaces}
              viewerState={viewerState}
              selectedObjectId={selectedObjectId}
              onObjectSelect={setSelectedObjectId}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Tabs defaultValue="surfaces">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="surfaces">Surfaces</TabsTrigger>
              <TabsTrigger value="objects">Objets</TabsTrigger>
            </TabsList>
            <TabsContent value="surfaces" className="mt-4">
              <BIMSurfacesPanel
                surfaces={surfaces}
                selectedRoomId={selectedObjectId}
                onRoomSelect={setSelectedObjectId}
                isLoading={isLoading}
              />
            </TabsContent>
            <TabsContent value="objects" className="mt-4">
              <BIMObjectsPanel
                objects={objects}
                selectedObjectId={selectedObjectId}
                onObjectSelect={setSelectedObjectId}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Export Dialog */}
      <BIMExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={exportModel}
        modelId={model?.id}
      />
    </div>
  );
};
