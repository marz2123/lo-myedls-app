import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[analyze-energy] Starting analysis for project ${projectId}`);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, property_locations(*)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch BIM model if exists
    const { data: bimModel } = await supabase
      .from('edl_bim_models')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch frames for analysis
    const { data: frames } = await supabase
      .from('extracted_frames')
      .select('*')
      .eq('visit_session_id', project.visit_session_id || '')
      .limit(20);

    // Fetch external building analysis
    const { data: externalAnalysis } = await supabase
      .from('external_building_analysis')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Prepare data for AI analysis
    const analysisContext = {
      project: {
        type: project.property_type,
        address: project.address,
        city: project.city,
        postal_code: project.postal_code,
        surface: project.surface_m2,
        year_built: project.construction_year,
        floors: project.floors_count,
      },
      bim: bimModel ? {
        total_surface: bimModel.total_surface_m2,
        total_volume: bimModel.total_volume_m3,
        rooms: bimModel.total_rooms,
      } : null,
      externalAnalysis: externalAnalysis?.analysis_json || null,
      framesAnalyzed: frames?.length || 0,
      detectedMaterials: frames?.flatMap(f => f.detected_materials || []) || [],
      detectedElements: frames?.flatMap(f => f.detected_elements || []) || [],
    };

    // Call AI for energy analysis
    let aiAnalysis;
    if (lovableApiKey) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en diagnostic énergétique immobilier français. Analyse les données fournies et génère un profil énergétique complet avec:
              - Estimation de la classe énergie (A-G)
              - Estimation de la classe GES (A-G)
              - Estimation de la consommation en kWh/m²/an
              - Analyse de l'isolation et des ponts thermiques
              - Identification des équipements de chauffage/ventilation
              - Recommandations de travaux avec gains estimés
              - Score de conformité RE2020
              
              Réponds en JSON structuré uniquement.`
            },
            {
              role: 'user',
              content: JSON.stringify(analysisContext),
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'energy_analysis',
                description: 'Generate complete energy analysis',
                parameters: {
                  type: 'object',
                  properties: {
                    classe_energie: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
                    classe_ges: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
                    consommation_kwh_m2_an: { type: 'number' },
                    consommation_chauffage_kwh: { type: 'number' },
                    consommation_ecs_kwh: { type: 'number' },
                    consommation_electrique_kwh: { type: 'number' },
                    cout_annuel_energie: { type: 'number' },
                    emissions_co2_kg_an: { type: 'number' },
                    emissions_co2_kg_m2_an: { type: 'number' },
                    isolation_score: { type: 'number', minimum: 0, maximum: 100 },
                    etancheite_score: { type: 'number', minimum: 0, maximum: 100 },
                    chauffage_type: { type: 'string' },
                    chauffage_energie: { type: 'string' },
                    chauffage_rendement: { type: 'number' },
                    ventilation_type: { type: 'string' },
                    menuiseries_type: { type: 'string' },
                    menuiseries_qualite: { type: 'string' },
                    conformite_re2020: { type: 'boolean' },
                    score_re2020: { type: 'number' },
                    ponts_thermiques: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          location: { type: 'string' },
                          severity: { type: 'string', enum: ['faible', 'moyen', 'important'] },
                        },
                      },
                    },
                    materiaux: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          location: { type: 'string' },
                          element: { type: 'string' },
                          qualite: { type: 'string' },
                        },
                      },
                    },
                    recommendations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type_travaux: { type: 'string' },
                          categorie: { type: 'string' },
                          titre: { type: 'string' },
                          description: { type: 'string' },
                          priorite: { type: 'number' },
                          gain_kwh_m2_an: { type: 'number' },
                          gain_pourcentage: { type: 'number' },
                          cout_estimatif_min: { type: 'number' },
                          cout_estimatif_max: { type: 'number' },
                          roi_annees: { type: 'number' },
                          economie_annuelle: { type: 'number' },
                          eligible_maprimereonov: { type: 'boolean' },
                          eligible_cee: { type: 'boolean' },
                        },
                      },
                    },
                    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: ['classe_energie', 'classe_ges', 'consommation_kwh_m2_an'],
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'energy_analysis' } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          aiAnalysis = JSON.parse(toolCall.function.arguments);
        }
      }
    }

    // Use default values if AI analysis failed
    if (!aiAnalysis) {
      aiAnalysis = generateDefaultAnalysis(analysisContext);
    }

    // Create or update energy profile
    const profileData = {
      project_id: projectId,
      user_id: user.id,
      bim_model_id: bimModel?.id,
      classe_energie: aiAnalysis.classe_energie,
      classe_ges: aiAnalysis.classe_ges,
      consommation_kwh_m2_an: aiAnalysis.consommation_kwh_m2_an,
      consommation_chauffage_kwh: aiAnalysis.consommation_chauffage_kwh,
      consommation_ecs_kwh: aiAnalysis.consommation_ecs_kwh,
      consommation_electrique_kwh: aiAnalysis.consommation_electrique_kwh,
      consommation_totale_kwh: (aiAnalysis.consommation_chauffage_kwh || 0) + 
        (aiAnalysis.consommation_ecs_kwh || 0) + 
        (aiAnalysis.consommation_electrique_kwh || 0),
      cout_annuel_energie: aiAnalysis.cout_annuel_energie,
      emissions_co2_kg_an: aiAnalysis.emissions_co2_kg_an,
      emissions_co2_kg_m2_an: aiAnalysis.emissions_co2_kg_m2_an,
      isolation_score: aiAnalysis.isolation_score,
      etancheite_score: aiAnalysis.etancheite_score,
      chauffage_type: aiAnalysis.chauffage_type,
      chauffage_energie: aiAnalysis.chauffage_energie,
      chauffage_rendement: aiAnalysis.chauffage_rendement,
      ventilation_type: aiAnalysis.ventilation_type,
      menuiseries_type: aiAnalysis.menuiseries_type,
      menuiseries_qualite: aiAnalysis.menuiseries_qualite,
      conformite_re2020: aiAnalysis.conformite_re2020,
      score_re2020: aiAnalysis.score_re2020,
      ponts_thermiques_detectes: aiAnalysis.ponts_thermiques || [],
      materiaux_detectes: aiAnalysis.materiaux || [],
      surface_habitable_m2: project.surface_m2 || bimModel?.total_surface_m2,
      surface_chauffee_m2: project.surface_m2 || bimModel?.total_surface_m2,
      volume_chauffe_m3: bimModel?.total_volume_m3,
      ai_confidence_score: aiAnalysis.confidence_score || 0.7,
      photos_analyzed: frames?.length || 0,
      status: 'completed',
      analyzed_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from('edl_energy_profiles')
      .upsert(profileData, { 
        onConflict: 'project_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (profileError) {
      // Try insert if upsert fails
      const { data: insertedProfile, error: insertError } = await supabase
        .from('edl_energy_profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Create recommendations
      if (aiAnalysis.recommendations && insertedProfile) {
        for (const rec of aiAnalysis.recommendations) {
          await supabase.from('edl_energy_recommendations').insert({
            energy_profile_id: insertedProfile.id,
            project_id: projectId,
            user_id: user.id,
            ...rec,
          });
        }
      }

      console.log(`[analyze-energy] Analysis completed for project ${projectId}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        profile: insertedProfile,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create recommendations
    if (aiAnalysis.recommendations && profile) {
      // Delete existing recommendations
      await supabase
        .from('edl_energy_recommendations')
        .delete()
        .eq('energy_profile_id', profile.id);
      
      for (const rec of aiAnalysis.recommendations) {
        await supabase.from('edl_energy_recommendations').insert({
          energy_profile_id: profile.id,
          project_id: projectId,
          user_id: user.id,
          ...rec,
        });
      }
    }

    console.log(`[analyze-energy] Analysis completed for project ${projectId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      profile,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[analyze-energy] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateDefaultAnalysis(context: any) {
  const surface = context.project?.surface || context.bim?.total_surface || 80;
  const yearBuilt = context.project?.year_built || 1980;
  
  // Estimate based on construction year
  let classeEnergie = 'D';
  let consommation = 200;
  
  if (yearBuilt >= 2020) {
    classeEnergie = 'B';
    consommation = 90;
  } else if (yearBuilt >= 2012) {
    classeEnergie = 'C';
    consommation = 130;
  } else if (yearBuilt >= 2000) {
    classeEnergie = 'D';
    consommation = 200;
  } else if (yearBuilt >= 1980) {
    classeEnergie = 'E';
    consommation = 280;
  } else {
    classeEnergie = 'F';
    consommation = 380;
  }

  return {
    classe_energie: classeEnergie,
    classe_ges: classeEnergie,
    consommation_kwh_m2_an: consommation,
    consommation_chauffage_kwh: consommation * surface * 0.7,
    consommation_ecs_kwh: consommation * surface * 0.15,
    consommation_electrique_kwh: consommation * surface * 0.15,
    cout_annuel_energie: consommation * surface * 0.15,
    emissions_co2_kg_an: consommation * surface * 0.2,
    emissions_co2_kg_m2_an: consommation * 0.2,
    isolation_score: yearBuilt >= 2012 ? 75 : 45,
    etancheite_score: yearBuilt >= 2012 ? 70 : 40,
    chauffage_type: 'Radiateurs électriques',
    chauffage_energie: 'Électricité',
    chauffage_rendement: 100,
    ventilation_type: yearBuilt >= 2000 ? 'VMC simple flux' : 'Naturelle',
    menuiseries_type: yearBuilt >= 2000 ? 'Double vitrage PVC' : 'Simple vitrage bois',
    menuiseries_qualite: yearBuilt >= 2012 ? 'Bonne' : 'Moyenne',
    conformite_re2020: yearBuilt >= 2022,
    score_re2020: yearBuilt >= 2022 ? 85 : 35,
    ponts_thermiques: [
      { type: 'mur_plancher', location: 'Liaison mur/plancher bas', severity: 'moyen' },
      { type: 'fenetre', location: 'Pourtour des fenêtres', severity: 'faible' },
    ],
    materiaux: [],
    recommendations: [
      {
        type_travaux: 'Isolation des murs',
        categorie: 'isolation',
        titre: 'Isolation thermique des murs par l\'intérieur',
        description: 'Installation d\'un doublage isolant sur les murs donnant sur l\'extérieur',
        priorite: 1,
        gain_kwh_m2_an: 40,
        gain_pourcentage: 20,
        cout_estimatif_min: 50 * surface,
        cout_estimatif_max: 80 * surface,
        roi_annees: 8,
        economie_annuelle: 400,
        eligible_maprimereonov: true,
        eligible_cee: true,
      },
      {
        type_travaux: 'Remplacement fenêtres',
        categorie: 'menuiseries',
        titre: 'Remplacement des fenêtres par du double vitrage performant',
        description: 'Installation de fenêtres double vitrage à isolation renforcée',
        priorite: 2,
        gain_kwh_m2_an: 25,
        gain_pourcentage: 12,
        cout_estimatif_min: 400 * 6,
        cout_estimatif_max: 800 * 6,
        roi_annees: 10,
        economie_annuelle: 250,
        eligible_maprimereonov: true,
        eligible_cee: true,
      },
    ],
    confidence_score: 0.5,
  };
}
