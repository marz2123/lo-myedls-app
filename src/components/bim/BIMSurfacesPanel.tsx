import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Ruler, 
  Box,
  Square,
  Layers,
  Home
} from 'lucide-react';
import type { BIMSurface } from '@/types/bim';

interface BIMSurfacesPanelProps {
  surfaces: BIMSurface[];
  selectedRoomId?: string;
  onRoomSelect?: (roomId: string) => void;
  isLoading?: boolean;
}

const roomTypeLabels: Record<string, string> = {
  sejour: 'Séjour',
  chambre: 'Chambre',
  cuisine: 'Cuisine',
  sdb: 'Salle de bain',
  wc: 'WC',
  entree: 'Entrée',
  couloir: 'Couloir',
  bureau: 'Bureau',
  cellier: 'Cellier',
  garage: 'Garage',
  terrasse: 'Terrasse',
  balcon: 'Balcon',
};

export const BIMSurfacesPanel: React.FC<BIMSurfacesPanelProps> = ({
  surfaces,
  selectedRoomId,
  onRoomSelect,
  isLoading
}) => {
  // Calculate totals
  const totalSurface = surfaces.reduce((sum, s) => sum + s.surface_m2, 0);
  const totalVolume = surfaces.reduce((sum, s) => sum + s.volume_m3, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Métrés & Surfaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
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
          <Ruler className="h-5 w-5" />
          Métrés & Surfaces
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <Square className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{totalSurface.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">m² total</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <Box className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{totalVolume.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">m³ total</p>
          </div>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {surfaces.map(surface => (
              <div
                key={surface.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedRoomId === surface.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onRoomSelect?.(surface.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium text-sm">{surface.room_name}</h4>
                      {surface.room_type && (
                        <p className="text-xs text-muted-foreground">
                          {roomTypeLabels[surface.room_type] || surface.room_type}
                        </p>
                      )}
                    </div>
                  </div>
                  {surface.floor_level !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Layers className="h-3 w-3 mr-1" />
                      Étage {surface.floor_level}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface:</span>
                    <span className="font-medium">{surface.surface_m2.toFixed(2)} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium">{surface.volume_m3.toFixed(2)} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hauteur:</span>
                    <span className="font-medium">{surface.hauteur_sous_plafond.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Périmètre:</span>
                    <span className="font-medium">{surface.perimeter_m.toFixed(2)} m</span>
                  </div>
                </div>

                {/* Material info */}
                {(surface.sol_material || surface.murs_material) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {surface.sol_material && (
                      <Badge variant="secondary" className="text-xs">
                        Sol: {surface.sol_material}
                      </Badge>
                    )}
                    {surface.murs_material && (
                      <Badge variant="secondary" className="text-xs">
                        Murs: {surface.murs_material}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Openings */}
                {(surface.nb_portes > 0 || surface.nb_fenetres > 0) && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {surface.nb_portes > 0 && (
                      <span>{surface.nb_portes} porte{surface.nb_portes > 1 ? 's' : ''}</span>
                    )}
                    {surface.nb_fenetres > 0 && (
                      <span>{surface.nb_fenetres} fenêtre{surface.nb_fenetres > 1 ? 's' : ''}</span>
                    )}
                  </div>
                )}

                {/* Metrics for work */}
                {(surface.ml_plinthes > 0 || surface.ml_corniches > 0) && (
                  <div className="mt-2 pt-2 border-t text-xs">
                    <p className="text-muted-foreground mb-1">Métrés travaux:</p>
                    <div className="flex gap-3">
                      {surface.ml_plinthes > 0 && (
                        <span>Plinthes: {surface.ml_plinthes.toFixed(1)} ml</span>
                      )}
                      {surface.ml_corniches > 0 && (
                        <span>Corniches: {surface.ml_corniches.toFixed(1)} ml</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {surfaces.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Ruler className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune surface détectée</p>
                <p className="text-sm">Générez un modèle BIM pour extraire les métrés</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
