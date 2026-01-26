import { Building, Landmark, Home, Layers, MapPin, Users, ShoppingBag, Train, GraduationCap } from 'lucide-react';
import { SmartBlock, InfoRow, InfoGrid, StatusBadge } from './SmartBlock';
import { UrbanContextResponse } from '@/hooks/useUrbanContext';
import { NeighborhoodData } from '@/hooks/useNeighborhoodData';

interface UrbanContextBlockProps {
  urbanData?: UrbanContextResponse | null;
  neighborhoodData?: NeighborhoodData | null;
  isLoading?: boolean;
  smartFillerData?: Record<string, any> | null;
}

export const UrbanContextBlock = ({
  urbanData,
  neighborhoodData,
  isLoading,
  smartFillerData,
}: UrbanContextBlockProps) => {
  // Merge smartFillerData if original data is missing
  const buildingFromFiller = smartFillerData?.buildingInfo?.data || smartFillerData?.urbanContext?.data;
  const data = urbanData?.data || (buildingFromFiller ? {
    buildingType: buildingFromFiller.buildingType,
    buildingLevels: buildingFromFiller.buildingLevels,
    buildingYear: buildingFromFiller.buildingYear,
    buildingMaterial: buildingFromFiller.buildingMaterial,
    buildingHeight: buildingFromFiller.buildingHeight,
    neighborhoodType: buildingFromFiller.neighborhoodType,
    neighborhoodDensity: buildingFromFiller.neighborhoodDensity,
    avgBuildingLevels: buildingFromFiller.avgBuildingLevels || null,
    quarterName: buildingFromFiller.quarterName || null,
    zoneType: buildingFromFiller.zoneType || null,
    pluZone: buildingFromFiller.pluZone || null,
  } as any : null);

  // Merge neighborhood POIs from smart filler
  const mergedNeighborhood = neighborhoodData?.amenities?.commerce?.count > 0 
    ? neighborhoodData 
    : (smartFillerData?.neighborhood?.data || neighborhoodData);

  return (
    <SmartBlock
      icon={<Landmark className="h-5 w-5" />}
      title="Contexte urbain & historique"
      subtitle="Caractéristiques du bâti et du quartier"
      isLoading={isLoading}
      badge={data?.neighborhoodDensity ? <StatusBadge status="info" label={data.neighborhoodDensity} /> : undefined}
      defaultOpen={false}
    >
      {data ? (
        <div className="space-y-6">
          {/* Building info */}
          {(data.buildingType || data.buildingLevels || data.buildingYear) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Bâtiment identifié
              </p>
              <InfoGrid
                items={[
                  { label: 'Type', value: data.buildingType || 'N/A', icon: <Building className="h-4 w-4" /> },
                  { label: 'Niveaux', value: data.buildingLevels?.toString() || 'N/A', icon: <Layers className="h-4 w-4" /> },
                  { label: 'Hauteur', value: data.buildingHeight ? `${data.buildingHeight} m` : 'N/A', icon: <Building className="h-4 w-4" /> },
                  { label: 'Année', value: data.buildingYear || 'N/A', icon: <Landmark className="h-4 w-4" /> },
                ]}
              />
              
              {data.buildingMaterial && (
                <div className="mt-3">
                  <InfoRow
                    label="Matériau principal"
                    value={data.buildingMaterial}
                    icon={<Building className="h-4 w-4" />}
                  />
                </div>
              )}
            </div>
          )}

          {/* Neighborhood */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Caractéristiques du quartier
            </p>
            <div className="space-y-1">
              <InfoRow
                label="Type de quartier"
                value={data.neighborhoodType || 'Non déterminé'}
                icon={<MapPin className="h-4 w-4" />}
              />
              <InfoRow
                label="Densité"
                value={data.neighborhoodDensity || 'Moyenne'}
                icon={<Users className="h-4 w-4" />}
              />
              <InfoRow
                label="Commerces"
                value={mergedNeighborhood?.amenities?.commerce?.count ? `${mergedNeighborhood.amenities.commerce.count} à proximité` : '—'}
                icon={<ShoppingBag className="h-4 w-4" />}
              />
              <InfoRow
                label="Transports"
                value={mergedNeighborhood?.amenities?.transport?.count ? `${mergedNeighborhood.amenities.transport.count} à proximité` : '—'}
                icon={<Train className="h-4 w-4" />}
              />
              <InfoRow
                label="Écoles"
                value={mergedNeighborhood?.amenities?.education?.count ? `${mergedNeighborhood.amenities.education.count} à proximité` : '—'}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              {data.avgBuildingLevels && data.avgBuildingLevels > 0 && (
                <InfoRow
                  label="Hauteur moyenne secteur"
                  value={`${data.avgBuildingLevels} niveaux`}
                  icon={<Layers className="h-4 w-4" />}
                />
              )}
              {data.quarterName && (
                <InfoRow
                  label="Quartier"
                  value={data.quarterName}
                  icon={<MapPin className="h-4 w-4" />}
                />
              )}
            </div>
          </div>

          {/* Zone info */}
          {(data.zoneType || data.pluZone) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Zonage urbanisme
              </p>
              <div className="space-y-1">
                {data.zoneType && (
                  <InfoRow
                    label="Type de zone"
                    value={data.zoneType}
                    icon={<Landmark className="h-4 w-4" />}
                  />
                )}
                {data.pluZone && (
                  <InfoRow
                    label="Zone PLU"
                    value={data.pluZone}
                    icon={<Landmark className="h-4 w-4" />}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Building className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Données urbaines non disponibles</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Basé sur OpenStreetMap
          </p>
        </div>
      )}
    </SmartBlock>
  );
};
