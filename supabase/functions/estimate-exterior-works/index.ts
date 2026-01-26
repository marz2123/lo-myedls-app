import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkEstimation {
  name: string;
  quantity: string;
  unit: string;
  costMin: number;
  costMax: number;
  priority: 'low' | 'medium' | 'high';
  reason?: string;
  dependencies?: string[];
}

interface EstimationResult {
  works: WorkEstimation[];
  globalBudgetMin: number;
  globalBudgetMax: number;
  complexityLevel: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `Tu es économiste de la construction spécialisé en travaux extérieurs (façades, toitures, ITE, reprises structurelles, menuiseries, étanchéité).

Tu travailles pour une application professionnelle appelée MyEDLS, utilisée par des économistes de la construction, des chefs de chantier et des maîtres d'ouvrage.

Ton rôle : analyser les données techniques d'un bâtiment et produire une estimation des travaux extérieurs probables, avec quantités et fourchettes de coûts réalistes basées sur les ratios français actuels (2024).

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte d'introduction ni explication.`;

const USER_PROMPT = `Voici les données techniques du bâtiment (JSON). Estime les travaux probables, leurs quantités et fourchettes de coûts.

DONNÉES DU BÂTIMENT:
[BUILDING_DATA_JSON]

Produis un JSON strictement au format suivant:

{
  "works": [
    {
      "name": "Ravalement façade",
      "quantity": "xxx m²",
      "unit": "m²",
      "costMin": number,
      "costMax": number,
      "priority": "low | medium | high",
      "reason": "pathologie | vétusté | performance énergétique | réglementaire",
      "dependencies": ["échafaudage obligatoire", "autorisation ABF", ...]
    }
  ],
  "globalBudgetMin": number,
  "globalBudgetMax": number,
  "complexityLevel": "low | medium | high"
}

Règles métier:

1. TYPES DE TRAVAUX À CONSIDÉRER:
   - Ravalement façade (nettoyage, peinture, enduit, réparations)
   - Réfection toiture (couverture, étanchéité, zinguerie)
   - ITE (isolation thermique par l'extérieur) si pertinent
   - Menuiseries extérieures (remplacement fenêtres/portes)
   - Reprises structurelles (fissures, stabilisation)
   - Balcons/gardes-corps (réparation, mise aux normes)
   - Échafaudage (si nécessaire pour les travaux)

2. ESTIMATION DES SURFACES:
   - Façade: (périmètre estimé × hauteur estimée) - ouvertures
   - Toiture: surface cadastrale × coefficient pente (1.1 à 1.4)
   - Si données manquantes, utilise des hypothèses raisonnables

3. RATIOS DE COÛTS 2024 (€ HT):
   - Ravalement simple: 40-80€/m²
   - Ravalement avec réparations: 80-150€/m²
   - ITE: 120-200€/m²
   - Toiture tuile: 80-150€/m²
   - Toiture zinc: 150-250€/m²
   - Menuiseries PVC: 400-700€/unité
   - Menuiseries alu: 700-1200€/unité
   - Échafaudage: 15-25€/m²/mois

4. PRIORITÉS:
   - "high": urgence sécurité ou dégradation rapide
   - "medium": travaux recommandés à moyen terme
   - "low": amélioration ou esthétique

5. COMPLEXITÉ GLOBALE:
   - "low": travaux courants, pas de contrainte
   - "medium": quelques contraintes (ABF, accès, coordination)
   - "high": contraintes fortes (site classé, structure, coordination multi-lots)

6. N'invente pas de données précises si absentes. Indique "estimation" dans quantity si approximatif.

Renvoie UNIQUEMENT le JSON final, rien d'autre.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { externalAnalysisId, snapshotId, projectId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch external building analysis
    let externalAnalysis: any = null;
    if (externalAnalysisId) {
      const { data, error } = await supabase
        .from('external_building_analysis')
        .select('*')
        .eq('id', externalAnalysisId)
        .single();

      if (error) {
        console.error('Error fetching external analysis:', error);
      } else {
        externalAnalysis = data;
      }
    }

    // Fetch property enrichment snapshot
    let snapshot: any = null;
    if (snapshotId) {
      const { data, error } = await supabase
        .from('property_enrichment_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error) {
        console.error('Error fetching snapshot:', error);
      } else {
        snapshot = data;
      }
    }

    // Build context for AI
    const buildingData: any = {
      address: snapshot?.address_normalized || 'Adresse inconnue',
      cadastre: {
        surface: snapshot?.cadastre_surface_m2,
        section: snapshot?.cadastre_section,
      },
      analysis: externalAnalysis?.analysis_json || {},
      urbanism: snapshot?.urbanism_json || {},
      climate: snapshot?.climate_json || {},
      risks: snapshot?.risks_json || {},
    };

    // Add building analysis details
    if (externalAnalysis?.analysis_json) {
      const analysis = externalAnalysis.analysis_json;
      buildingData.buildingType = analysis.buildingType;
      buildingData.floorsEstimated = analysis.floorsEstimated;
      buildingData.facadeMaterial = analysis.facadeMaterial;
      buildingData.facadeState = analysis.facadeState;
      buildingData.facadePathologies = analysis.facadePathologies;
      buildingData.roofMaterial = analysis.roofMaterial;
      buildingData.roofState = analysis.roofState;
      buildingData.balconies = analysis.balconies;
      buildingData.windowsType = analysis.windowsType;
      buildingData.externalThermalWeaknesses = analysis.externalThermalWeaknesses;
      buildingData.potentialStructuralAlerts = analysis.potentialStructuralAlerts;
      buildingData.globalExteriorCondition = analysis.globalExteriorCondition;
    }

    console.log('Building data for estimation:', JSON.stringify(buildingData, null, 2));

    // Call AI for estimation
    const userPrompt = USER_PROMPT.replace('[BUILDING_DATA_JSON]', JSON.stringify(buildingData, null, 2));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes dépassée, réessayez plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let estimation: EstimationResult;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonStr = jsonMatch[1] || content;
      estimation = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content);

      // Default estimation if parsing fails
      estimation = {
        works: [
          {
            name: 'Estimation non disponible',
            quantity: 'N/A',
            unit: '-',
            costMin: 0,
            costMax: 0,
            priority: 'medium',
            reason: 'Analyse requise sur site',
          },
        ],
        globalBudgetMin: 0,
        globalBudgetMax: 0,
        complexityLevel: 'medium',
      };
    }

    // Save to database
    const effectiveProjectId = projectId || externalAnalysis?.project_id || snapshot?.project_id;

    const { data: savedEstimation, error: insertError } = await supabase
      .from('exterior_work_estimations')
      .upsert({
        project_id: effectiveProjectId,
        snapshot_id: snapshotId,
        external_analysis_id: externalAnalysisId,
        estimation_json: estimation,
        global_budget_min: estimation.globalBudgetMin,
        global_budget_max: estimation.globalBudgetMax,
        complexity_level: estimation.complexityLevel,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'external_analysis_id',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving estimation:', insertError);
    } else {
      console.log('Estimation saved to database');
    }

    return new Response(
      JSON.stringify({
        estimation,
        savedId: savedEstimation?.id,
        buildingContext: {
          address: buildingData.address,
          surface: buildingData.cadastre?.surface,
          floorsEstimated: buildingData.floorsEstimated,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Estimation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
