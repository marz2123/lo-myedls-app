import React, { useEffect, useState } from 'react';
import { 
  Loader2, MapPin, Building2, Bus, ShoppingBag, GraduationCap, Heart, 
  Landmark, TreePine, ChevronDown, Map, Layers, Euro, 
  AlertTriangle, Check, ExternalLink, FileText, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCadastralData } from '@/hooks/useCadastralData';
import { useNeighborhoodData } from '@/hooks/useNeighborhoodData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UrbanismoBlockProps {
  latitude: number;
  longitude: number;
  address: string;
  bdnbData?: {
    nb_etage?: number;
    annee_construction?: number;
    surface_au_sol?: number;
    surface_habitable?: number;
    dpe_classe?: string;
  } | null;
  aiAnalysis?: {
    buildingType?: string;
    estimatedFloors?: number | string;
    constructionEra?: string;
    estimatedFacadeArea?: number;
  } | null;
  urbanismData?: {
    documents?: any[];
    zones?: any[];
    infos?: any[];
    prescriptions?: any[];
    servitudes?: any[];
    abfPerimeter?: any;
    documentType?: string;
  } | null;
  neighborhoodData?: {
    walkScore?: number;
    amenities: {
      [key: string]: {
        count: number;
        items: Array<{ name: string; distance: number }>;
      };
    };
  } | null;
}

type BlockType = 'carte' | 'parcelle' | 'terrain' | 'batiment' | 'urbanisme' | 'pois' | 'marche';

interface BlockConfig {
  key: BlockType;
  title: string;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}

const BLOCKS: BlockConfig[] = [
  { key: 'carte', title: 'Carte', icon: Map, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'parcelle', title: 'Parcelle', icon: Layers, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'terrain', title: 'Terrain', icon: MapPin, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'batiment', title: 'Bâtiment', icon: Building2, bgColor: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
  { key: 'urbanisme', title: 'Documents applicables', icon: FileText, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'pois', title: 'POIs', icon: Landmark, bgColor: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
  { key: 'marche', title: 'Marché', icon: Euro, bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
];

const POI_CATEGORIES = [
  { key: 'transport', label: 'Transport', icon: Bus, color: 'text-blue-500' },
  { key: 'commerce', label: 'Commerce', icon: ShoppingBag, color: 'text-amber-500' },
  { key: 'loisirs', label: 'Loisirs', icon: TreePine, color: 'text-emerald-500' },
  { key: 'sante', label: 'Santé', icon: Heart, color: 'text-red-500' },
  { key: 'education', label: 'Éducation', icon: GraduationCap, color: 'text-purple-500' },
  { key: 'services', label: 'Services publics', icon: Landmark, color: 'text-slate-500' },
];

export const UrbanismoBlock: React.FC<UrbanismoBlockProps> = ({
  latitude,
  longitude,
  address,
  bdnbData,
  aiAnalysis,
  urbanismData,
  neighborhoodData: neighborhoodDataProp,
}) => {
  const [openBlocks, setOpenBlocks] = useState<Set<BlockType>>(new Set());
  const { cadastralData, isLoading: cadastralLoading, fetchCadastralData, getCadastralPlanUrl } = useCadastralData();

  useEffect(() => {
    if (latitude && longitude) {
      fetchCadastralData(latitude, longitude);
    }
  }, [latitude, longitude, fetchCadastralData]);

  const parcel = cadastralData?.parcels?.[0];
  const neighborhoodData = neighborhoodDataProp;
  const isLoading = cadastralLoading;

  const toggleBlock = (key: BlockType) => {
    setOpenBlocks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getBlockSubtitle = (key: BlockType): string => {
    switch (key) {
      case 'carte':
        return 'Vue satellite';
      case 'parcelle':
        return parcel ? `${parcel.section}-${parcel.numero}` : 'Cadastre';
      case 'terrain':
        return parcel?.contenance ? `${parcel.contenance.toLocaleString('fr-FR')} m²` : 'Surface';
      case 'batiment':
        const yearSource = bdnbData?.annee_construction || (aiAnalysis?.constructionEra ? aiAnalysis.constructionEra.split('-')[0] : null);
        return yearSource ? `${yearSource}` : 'Infos bâti';
      case 'urbanisme':
        return urbanismData?.documentType || (urbanismData?.documents?.[0]?.typedoc) || 'PLU/PPR/RNU';
      case 'pois':
        if (neighborhoodData) {
          const total = Object.values(neighborhoodData.amenities).reduce((sum, cat) => sum + cat.count, 0);
          return `${total} à proximité`;
        }
        return 'Proximité';
      case 'marche':
        return 'Prix marché';
      default:
        return '';
    }
  };

  const getBlockStatus = (key: BlockType): 'loaded' | 'loading' | 'empty' => {
    if (isLoading) return 'loading';
    switch (key) {
      case 'carte':
      case 'parcelle':
        return 'loaded';
      case 'terrain':
        return parcel ? 'loaded' : 'empty';
      case 'batiment':
        return (bdnbData || aiAnalysis) ? 'loaded' : 'empty';
      case 'urbanisme':
        return urbanismData ? 'loaded' : 'empty';
      case 'pois':
        return neighborhoodData ? 'loaded' : 'empty';
      case 'marche':
        return 'empty';
      default:
        return 'empty';
    }
  };

  if (isLoading && !cadastralData && !neighborhoodData) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBlockContent = (key: BlockType) => {
    switch (key) {
      case 'carte':
        return (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-border">
              <iframe
                src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${latitude},${longitude}&zoom=18&maptype=satellite`}
                className="w-full h-[200px]"
                title="Vue satellite"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-border/50">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  <p className="text-[10px] font-medium truncate max-w-[150px]">{address}</p>
                </div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <DataRow label="Latitude" value={latitude.toFixed(6)} />
                <DataRow label="Longitude" value={longitude.toFixed(6)} />
              </div>
            </div>
          </div>
        );

      case 'parcelle':
        return (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-border">
              <iframe
                src={`https://cadastre.data.gouv.fr/map#19/${latitude}/${longitude}`}
                className="w-full h-[200px]"
                title="Plan cadastral"
              />
              {parcel && (
                <div className="absolute bottom-2 right-2 bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-border/50">
                  <p className="text-[10px] font-medium text-primary">
                    Parcelle {parcel.section}-{parcel.numero}
                  </p>
                </div>
              )}
            </div>
            {parcel && (
              <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                <a
                  href={getCadastralPlanUrl(cadastralData?.communeCode || '', parcel.section, parcel.numero)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Voir sur cadastre.gouv.fr
                </a>
              </Button>
            )}
          </div>
        );

      case 'terrain':
        return (
          <div className="bg-muted/30 rounded-lg divide-y divide-border">
            <DataRow label="Numéro parcelle" value={parcel ? `N°${parcel.numero}` : '—'} padded />
            <DataRow label="Section" value={parcel?.section || '—'} padded />
            <DataRow label="Surface totale" value={parcel?.contenance ? `${parcel.contenance.toLocaleString('fr-FR')} m²` : '—'} padded />
            <DataRow label="Ref. Cadastrale" value={parcel ? `${cadastralData?.communeCode || ''}${parcel.section}${parcel.numero}` : '—'} padded />
            <DataRow label="Commune" value={cadastralData?.communeName || '—'} padded />
          </div>
        );

      case 'batiment':
        // Use BDNB data first, fallback to AI analysis
        const buildingType = bdnbData ? 'Bâti' : (aiAnalysis?.buildingType || '—');
        const surfaceAuSol = bdnbData?.surface_au_sol 
          ? `${bdnbData.surface_au_sol.toLocaleString('fr-FR')} m²` 
          : (aiAnalysis?.estimatedFacadeArea ? `~${aiAnalysis.estimatedFacadeArea} m²` : '—');
        const niveaux = bdnbData?.nb_etage?.toString() || aiAnalysis?.estimatedFloors?.toString() || '—';
        const surfaceHabitable = bdnbData?.surface_habitable 
          ? `${bdnbData.surface_habitable.toLocaleString('fr-FR')} m²` 
          : '—';
        const anneeConstruction = bdnbData?.annee_construction?.toString() || aiAnalysis?.constructionEra || '—';
        
        const hasOfficialData = !!bdnbData;
        const hasAIData = !!aiAnalysis && !bdnbData;
        
        return (
          <div className="space-y-3">
            {hasAIData && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Données BDNB non disponibles. Estimation IA affichée.
                  </p>
                </div>
              </div>
            )}
            {hasOfficialData && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Source: BDNB (Base de Données Nationale des Bâtiments)
                  </p>
                </div>
              </div>
            )}
            <div className="bg-muted/30 rounded-lg divide-y divide-border">
              <DataRow label="Type bâtiment" value={buildingType} padded />
              <DataRow label="Surface au sol" value={surfaceAuSol} padded />
              <DataRow label="Nombre de niveaux" value={niveaux} padded />
              <DataRow label="Surface habitable" value={surfaceHabitable} padded />
              <DataRow label="Année construction" value={anneeConstruction} padded />
              {bdnbData?.dpe_classe && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-xs text-muted-foreground">DPE</span>
                  <Badge variant={getDPEVariant(bdnbData.dpe_classe)} className="text-xs">
                    Classe {bdnbData.dpe_classe}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        );

      case 'pois':
        return (
          <div className="space-y-3">
            {neighborhoodData?.walkScore && (
              <div className="bg-primary/5 rounded-lg border border-primary/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Walk Score</span>
                  <Badge 
                    variant={neighborhoodData.walkScore >= 70 ? 'default' : neighborhoodData.walkScore >= 50 ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {neighborhoodData.walkScore}/100
                  </Badge>
                </div>
              </div>
            )}
            
            <div className="bg-muted/30 rounded-lg divide-y divide-border">
              {POI_CATEGORIES.map(({ key, label, icon: Icon, color }) => {
                const category = neighborhoodData?.amenities?.[key as keyof typeof neighborhoodData.amenities];
                const count = category?.count || 0;
                const nearest = category?.items?.[0];
                
                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-background")}>
                        <Icon className={cn("w-4 h-4", color)} />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{count} trouvé{count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {nearest && (
                      <Badge variant="secondary" className="text-[10px]">
                        {nearest.distance}m
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'urbanisme':
        if (!urbanismData) {
          return (
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">
                Données d'urbanisme non disponibles
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* Documents d'urbanisme - PLU, PPR, etc. */}
            {urbanismData.documents && urbanismData.documents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Documents réglementaires</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {urbanismData.documents.length} document{urbanismData.documents.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Liste exhaustive des documents d'urbanisme (PLU, PPR, RNU) applicables
                </p>
                <div className="bg-muted/30 rounded-lg divide-y divide-border">
                  {urbanismData.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={doc.typedoc?.includes('PPR') ? 'destructive' : 'default'} 
                          className="text-[10px] font-semibold"
                        >
                          {doc.typedoc || 'Document'}
                        </Badge>
                        {doc.etat && (
                          <Badge variant="outline" className="text-[10px]">
                            {doc.etat}
                          </Badge>
                        )}
                      </div>
                      {doc.nom && (
                        <p className="text-xs font-medium text-foreground">{doc.nom}</p>
                      )}
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        {doc.datappro && (
                          <div className="flex justify-between">
                            <span>Date d'approbation:</span>
                            <span className="font-medium">{new Date(doc.datappro).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {doc.datedoc && (
                          <div className="flex justify-between">
                            <span>Date du document:</span>
                            <span className="font-medium">{new Date(doc.datedoc).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {doc.datefin && (
                          <div className="flex justify-between">
                            <span>Date de fin:</span>
                            <span className="font-medium">{new Date(doc.datefin).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      {doc.urldoc && (
                        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                          <a href={doc.urldoc} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Consulter le document complet
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zonage PLU détaillé */}
            {urbanismData.zones && urbanismData.zones.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Zonage PLU</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {urbanismData.zones.length} zone{urbanismData.zones.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Zones réglementaires applicables à la parcelle
                </p>
                <div className="bg-muted/30 rounded-lg divide-y divide-border">
                  {urbanismData.zones.map((zone: any, idx: number) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-[10px] font-semibold">
                            {zone.typezone}
                          </Badge>
                          {zone.destdomi && (
                            <Badge variant="outline" className="text-[10px]">
                              {zone.destdomi}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {zone.libelle && (
                        <p className="text-xs font-medium text-foreground">{zone.libelle}</p>
                      )}
                      
                      {zone.libelong && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{zone.libelong}</p>
                      )}
                      
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        {zone.nomfic && (
                          <div className="flex justify-between gap-2">
                            <span>Document source:</span>
                            <span className="font-medium text-right">{zone.nomfic}</span>
                          </div>
                        )}
                        {zone.datappro && (
                          <div className="flex justify-between">
                            <span>Date d'approbation:</span>
                            <span className="font-medium">{new Date(zone.datappro).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      
                      {zone.urlreg && (
                        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                          <a href={zone.urlreg} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Consulter le règlement de zone
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescriptions urbanistiques complètes */}
            {urbanismData.prescriptions && urbanismData.prescriptions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Prescriptions urbanistiques</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {urbanismData.prescriptions.length} prescription{urbanismData.prescriptions.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Règles et contraintes urbanistiques applicables
                </p>
                <div className="bg-muted/30 rounded-lg divide-y divide-border">
                  {urbanismData.prescriptions.map((presc: any, idx: number) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground">{presc.libelle}</span>
                      </div>
                      
                      {presc.txt && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                          {presc.txt}
                        </p>
                      )}
                      
                      <div className="space-y-1 text-[11px] text-muted-foreground pl-5">
                        {presc.typepresc && (
                          <div className="flex justify-between gap-2">
                            <span>Type de prescription:</span>
                            <Badge variant="outline" className="text-[10px]">
                              {presc.typepresc}
                            </Badge>
                          </div>
                        )}
                        {presc.categorie && (
                          <div className="flex justify-between gap-2">
                            <span>Catégorie:</span>
                            <span className="font-medium">{presc.categorie}</span>
                          </div>
                        )}
                        {presc.nomfic && (
                          <div className="flex justify-between gap-2">
                            <span>Document:</span>
                            <span className="font-medium text-right text-[10px]">{presc.nomfic}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Servitudes d'utilité publique complètes */}
            {urbanismData.servitudes && urbanismData.servitudes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Servitudes d'utilité publique</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {urbanismData.servitudes.length} servitude{urbanismData.servitudes.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  SUP (Servitudes d'Utilité Publique) applicables à la parcelle
                </p>
                <div className="bg-muted/30 rounded-lg divide-y divide-border">
                  {urbanismData.servitudes.map((serv: any, idx: number) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          {serv.libelle || serv.categorie}
                        </span>
                        {serv.categorie && (
                          <Badge variant="outline" className="text-[10px]">
                            {serv.categorie}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        {serv.txt && (
                          <p className="leading-relaxed">{serv.txt}</p>
                        )}
                        {serv.nomfic && (
                          <div className="flex justify-between gap-2">
                            <span>Document source:</span>
                            <span className="font-medium text-right text-[10px]">{serv.nomfic}</span>
                          </div>
                        )}
                        {serv.datappro && (
                          <div className="flex justify-between">
                            <span>Date d'approbation:</span>
                            <span className="font-medium">{new Date(serv.datappro).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {serv.typeserv && (
                          <div className="flex justify-between gap-2">
                            <span>Type de servitude:</span>
                            <span className="font-medium">{serv.typeserv}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Périmètre ABF */}
            {urbanismData.abfPerimeter && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      Périmètre de protection des monuments historiques
                    </p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-500 mt-0.5">
                      Soumis à l'avis de l'Architecte des Bâtiments de France (ABF)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Source */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Source: Géoportail de l'Urbanisme (GPU) - API Carto IGN
              </p>
            </div>
          </div>
        );

      case 'marche':
        return (
          <div className="bg-muted/30 rounded-lg p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">
              Données de marché non disponibles
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Block grid - Apple style cards that expand */}
      {BLOCKS.map((block) => {
        const Icon = block.icon;
        const status = getBlockStatus(block.key);
        const subtitle = getBlockSubtitle(block.key);
        const isOpen = openBlocks.has(block.key);
        
        return (
          <Collapsible key={block.key} open={isOpen} onOpenChange={() => toggleBlock(block.key)}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border",
                  "bg-card hover:bg-accent/50 transition-all duration-200",
                  "text-left active:scale-[0.99]",
                  isOpen ? "border-primary/30 bg-accent/30" : "border-border/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Icon container */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    block.bgColor
                  )}>
                    <Icon className={cn("w-5 h-5", block.iconColor)} />
                  </div>
                  
                  <div>
                    {/* Title */}
                    <h3 className="font-semibold text-sm text-foreground">{block.title}</h3>
                    
                    {/* Subtitle with status */}
                    <div className="flex items-center gap-1.5">
                      {status === 'loaded' && (
                        <Check className="w-3 h-3 text-emerald-500" />
                      )}
                      {status === 'loading' && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {subtitle}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Chevron */}
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="pt-3 px-1">
                {renderBlockContent(block.key)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

// Helper components
const DataRow: React.FC<{ label: string; value: string; padded?: boolean }> = ({ label, value, padded }) => (
  <div className={cn("flex justify-between items-center", padded && "px-3 py-2")}>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-medium text-foreground">{value}</span>
  </div>
);

const getDPEVariant = (classe: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (['A', 'B'].includes(classe)) return 'default';
  if (['C', 'D'].includes(classe)) return 'secondary';
  if (['E', 'F', 'G'].includes(classe)) return 'destructive';
  return 'outline';
};
