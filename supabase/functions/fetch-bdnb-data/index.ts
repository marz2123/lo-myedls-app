import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, address } = await req.json();

    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Latitude et longitude requises' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching BDNB data for lat=${lat}, lon=${lon}`);

    // Try geocoding endpoint first
    let buildingData = null;
    let batimentGroupeId = null;

    try {
      const geocodeUrl = `https://api-open.bdnb.io/v1/bdnb/geocodage?lat=${lat}&lon=${lon}&radius=50`;
      console.log('BDNB geocode URL:', geocodeUrl);
      
      const geocodeResponse = await fetchWithTimeout(geocodeUrl, {
        headers: { 'Accept': 'application/json' }
      }, 8000);

      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.results && geocodeData.results.length > 0) {
          batimentGroupeId = geocodeData.results[0].batiment_groupe_id;
          console.log('Found batiment_groupe_id:', batimentGroupeId);
        }
      } else {
        console.log('Geocode failed with status:', geocodeResponse.status);
      }
    } catch (e) {
      console.log('Geocode error:', e);
    }

    // If we have a building ID, fetch complete data
    if (batimentGroupeId) {
      try {
        const buildingUrl = `https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet?batiment_groupe_id=${batimentGroupeId}`;
        const buildingResponse = await fetchWithTimeout(buildingUrl, {
          headers: { 'Accept': 'application/json' }
        }, 8000);

        if (buildingResponse.ok) {
          const data = await buildingResponse.json();
          if (data.results && data.results.length > 0) {
            buildingData = data.results[0];
          }
        }
      } catch (e) {
        console.log('Building data fetch error:', e);
      }
    }

    // Fallback: try direct coordinate query
    if (!buildingData) {
      try {
        const coordUrl = `https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet?lat=${lat}&lon=${lon}&distance=100`;
        console.log('Trying coordinate query:', coordUrl);
        
        const coordResponse = await fetchWithTimeout(coordUrl, {
          headers: { 'Accept': 'application/json' }
        }, 8000);

        if (coordResponse.ok) {
          const coordData = await coordResponse.json();
          if (coordData.results && coordData.results.length > 0) {
            buildingData = coordData.results[0];
          }
        }
      } catch (e) {
        console.log('Coordinate query error:', e);
      }
    }

    // Fallback: try alternative BDNB endpoints
    if (!buildingData) {
      try {
        // Try batiment_groupe endpoint with bbox
        const bbox = `${lon - 0.001},${lat - 0.001},${lon + 0.001},${lat + 0.001}`;
        const bboxUrl = `https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe?bbox=${bbox}`;
        
        const bboxResponse = await fetchWithTimeout(bboxUrl, {
          headers: { 'Accept': 'application/json' }
        }, 8000);

        if (bboxResponse.ok) {
          const bboxData = await bboxResponse.json();
          if (bboxData.results && bboxData.results.length > 0) {
            buildingData = bboxData.results[0];
          }
        }
      } catch (e) {
        console.log('Bbox query error:', e);
      }
    }

    if (!buildingData) {
      return new Response(
        JSON.stringify({ 
          error: 'Aucun bâtiment trouvé dans la BDNB',
          building: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map the response to a clean structure
    const mappedData = mapBDNBResponse(buildingData);

    return new Response(
      JSON.stringify({ 
        building: mappedData,
        raw: buildingData,
        source: 'BDNB Open'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BDNB edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur BDNB';
    return new Response(
      JSON.stringify({ error: errorMessage, building: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapBDNBResponse(raw: any): any {
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
