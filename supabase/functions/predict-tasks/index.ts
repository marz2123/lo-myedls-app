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

    const { projectId, propertyType, address, numberOfUnits } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    const userId = decodedPayload.sub;

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's assigned A/B testing strategy
    const { data: assignment } = await supabase
      .from('user_prediction_assignments')
      .select('strategy_id, prediction_strategies(strategy_config)')
      .eq('user_id', userId)
      .single();

    let strategyConfig: any = {
      useUserHistory: true,
      useSimilarProjects: true,
      useFeedbackLearning: true,
      confidenceThreshold: 70,
      maxSuggestions: 8
    };

    let assignedStrategyId = null;

    if (!assignment) {
      // Randomly assign a strategy for A/B testing
      const { data: activeStrategies } = await supabase
        .from('prediction_strategies')
        .select('id, strategy_config')
        .eq('is_active', true);

      if (activeStrategies && activeStrategies.length > 0) {
        const randomStrategy = activeStrategies[Math.floor(Math.random() * activeStrategies.length)];
        assignedStrategyId = randomStrategy.id;
        strategyConfig = randomStrategy.strategy_config;

        // Create assignment
        await supabase
          .from('user_prediction_assignments')
          .insert({ user_id: userId, strategy_id: assignedStrategyId });
      }
    } else {
      assignedStrategyId = assignment.strategy_id;
      strategyConfig = (assignment.prediction_strategies as any)?.strategy_config || strategyConfig;
    }

    // Fetch historical prediction feedback for quality scoring
    const { data: feedbackHistory, error: feedbackError } = await supabase
      .from('task_prediction_feedback')
      .select('predicted_task_data, accepted, feedback_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (feedbackError) {
      console.error('Error fetching feedback history:', feedbackError);
    }

    // Calculate acceptance rates for different task types
    const acceptanceRates = new Map<string, { accepted: number; total: number }>();
    if (feedbackHistory && feedbackHistory.length > 0) {
      feedbackHistory.forEach((feedback: any) => {
        const taskData = feedback.predicted_task_data;
        const key = taskData.work_type || 'unknown';
        
        if (!acceptanceRates.has(key)) {
          acceptanceRates.set(key, { accepted: 0, total: 0 });
        }
        
        const rate = acceptanceRates.get(key)!;
        rate.total++;
        if (feedback.accepted) {
          rate.accepted++;
        }
      });
    }

    // Fetch user's task history (if enabled in strategy)
    let taskHistoryContext = '';
    if (strategyConfig.useUserHistory) {
      const { data: taskHistory } = await supabase
        .from('extracted_tasks')
        .select(`
          title,
          description,
          area,
          location,
          priority,
          work_type,
          task_families(code, name),
          task_categories(code, name),
          task_subcategories(code, name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (taskHistory && taskHistory.length > 0) {
        taskHistoryContext = `\n\nHistorique des tâches de l'utilisateur (${taskHistory.length} dernières tâches):\n${taskHistory.slice(0, 20).map((t: any, i: number) => 
          `${i + 1}. ${t.title} - ${t.description || 'N/A'} | Zone: ${t.area || 'N/A'} | Localisation: ${t.location || 'N/A'} | Priorité: ${t.priority || 'N/A'} | Type: ${t.work_type || 'N/A'} | DSC: ${t.task_families?.code || 'N/A'}/${t.task_categories?.code || 'N/A'}/${t.task_subcategories?.code || 'N/A'}`
        ).join('\n')}`;
      }
    }

    // Fetch tasks from similar projects (if enabled in strategy)
    let similarTasksContext = '';
    if (strategyConfig.useSimilarProjects) {
      const { data: similarProjectTasks } = await supabase
        .from('extracted_tasks')
        .select(`
          title,
          description,
          area,
          location,
          projects!inner(property_type)
        `)
        .eq('user_id', userId)
        .eq('projects.property_type', propertyType)
        .order('created_at', { ascending: false })
        .limit(30);

      if (similarProjectTasks && similarProjectTasks.length > 0) {
        similarTasksContext = `\n\nTâches typiques pour le type de bien "${propertyType}" (${similarProjectTasks.length} tâches):\n${similarProjectTasks.slice(0, 15).map((t: any, i: number) => 
          `${i + 1}. ${t.title} - ${t.description || 'N/A'} | Zone: ${t.area || 'N/A'} | Localisation: ${t.location || 'N/A'}`
        ).join('\n')}`;
      }
    }

    // Build acceptance rate context (if using feedback learning)
    let acceptanceContext = '';
    if (strategyConfig.useFeedbackLearning && acceptanceRates.size > 0) {
      acceptanceContext = `\n\nTaux d'acceptation historique des prédictions par type de travaux:\n${Array.from(acceptanceRates.entries()).map(([type, rate]) => 
        `- ${type}: ${Math.round((rate.accepted / rate.total) * 100)}% (${rate.accepted}/${rate.total} acceptées)`
      ).join('\n')}\n\nAJUSTE LA CONFIANCE en fonction de ces taux historiques. Si un type de tâche a un faible taux d'acceptation, réduis la confiance.`;
    }

    const systemPrompt = `Tu es un expert en inspection immobilière et en gestion de travaux.

Contexte du projet:
- Type de bien: ${propertyType}
- Adresse: ${address}
${numberOfUnits ? `- Nombre d'unités: ${numberOfUnits}` : ''}
${taskHistoryContext}
${similarTasksContext}
${acceptanceContext}

Mission: Analyser l'historique des tâches de l'utilisateur et prédire les prochaines tâches probables pour ce projet.

Considère:
1. Les patterns récurrents dans l'historique de l'utilisateur
2. Les tâches typiques pour ce type de bien
3. Les zones et localisations fréquemment inspectées
4. Les priorités habituelles
5. Le type de travaux (rénovation/construction neuve)

Fournis 5 à 8 suggestions de tâches prédictives pertinentes et réalistes.`;

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
          { role: 'user', content: 'Génère des suggestions de tâches prédictives pour ce projet.' }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_predictive_tasks",
            description: "Suggérer des tâches prédictives basées sur l'historique et le contexte du projet",
            parameters: {
              type: "object",
              properties: {
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Titre de la tâche prédite" },
                      description: { type: "string", description: "Description détaillée" },
                      area: { type: "string", description: "Zone concernée" },
                      location: { type: "string", description: "Localisation précise" },
                      priority: { type: "string", enum: ["low", "medium", "high"], description: "Priorité estimée" },
                      work_type: { type: "string", enum: ["renovation", "new_build"], description: "Type de travaux" },
                      confidence: { type: "number", description: "Confiance de la prédiction (0-100)" },
                      reasoning: { type: "string", description: "Raison de cette prédiction" }
                    },
                    required: ["title", "description", "priority", "work_type", "confidence", "reasoning"],
                    additionalProperties: false
                  },
                  minItems: strategyConfig.maxSuggestions || 5,
                  maxItems: strategyConfig.maxSuggestions || 8
                }
              },
              required: ["predictions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_predictive_tasks" } }
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

    const predictions = JSON.parse(toolCall.function.arguments);

    // Update strategy metrics (simplified - not using RPC)
    if (assignedStrategyId && predictions.predictions) {
      const { data: currentMetrics } = await supabase
        .from('strategy_performance_metrics')
        .select('total_predictions')
        .eq('strategy_id', assignedStrategyId)
        .single();

      if (currentMetrics) {
        await supabase
          .from('strategy_performance_metrics')
          .update({
            total_predictions: currentMetrics.total_predictions + predictions.predictions.length,
            last_updated: new Date().toISOString()
          })
          .eq('strategy_id', assignedStrategyId);
      }
    }

    return new Response(JSON.stringify({
      ...predictions,
      strategy_id: assignedStrategyId,
      strategy_config: strategyConfig
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predict-tasks:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
