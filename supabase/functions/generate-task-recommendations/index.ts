import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('extracted_tasks')
      .select(`
        *,
        task_families(code, name),
        task_categories(code, name),
        task_subcategories(code, name)
      `)
      .eq('project_id', projectId);

    if (tasksError) throw tasksError;

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Prepare AI context
    const tasksSummary = tasks?.map(t => ({
      title: t.title,
      family: t.task_families?.name,
      category: t.task_categories?.name,
      subcategory: t.task_subcategories?.name,
      location: t.location
    }));

    const prompt = `Analyse les tâches d'inspection suivantes pour un ${project.property_type} situé à ${project.address}.

Tâches existantes:
${JSON.stringify(tasksSummary, null, 2)}

En te basant sur:
1. Les tâches déjà identifiées
2. Le type de bien (${project.property_type})
3. Les patterns typiques d'inspection
4. Les corrélations entre tâches

Génère 3-5 recommandations de tâches supplémentaires qui pourraient avoir été oubliées.

Pour chaque recommandation, fournis:
- title: titre de la tâche recommandée
- description: description détaillée
- reason: pourquoi cette tâche est recommandée
- priority: 'low', 'medium', ou 'high'
- estimated_cost_min: coût minimum estimé en euros
- estimated_cost_max: coût maximum estimé en euros
- related_task_titles: titres des tâches existantes liées (array)`;

    // Call Lovable AI
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
            content: 'Tu es un expert en inspection immobilière. Tu génères des recommandations de tâches basées sur des patterns d\'inspection professionnels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_tasks",
            description: "Génère des recommandations de tâches d'inspection",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      reason: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      estimated_cost_min: { type: "number" },
                      estimated_cost_max: { type: "number" },
                      related_task_titles: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "description", "reason", "priority"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_tasks" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const recommendations = JSON.parse(toolCall?.function?.arguments || '{"recommendations":[]}').recommendations;

    // Save recommendations to database
    for (const rec of recommendations) {
      // Find related task IDs
      const relatedTaskIds = tasks
        ?.filter(t => rec.related_task_titles?.includes(t.title))
        .map(t => t.id) || [];

      await supabase
        .from('task_recommendations')
        .insert({
          project_id: projectId,
          recommended_task_title: rec.title,
          recommended_task_description: rec.description,
          recommendation_reason: rec.reason,
          confidence_score: 0.85,
          based_on_task_ids: relatedTaskIds,
          priority: rec.priority,
          estimated_cost_range: {
            min: rec.estimated_cost_min || 0,
            max: rec.estimated_cost_max || 0
          }
        });
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});