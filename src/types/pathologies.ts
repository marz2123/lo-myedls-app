export type PathologyType = 'fissure' | 'humidite' | 'moisissure' | 'infiltration' | 'decollement' | 'degradation' | 'amiante' | 'plomb' | 'termites';
export type PathologySeverity = 'faible' | 'modere' | 'grave' | 'critique';
export type HazardousSubstance = 'amiante' | 'plomb' | 'termites';

export interface ARMeasurements {
  width: number;   // largeur en m
  height: number;  // hauteur en m
  depth: number;   // profondeur en m
  surfaceArea: number;  // surface en m²
  volume: number;  // volume en m³
}

export interface RepairCostEstimate {
  laborCost: number;      // coût main d'œuvre en €
  materialCost: number;   // coût matériaux en €
  totalCost: number;      // coût total en €
  estimatedDuration: number; // durée estimée en heures
  pricePerUnit: number;   // prix unitaire (€/m² ou €/ml)
  unit: 'm²' | 'ml' | 'unité';
}

export interface DetectedPathology {
  type: PathologyType;
  severity: PathologySeverity;
  confidence: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
  recommendations?: string;
  estimatedArea?: number; // m² ou ml (estimation basique)
  urgency?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  
  // Nouvelles propriétés pour substances dangereuses
  isHazardous?: boolean;
  hazardousType?: HazardousSubstance;
  regulatoryCompliance?: {
    crepCompliant: boolean;  // conforme aux normes CREP
    requiresSpecialist: boolean;  // nécessite un spécialiste certifié
    legalDeadline?: string;  // délai légal d'intervention
  };
  
  // Quantification précise avec AR 3D
  arMeasurements?: ARMeasurements;
  affectedSurface?: number;  // surface réellement affectée en m² (calculée avec AR)
  affectedVolume?: number;   // volume réellement affecté en m³ (calculée avec AR)
  
  // Estimation de coût
  repairCost?: RepairCostEstimate;
}

export interface PathologyAnalysisResult {
  frameId: string;
  imageUrl: string;
  pathologies: DetectedPathology[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  analysisTimestamp: number;
  aiConfidence: number;
}

export const pathologyLabels: Record<PathologyType, string> = {
  fissure: 'Fissure',
  humidite: 'Humidité',
  moisissure: 'Moisissure',
  infiltration: 'Infiltration',
  decollement: 'Décollement',
  degradation: 'Dégradation',
  amiante: 'Amiante',
  plomb: 'Plomb',
  termites: 'Termites'
};

export const severityLabels: Record<PathologySeverity, string> = {
  faible: 'Faible',
  modere: 'Modéré',
  grave: 'Grave',
  critique: 'Critique'
};

export const severityColors: Record<PathologySeverity, string> = {
  faible: 'bg-green-500',
  modere: 'bg-yellow-500',
  grave: 'bg-orange-500',
  critique: 'bg-red-500'
};

export const pathologyIcons: Record<PathologyType, string> = {
  fissure: '🔍',
  humidite: '💧',
  moisissure: '🦠',
  infiltration: '🌊',
  decollement: '📌',
  degradation: '⚠️',
  amiante: '☣️',
  plomb: '⚠️',
  termites: '🐛'
};

export const hazardousSubstanceLabels: Record<HazardousSubstance, string> = {
  amiante: 'Amiante (substance cancérigène)',
  plomb: 'Plomb (toxique)',
  termites: 'Termites (insectes xylophages)'
};
