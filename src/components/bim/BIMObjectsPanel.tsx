import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BoxSelect, 
  DoorOpen,
  Square,
  Zap,
  Droplets,
  Flame,
  Wind,
  Lightbulb,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { BIMObject } from '@/types/bim';

interface BIMObjectsPanelProps {
  objects: BIMObject[];
  selectedObjectId?: string;
  onObjectSelect?: (objectId: string) => void;
  isLoading?: boolean;
}

const objectTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  wall: { label: 'Mur', icon: <Square className="h-4 w-4" />, color: 'text-slate-600' },
  door: { label: 'Porte', icon: <DoorOpen className="h-4 w-4" />, color: 'text-amber-600' },
  window: { label: 'Fenêtre', icon: <Square className="h-4 w-4" />, color: 'text-blue-400' },
  floor: { label: 'Sol', icon: <Square className="h-4 w-4" />, color: 'text-amber-800' },
  ceiling: { label: 'Plafond', icon: <Square className="h-4 w-4" />, color: 'text-slate-300' },
  radiator: { label: 'Radiateur', icon: <Flame className="h-4 w-4" />, color: 'text-orange-500' },
  socket: { label: 'Prise', icon: <Zap className="h-4 w-4" />, color: 'text-yellow-500' },
  switch: { label: 'Interrupteur', icon: <Zap className="h-4 w-4" />, color: 'text-yellow-600' },
  luminaire: { label: 'Luminaire', icon: <Lightbulb className="h-4 w-4" />, color: 'text-yellow-400' },
  vmc: { label: 'VMC', icon: <Wind className="h-4 w-4" />, color: 'text-cyan-500' },
  sanitaire: { label: 'Sanitaire', icon: <Droplets className="h-4 w-4" />, color: 'text-blue-500' },
  chauffe_eau: { label: 'Chauffe-eau', icon: <Droplets className="h-4 w-4" />, color: 'text-red-500' },
};

const conditionConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  neuf: { label: 'Neuf', color: 'text-green-600', bgColor: 'bg-green-100' },
  bon: { label: 'Bon', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  moyen: { label: 'Moyen', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  mauvais: { label: 'Mauvais', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  a_refaire: { label: 'À refaire', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const BIMObjectsPanel: React.FC<BIMObjectsPanelProps> = ({
  objects,
  selectedObjectId,
  onObjectSelect,
  isLoading
}) => {
  // Group objects by type
  const groupedObjects = objects.reduce((acc, obj) => {
    if (!acc[obj.object_type]) {
      acc[obj.object_type] = [];
    }
    acc[obj.object_type].push(obj);
    return acc;
  }, {} as Record<string, BIMObject[]>);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoxSelect className="h-5 w-5" />
            Objets BIM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BoxSelect className="h-5 w-5" />
          Objets BIM
          <Badge variant="secondary">{objects.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedObjects).map(([type, typeObjects]) => {
              const config = objectTypeConfig[type] || { 
                label: type, 
                icon: <BoxSelect className="h-4 w-4" />, 
                color: 'text-muted-foreground' 
              };

              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={config.color}>{config.icon}</span>
                    <h4 className="font-medium text-sm">{config.label}</h4>
                    <Badge variant="outline" className="text-xs">
                      {typeObjects.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 pl-6">
                    {typeObjects.slice(0, 5).map(obj => {
                      const condition = obj.condition_state 
                        ? conditionConfig[obj.condition_state] 
                        : null;

                      return (
                        <div
                          key={obj.id}
                          className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                            selectedObjectId === obj.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => onObjectSelect?.(obj.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {obj.object_name || config.label}
                              </span>
                              {obj.anomalies && obj.anomalies.length > 0 && (
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                            {condition && (
                              <Badge className={`${condition.bgColor} ${condition.color} border-0 text-xs`}>
                                {condition.label}
                              </Badge>
                            )}
                          </div>

                          {/* Dimensions */}
                          {(obj.width || obj.height || obj.area_m2) && (
                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                              {obj.width && obj.height && (
                                <span>{obj.width}×{obj.height}m</span>
                              )}
                              {obj.area_m2 && (
                                <span>{obj.area_m2.toFixed(2)} m²</span>
                              )}
                            </div>
                          )}

                          {/* Material */}
                          {obj.material_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {obj.material_name}
                            </p>
                          )}

                          {/* Linked tasks */}
                          {obj.linked_task_ids && obj.linked_task_ids.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {obj.linked_task_ids.length} tâche{obj.linked_task_ids.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {typeObjects.length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        Voir {typeObjects.length - 5} de plus
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {objects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BoxSelect className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun objet détecté</p>
                <p className="text-sm">Générez un modèle BIM pour détecter les objets</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
