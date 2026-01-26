// Types partagés pour le service d'enrichissement immobilier MyEDLS

export interface PropertyEnrichmentRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  refresh?: boolean; // pour forcer un nouvel appel même si snapshot existe
}

export interface AddressData {
  input: string;
  normalized: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  codeInsee?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  orientation?: string;
  formattedGps?: string;
}

export interface CadastreData {
  section?: string;
  parcelle?: string;
  surfaceM2?: number;
  geometry?: any;
  commune?: string;
  typeLocal?: string;
  planUrl?: string;
}

export interface MarketTransaction {
  date: string;
  type: string;
  surfaceM2: number;
  price: number;
  pricePerM2: number;
  source: string;
}

export interface MarketData {
  lastTransactions?: MarketTransaction[];
  pricePerM2Estimated?: number;
  priceTrend?: Array<{ year: number; pricePerM2: number }>;
  avgPricePerM2Local?: number;
  medianPricePerM2Local?: number;
  transactionCount?: number;
}

export interface RisksData {
  flood?: {
    level: string;
    zone?: string;
    description?: string;
  };
  clay?: {
    level: string;
    exposure?: string;
  };
  seismic?: {
    zone: number;
    level: string;
  };
  radon?: {
    level: string;
    category?: number;
  };
  industrial?: {
    seveso?: boolean;
    icpe?: boolean;
    sites?: Array<{
      name: string;
      distance: number;
      type: string;
    }>;
  };
  forestFire?: {
    level: string;
  };
  coastalErosion?: {
    level: string;
  };
  noise?: {
    level: string;
    sources?: string[];
  };
  globalRiskLevel?: 'low' | 'medium' | 'high';
}

export interface GpuDocument {
  partition?: string;
  idurba?: string;
  typedoc?: string;
  etat?: string;
  nomproc?: string;
  urlpe?: string;
  datappro?: string;
  datefin?: string;
}

export interface GpuZone {
  libelle?: string;
  libelong?: string;
  typezone?: string;
  destdomi?: string;
  nomfic?: string;
  urlfic?: string;
}

export interface GpuPrescription {
  libelle?: string;
  txt?: string;
  typepsc?: string;
  stypepsc?: string;
}

export interface GpuServitude {
  nomfic?: string;
  urlfic?: string;
  categorie?: string;
  libelle?: string;
}

export interface UrbanismData {
  // Commune
  communeCovered?: boolean;
  isRNU?: boolean;
  
  // Documents d'urbanisme
  documents?: GpuDocument[];
  mainDocument?: GpuDocument;
  
  // Zonage PLU
  zones?: GpuZone[];
  zone?: string;
  zoneDescription?: string;
  buildingDestination?: string;
  
  // Informations complémentaires
  infoSurf?: any[];
  infoLin?: any[];
  infoPct?: any[];
  
  // Prescriptions
  prescriptionsSurf?: GpuPrescription[];
  prescriptionsLin?: GpuPrescription[];
  prescriptionsPct?: GpuPrescription[];
  
  // Servitudes d'utilité publique (SUP)
  servitudes?: GpuServitude[];
  servitudesCount?: number;
  hasServitudes?: boolean;
  
  // Legacy / autres sources
  regulationsPdfUrl?: string;
  abfZone?: boolean;
  abfDistance?: number;
  maxHeightMeters?: number;
  pluAvailable?: boolean;
  
  source?: string;
}

export interface OwnerCompany {
  name: string;
  siren?: string;
  siret?: string;
  legalForm?: string;
  representative?: string;
  registeredAddress?: string;
  pappersUrl?: string;
  creationDate?: string;
  activity?: string;
  nafCode?: string;
  capital?: number;
}

export interface OwnersData {
  type: 'unknown' | 'person' | 'company' | 'coownership' | 'public';
  companies?: OwnerCompany[];
  estimationType?: string; // 'likely_SCI_family', 'likely_private', etc.
  acquisitionDate?: string;
  acquisitionPrice?: number;
  ownershipHistory?: Array<{
    date: string;
    type: string;
    price?: number;
  }>;
  aiEstimation?: {
    probableType: string;
    probableYear: number | null;
    confidence: number;
    reasoning: string;
  };
}

export interface DistrictScores {
  shops?: number;
  schools?: number;
  greenAreas?: number;
  transport?: number;
  noise?: number;
  health?: number;
  culture?: number;
  overall?: number;
}

export interface POI {
  type: string;
  name?: string;
  distanceMeters?: number;
  category?: string;
}

export interface DistrictData {
  scores?: DistrictScores;
  pois?: POI[];
  walkScore?: number;
  airQuality?: {
    index: number;
    pm25?: number;
    pm10?: number;
    o3?: number;
  };
  population?: {
    density?: number;
    medianAge?: number;
    medianIncome?: number;
  };
  buildingContext?: {
    type?: string;
    levels?: number;
    height?: number;
    neighborhoodDensity?: string;
  };
}

export interface ClimateData {
  sunHoursYear?: number;
  avgTempYear?: number;
  avgRainMmYear?: number;
  prevailingWind?: string;
  avgHumidity?: number;
  uvIndex?: number;
  currentWeather?: {
    temperature: number;
    description: string;
    humidity: number;
    windSpeed: number;
  };
  solarExposure?: 'low' | 'medium' | 'high';
}

export interface ImageryData {
  streetViewUrl?: string;
  streetViewProvider?: 'mapillary';
  streetViewImageId?: string;
  aerialImageUrl?: string;
  aerialProvider?: 'openAerialMap' | 'osm' | 'arcgis';
  satelliteUrl?: string;
  facadePhotos?: string[];
  detectedFeatures?: {
    vegetation?: boolean;
    pool?: boolean;
    parking?: boolean;
    roofType?: string;
  };
}

export interface AISummary {
  headline: string;
  bulletPoints: string[];
  riskLevelGlobal: 'low' | 'medium' | 'high';
  renovationPotential: 'low' | 'medium' | 'high';
  commentsForTechnicalVisit?: string;
  buildingAnalysis?: {
    estimatedType?: string;
    estimatedYear?: number | null;
    estimatedFloors?: number | null;
    facadeMaterial?: string;
    visiblePathologies?: string[];
    roofCondition?: string;
    potentialDPE?: string;
    elevatorProbable?: boolean;
  };
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  recommendations?: string[];
}

export type SourceStatus = 'OK' | 'EMPTY' | 'ERROR' | 'PARTIAL' | 'SKIPPED';

export interface SourceStatusMap {
  ban?: SourceStatus;
  altitude?: SourceStatus;
  cadastre?: SourceStatus;
  dvf?: SourceStatus;
  pappers?: SourceStatus;
  georisques?: SourceStatus;
  urbanism?: SourceStatus;
  osm?: SourceStatus;
  climate?: SourceStatus;
  imagery?: SourceStatus;
  ai?: SourceStatus;
}

export interface PropertyEnrichmentResponse {
  id?: string;
  snapshotId?: string; // Alias for id when coming from property-enrichment
  projectId?: string;
  address: AddressData;
  cadastre?: CadastreData;
  market?: MarketData;
  risks?: RisksData;
  urbanism?: UrbanismData;
  owners?: OwnersData;
  district?: DistrictData;
  climate?: ClimateData;
  imagery?: ImageryData;
  aiSummary?: AISummary;
  sourceStatus: SourceStatusMap;
  createdAt?: string;
  updatedAt?: string;
  cached?: boolean;
}

// Type pour le snapshot en base de données
export interface PropertyEnrichmentSnapshot {
  id: string;
  project_id: string | null;
  address_input: string;
  address_normalized: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  code_insee: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  cadastre_section: string | null;
  cadastre_parcelle: string | null;
  cadastre_surface_m2: number | null;
  cadastre_geom: any;
  market_json: MarketData;
  risks_json: RisksData;
  urbanism_json: UrbanismData;
  owners_json: OwnersData;
  district_json: DistrictData;
  climate_json: ClimateData;
  imagery_json: ImageryData;
  ai_summary_json: AISummary;
  ai_confidence: number | null;
  source_status_json: SourceStatusMap;
  created_at: string;
  updated_at: string;
}
