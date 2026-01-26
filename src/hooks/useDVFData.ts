import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface DVFTransaction {
  id: string;
  date_mutation: string;
  nature_mutation: string;
  valeur_fonciere: number;
  adresse_numero: string;
  adresse_nom_voie: string;
  code_postal: string;
  nom_commune: string;
  type_local: string;
  surface_reelle_bati: number;
  nombre_pieces_principales: number;
  surface_terrain: number;
  prix_m2: number;
}

export interface DVFStats {
  avgPriceM2Appartement: number;
  avgPriceM2Maison: number;
  totalTransactions: number;
  priceEvolution: Array<{
    year: number;
    avgPrice: number;
  }>;
  nearbyTransactions: DVFTransaction[];
}

export interface DVFResponse {
  stats: DVFStats;
  lastUpdate: string;
}

export const useDVFData = () => {
  const [dvfData, setDvfData] = useState<DVFResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDVFData = useCallback(async (lat: number, lon: number, codeInsee?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching DVF via edge function for lat=${lat}, lon=${lon}, codeInsee=${codeInsee}`);

      // Use edge function to bypass CORS
      const { data, error: fnError } = await supabase.functions.invoke('fetch-dvf-data', {
        body: { lat, lon, codeInsee }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Erreur lors de la récupération des données DVF');
      }

      const rawTransactions = data?.transactions || [];
      console.log(`Found ${rawTransactions.length} DVF transactions via edge function`);

      // Transform to expected format
      const transactions: DVFTransaction[] = rawTransactions.map((t: any) => {
        const surface = t.surface_reelle_bati || 1;
        return {
          id: crypto.randomUUID(),
          date_mutation: t.date_mutation,
          nature_mutation: 'Vente',
          valeur_fonciere: t.valeur_fonciere || 0,
          adresse_numero: '',
          adresse_nom_voie: t.adresse || '',
          code_postal: t.code_postal || '',
          nom_commune: t.commune || '',
          type_local: t.type_local || 'Bien immobilier',
          surface_reelle_bati: t.surface_reelle_bati || 0,
          nombre_pieces_principales: t.nombre_pieces_principales || 0,
          surface_terrain: 0,
          prix_m2: surface > 0 ? Math.round(t.valeur_fonciere / surface) : 0,
        };
      });

      if (transactions.length === 0) {
        setError('Aucune transaction DVF trouvée dans un rayon de 2km');
        setDvfData(null);
        return;
      }

      // Calculate statistics
      const appartements = transactions.filter(t => 
        t.type_local?.toLowerCase().includes('appartement')
      );
      const maisons = transactions.filter(t => 
        t.type_local?.toLowerCase().includes('maison')
      );

      const avgPriceM2Appartement = appartements.length > 0
        ? Math.round(appartements.reduce((sum, t) => sum + t.prix_m2, 0) / appartements.length)
        : 0;

      const avgPriceM2Maison = maisons.length > 0
        ? Math.round(maisons.reduce((sum, t) => sum + t.prix_m2, 0) / maisons.length)
        : 0;

      // Group by year for evolution chart
      const byYear: Record<number, number[]> = {};
      transactions.forEach(t => {
        if (t.date_mutation) {
          const year = new Date(t.date_mutation).getFullYear();
          if (!isNaN(year)) {
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(t.prix_m2);
          }
        }
      });

      const priceEvolution = Object.entries(byYear)
        .map(([year, prices]) => ({
          year: parseInt(year),
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        }))
        .sort((a, b) => a.year - b.year)
        .slice(-5);

      // Keep more transactions for filtering (up to 500)
      setDvfData({
        stats: {
          avgPriceM2Appartement,
          avgPriceM2Maison,
          totalTransactions: transactions.length,
          priceEvolution,
          nearbyTransactions: transactions.slice(0, 500),
        },
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('DVF fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données DVF');
      setDvfData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    dvfData,
    isLoading,
    error,
    fetchDVFData,
  };
};
