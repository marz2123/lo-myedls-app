import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EnergyProfile, EnergyRecommendation, EnergyForecast, EnergyClass } from '@/types/energy';

export const useEnergyAnalysis = (projectId?: string) => {
  const [profile, setProfile] = useState<EnergyProfile | null>(null);
  const [recommendations, setRecommendations] = useState<EnergyRecommendation[]>([]);
  const [forecasts, setForecasts] = useState<EnergyForecast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEnergyProfile = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('edl_energy_profiles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        const mappedProfile: EnergyProfile = {
          ...profileData,
          classe_energie: profileData.classe_energie as EnergyClass,
          classe_ges: profileData.classe_ges as EnergyClass,
          status: profileData.status as EnergyProfile['status'],
          ponts_thermiques_detectes: profileData.ponts_thermiques_detectes as any,
          materiaux_detectes: profileData.materiaux_detectes as any,
          non_conformites: profileData.non_conformites as any,
          bilan_carbone: profileData.bilan_carbone as any,
          analysis_metadata: profileData.analysis_metadata as any,
        };
        setProfile(mappedProfile);

        // Load recommendations
        const { data: recsData } = await supabase
          .from('edl_energy_recommendations')
          .select('*')
          .eq('energy_profile_id', profileData.id)
          .order('priorite', { ascending: true });

        if (recsData) {
          setRecommendations(recsData.map(r => ({
            ...r,
            categorie: r.categorie as EnergyRecommendation['categorie'],
            nouvelle_classe_energie: r.nouvelle_classe_energie as EnergyClass,
            aides_disponibles: r.aides_disponibles as any,
            details_techniques: r.details_techniques as any,
          })));
        }

        // Load forecasts
        const { data: forecastsData } = await supabase
          .from('edl_energy_forecasts')
          .select('*')
          .eq('energy_profile_id', profileData.id)
          .order('created_at', { ascending: false });

        if (forecastsData) {
          setForecasts(forecastsData.map(f => ({
            ...f,
            avant_classe_energie: f.avant_classe_energie as EnergyClass,
            avant_classe_ges: f.avant_classe_ges as EnergyClass,
            apres_classe_energie: f.apres_classe_energie as EnergyClass,
            apres_classe_ges: f.apres_classe_ges as EnergyClass,
            travaux_prevus: f.travaux_prevus as any,
          })));
        }
      }
    } catch (err) {
      console.error('Error loading energy profile:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const runEnergyAnalysis = useCallback(async () => {
    if (!projectId) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-energy', {
        body: { projectId },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Reload profile after analysis
      await loadEnergyProfile();
      
      return data;
    } catch (err) {
      console.error('Error running energy analysis:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'analyse');
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, loadEnergyProfile]);

  const createForecast = useCallback(async (
    scenarioName: string,
    travaux: { type: string; description: string; cout_estime?: number }[]
  ) => {
    if (!profile) return;
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('simulate-energy-forecast', {
        body: {
          profileId: profile.id,
          scenarioName,
          travaux,
        },
      });

      if (fnError) throw fnError;
      
      await loadEnergyProfile();
      return data;
    } catch (err) {
      console.error('Error creating forecast:', err);
      throw err;
    }
  }, [profile, loadEnergyProfile]);

  const acceptRecommendation = useCallback(async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('edl_energy_recommendations')
        .update({
          is_accepted: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);

      if (error) throw error;
      
      setRecommendations(prev =>
        prev.map(r =>
          r.id === recommendationId
            ? { ...r, is_accepted: true, accepted_at: new Date().toISOString() }
            : r
        )
      );
    } catch (err) {
      console.error('Error accepting recommendation:', err);
      throw err;
    }
  }, []);

  const getEnergyClassFromConsumption = useCallback((kwhM2An: number): EnergyClass => {
    if (kwhM2An <= 70) return 'A';
    if (kwhM2An <= 110) return 'B';
    if (kwhM2An <= 180) return 'C';
    if (kwhM2An <= 250) return 'D';
    if (kwhM2An <= 330) return 'E';
    if (kwhM2An <= 420) return 'F';
    return 'G';
  }, []);

  const getGESClassFromEmissions = useCallback((kgCo2M2An: number): EnergyClass => {
    if (kgCo2M2An <= 6) return 'A';
    if (kgCo2M2An <= 11) return 'B';
    if (kgCo2M2An <= 30) return 'C';
    if (kgCo2M2An <= 50) return 'D';
    if (kgCo2M2An <= 70) return 'E';
    if (kgCo2M2An <= 100) return 'F';
    return 'G';
  }, []);

  return {
    profile,
    recommendations,
    forecasts,
    isLoading,
    isAnalyzing,
    error,
    loadEnergyProfile,
    runEnergyAnalysis,
    createForecast,
    acceptRecommendation,
    getEnergyClassFromConsumption,
    getGESClassFromEmissions,
  };
};
