import { useState, useCallback } from 'react';

export interface RiskData {
  naturels: {
    inondation: boolean;
    seisme: number; // zone 1-5
    argiles: string; // exposition aléa
    radon: number; // potentiel 1-3
    feuForet: boolean;
    avalanche: boolean;
    volcan: boolean;
  };
  technologiques: {
    icpe: boolean; // Installations classées
    nucleaire: boolean;
    canalisations: boolean;
  };
  autres: {
    pprn: boolean; // Plan de prévention risques naturels
    pprt: boolean; // Plan de prévention risques technologiques
    catnat: number; // Nombre d'arrêtés catastrophe naturelle
  };
}

export interface GeorisquesResponse {
  risks: RiskData;
  commune: string;
  departement: string;
  lastUpdate?: string;
}

export const useGeorisques = () => {
  const [riskData, setRiskData] = useState<GeorisquesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskData = useCallback(async (lat: number, lon: number, codeInsee?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Georisques API - fetch risk data for location
      const params = new URLSearchParams({
        latlon: `${lon},${lat}`,
        rayon: '100', // 100m radius
      });

      const response = await fetch(
        `https://georisques.gouv.fr/api/v1/gaspar/risques?${params.toString()}`
      );

      if (!response.ok) {
        // Fallback: use commune code if available
        if (codeInsee) {
          const altResponse = await fetch(
            `https://georisques.gouv.fr/api/v1/gaspar/risques?code_insee=${codeInsee}`
          );
          
          if (altResponse.ok) {
            const altData = await altResponse.json();
            processRiskData(altData);
            return;
          }
        }
        throw new Error('Impossible de récupérer les données de risques');
      }

      const data = await response.json();
      processRiskData(data);
    } catch (err) {
      console.error('Georisques fetch error:', err);
      // Set default/empty risk data on error
      setRiskData({
        risks: {
          naturels: {
            inondation: false,
            seisme: 1,
            argiles: 'Non renseigné',
            radon: 1,
            feuForet: false,
            avalanche: false,
            volcan: false,
          },
          technologiques: {
            icpe: false,
            nucleaire: false,
            canalisations: false,
          },
          autres: {
            pprn: false,
            pprt: false,
            catnat: 0,
          },
        },
        commune: '',
        departement: '',
      });
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processRiskData = (data: any) => {
    const risks: RiskData = {
      naturels: {
        inondation: false,
        seisme: 1,
        argiles: 'Non renseigné',
        radon: 1,
        feuForet: false,
        avalanche: false,
        volcan: false,
      },
      technologiques: {
        icpe: false,
        nucleaire: false,
        canalisations: false,
      },
      autres: {
        pprn: false,
        pprt: false,
        catnat: 0,
      },
    };

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any) => {
        const risqueCode = item.risque_jo_code;
        
        // Map risk codes to our structure
        if (risqueCode?.includes('INOND')) risks.naturels.inondation = true;
        if (risqueCode?.includes('SEISME')) risks.naturels.seisme = Math.max(risks.naturels.seisme, parseInt(item.zone_sismicite) || 1);
        if (risqueCode?.includes('FEU')) risks.naturels.feuForet = true;
        if (risqueCode?.includes('AVAL')) risks.naturels.avalanche = true;
        if (risqueCode?.includes('VOLCAN')) risks.naturels.volcan = true;
        if (risqueCode?.includes('NUCL')) risks.technologiques.nucleaire = true;
        if (risqueCode?.includes('ICPE')) risks.technologiques.icpe = true;
        
        if (item.num_pprn) risks.autres.pprn = true;
        if (item.num_pprt) risks.autres.pprt = true;
      });
    }

    // Count CATNAT
    if (data.catnat && Array.isArray(data.catnat)) {
      risks.autres.catnat = data.catnat.length;
    }

    setRiskData({
      risks,
      commune: data.commune || '',
      departement: data.departement || '',
      lastUpdate: new Date().toISOString(),
    });
  };

  const getRiskLevel = useCallback((riskData: RiskData): 'low' | 'medium' | 'high' => {
    let score = 0;
    
    if (riskData.naturels.inondation) score += 2;
    if (riskData.naturels.seisme >= 3) score += 2;
    if (riskData.naturels.seisme >= 4) score += 2;
    if (riskData.naturels.feuForet) score += 1;
    if (riskData.technologiques.nucleaire) score += 3;
    if (riskData.technologiques.icpe) score += 1;
    if (riskData.autres.catnat > 5) score += 2;
    
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }, []);

  return {
    riskData,
    isLoading,
    error,
    fetchRiskData,
    getRiskLevel,
  };
};
