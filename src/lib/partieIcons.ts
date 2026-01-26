import {
  DoorOpen,
  MoveVertical,
  Building,
  HomeIcon,
  ArrowUpDown,
  Waypoints,
  Triangle,
  Archive,
  Wrench,
  Flame,
  Trash,
  Bike,
  Car,
  Sun,
  Trees,
  TreePine,
  Plus,
  Building2,
  Store,
  Square,
  Warehouse,
  LucideIcon,
} from 'lucide-react';

/**
 * Mapping cohérent des icônes pour chaque type de partie commune
 * Utilise des icônes Lucide représentatives et logiques
 */
export const PARTIES_COMMUNES_ICONS: Record<string, { icon: LucideIcon; emoji: string }> = {
  hall: { icon: DoorOpen, emoji: '🚪' },
  escalier: { icon: MoveVertical, emoji: '🪜' },
  ascenseur: { icon: ArrowUpDown, emoji: '🛗' },
  couloir: { icon: Waypoints, emoji: '🚶‍♂️' },
  facade: { icon: Building, emoji: '🏢' },
  toiture: { icon: HomeIcon, emoji: '🏠' },
  combles: { icon: Triangle, emoji: '🏚️' },
  cave_commune: { icon: Archive, emoji: '🍾' },
  local_technique: { icon: Wrench, emoji: '🔧' },
  chaufferie: { icon: Flame, emoji: '🔥' },
  local_poubelles: { icon: Trash, emoji: '🗑️' },
  local_velos: { icon: Bike, emoji: '🚲' },
  parking_commun: { icon: Car, emoji: '🅿️' },
  terrasse_commune: { icon: Sun, emoji: '☀️' },
  espaces_verts: { icon: Trees, emoji: '🌳' },
  jardin_commun: { icon: TreePine, emoji: '🌲' },
  autre: { icon: Plus, emoji: '➕' },
};

/**
 * Mapping des icônes pour les parties privatives
 */
export const PARTIES_PRIVATIVES_ICONS: Record<string, { icon: LucideIcon; emoji: string }> = {
  appartement: { icon: Building2, emoji: '🏠' },
  local_commercial: { icon: Store, emoji: '🏪' },
  plateau: { icon: Square, emoji: '📐' },
  parking: { icon: Car, emoji: '🅿️' },
  box: { icon: Warehouse, emoji: '🚗' },
  cave: { icon: Archive, emoji: '🪨' },
  jardin: { icon: TreePine, emoji: '🌳' },
  combles: { icon: Triangle, emoji: '🏚️' },
};

/**
 * Retourne l'icône appropriée pour un type de partie commune
 */
export const getPartieIcon = (type: string): LucideIcon => {
  return PARTIES_COMMUNES_ICONS[type]?.icon || Plus;
};

/**
 * Retourne l'emoji approprié pour un type de partie
 */
export const getPartieEmoji = (type: string): string => {
  return PARTIES_COMMUNES_ICONS[type]?.emoji || PARTIES_PRIVATIVES_ICONS[type]?.emoji || '📍';
};
