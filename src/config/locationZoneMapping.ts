import type { ZoneType } from '@/types/businessModel';

// =====================================================
// Configuration des zones par défaut selon le type de lieu
// Assure la cohérence et la logique métier
// =====================================================

export interface ZoneConfig {
  type: ZoneType;
  label: string;
  icon?: string;
  color?: string;
}

// Zones par défaut pour chaque type de lieu
export const LOCATION_ZONE_MAPPING: Record<string, ZoneConfig[]> = {
  // ===== PARTIES COMMUNES =====
  
  // Parking commun - zones spécifiques
  parking_commun: [
    { type: 'sol', label: 'Sol / Revêtement', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs / Parois', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage / Électricité', color: 'bg-yellow-500' },
    { type: 'ventilation', label: 'Ventilation / Extraction', color: 'bg-cyan-500' },
    { type: 'equipements', label: 'Équipements (barrières, portes)', color: 'bg-green-500' },
  ],
  
  // Cave commune
  cave_commune: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Électricité', color: 'bg-yellow-500' },
    { type: 'ventilation', label: 'Ventilation', color: 'bg-cyan-500' },
    { type: 'equipements', label: 'Portes / Serrures', color: 'bg-green-500' },
  ],
  
  // Hall d'entrée
  hall_entree: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Portes / Vitrages', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Éclairage / Interphone', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Boîtes aux lettres / Équipements', color: 'bg-green-500' },
  ],
  
  // Escalier
  escalier: [
    { type: 'sol', label: 'Marches / Paliers', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Rampe / Garde-corps', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
  ],
  
  // Couloir / Palier
  couloir: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Extincteurs / Signalétique', color: 'bg-green-500' },
  ],
  
  // Local poubelles
  local_poubelles: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'ventilation', label: 'Ventilation', color: 'bg-cyan-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Conteneurs / Équipements', color: 'bg-green-500' },
  ],
  
  // Local vélos
  local_velos: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Racks / Équipements', color: 'bg-green-500' },
  ],
  
  // Terrasse commune
  terrasse_commune: [
    { type: 'sol', label: 'Sol / Revêtement', color: 'bg-amber-500' },
    { type: 'facade', label: 'Garde-corps / Murets', color: 'bg-blue-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Mobilier / Équipements', color: 'bg-green-500' },
  ],
  
  // Espaces verts
  espaces_verts: [
    { type: 'sol', label: 'Pelouse / Plantations', color: 'bg-green-600' },
    { type: 'equipements', label: 'Clôtures / Mobilier', color: 'bg-amber-500' },
    { type: 'electricite', label: 'Éclairage extérieur', color: 'bg-yellow-500' },
  ],
  
  // Toiture
  toiture: [
    { type: 'toiture', label: 'Couverture', color: 'bg-slate-500' },
    { type: 'facade', label: 'Chéneaux / Gouttières', color: 'bg-blue-500' },
    { type: 'ventilation', label: 'Sorties ventilation', color: 'bg-cyan-500' },
    { type: 'equipements', label: 'Antennes / Équipements', color: 'bg-green-500' },
  ],
  
  // Façade
  facade: [
    { type: 'facade', label: 'Enduit / Revêtement', color: 'bg-slate-500' },
    { type: 'menuiseries', label: 'Menuiseries extérieures', color: 'bg-orange-500' },
    { type: 'equipements', label: 'Volets / Stores', color: 'bg-green-500' },
  ],
  
  // Local technique
  local_technique: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'electricite', label: 'Armoire électrique', color: 'bg-yellow-500' },
    { type: 'plomberie', label: 'Plomberie / Canalisations', color: 'bg-blue-400' },
    { type: 'chauffage', label: 'Chaudière / Chaufferie', color: 'bg-red-500' },
    { type: 'ventilation', label: 'VMC / Ventilation', color: 'bg-cyan-500' },
  ],
  
  // Chaufferie
  chaufferie: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'chauffage', label: 'Chaudière', color: 'bg-red-500' },
    { type: 'plomberie', label: 'Canalisations', color: 'bg-blue-400' },
    { type: 'ventilation', label: 'Ventilation', color: 'bg-cyan-500' },
    { type: 'electricite', label: 'Électricité', color: 'bg-yellow-500' },
  ],
  
  // Ascenseur
  ascenseur: [
    { type: 'sol', label: 'Sol cabine', color: 'bg-amber-500' },
    { type: 'murs', label: 'Parois cabine', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond cabine', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage / Boutons', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Portes / Miroir', color: 'bg-green-500' },
  ],
  
  // ===== PARTIES PRIVATIVES =====
  
  // Appartement / Logement (zones standard)
  appartement: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Menuiseries', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Électricité', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Équipements', color: 'bg-green-500' },
  ],
  
  // Entrée
  entree: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Porte d\'entrée', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Éclairage / Interrupteurs', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Placard / Rangements', color: 'bg-green-500' },
  ],
  
  // Séjour / Salon
  sejour: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Fenêtres / Portes', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Prises / Éclairage', color: 'bg-yellow-500' },
    { type: 'chauffage', label: 'Chauffage', color: 'bg-red-500' },
  ],
  
  // Cuisine
  cuisine: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs / Crédence', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Fenêtre', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Prises / Éclairage', color: 'bg-yellow-500' },
    { type: 'plomberie', label: 'Évier / Robinetterie', color: 'bg-blue-400' },
    { type: 'equipements', label: 'Meubles / Électroménager', color: 'bg-green-500' },
    { type: 'ventilation', label: 'Hotte / VMC', color: 'bg-cyan-500' },
  ],
  
  // Chambre
  chambre: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Fenêtre / Volets', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Prises / Éclairage', color: 'bg-yellow-500' },
    { type: 'chauffage', label: 'Chauffage', color: 'bg-red-500' },
    { type: 'equipements', label: 'Placards', color: 'bg-green-500' },
  ],
  
  // Salle de bain
  salle_de_bain: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs / Faïence', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'menuiseries', label: 'Fenêtre / Porte', color: 'bg-orange-500' },
    { type: 'electricite', label: 'Éclairage / Prises', color: 'bg-yellow-500' },
    { type: 'plomberie', label: 'Lavabo / Douche / Baignoire', color: 'bg-blue-400' },
    { type: 'equipements', label: 'Meubles / Miroir', color: 'bg-green-500' },
    { type: 'ventilation', label: 'VMC / Aération', color: 'bg-cyan-500' },
  ],
  
  // WC / Toilettes
  wc: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'plomberie', label: 'WC / Chasse', color: 'bg-blue-400' },
    { type: 'ventilation', label: 'VMC / Aération', color: 'bg-cyan-500' },
  ],
  
  // Couloir intérieur
  couloir_interieur: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
  ],
  
  // Balcon / Terrasse privative
  balcon: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'facade', label: 'Garde-corps', color: 'bg-blue-500' },
    { type: 'menuiseries', label: 'Porte-fenêtre', color: 'bg-orange-500' },
  ],
  
  // Cave privative
  cave: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'electricite', label: 'Éclairage', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Porte / Serrure', color: 'bg-green-500' },
  ],
  
  // Garage privatif
  garage: [
    { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
    { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
    { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
    { type: 'electricite', label: 'Éclairage / Prises', color: 'bg-yellow-500' },
    { type: 'equipements', label: 'Porte de garage', color: 'bg-green-500' },
  ],
  
  // Jardin privatif
  jardin: [
    { type: 'sol', label: 'Pelouse / Plantations', color: 'bg-green-600' },
    { type: 'equipements', label: 'Clôture / Portail', color: 'bg-amber-500' },
    { type: 'electricite', label: 'Éclairage extérieur', color: 'bg-yellow-500' },
  ],
};

// Zones par défaut si le type de lieu n'est pas reconnu
export const DEFAULT_ZONES: ZoneConfig[] = [
  { type: 'sol', label: 'Sol', color: 'bg-amber-500' },
  { type: 'murs', label: 'Murs', color: 'bg-blue-500' },
  { type: 'plafond', label: 'Plafond', color: 'bg-purple-500' },
  { type: 'menuiseries', label: 'Menuiseries', color: 'bg-orange-500' },
  { type: 'electricite', label: 'Électricité', color: 'bg-yellow-500' },
  { type: 'equipements', label: 'Équipements', color: 'bg-green-500' },
];

/**
 * Obtenir les zones appropriées pour un type de lieu
 */
export function getZonesForLocationType(locationType: string | undefined): ZoneConfig[] {
  if (!locationType) return DEFAULT_ZONES;
  
  // Normaliser le type (minuscules, underscores)
  const normalizedType = locationType.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  
  // Chercher une correspondance exacte
  if (LOCATION_ZONE_MAPPING[normalizedType]) {
    return LOCATION_ZONE_MAPPING[normalizedType];
  }
  
  // Chercher des correspondances partielles
  for (const [key, zones] of Object.entries(LOCATION_ZONE_MAPPING)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return zones;
    }
  }
  
  return DEFAULT_ZONES;
}

/**
 * Vérifier si une zone est pertinente pour un type de lieu
 */
export function isZoneRelevantForLocation(zoneType: ZoneType, locationType: string | undefined): boolean {
  const relevantZones = getZonesForLocationType(locationType);
  return relevantZones.some(z => z.type === zoneType);
}
