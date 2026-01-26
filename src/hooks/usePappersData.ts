import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PappersEntrepriseData {
  siren?: string;
  siret?: string;
  denomination?: string;
  forme_juridique?: string;
  date_creation?: string;
  siege?: {
    adresse_ligne_1?: string;
    code_postal?: string;
    ville?: string;
  };
  dirigeants?: Array<{
    nom?: string;
    prenom?: string;
    fonction?: string;
  }>;
  activite?: string;
  code_naf?: string;
  capital_social?: number;
}

export interface ProprietaireData {
  type?: string;
  nom?: string;
  prenom?: string;
  denomination?: string;
  siren?: string;
  siret?: string;
  date_acquisition?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  email?: string;
  telephone?: string;
  forme_juridique?: string;
  source?: string;
}

export interface PappersImmobilierData {
  proprietaires?: ProprietaireData[];
  surface_cadastrale?: number;
  reference_cadastrale?: string;
  historique_parcelle?: Array<{
    date?: string;
    nature?: string;
    prix?: number;
  }>;
}

export interface AIOwnerEstimation {
  probable_owner_type: 'particulier' | 'sci' | 'fonciere' | 'copropriete' | 'collectivite' | 'inconnu';
  confidence: number;
  estimated_acquisition_year?: number;
  estimated_acquisition_price?: number;
  property_profile: string;
  market_context: string;
  reasoning: string;
  source: 'ai_estimation';
}

export interface MAJICData {
  proprietaires_moraux?: Array<{
    denomination: string;
    siren?: string;
    type_personne_morale: string;
    droit_propriete: string;
  }>;
  source: 'majic';
}

export interface DVFData {
  derniere_vente?: {
    date: string;
    prix: number;
    prix_m2: number;
    type_local?: string;
    nature_mutation?: string;
  };
  historique_ventes?: Array<{
    date: string;
    prix: number;
    surface: number;
    type_local?: string;
    nature_mutation?: string;
  }>;
  nb_transactions?: number;
  prix_moyen_m2?: number;
}

export interface CadastreData {
  section?: string;
  numero?: string;
  surface?: number;
  code_commune?: string;
  code_departement?: string;
  prefixe?: string;
  id_parcelle?: string;
  contenance?: number;
  arpente?: boolean;
  commune?: string;
  feuille?: string;
}

export interface APIStatus {
  pappers: 'success' | 'error' | 'no_key' | 'no_data';
  dvf: 'success' | 'error' | 'no_data';
  cadastre: 'success' | 'error' | 'no_data';
  majic: 'success' | 'error' | 'no_data';
  ai: 'success' | 'error' | 'no_data';
}

export interface PropertyOwnerData {
  pappers_entreprise?: PappersEntrepriseData;
  pappers_immobilier?: PappersImmobilierData;
  majic_data?: MAJICData;
  dvf_data?: DVFData;
  cadastre_data?: CadastreData;
  ai_estimation?: AIOwnerEstimation;
  data_sources: string[];
  data_source: 'pappers' | 'majic' | 'cadastre_only' | 'mixed' | 'ai_estimation';
  last_updated: string;
  api_status: APIStatus;
}

export const usePappersData = () => {
  const [data, setData] = useState<PropertyOwnerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPropertyOwners = useCallback(async (
    address: string,
    lat: number,
    lon: number,
    siren?: string,
    codeInsee?: string
  ) => {
    if (!address || lat === undefined || lon === undefined) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'get-property-owners',
        {
          body: { address, lat, lon, siren, codeInsee }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      setData(responseData);
    } catch (err) {
      console.error('Error fetching property owner data:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
      setData(null);
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
    fetchPropertyOwners,
    clearData,
  };
};
