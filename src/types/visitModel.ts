// =====================================================
// MyEDLS Visit Model Types
// Structure: Bien → Partie → Lieu → Zone → Problème → Tâche
// =====================================================

export type TypeBien = 'immeuble' | 'maison' | 'appartement' | 'plateau' | 'commerce' | 'autre';
export type TypePartie = 'commune' | 'privative';
export type TypeZone = 'murs' | 'sol' | 'plafond' | 'menuiseries' | 'electricite' | 'plomberie' | 'equipements' | 'ventilation' | 'chauffage' | 'facade' | 'toiture' | 'autre';
export type EtatGlobal = 'neuf' | 'bon' | 'a_refaire';
export type Urgence = 'immediate' | 'haute' | 'normale' | 'basse';
export type OrigineProbleme = 'ia' | 'user' | 'document';
export type EtatValidation = 'en_attente' | 'valide' | 'rejete' | 'modifie';
export type Difficulte = 'facile' | 'moyenne' | 'difficile' | 'expert';
export type OccupationStatus = 'occupe' | 'vacant' | 'en_travaux';
export type MediaType = 'photo' | 'video' | 'audio' | 'document';

// Labels français
export const TYPE_BIEN_LABELS: Record<TypeBien, string> = {
  immeuble: 'Immeuble',
  maison: 'Maison',
  appartement: 'Appartement',
  plateau: 'Plateau',
  commerce: 'Commerce',
  autre: 'Autre',
};

export const TYPE_PARTIE_LABELS: Record<TypePartie, string> = {
  commune: 'Parties Communes',
  privative: 'Parties Privatives',
};

export const TYPE_ZONE_LABELS: Record<TypeZone, string> = {
  murs: 'Murs',
  sol: 'Sol',
  plafond: 'Plafond',
  menuiseries: 'Menuiseries',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  equipements: 'Équipements',
  ventilation: 'Ventilation',
  chauffage: 'Chauffage',
  facade: 'Façade',
  toiture: 'Toiture',
  autre: 'Autre',
};

export const ETAT_GLOBAL_LABELS: Record<EtatGlobal, string> = {
  neuf: 'Neuf',
  bon: 'Bon',
  a_refaire: 'À refaire',
};

export const ETAT_GLOBAL_COLORS: Record<EtatGlobal, { bg: string; text: string; border: string }> = {
  neuf: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  bon: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  a_refaire: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
};

export const URGENCE_LABELS: Record<Urgence, string> = {
  immediate: 'Immédiate',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

export const URGENCE_COLORS: Record<Urgence, string> = {
  immediate: 'bg-destructive text-destructive-foreground',
  haute: 'bg-warning text-warning-foreground',
  normale: 'bg-info text-info-foreground',
  basse: 'bg-muted text-muted-foreground',
};

export const DIFFICULTE_LABELS: Record<Difficulte, string> = {
  facile: 'Facile',
  moyenne: 'Moyenne',
  difficile: 'Difficile',
  expert: 'Expert',
};

export const ETAT_VALIDATION_LABELS: Record<EtatValidation, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
  modifie: 'Modifié',
};

// Types de lieux suggérés par type de partie
export const LIEUX_COMMUNS = [
  'Façade rue',
  'Façade arrière',
  'Façade latérale',
  'Toiture',
  'Combles',
  'Cage d\'escalier A',
  'Cage d\'escalier B',
  'Hall d\'entrée',
  'Couloir RDC',
  'Couloir étage',
  'Local technique',
  'Local poubelles',
  'Cave commune',
  'Parking souterrain',
  'Parking extérieur',
  'Jardin commun',
  'Terrasse commune',
];

export const LIEUX_PRIVATIFS = [
  'Entrée',
  'Séjour',
  'Cuisine',
  'Chambre 1',
  'Chambre 2',
  'Chambre 3',
  'Salle de bain',
  'Salle d\'eau',
  'WC',
  'Couloir',
  'Dégagement',
  'Balcon',
  'Terrasse',
  'Loggia',
  'Cave',
  'Parking',
  'Box',
  'Garage',
  'Jardin',
  'Cellier',
  'Buanderie',
];

// Interface pour la fiche bien complète
export interface FicheBien {
  id: string;
  nom: string;
  type_bien: TypeBien;
  adresse: string;
  code_postal?: string;
  ville?: string;
  // Composition
  nb_appartements: number;
  nb_cages: number;
  nb_facades: number;
  nb_parkings: number;
  nb_boxes: number;
  nb_garages: number;
  nb_caves: number;
  nb_jardins: number;
  nb_etages: number;
  nb_locaux_techniques: number;
  surface_totale_m2?: number;
  // Contexte
  date_construction?: string;
  type_chauffage?: string;
  type_ventilation?: string;
  contexte_historique?: string;
  sinistres_precedents?: string;
  travaux_anterieurs?: string;
  contraintes?: string;
  diagnostics_existants?: any[];
  acces_handicapes: boolean;
  // Métadonnées
  created_at: string;
  updated_at: string;
}

// Interface pour une séquence de visite
export interface SequenceVisite {
  id: string;
  bien_id: string;
  partie_id: string;
  lieu_id: string;
  ordre_visite: number;
  // Médias
  video_url?: string;
  audio_url?: string;
  photos: string[];
  // Analyse
  transcription?: string;
  etat_detecte?: EtatGlobal;
  etat_confirme?: EtatGlobal;
  zones_detectees: TypeZone[];
  ai_analysis?: any;
  // Métadonnées
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
  commentaire_global?: string;
  conditions_visite?: any;
  participants?: any[];
  gps_coordinates?: { lat: number; lng: number };
}

// Interface pour une zone
export interface ZoneVisite {
  id: string;
  lieu_id: string;
  type_zone: TypeZone;
  nom_personnalise?: string;
  position_dans_lieu?: string;
  etat: EtatGlobal;
  // Mesures
  surface_m2?: number;
  longueur_m?: number;
  largeur_m?: number;
  hauteur_m?: number;
  mesures_ar?: any;
  // Détections IA
  materiaux_detectes?: string[];
  pathologies_detectees?: string[];
  notes?: string;
}

// Interface pour un problème
export interface Probleme {
  id: string;
  sequence_id: string;
  zone_id?: string;
  titre: string;
  description?: string;
  origine: OrigineProbleme;
  severite: 'low' | 'medium' | 'high' | 'critical';
  urgence: Urgence;
  // Localisation
  position_x?: number;
  position_y?: number;
  dimensions?: any;
  // Photos
  photo_urls: string[];
  video_timestamp_start?: number;
  video_timestamp_end?: number;
  // Coûts
  cout_estime_min?: number;
  cout_estime_max?: number;
  recommandations?: string;
  // Validation
  is_confirmed: boolean;
  is_resolved: boolean;
  date_constatation: string;
}

// Interface pour une tâche
export interface TacheVisite {
  id: string;
  bien_id: string;
  partie_id?: string;
  lieu_id?: string;
  zone_id?: string;
  sequence_id?: string;
  probleme_id?: string;
  // Classification FT/CT/ST
  famille_id?: string;
  famille_code?: string;
  famille_nom?: string;
  categorie_id?: string;
  categorie_code?: string;
  categorie_nom?: string;
  sous_categorie_id?: string;
  sous_categorie_code?: string;
  sous_categorie_nom?: string;
  // Détails tâche
  titre: string;
  description?: string;
  quantite?: number;
  unite?: string;
  etat: EtatGlobal;
  priorite: 'low' | 'medium' | 'high' | 'urgent';
  type_travaux?: string;
  // Coûts
  cout_estime_min?: number;
  cout_estime_max?: number;
  // Exécution
  corps_metier?: string;
  difficulte: Difficulte;
  delai_estime_jours?: number;
  ordre_execution?: number;
  // Validation
  etat_validation: EtatValidation;
  validated_at?: string;
  validated_by?: string;
  notes_validation?: string;
  // Photos
  photo_urls: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

// Interface pour un média
export interface MediaVisite {
  id: string;
  project_id: string;
  sequence_id?: string;
  zone_id?: string;
  problem_id?: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  filename?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  timestamp_in_sequence?: number;
  ai_analysis?: any;
  annotations?: any[];
  is_key_frame: boolean;
  caption?: string;
  metadata?: any;
  created_at: string;
}

// Interface pour l'élément de timeline
export interface TimelineItem {
  sequence: SequenceVisite;
  partie_nom: string;
  partie_type: TypePartie;
  lieu_nom: string;
  lieu_type?: string;
  zones: ZoneVisite[];
  problemes: Probleme[];
  taches: TacheVisite[];
  medias: MediaVisite[];
  nb_problemes: number;
  nb_taches: number;
}

// Exemple de mapping pour le cas concret mentionné
export const EXEMPLE_MAPPING_TACHES = {
  fissures_mur: {
    famille: 'Cloisons',
    categorie: 'Réparations',
    sous_categorie: 'Fissures mur plein',
    description_type: 'Réparation fissures + ponçage + impression',
  },
  sol_irregulier: {
    famille: 'Sols',
    categorie: 'Préparation sols',
    sous_categorie: 'Ragréage auto-lissant',
    description_type: 'Ragréage auto-lissant complet',
  },
};
