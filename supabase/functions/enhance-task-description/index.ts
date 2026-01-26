import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { taskTitle, taskDescription, familyName, categoryName, subcategoryName, location, area } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    const userId = decodedPayload.sub;

    // Initialize Supabase client with service role key
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user's task history for personalization
    const { data: taskHistory, error: historyError } = await supabase
      .from('extracted_tasks')
      .select('title, description, task_families(name), task_categories(name), task_subcategories(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching task history:', historyError);
    }

    // Build history context
    const historyContext = taskHistory && taskHistory.length > 0
      ? `\n\nHistorique des tâches récentes de l'utilisateur:\n${taskHistory.map((t: any, i: number) => 
          `${i + 1}. ${t.title} - ${t.description || 'Pas de description'} (${t.task_families?.name || 'N/A'}/${t.task_categories?.name || 'N/A'}/${t.task_subcategories?.name || 'N/A'})`
        ).join('\n')}`
      : '';


    const contextInfo = [
      taskTitle ? `Titre: ${taskTitle}` : '',
      taskDescription ? `Description actuelle: ${taskDescription}` : '',
      familyName ? `Famille DSC: ${familyName}` : '',
      categoryName ? `Catégorie DSC: ${categoryName}` : '',
      subcategoryName ? `Sous-catégorie DSC: ${subcategoryName}` : '',
      location ? `Localisation: ${location}` : '',
      area ? `Zone: ${area}` : '',
    ].filter(Boolean).join('\n');

    const systemPrompt = `Tu es un assistant expert en inspection immobilière et en gestion de travaux. 
Ta mission est de suggérer des améliorations pour enrichir la description d'une tâche de travaux.

Contexte de la tâche:
${contextInfo}${historyContext}

Analyse l'historique des tâches précédentes de l'utilisateur pour personnaliser tes suggestions en tenant compte de:
- Son style de description habituel (niveau de détail, terminologie utilisée)
- Les types de travaux qu'il inspecte fréquemment
- Les aspects qu'il a tendance à mentionner dans ses descriptions

Fournis 3 suggestions d'enrichissement de la description qui:
1. Ajoutent des détails techniques pertinents cohérents avec son historique
2. Précisent les aspects pratiques de la tâche dans son style habituel
3. Incluent des considérations de sécurité ou de conformité si applicable

Chaque suggestion doit être claire, concise, personnalisée à l'utilisateur, et directement applicable.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Génère 3 suggestions d\'enrichissement pour cette description de tâche.' }
        ],
        tools: [{
          type: "function",
          function: {
            name: "provide_enhancement_suggestions",
            description: "Fournir 3 suggestions d'enrichissement pour la description de la tâche",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Titre court de la suggestion" },
                      enhancement: { type: "string", description: "Texte d'enrichissement à ajouter" }
                    },
                    required: ["title", "enhancement"],
                    additionalProperties: false
                  },
                  minItems: 3,
                  maxItems: 3
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "provide_enhancement_suggestions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-task-description:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
