import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface BDNBBuildingData {
  // Identifiants
  batiment_groupe_id?: string;
  rnb_id?: string;
  ban_id?: string;
  
  // Fichiers Fonciers - Usage et lots
  nb_log?: number;  // Nombre de logements
  nb_log_lc?: number;  // Nombre de logements collectifs
  nb_log_mi?: number;  // Nombre de logements maisons individuelles
  nb_lot_garpark?: number;  // Nombre de lots de garage/parking
  nb_lot_tertiaire?: number;  // Nombre de lots tertiaires
  nb_lot_activite?: number;  // Nombre de lots d'activité
  usage_niveau_1_txt?: string;  // Usage principal
  
  // RNC - Registre National des Copropriétés
  numero_immat_principal?: string;  // Numéro d'immatriculation copropriété
  nb_lots_tot?: number;  // Nombre total de lots
  nb_lots_hab?: number;  // Nombre de lots habitation
  nb_lots_bureaux?: number;  // Nombre de lots bureaux
  nb_lots_commerces?: number;  // Nombre de lots commerces
  nb_ascenseurs?: number;
  
  // Construction
  annee_construction?: number;
  periode_construction?: string;
  mat_mur?: string;  // Matériau mur
  mat_mur_txt?: string;  // Matériau mur texte
  mat_toit?: string;  // Matériau toiture
  mat_toit_txt?: string;  // Matériau toiture texte
  nb_etage?: number;
  hauteur?: number;  // Hauteur bâtiment en mètres
  
  // DPE
  classe_dpe_conso_energie?: string;
  classe_dpe_emission_ges?: string;
  conso_energie_m2?: number;
  emission_ges_m2?: number;
  
  // Surface
  surface_habitable?: number;
  surface_facade?: number;
  emprise_sol?: number;
  
  // Synthèse usage
  l_usage_bat?: string[];
  usage_principal?: string;
  statut_copro?: string;
  nb_pdl_hab?: number;  // Nombre de points de livraison habitation
  nb_pdl_pro?: number;  // Nombre de points de livraison pro
  
  // Qualité des données
  fiabilite_hauteur?: string;
  fiabilite_annee?: string;
  
  // Données source
  data_source: 'bdnb_open' | 'bdnb_expert' | 'estimation';
  confidence_score?: number;
}

interface BDNBResponse {
  data: BDNBBuildingData | null;
  isLoading: boolean;
  error: string | null;
}

export const useBDNBData = () => {
  const [data, setData] = useState<BDNBBuildingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBDNBData = useCallback(async (
    lat: number,
    lon: number,
    address?: string
  ): Promise<BDNBBuildingData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching BDNB via edge function for lat=${lat}, lon=${lon}`);

      // Use edge function to bypass CORS
      const { data: responseData, error: fnError } = await supabase.functions.invoke('fetch-bdnb-data', {
        body: { lat, lon, address }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Erreur lors de la récupération des données BDNB');
      }

      if (responseData?.error) {
        console.log('BDNB returned error:', responseData.error);
        setError(responseData.error);
        setData(null);
        return null;
      }

      if (responseData?.building) {
        const bdnbData = responseData.building as BDNBBuildingData;
        setData(bdnbData);
        return bdnbData;
      }

      setError('Aucun bâtiment trouvé dans la BDNB');
      setData(null);
      return null;

    } catch (err) {
      console.error('BDNB fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des données BDNB';
      setError(errorMessage);
      setData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchBDNBData,
    clearData,
  };
};

function mapBDNBResponse(raw: any): BDNBBuildingData {
  // Helper to get material text
  const getMaterialText = (code: string | undefined): string | undefined => {
    const materials: Record<string, string> = {
      '11': 'Pierre',
      '21': 'Béton banché',
      '22': 'Aggloméré/parpaing',
      '23': 'Béton cellulaire',
      '31': 'Bois',
      '41': 'Métal',
      '51': 'Brique',
      '91': 'Autre',
    };
    return code ? materials[code] : undefined;
  };

  const getRoofText = (code: string | undefined): string | undefined => {
    const roofs: Record<string, string> = {
      '1': 'Ardoise',
      '2': 'Tuile canal',
      '3': 'Tuile plate',
      '4': 'Tuile mécanique',
      '5': 'Zinc/cuivre/aluminium',
      '6': 'Terrasse/Étanchéité',
      '7': 'Toit végétalisé',
      '8': 'Autre',
    };
    return code ? roofs[code] : undefined;
  };

  return {
    batiment_groupe_id: raw.batiment_groupe_id,
    rnb_id: raw.rnb_id,
    ban_id: raw.ban_id,
    
    // Fichiers Fonciers
    nb_log: raw.nb_log ?? raw.ffo_bat?.nb_log,
    nb_log_lc: raw.nb_log_lc ?? raw.ffo_bat?.nb_log_lc,
    nb_log_mi: raw.nb_log_mi ?? raw.ffo_bat?.nb_log_mi,
    nb_lot_garpark: raw.nb_lot_garpark ?? raw.ffo_bat?.nb_lot_garpark_individuel ?? raw.ffo_bat?.nb_lot_garpark,
    nb_lot_tertiaire: raw.nb_lot_tertiaire ?? raw.ffo_bat?.nb_loc_tertiaire,
    nb_lot_activite: raw.nb_lot_activite ?? raw.ffo_bat?.nb_loc_activite,
    usage_niveau_1_txt: raw.usage_niveau_1_txt ?? raw.synthese_propriete_usage?.usage_niveau_1_txt,
    
    // RNC
    numero_immat_principal: raw.rnc?.numero_immat_principal,
    nb_lots_tot: raw.rnc?.nb_lots_tot,
    nb_lots_hab: raw.rnc?.nb_lots_hab,
    nb_lots_bureaux: raw.rnc?.nb_lots_bureaux,
    nb_lots_commerces: raw.rnc?.nb_lots_commerces,
    nb_ascenseurs: raw.rnc?.nb_ascenseurs,
    
    // Construction
    annee_construction: raw.annee_construction ?? raw.ffo_bat?.annee_construction ?? raw.bdtopo_bat?.annee_construction,
    periode_construction: raw.periode_construction ?? raw.bdtopo_bat?.periode_construction,
    mat_mur: raw.mat_mur ?? raw.ffo_bat?.mat_mur,
    mat_mur_txt: getMaterialText(raw.mat_mur ?? raw.ffo_bat?.mat_mur),
    mat_toit: raw.mat_toit ?? raw.ffo_bat?.mat_toit,
    mat_toit_txt: getRoofText(raw.mat_toit ?? raw.ffo_bat?.mat_toit),
    nb_etage: raw.nb_etage ?? raw.bdtopo_bat?.nb_etages ?? raw.ffo_bat?.nb_niv,
    hauteur: raw.bdtopo_bat?.hauteur ?? raw.hauteur,
    
    // DPE
    classe_dpe_conso_energie: raw.dpe_representatif_logement?.classe_conso_energie ?? raw.classe_conso_energie,
    classe_dpe_emission_ges: raw.dpe_representatif_logement?.classe_emission_ges ?? raw.classe_emission_ges,
    conso_energie_m2: raw.dpe_representatif_logement?.conso_energie_primaire_m2,
    emission_ges_m2: raw.dpe_representatif_logement?.emission_ges_m2,
    
    // Surfaces
    surface_habitable: raw.ffo_bat?.surface_habitable ?? raw.surface_habitable,
    surface_facade: raw.bdtopo_bat?.surface_facade_totale,
    emprise_sol: raw.bdtopo_bat?.surface_au_sol ?? raw.emprise_sol,
    
    // Synthèse usage
    l_usage_bat: raw.synthese_propriete_usage?.l_usage_bat ?? raw.l_usage_bat,
    usage_principal: raw.synthese_propriete_usage?.usage_principal ?? raw.usage_principal,
    statut_copro: raw.synthese_propriete_usage?.statut_copro ?? raw.statut_copro,
    nb_pdl_hab: raw.synthese_propriete_usage?.nb_pdl_hab,
    nb_pdl_pro: raw.synthese_propriete_usage?.nb_pdl_pro,
    
    // Fiabilité
    fiabilite_hauteur: raw.bdtopo_bat?.fiabilite_hauteur,
    fiabilite_annee: raw.ffo_bat?.fiabilite_annee,
    
    data_source: 'bdnb_open',
    confidence_score: 0.95,
  };
}
