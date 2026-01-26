import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictiveAnalysisResult {
  delays: Array<{
    area: string;
    estimatedDelayDays: number;
    causes: string;
    suggestedMitigation: string;
  }>;
  workload: Array<{
    resource: string;
    status: 'overloaded' | 'balanced' | 'underused';
    taskCount: number;
    details: string;
  }>;
  budgetCriticalItems: Array<{
    label: string;
    reason: string;
    recommendedAction: string;
    estimatedImpact: 'high' | 'medium' | 'low';
  }>;
  purchaseSuggestions: Array<{
    label: string;
    quantityEstimate: number | string;
    unit: string;
    timeFrame: string;
    family: string;
  }>;
  actionPlan7Days: Array<{
    day: number;
    focus: string;
    suggestedTasks: string[];
    priority: 'critical' | 'high' | 'normal';
  }>;
  summary: string;
  riskScore: number;
  generatedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error('projectId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all relevant project data in parallel
    const [
      { data: project },
      { data: tasks },
      { data: problems },
      { data: sequences },
      { data: anomalies },
      { data: dailyLogs }
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('extracted_tasks').select('*, task_families(ft_label), task_categories(ct_label), task_subcategories(st_label)').eq('project_id', projectId),
      supabase.from('problem_tasks').select('*').eq('project_id', projectId),
      supabase.from('visit_sequences').select('*').eq('project_id', projectId),
      supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
      supabase.from('daily_logs').select('*').eq('project_id', projectId).order('log_date', { ascending: false }).limit(10)
    ]);

    // Prepare data for AI analysis
    const tasksData = tasks?.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      location: t.location,
      area: t.area,
      family: t.task_families?.ft_label || 'Non classé',
      category: t.task_categories?.ct_label,
      subcategory: t.task_subcategories?.st_label,
      workType: t.work_type,
      sourceType: t.source_type,
      createdAt: t.created_at
    })) || [];

    const problemsData = problems?.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      priority: p.priority,
      severity: p.severity,
      urgence: p.urgence,
      location: p.location_name,
      assignee: p.assigned_to,
      dueDate: p.due_date,
      estimatedCostMin: p.cout_estime_min,
      estimatedCostMax: p.cout_estime_max
    })) || [];

    const risksData = anomalies?.map(a => ({
      type: a.anomaly_type,
      description: a.description,
      severity: a.severity,
      confidence: a.confidence_score,
      isConfirmed: a.is_confirmed
    })) || [];

    const recentLogsData = dailyLogs?.map(l => ({
      date: l.log_date,
      observations: l.observations,
      problems: l.problems_encountered,
      tasksCompleted: l.tasks_completed,
      urgentNeeds: l.urgent_needs,
      aiSummary: l.ai_summary
    })) || [];

    // Prepare the AI prompt
    const systemPrompt = `Tu es IAHome Predictive Engine, un assistant IA pour Groupe MyHome.
Tu agis comme un directeur de projet senior et un gestionnaire de chantier expérimenté.
Tu analyses les tâches, la planification, les risques et les coûts potentiels.
Tu DOIS être concis, opérationnel et déterministe.

RÈGLES CRITIQUES:
- Ne jamais inventer de prix exacts sauf si des données de coût existent
- Ne jamais présenter les estimations comme des garanties
- Toujours formuler les prédictions avec: "Risque de...", "Probable...", "Je recommande..."
- Réponses en français professionnel
- Focus sur l'actionnable

FAMILLES DE TÂCHES PRINCIPALES (pour achat et budget):
- Gros œuvre, Structure, Façades (coûts élevés)
- Menuiseries extérieures (coûts élevés, délais longs)
- Réseaux: Plomberie EF/EC/EU/EV, Électricité, VMC, Chauffage
- Second œuvre: Plâtrerie, Carrelage, Peinture
- Finitions et équipements

MATÉRIAUX TYPIQUES PAR FAMILLE:
- Plâtrerie: BA13, rails, montants, bandes, enduit
- Plomberie: tuyaux PER/cuivre, raccords, robinetterie, WC, receveurs douche
- Électricité: câbles, gaines ICTA, prises, interrupteurs, tableaux
- Carrelage: carreaux, colle, joints, croisillons
- Peinture: peinture, sous-couche, enduit de lissage`;

    const userPrompt = `Analyse ce projet de construction/rénovation et fournis une analyse prédictive complète.

PROJET:
${JSON.stringify({
  type: project?.property_type,
  address: project?.address,
  createdAt: project?.created_at
}, null, 2)}

TÂCHES EXTRAITES (${tasksData.length}):
${JSON.stringify(tasksData.slice(0, 50), null, 2)}

PROBLÈMES/TÂCHES PLANIFIÉES (${problemsData.length}):
${JSON.stringify(problemsData.slice(0, 30), null, 2)}

RISQUES/ANOMALIES DÉTECTÉS (${risksData.length}):
${JSON.stringify(risksData, null, 2)}

JOURNAUX RÉCENTS:
${JSON.stringify(recentLogsData, null, 2)}

STATISTIQUES:
- Total tâches: ${tasksData.length}
- Total problèmes: ${problemsData.length}
- Tâches urgentes: ${problemsData.filter(p => p.priority === 'urgente' || p.urgence === 'haute').length}
- Risques confirmés: ${risksData.filter(r => r.isConfirmed).length}

Retourne un JSON STRICT avec cette structure:
{
  "delays": [{"area": string, "estimatedDelayDays": number, "causes": string, "suggestedMitigation": string}],
  "workload": [{"resource": string, "status": "overloaded"|"balanced"|"underused", "taskCount": number, "details": string}],
  "budgetCriticalItems": [{"label": string, "reason": string, "recommendedAction": string, "estimatedImpact": "high"|"medium"|"low"}],
  "purchaseSuggestions": [{"label": string, "quantityEstimate": number|string, "unit": string, "timeFrame": string, "family": string}],
  "actionPlan7Days": [{"day": number, "focus": string, "suggestedTasks": [taskIds], "priority": "critical"|"high"|"normal"}],
  "summary": "Résumé en 2-3 phrases",
  "riskScore": number entre 0 et 100
}`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No AI response content');
    }

    // Parse AI response
    let analysis: PredictiveAnalysisResult;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      analysis = {
        delays: parsed.delays || [],
        workload: parsed.workload || [],
        budgetCriticalItems: parsed.budgetCriticalItems || [],
        purchaseSuggestions: parsed.purchaseSuggestions || [],
        actionPlan7Days: parsed.actionPlan7Days || [],
        summary: parsed.summary || 'Analyse complétée',
        riskScore: parsed.riskScore || 50,
        generatedAt: new Date().toISOString()
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback with basic analysis
      analysis = {
        delays: [],
        workload: [],
        budgetCriticalItems: tasksData
          .filter(t => ['Gros œuvre', 'Structure', 'Façades', 'Menuiseries'].some(f => t.family?.includes(f)))
          .slice(0, 5)
          .map(t => ({
            label: t.title,
            reason: 'Famille de travaux potentiellement coûteuse',
            recommendedAction: 'Prévoir budget adapté',
            estimatedImpact: 'medium' as const
          })),
        purchaseSuggestions: [],
        actionPlan7Days: [{
          day: 1,
          focus: 'Tâches prioritaires',
          suggestedTasks: problemsData.filter(p => p.priority === 'urgente').slice(0, 5).map(p => p.id),
          priority: 'high' as const
        }],
        summary: 'Analyse partielle - données insuffisantes pour analyse complète',
        riskScore: 50,
        generatedAt: new Date().toISOString()
      };
    }

    // Store analysis result
    const { error: insertError } = await supabase
      .from('cache_predictions')
      .upsert({
        cache_key: `predictive_${projectId}`,
        prediction_type: 'predictive_analysis',
        prediction_data: analysis,
        confidence_score: analysis.riskScore / 100,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min TTL
        user_id: (await supabase.auth.getUser())?.data?.user?.id || 'system'
      }, { onConflict: 'cache_key' });

    if (insertError) {
      console.warn('Failed to cache analysis:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      meta: {
        tasksAnalyzed: tasksData.length,
        problemsAnalyzed: problemsData.length,
        risksAnalyzed: risksData.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predictive analysis error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
