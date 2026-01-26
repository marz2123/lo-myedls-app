import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zone types matching the database enum
const ZONE_TYPES = ['murs', 'sol', 'plafond', 'menuiseries', 'electricite', 'plomberie', 'equipements', 'ventilation', 'chauffage', 'facade', 'toiture', 'autre'];

// Condition states
const CONDITION_STATES = ['neuf', 'bon', 'a_refaire'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      sequenceId,
      projectId,
      partId,
      locationId,
      transcription,
      photoUrls,
      videoUrl
    } = await req.json();

    if (!sequenceId || !projectId) {
      throw new Error('sequenceId and projectId are required');
    }

    console.log(`Analyzing sequence ${sequenceId} for project ${projectId}`);

    // Update sequence status
    await supabase
      .from('visit_sequences')
      .update({ status: 'processing' })
      .eq('id', sequenceId);

    // Get project context
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Get location context if provided
    let locationContext = '';
    if (locationId) {
      const { data: location } = await supabase
        .from('property_locations')
        .select('*, property_parts(*)')
        .eq('id', locationId)
        .single();
      
      if (location) {
        locationContext = `
Lieu: ${location.name}
Type de lieu: ${location.location_type || 'Non spécifié'}
Étage: ${location.floor_level || 'Non spécifié'}
Partie: ${location.property_parts?.name || 'Non spécifié'} (${location.property_parts?.part_type || ''})
`;
      }
    }

    // Get DTC taxonomy complète (FT/CT/SC/T) pour classification
    console.log('[analyze-visit-sequence] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code');

    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('ct_code, ft_code, ct_label')
      .order('ct_code');

    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('sc_code, ct_code, ft_code, sc_label, zone_type')
      .order('sc_code');

    console.log(`[analyze-visit-sequence] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC`);

    // Build taxonomy context avec DTC
    const taxonomyContext = ftFamilles?.map(ft => {
      const cats = ctCategories?.filter(c => c.ft_code === ft.ft_code) || [];
      return `${ft.ft_code} - ${ft.ft_label}: ${cats.map(c => `${c.ct_code} ${c.ct_label}`).join(', ')}`;
    }).join('\n') || '';

    // Build the analysis prompt
const analysisPrompt = `Tu es un expert en diagnostic immobilier pour MyEDLS. Analyse cette séquence de visite selon la structure métier:
Bien → Partie → Lieu → Zone → Problème → Tâche (FT/CT/ST)

CONTEXTE DU BIEN:
Type: ${project?.property_type || 'Non spécifié'}
Adresse: ${project?.address || 'Non spécifié'}
${locationContext}

TRANSCRIPTION AUDIO DE LA VISITE:
"${transcription || 'Aucune transcription disponible'}"

PHOTOS ASSOCIÉES: ${photoUrls?.length || 0} photo(s)

EXEMPLE CONCRET À SUIVRE:
Pour une transcription "On est dans le séjour de l'appart 201. Mur côté fenêtre fissuré sur 2 mètres. Sol irrégulier, il faudra tout reprendre."
Tu dois détecter:
- Zones: murs (côté fenêtre), sol
- Problèmes: Fissures mur côté fenêtre, Sol irrégulier
- Mapping FT/CT/ST depuis le catalogue:
  * Cloisons > Réparations > Fissures mur plein
  * Sols > Préparation sols > Ragréage auto-lissant

TAXONOMIE DTC DISPONIBLE (FT/CT/SC):
${taxonomyContext.slice(0, 3000)}

INSTRUCTIONS DÉTAILLÉES:
1. Détecte les ZONES observées parmi: murs, sol, plafond, menuiseries, electricite, plomberie, equipements, ventilation, chauffage, facade, toiture, autre
2. Pour chaque zone, évalue son ÉTAT: "neuf" (parfait), "bon" (correct), "a_refaire" (travaux nécessaires)
3. Identifie chaque PROBLÈME avec:
   - Titre précis (ex: "Fissure mur côté fenêtre")
   - Zone concernée
   - Sévérité: low, medium, high, critical
   - Urgence: immediate, haute, normale, basse
   - Dimensions estimées si mentionnées
4. Pour chaque problème, génère une TÂCHE avec classification FT/CT/ST:
   - Famille (FT), Catégorie (CT), Sous-catégorie (ST) depuis le catalogue
   - Quantité estimée si mentionnée (ex: "6 m²", "2 m linéaires")
   - Type de travaux: reparation, remplacement, renovation, entretien
   - Priorité: low, medium, high, urgent
   - Difficulté: facile, moyenne, difficile, expert

Réponds UNIQUEMENT avec un JSON valide:
{
  "detected_zones": ["murs", "sol"],
  "condition": "a_refaire",
  "zones_details": [
    {"zone_type": "murs", "position": "côté fenêtre", "condition": "a_refaire"},
    {"zone_type": "sol", "position": "global", "condition": "a_refaire"}
  ],
  "problems": [
    {
      "title": "Fissures mur côté fenêtre",
      "description": "Fissures sur 2 mètres linéaires sur le mur côté fenêtre",
      "severity": "high",
      "urgence": "haute",
      "zone_type": "murs",
      "dimensions": {"longueur_m": 2},
      "task": {
        "title": "Réparation fissures + ponçage + impression",
        "description": "Rebouchage des fissures, ponçage et mise en peinture",
        "family_code": "01",
        "family_name": "Cloisons",
        "category_code": "01.01",
        "category_name": "Réparations",
        "subcategory_code": "01.01.01",
        "subcategory_name": "Fissures mur plein",
        "quantity": 6,
        "unit": "m²",
        "priority": "high",
        "work_type": "reparation",
        "difficulte": "moyenne",
        "corps_metier": "Peintre"
      }
    },
    {
      "title": "Sol irrégulier / différences de niveau",
      "description": "Sol nécessitant une reprise complète par ragréage",
      "severity": "medium",
      "urgence": "normale",
      "zone_type": "sol",
      "dimensions": {"surface_m2": 20},
      "task": {
        "title": "Ragréage auto-lissant complet du séjour",
        "description": "Ragréage auto-lissant sur toute la surface du séjour",
        "family_code": "02",
        "family_name": "Sols",
        "category_code": "02.01",
        "category_name": "Préparation sols",
        "subcategory_code": "02.01.01",
        "subcategory_name": "Ragréage auto-lissant",
        "quantity": 20,
        "unit": "m²",
        "priority": "medium",
        "work_type": "renovation",
        "difficulte": "moyenne",
        "corps_metier": "Solier"
      }
    }
  ],
  "summary": "Séjour appart 201 nécessitant travaux sur mur (fissures 2m) et sol (ragréage complet 20m²)"
}`;

    let analysisResult;

    if (lovableApiKey) {
      console.log('Calling Lovable AI for sequence analysis...');
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en diagnostic immobilier. Réponds uniquement en JSON valide.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('JSON parse error:', e);
          analysisResult = getDefaultAnalysis();
        }
      } else {
        analysisResult = getDefaultAnalysis();
      }
    } else {
      console.log('No AI key available, using default analysis');
      analysisResult = getDefaultAnalysis();
    }

    // Validate and normalize the analysis result
    const validatedZones = (analysisResult.detected_zones || [])
      .filter((z: string) => ZONE_TYPES.includes(z));
    
    const validatedCondition = CONDITION_STATES.includes(analysisResult.condition) 
      ? analysisResult.condition 
      : 'bon';

    // Update sequence with analysis results
    await supabase
      .from('visit_sequences')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        ai_analysis: analysisResult,
        detected_condition: validatedCondition,
        detected_zones: validatedZones
      })
      .eq('id', sequenceId);

    // Create identified problems and tasks
    const createdProblems = [];
    const createdTasks = [];

    for (const problem of analysisResult.problems || []) {
      // Find matching DSC classification
      let familyId = null;
      let categoryId = null;
      let subcategoryId = null;

      if (problem.task?.family_code) {
        const family = families?.find(f => f.code === problem.task.family_code);
        if (family) {
          familyId = family.id;
          if (problem.task?.category_code) {
            const category = categories?.find(c => c.code === problem.task.category_code && c.family_id === family.id);
            if (category) {
              categoryId = category.id;
              if (problem.task?.subcategory_code) {
                const subcategory = subcategories?.find(s => s.code === problem.task.subcategory_code && s.category_id === category.id);
                if (subcategory) {
                  subcategoryId = subcategory.id;
                }
              }
            }
          }
        }
      }

      // Create the problem
      const { data: createdProblem, error: problemError } = await supabase
        .from('identified_problems')
        .insert({
          project_id: projectId,
          sequence_id: sequenceId,
          location_id: locationId,
          title: problem.title,
          description: problem.description,
          severity: problem.severity || 'medium',
          zone_type: ZONE_TYPES.includes(problem.zone_type) ? problem.zone_type : null,
          photo_urls: photoUrls || [],
          ai_detected: true,
          detection_confidence: 0.8,
          is_confirmed: false
        })
        .select()
        .single();

      if (problemError) {
        console.error('Error creating problem:', problemError);
        continue;
      }

      createdProblems.push(createdProblem);

      // Create the associated task
      if (problem.task && createdProblem) {
        const { data: createdTask, error: taskError } = await supabase
          .from('problem_tasks')
          .insert({
            problem_id: createdProblem.id,
            project_id: projectId,
            part_id: partId,
            location_id: locationId,
            title: problem.task.title,
            description: problem.task.description,
            family_id: familyId,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            priority: problem.task.priority || 'medium',
            work_type: problem.task.work_type,
            condition: validatedCondition,
            photo_urls: photoUrls || [],
            status: 'pending'
          })
          .select()
          .single();

        if (taskError) {
          console.error('Error creating task:', taskError);
        } else {
          createdTasks.push(createdTask);
        }
      }
    }

    console.log(`Sequence ${sequenceId} analyzed: ${createdProblems.length} problems, ${createdTasks.length} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        sequence_id: sequenceId,
        analysis: {
          detected_zones: validatedZones,
          condition: validatedCondition,
          summary: analysisResult.summary || ''
        },
        problems_count: createdProblems.length,
        tasks_count: createdTasks.length,
        problems: createdProblems,
        tasks: createdTasks
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-visit-sequence:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getDefaultAnalysis() {
  return {
    detected_zones: ['murs', 'sol', 'plafond'],
    condition: 'bon',
    problems: [],
    summary: 'Analyse par défaut - aucun problème détecté automatiquement'
  };
}
