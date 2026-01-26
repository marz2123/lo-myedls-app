import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildingAnalysis {
  buildingType: string;
  estimatedFloors: number;
  constructionEra: string;
  facadeMaterial: string;
  facadeCondition: string;
  pathologies: string[];
  estimatedDPE: string;
  hasElevator: string;
  roofType: string;
  roofCondition: string;
  estimatedFacadeArea: number;
  confidenceScore: number;
  recommendations: string[];
  arretePéril?: string;
  permisConstructionHistorique?: string;
  travauxRecentsProbables?: string;
  zonePLU?: string;
  // Lots et destination - données officielles ou estimations
  lotsAppartements?: number | string;
  lotsGarages?: number | string;
  lotsAnnexes?: number | string;
  lotsCommerces?: number | string;
  totalLots?: number | string;
  destinationBien?: string;
  // Source des données de lots
  lotsDataSource?: 'bdnb' | 'rnc' | 'estimation';
  bdnbId?: string;
}

interface BDNBData {
  batiment_groupe_id?: string;
  nb_log?: number;
  nb_log_lc?: number;
  nb_log_mi?: number;
  nb_lot_garpark?: number;
  nb_lot_tertiaire?: number;
  usage_niveau_1_txt?: string;
  annee_construction?: number;
  mat_mur?: string;
  nb_etage?: number;
  classe_dpe_conso_energie?: string;
  rnc?: {
    nb_lots_tot?: number;
    nb_lots_hab?: number;
    nb_lots_bureaux?: number;
    nb_lots_commerces?: number;
    nb_ascenseurs?: number;
    numero_immat_principal?: string;
  };
}

// Fetch official data from BDNB API (free Open tier)
async function fetchBDNBData(lat: number, lon: number): Promise<BDNBData | null> {
  try {
    console.log(`Fetching BDNB data for ${lat}, ${lon}`);
    
    // Try to find building by coordinates using BDNB Open API
    const geocodeUrl = `https://api-open.bdnb.io/v1/bdnb/geocodage?lat=${lat}&lon=${lon}&radius=30`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!geocodeResponse.ok) {
      console.log('BDNB geocode failed:', geocodeResponse.status);
      return null;
    }

    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      console.log('No BDNB results found');
      return null;
    }

    const batimentGroupeId = geocodeData.results[0].batiment_groupe_id;
    console.log('Found batiment_groupe_id:', batimentGroupeId);

    // Fetch complete building data
    const buildingUrl = `https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet?batiment_groupe_id=${batimentGroupeId}`;
    const buildingResponse = await fetch(buildingUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!buildingResponse.ok) {
      console.log('BDNB building fetch failed:', buildingResponse.status);
      return null;
    }

    const buildingData = await buildingResponse.json();
    
    if (!buildingData.results || buildingData.results.length === 0) {
      console.log('No BDNB building data found');
      return null;
    }

    const building = buildingData.results[0];
    console.log('BDNB building data:', JSON.stringify(building).substring(0, 500));
    
    return {
      batiment_groupe_id: building.batiment_groupe_id,
      nb_log: building.ffo_bat?.nb_log ?? building.nb_log,
      nb_log_lc: building.ffo_bat?.nb_log_lc,
      nb_log_mi: building.ffo_bat?.nb_log_mi,
      nb_lot_garpark: building.ffo_bat?.nb_lot_garpark_individuel ?? building.ffo_bat?.nb_lot_garpark,
      nb_lot_tertiaire: building.ffo_bat?.nb_loc_tertiaire,
      usage_niveau_1_txt: building.synthese_propriete_usage?.usage_niveau_1_txt,
      annee_construction: building.ffo_bat?.annee_construction,
      mat_mur: building.ffo_bat?.mat_mur,
      nb_etage: building.bdtopo_bat?.nb_etages,
      classe_dpe_conso_energie: building.dpe_representatif_logement?.classe_conso_energie,
      rnc: building.rnc ? {
        nb_lots_tot: building.rnc.nb_lots_tot,
        nb_lots_hab: building.rnc.nb_lots_hab,
        nb_lots_bureaux: building.rnc.nb_lots_bureaux,
        nb_lots_commerces: building.rnc.nb_lots_commerces,
        nb_ascenseurs: building.rnc.nb_ascenseurs,
        numero_immat_principal: building.rnc.numero_immat_principal,
      } : undefined,
    };
  } catch (error) {
    console.error('BDNB fetch error:', error);
    return null;
  }
}

const SYSTEM_PROMPT = `Tu es un expert immobilier français. Tu DOIS analyser les bâtiments et fournir des estimations réalistes.

RÈGLES ABSOLUES:
1. Retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après
2. Utilise EXACTEMENT ces noms de champs (pas de variations)
3. JAMAIS "Inconnu" - fais des estimations basées sur le contexte français
4. Les nombres doivent être des nombres (pas de strings)`;

function getEstimationPrompt(address: string, lat?: number, lon?: number, bdnbData?: BDNBData | null): string {
  let bdnbContext = '';
  if (bdnbData) {
    bdnbContext = `
DONNÉES OFFICIELLES BDNB DISPONIBLES (utilise-les en priorité):
- Nombre de logements: ${bdnbData.nb_log ?? 'non renseigné'}
- Logements collectifs: ${bdnbData.nb_log_lc ?? 'non renseigné'}
- Maisons individuelles: ${bdnbData.nb_log_mi ?? 'non renseigné'}
- Lots garages/parkings: ${bdnbData.nb_lot_garpark ?? 'non renseigné'}
- Lots tertiaires: ${bdnbData.nb_lot_tertiaire ?? 'non renseigné'}
- Usage principal: ${bdnbData.usage_niveau_1_txt ?? 'non renseigné'}
- Année construction: ${bdnbData.annee_construction ?? 'non renseignée'}
- Matériau mur: ${bdnbData.mat_mur ?? 'non renseigné'}
- Étages: ${bdnbData.nb_etage ?? 'non renseigné'}
- DPE: ${bdnbData.classe_dpe_conso_energie ?? 'non renseigné'}
${bdnbData.rnc ? `
DONNÉES RNC (Registre Copropriétés):
- Total lots: ${bdnbData.rnc.nb_lots_tot ?? 'non renseigné'}
- Lots habitation: ${bdnbData.rnc.nb_lots_hab ?? 'non renseigné'}
- Lots bureaux: ${bdnbData.rnc.nb_lots_bureaux ?? 'non renseigné'}
- Lots commerces: ${bdnbData.rnc.nb_lots_commerces ?? 'non renseigné'}
- Ascenseurs: ${bdnbData.rnc.nb_ascenseurs ?? 'non renseigné'}
` : ''}
`;
  }

  return `Analyse ce bâtiment français et retourne un JSON:
${bdnbContext}
{
  "buildingType": "type ex: Immeuble collectif années 60",
  "estimatedFloors": 4,
  "constructionEra": "1960-1980",
  "facadeMaterial": "Enduit ciment",
  "facadeCondition": "Moyen - traces d'usure",
  "pathologies": ["Fissures légères", "Joints vieillissants"],
  "estimatedDPE": "D",
  "hasElevator": "Probable",
  "roofType": "Terrasse étanchéité",
  "roofCondition": "À vérifier",
  "estimatedFacadeArea": 350,
  "confidenceScore": 0.5,
  "recommendations": ["Ravalement recommandé", "Audit énergétique conseillé"],
  "arretePéril": "Aucun arrêté de péril détecté",
  "permisConstructionHistorique": "Pas d'information sur PC/DP récents",
  "travauxRecentsProbables": "Ravalement probable dans les 10 dernières années",
  "zonePLU": "Zone UA - Centre urbain",
  "lotsAppartements": ${bdnbData?.nb_log ?? bdnbData?.rnc?.nb_lots_hab ?? '"À vérifier"'},
  "lotsGarages": ${bdnbData?.nb_lot_garpark ?? '"À vérifier"'},
  "lotsAnnexes": "À vérifier",
  "lotsCommerces": ${bdnbData?.rnc?.nb_lots_commerces ?? bdnbData?.nb_lot_tertiaire ?? '"À vérifier"'},
  "totalLots": ${bdnbData?.rnc?.nb_lots_tot ?? '"À vérifier"'},
  "destinationBien": "${bdnbData?.usage_niveau_1_txt || 'Habitation collective (probable)'}"
}

Adresse: ${address}
${lat && lon ? `Coordonnées: ${lat}, ${lon}` : ''}

IMPORTANT:
${bdnbData ? '- Les données BDNB sont OFFICIELLES, utilise-les comme base fiable' : '- Aucune donnée BDNB disponible, fais des estimations prudentes'}
- Pour les données non disponibles dans BDNB, mets "À vérifier"
- Le confidenceScore doit être ${bdnbData ? '0.85 à 0.95' : '0.4 à 0.6'} selon la qualité des données`;
}

function normalizeAnalysis(raw: any, bdnbData?: BDNBData | null): BuildingAnalysis {
  console.log('Raw AI response to normalize:', JSON.stringify(raw));
  
  // Use BDNB data when available
  const useOfficialLots = bdnbData && (bdnbData.nb_log || bdnbData.rnc?.nb_lots_tot);
  
  const normalized: BuildingAnalysis = {
    buildingType: String(raw.buildingType || raw.building_type || raw.type || 'Immeuble collectif'),
    estimatedFloors: bdnbData?.nb_etage || parseInt(raw.estimatedFloors || raw.floorsEstimated || raw.floors || raw.etages || '4', 10) || 4,
    constructionEra: bdnbData?.annee_construction ? String(bdnbData.annee_construction) : String(raw.constructionEra || raw.construction_era || raw.era || raw.epoque || '1960-1980'),
    facadeMaterial: bdnbData?.mat_mur || String(raw.facadeMaterial || raw.facade_material || raw.material || raw.materiau || 'Enduit'),
    facadeCondition: String(raw.facadeCondition || raw.facadeState || raw.facade_condition || raw.condition || raw.etat_facade || 'Moyen'),
    pathologies: Array.isArray(raw.pathologies) ? raw.pathologies : 
                 Array.isArray(raw.facadePathologies) ? raw.facadePathologies : 
                 ['À évaluer sur site'],
    estimatedDPE: bdnbData?.classe_dpe_conso_energie || String(raw.estimatedDPE || raw.dpe || raw.DPE || 'D'),
    hasElevator: bdnbData?.rnc?.nb_ascenseurs !== undefined 
      ? (bdnbData.rnc.nb_ascenseurs > 0 ? 'Oui' : 'Non')
      : String(raw.hasElevator || raw.elevator || raw.ascenseur || 'Probable'),
    roofType: String(raw.roofType || raw.roof_type || raw.toiture || 'Terrasse'),
    roofCondition: String(raw.roofCondition || raw.roofState || raw.roof_condition || raw.etat_toiture || 'À vérifier'),
    estimatedFacadeArea: parseInt(raw.estimatedFacadeArea || raw.facade_area || raw.surface_facade || '300', 10) || 300,
    confidenceScore: useOfficialLots ? 0.9 : (parseFloat(raw.confidenceScore || raw.confidence || '0.5') || 0.5),
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : 
                     Array.isArray(raw.recommandations) ? raw.recommandations : 
                     ['Visite recommandée pour évaluation précise'],
    arretePéril: String(raw.arretePéril || raw.arrete_peril || raw.arretePéril || 'Non renseigné'),
    permisConstructionHistorique: String(raw.permisConstructionHistorique || raw.permis_construction || raw.historique_pc || 'Non renseigné'),
    travauxRecentsProbables: String(raw.travauxRecentsProbables || raw.travaux_recents || 'Non renseigné'),
    zonePLU: String(raw.zonePLU || raw.zone_plu || raw.plu || 'Non renseigné'),
    
    // Priorité aux données officielles BDNB/RNC
    lotsAppartements: bdnbData?.rnc?.nb_lots_hab ?? bdnbData?.nb_log ?? raw.lotsAppartements ?? 'À vérifier',
    lotsGarages: bdnbData?.nb_lot_garpark ?? raw.lotsGarages ?? 'À vérifier',
    lotsAnnexes: raw.lotsAnnexes ?? 'À vérifier',
    lotsCommerces: bdnbData?.rnc?.nb_lots_commerces ?? bdnbData?.nb_lot_tertiaire ?? raw.lotsCommerces ?? 'À vérifier',
    totalLots: bdnbData?.rnc?.nb_lots_tot ?? raw.totalLots ?? 'À vérifier',
    destinationBien: bdnbData?.usage_niveau_1_txt || String(raw.destinationBien || raw.destination_bien || raw.destination || 'À vérifier'),
    
    // Indiquer la source des données
    lotsDataSource: useOfficialLots ? (bdnbData?.rnc ? 'rnc' : 'bdnb') : 'estimation',
    bdnbId: bdnbData?.batiment_groupe_id,
  };
  
  console.log('Normalized analysis:', JSON.stringify(normalized));
  return normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { projectId, snapshotId, imageUrl, lat, lon, address } = body;
    
    console.log('Request received:', { projectId, snapshotId, hasImageUrl: !!imageUrl, lat, lon, address });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const fullAddress = address || 'France';
    
    // STEP 1: Fetch official BDNB data first
    let bdnbData: BDNBData | null = null;
    if (lat && lon) {
      console.log('Fetching BDNB official data...');
      bdnbData = await fetchBDNBData(lat, lon);
      if (bdnbData) {
        console.log('BDNB data retrieved successfully:', bdnbData.batiment_groupe_id);
      } else {
        console.log('No BDNB data available, will use AI estimation');
      }
    }
    
    // STEP 2: Build messages for AI (with BDNB context if available)
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Check if we have an image
    if (imageUrl && imageUrl.startsWith('http')) {
      console.log('Analyzing with image:', imageUrl);
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: getEstimationPrompt(fullAddress, lat, lon, bdnbData) },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      console.log('Analyzing without image, using location context');
      messages.push({
        role: 'user',
        content: getEstimationPrompt(fullAddress, lat, lon, bdnbData)
      });
    }

    console.log('Calling AI gateway...');
    
    // Call AI gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 2000,
      }),
    });

    console.log('AI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes dépassée' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI raw content:', content.substring(0, 500));

    // Parse JSON from response
    let analysis: BuildingAnalysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let jsonStr = content.trim();
      
      // Remove markdown code blocks
      if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      
      // Remove any leading/trailing whitespace and newlines
      jsonStr = jsonStr.trim();
      
      console.log('Cleaned JSON string:', jsonStr.substring(0, 300));
      
      const rawAnalysis = JSON.parse(jsonStr);
      analysis = normalizeAnalysis(rawAnalysis, bdnbData);
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Failed to parse content:', content);
      
      // Provide realistic defaults based on French building stock
      analysis = {
        buildingType: 'Immeuble collectif',
        estimatedFloors: 4,
        constructionEra: '1960-1980',
        facadeMaterial: 'Enduit ciment',
        facadeCondition: 'Moyen - usure normale',
        pathologies: ['Fissures légères possibles', 'Joints à vérifier'],
        estimatedDPE: 'D',
        hasElevator: 'Possible si > 3 étages',
        roofType: 'Terrasse ou tuiles',
        roofCondition: 'À évaluer sur site',
        estimatedFacadeArea: 350,
        confidenceScore: 0.3,
        recommendations: ['Visite terrain recommandée', 'Audit énergétique conseillé'],
      };
    }

    console.log('Final analysis to return:', JSON.stringify(analysis));

    // Save to database if context available
    if ((projectId || snapshotId) && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        await supabase
          .from('external_building_analysis')
          .upsert({
            project_id: projectId,
            snapshot_id: snapshotId,
            analysis_json: analysis,
            images_analyzed: imageUrl ? [imageUrl] : [],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'snapshot_id' });
          
        console.log('Analysis saved to DB');
      } catch (dbError) {
        console.error('DB save error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({ 
        analysis, 
        imagesAnalyzed: imageUrl ? [imageUrl] : [],
        hasImages: !!imageUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
