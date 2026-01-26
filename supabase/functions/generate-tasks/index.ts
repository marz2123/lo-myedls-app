// @ts-nocheck
// Contexte Deno (Edge Functions) : désactive les erreurs TS côté IDE.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedTask {
  ft: string;
  ftName: string;
  ct: string;
  ctName: string;
  st: string;
  stName: string;
  descriptionTechnique: string;
  quantite: number | null;
  unite: string;
  gravite: "low" | "medium" | "high";
  urgence: "low" | "medium" | "high";
  suggestionOuvrier: string;
  isApproximate: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { problemId, projectId } = await req.json();
    console.log("[generate-tasks] Starting for problem:", problemId, "project:", projectId);

    if (!problemId || !projectId) {
      throw new Error("problemId and projectId are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= STEP 1: RETRIEVE CONTEXT =============
    console.log("[generate-tasks] Step 1: Retrieving context...");

    // Get problem details
    const { data: problem, error: problemError } = await supabase
      .from("identified_problems")
      .select("*")
      .eq("id", problemId)
      .single();

    if (problemError || !problem) {
      throw new Error(`Problem not found: ${problemError?.message}`);
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    // Get location (Lieu)
    let location: any = null;
    if (problem.location_id) {
      const { data } = await supabase
        .from("property_locations")
        .select("*, pieces_json")
        .eq("id", problem.location_id)
        .single();
      location = data;
    }

    // Get part (Partie)
    let part: any = null;
    if (location?.part_id) {
      const { data } = await supabase
        .from("property_parts")
        .select("*")
        .eq("id", location.part_id)
        .single();
      part = data;
    }

    // Get zone
    let zone: any = null;
    if (problem.zone_id) {
      const { data } = await supabase
        .from("location_zones")
        .select("*")
        .eq("id", problem.zone_id)
        .single();
      zone = data;
    }

    // Get property composition for additional context
    const { data: composition } = await supabase
      .from("property_composition")
      .select("*")
      .eq("project_id", projectId)
      .single();

    // Get DTC (Descriptif Technique Commun) - FT/CT/SC/T
    console.log("[generate-tasks] Loading DTC structure...");
    
    const { data: ftFamilles } = await supabase
      .from("ft_familles")
      .select("id, ft_code, ft_label, commentaire_type_equipe");

    const { data: ctCategories } = await supabase
      .from("ct_categories")
      .select("id, ct_code, ft_code, ct_label");

    const { data: scSousCategories } = await supabase
      .from("sc_sous_categories")
      .select("id, sc_code, ct_code, ft_code, sc_label, zone_type, keywords_ia");

    const { data: tTaches } = await supabase
      .from("t_taches")
      .select("t_code, sc_code, ct_code, ft_code, t_label, description_detaillee, unite, rendement_h_par_unite")
      .limit(5000);

    // Build DTC reference string for AI (adaptation de buildDSCReference)
    const dscReference = buildDTCReference(ftFamilles || [], ctCategories || [], scSousCategories || [], tTaches || []);
    console.log("[generate-tasks] DTC loaded:", ftFamilles?.length, "FT,", ctCategories?.length, "CT,", scSousCategories?.length, "SC,", tTaches?.length, "T (échantillon)");

    // ============= STEP 2: BUILD CONTEXT =============
    console.log("[generate-tasks] Step 2: Building context...");

    const context = {
      partie: part ? {
        type: part.part_type,
        name: part.name
      } : null,
      lieu: location ? {
        name: location.name,
        type: location.location_type
      } : null,
      endroit: null as any,
      zone: zone ? {
        type: zone.zone_type,
        condition: zone.condition,
        notes: zone.notes
      } : null,
      problem: {
        title: problem.title,
        description: problem.description,
        severity: problem.severity,
        urgence: problem.urgence,
        photoUrls: problem.photo_urls || []
      },
      building: {
        type: project.property_type,
        address: project.address,
        year: composition?.building_year,
        constructionDate: composition?.date_construction
      }
    };

    // Parse pieces_json to find endroit
    if (location?.pieces_json) {
      let pieces = [];
      if (typeof location.pieces_json === 'string') {
        try { pieces = JSON.parse(location.pieces_json); } catch {}
      } else if (Array.isArray(location.pieces_json)) {
        pieces = location.pieces_json;
      }
      if (pieces.length > 0) {
        context.endroit = pieces[0]; // Use first piece as endroit context
      }
    }

    // ============= STEP 3: MULTIMODAL ANALYSIS =============
    console.log("[generate-tasks] Step 3: Multimodal analysis...");

    // Build analysis prompt with context and DSC
    const analysisPrompt = buildAnalysisPrompt(context, dscReference);

    // Check if we have photos for vision analysis
    const hasPhotos = Array.isArray(problem.photo_urls) && problem.photo_urls.length > 0;
    
    let messages: any[] = [
      {
        role: "system",
        content: `Tu es un expert en diagnostic bâtiment et travaux de chantier. Tu dois analyser un problème détecté lors d'une visite et générer les tâches FT/CT/ST correspondantes selon la nomenclature DSC fournie.

RÈGLES STRICTES:
1. Utilise UNIQUEMENT les codes FT/CT/ST existants dans la DSC fournie
2. Si tu ne trouves pas de correspondance exacte, utilise la plus proche et indique "isApproximate": true
3. Génère entre 1 et 5 tâches maximum par problème
4. La description technique doit être précise et actionnable pour un ouvrier
5. Estime les quantités quand c'est possible (sinon null)
6. La suggestionOuvrier doit détailler les étapes concrètes d'intervention`
      }
    ];

    // Add vision content if photos available
    if (hasPhotos && problem.photo_urls[0]) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          { type: "image_url", image_url: { url: problem.photo_urls[0] } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: analysisPrompt
      });
    }

    // ============= STEP 4: AI TASK GENERATION =============
    console.log("[generate-tasks] Step 4: Calling AI for task generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "generate_construction_tasks",
              description: "Génère les tâches de chantier FT/CT/ST pour un problème détecté",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ft: { type: "string", description: "Code de la Famille de Tâches (FT)" },
                        ftName: { type: "string", description: "Nom de la Famille de Tâches" },
                        ct: { type: "string", description: "Code de la Catégorie de Tâches (CT)" },
                        ctName: { type: "string", description: "Nom de la Catégorie de Tâches" },
                        st: { type: "string", description: "Code de la Sous-catégorie de Tâches (ST)" },
                        stName: { type: "string", description: "Nom de la Sous-catégorie de Tâches" },
                        descriptionTechnique: { type: "string", description: "Description technique détaillée de la tâche" },
                        quantite: { type: ["number", "null"], description: "Quantité estimée (null si impossible à estimer)" },
                        unite: { type: "string", enum: ["m2", "ml", "unité", "forfait", "m3", "kg"] },
                        gravite: { type: "string", enum: ["low", "medium", "high"] },
                        urgence: { type: "string", enum: ["low", "medium", "high"] },
                        suggestionOuvrier: { type: "string", description: "Étapes concrètes d'intervention pour l'ouvrier" },
                        isApproximate: { type: "boolean", description: "True si le matching FT/CT/ST est approximatif" }
                      },
                      required: ["ft", "ftName", "ct", "ctName", "st", "stName", "descriptionTechnique", "unite", "gravite", "urgence", "suggestionOuvrier", "isApproximate"]
                    }
                  },
                  confidence: {
                    type: "number",
                    description: "Score de confiance global entre 0 et 1"
                  },
                  analysis: {
                    type: "string",
                    description: "Résumé de l'analyse du problème"
                  }
                },
                required: ["tasks", "confidence", "analysis"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_construction_tasks" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-tasks] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("[generate-tasks] AI response received");

    // Extract tool call result
    let generatedResult = {
      tasks: [] as GeneratedTask[],
      confidence: 0,
      analysis: ""
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        generatedResult = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("[generate-tasks] Failed to parse AI result:", e);
      }
    }

    // ============= STEP 5: VALIDATION & STORAGE =============
    console.log("[generate-tasks] Step 5: Validating and storing...");

    // Validate FT/CT/ST codes exist in DTC
    const validatedTasks = generatedResult.tasks.map(task => {
      const familyExists = ftFamilles?.some((f: any) => f.ft_code === task.ft);
      const categoryExists = ctCategories?.some((c: any) => c.ct_code === task.ct);
      const subcategoryExists = scSousCategories?.some((s: any) => s.sc_code === task.st);

      return {
        ...task,
        isApproximate: task.isApproximate || !familyExists || !categoryExists || !subcategoryExists
      };
    });

    // Store in database
    const { data: stored, error: storeError } = await supabase
      .from("generated_tasks")
      .upsert({
        project_id: projectId,
        problem_id: problemId,
        tasks_json: validatedTasks,
        confidence: generatedResult.confidence,
        model_used: "google/gemini-2.5-flash",
        context_used: context,
        is_validated: false
      }, {
        onConflict: "problem_id"
      })
      .select()
      .single();

    if (storeError) {
      console.error("[generate-tasks] Store error:", storeError);
      // Don't throw, still return results
    }

    console.log("[generate-tasks] Complete! Generated", validatedTasks.length, "tasks");

    return new Response(
      JSON.stringify({
        success: true,
        tasks: validatedTasks,
        confidence: generatedResult.confidence,
        analysis: generatedResult.analysis,
        storedId: stored?.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-tasks] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Helper: Build DTC reference string for AI
function buildDTCReference(
  ftFamilles: any[], 
  ctCategories: any[], 
  scSousCategories: any[],
  tTaches: any[]
): string {
  let ref = "=== DESCRIPTIF TECHNIQUE COMMUN (DTC) ===\n\n";

  for (const ft of ftFamilles) {
    ref += `FT: ${ft.ft_code} - ${ft.ft_label}`;
    if (ft.commentaire_type_equipe) {
      ref += ` (${ft.commentaire_type_equipe})`;
    }
    ref += `\n`;
    
    const familyCategories = ctCategories.filter(c => c.ft_code === ft.ft_code);
    for (const ct of familyCategories) {
      ref += `  CT: ${ct.ct_code} - ${ct.ct_label}\n`;
      
      const catSubcategories = scSousCategories.filter(s => 
        s.ct_code === ct.ct_code && s.ft_code === ft.ft_code
      );
      for (const sc of catSubcategories) {
        ref += `    SC: ${sc.sc_code} - ${sc.sc_label}`;
        if (sc.zone_type) {
          ref += ` [zone: ${sc.zone_type}]`;
        }
        ref += `\n`;
        
        // Ajouter quelques tâches représentatives
        const scTasks = tTaches.filter(t => 
          t.sc_code === sc.sc_code && t.ct_code === ct.ct_code && t.ft_code === ft.ft_code
        ).slice(0, 3);
        
        for (const t of scTasks) {
          ref += `      T: ${t.t_code} - ${t.t_label}`;
          if (t.description_detaillee) {
            ref += ` - ${t.description_detaillee.substring(0, 80)}`;
          }
          if (t.unite && t.rendement_h_par_unite) {
            ref += ` [${t.rendement_h_par_unite}h/${t.unite}]`;
          }
          ref += `\n`;
        }
      }
    }
    ref += "\n";
  }

  return ref;
}

// Helper: Build analysis prompt
function buildAnalysisPrompt(context: any, dscReference: string): string {
  return `CONTEXTE DU PROBLÈME DÉTECTÉ:

📍 LOCALISATION:
- Partie: ${context.partie?.type || 'N/A'} - ${context.partie?.name || 'N/A'}
- Lieu: ${context.lieu?.name || 'N/A'} (${context.lieu?.type || 'N/A'})
- Endroit: ${context.endroit?.name || context.endroit?.type || 'N/A'}
- Zone: ${context.zone?.type || 'N/A'} (état: ${context.zone?.condition || 'N/A'})

🏠 BÂTIMENT:
- Type: ${context.building?.type || 'N/A'}
- Adresse: ${context.building?.address || 'N/A'}
- Année construction: ${context.building?.year || context.building?.constructionDate || 'N/A'}

⚠️ PROBLÈME:
- Titre: ${context.problem?.title || 'N/A'}
- Description: ${context.problem?.description || 'Aucune description'}
- Gravité actuelle: ${context.problem?.severity || 'N/A'}
- Urgence: ${context.problem?.urgence || 'N/A'}
- Photos disponibles: ${context.problem?.photoUrls?.length || 0}

${dscReference}

INSTRUCTIONS:
1. Analyse le problème décrit et les photos si disponibles
2. Identifie les travaux nécessaires
3. Pour chaque travail, trouve le FT/CT/ST le plus approprié dans la DSC ci-dessus
4. Génère les tâches avec descriptions techniques précises
5. Estime les quantités si possible

Génère les tâches FT/CT/ST correspondantes.`;
}