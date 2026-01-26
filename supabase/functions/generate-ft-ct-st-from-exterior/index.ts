import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkItem {
  name: string;
  quantity: string;
  unit: string;
  costMin: number;
  costMax: number;
  priority: 'low' | 'medium' | 'high';
  reason?: string;
  dependencies?: string[];
}

interface FtCtStMapping {
  FT: string;
  CT: string;
  ST: string;
  description: string;
}

const SYSTEM_PROMPT = `Tu connais parfaitement le référentiel FT / CT / ST de MyEDLS pour la classification des travaux du bâtiment.

FT = Famille de travaux (niveau macro) :
- Façades et revêtements extérieurs
- Toiture et couverture
- Menuiseries extérieures
- Structure et gros œuvre
- Étanchéité
- Isolation thermique extérieure
- Balcons et gardes-corps
- VRD et aménagements extérieurs

CT = Catégorie (niveau intermédiaire) :
- Réparation / Reprise
- Rénovation complète
- Remplacement
- Traitement / Protection
- Mise aux normes
- Amélioration énergétique

ST = Sous-catégorie (niveau précis) :
Exemples : Ravalement peinture, Ravalement enduit, ITE polystyrène, ITE laine de roche, Réfection tuiles, Réfection zinc, Remplacement fenêtres PVC, Remplacement fenêtres alu, Réparation fissures, Reprise structurelle, Étanchéité terrasse, Zinguerie, etc.

Tu dois TOUJOURS fournir une correspondance FT/CT/ST - ne jamais laisser vide.`;

const USER_PROMPT_TEMPLATE = `Voici un item travaux à mapper vers le référentiel FT/CT/ST :

[WORK_ITEM_JSON]

Mappe-le vers le format JSON suivant (UNIQUEMENT le JSON, pas d'explication) :
{
  "FT": "Famille de travaux",
  "CT": "Catégorie",
  "ST": "Sous-catégorie précise",
  "description": "Description détaillée de l'intervention"
}

Règles :
- FT = Famille de travaux (ex : Façades et revêtements extérieurs, Toiture et couverture, Menuiseries extérieures…)
- CT = Catégorie interne (ex : Réparation, Rénovation, Remplacement, Traitement…)
- ST = Sous-catégorie très précise (ex : ITE polystyrène, Ravalement enduit, Remplacement tuiles…)
- Ne jamais laisser vide → proposer la meilleure correspondance
- La description doit être technique et professionnelle`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exteriorWorkEstimationId, projectId } = await req.json();

    if (!exteriorWorkEstimationId) {
      throw new Error('exteriorWorkEstimationId is required');
    }

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

    // 1. Load works from exterior_work_estimations
    const { data: estimation, error: estError } = await supabase
      .from('exterior_work_estimations')
      .select('*')
      .eq('id', exteriorWorkEstimationId)
      .single();

    if (estError || !estimation) {
      throw new Error(`Estimation not found: ${estError?.message}`);
    }

    const works: WorkItem[] = estimation.estimation_json?.works || [];
    
    if (works.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No works found in estimation', tasks: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveProjectId = projectId || estimation.project_id;

    console.log(`Processing ${works.length} work items for FT/CT/ST mapping`);

    // 2. Delete existing tasks for this estimation to avoid duplicates
    await supabase
      .from('exterior_ft_ct_st_tasks')
      .delete()
      .eq('estimation_id', exteriorWorkEstimationId);

    // 3. For each work item, call AI to map to FT/CT/ST
    const mappedTasks: any[] = [];

    for (const work of works) {
      try {
        const userPrompt = USER_PROMPT_TEMPLATE.replace('[WORK_ITEM_JSON]', JSON.stringify(work, null, 2));

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
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.error('Rate limit exceeded, skipping work item:', work.name);
            continue;
          }
          if (response.status === 402) {
            console.error('Credits insufficient, skipping work item:', work.name);
            continue;
          }
          console.error('AI gateway error for work:', work.name, response.status);
          continue;
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        let mapping: FtCtStMapping;
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                           content.match(/```\s*([\s\S]*?)\s*```/) ||
                           content.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          mapping = JSON.parse(jsonStr.trim());
        } catch (parseError) {
          console.error('Failed to parse AI response for work:', work.name, parseError);
          // Default mapping if parsing fails
          mapping = {
            FT: 'Travaux extérieurs',
            CT: 'Réparation',
            ST: work.name,
            description: `Travaux de ${work.name.toLowerCase()}`,
          };
        }

        // Create task record
        const taskRecord = {
          estimation_id: exteriorWorkEstimationId,
          project_id: effectiveProjectId,
          work_name: work.name,
          work_quantity: work.quantity,
          work_unit: work.unit,
          cost_min: work.costMin,
          cost_max: work.costMax,
          priority: work.priority,
          reason: work.reason,
          ft_family: mapping.FT,
          ct_category: mapping.CT,
          st_subcategory: mapping.ST,
          description: mapping.description,
          dependencies: work.dependencies || [],
        };

        mappedTasks.push(taskRecord);
        console.log(`Mapped: ${work.name} → FT: ${mapping.FT}, CT: ${mapping.CT}, ST: ${mapping.ST}`);

      } catch (workError) {
        console.error('Error processing work item:', work.name, workError);
      }
    }

    // 4. Store all tasks in database
    if (mappedTasks.length > 0) {
      const { error: insertError } = await supabase
        .from('exterior_ft_ct_st_tasks')
        .insert(mappedTasks);

      if (insertError) {
        console.error('Error inserting tasks:', insertError);
        throw new Error(`Failed to save tasks: ${insertError.message}`);
      }

      console.log(`Successfully saved ${mappedTasks.length} FT/CT/ST tasks`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasksCount: mappedTasks.length,
        tasks: mappedTasks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate FT/CT/ST error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
