import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type AgentName = 'vision' | 'description' | 'task' | 'normes' | 'coherence' | 'quality' | 'comparative' | 'planning' | 'autopilot' | 'orchestrator';

interface AgentResult {
  agentName: AgentName;
  result: any;
  confidence: number;
  processingTimeMs: number;
  status: 'completed' | 'failed';
  error?: string;
}

// Agent prompts for each specialized AI
const AGENT_PROMPTS: Record<AgentName, string> = {
  vision: `Tu es Vision AI, expert en analyse visuelle de biens immobiliers pour EDL.
Analyse cette image et retourne un JSON avec:
- elements: liste des éléments détectés (type, label, confidence, material, state: neuf/bon/moyen/mauvais/absent)
- anomalies: liste des anomalies (type, severity: low/medium/high/critical, description, confidence)
- roomType: type de pièce détecté
- lighting: qualité éclairage (good/poor/very_poor)
- frameQuality: qualité cadrage (good/blur/dark/overexposed)
- missingAngles: angles manquants suggérés`,

  description: `Tu es Description AI, expert en rédaction d'EDL professionnels.
Génère des descriptions neutres, objectives et conformes aux normes ALUR.
Retourne un JSON avec:
- descriptions: liste avec (original, corrected, isNeutral, normCompliant, corrections[])
- globalDescription: description globale de la zone
- style: edl_standard
RÈGLES: Jamais de termes subjectifs (sale, dégradé excessif). Utilise un vocabulaire technique et neutre.`,

  task: `Tu es Task AI, expert en extraction de tâches EDL selon le DSC.
À partir des anomalies et éléments détectés, génère les tâches de travaux.
Retourne un JSON avec:
- tasks: liste avec (title, description, familyCode, familyName, categoryCode, categoryName, subcategoryCode, subcategoryName, unit, quantity, linkedAnomalyId, priority: haute/normale/basse)
- dpgfCoherence: true/false
Utilise les 28 familles de tâches standard (maçonnerie, électricité, plomberie, etc.)`,

  normes: `Tu es Normes AI, expert en conformité légale EDL France et Europe.
Vérifie la conformité ALUR, RT/RE, normes européennes.
Retourne un JSON avec:
- compliance: { alur: bool, rtRe: bool, european: bool, overall: 0-100 }
- violations: liste avec (normId, normName, description, severity: info/warning/error/critical, correction)
- forbiddenTerms: termes interdits détectés avec (term, context, replacement)
- missingObligations: obligations légales manquantes`,

  coherence: `Tu es Cohérence AI, expert en détection d'incohérences EDL.
Analyse les résultats des autres agents et détecte les contradictions.
Retourne un JSON avec:
- score: 0-100
- inconsistencies: liste avec (type, description, severity: low/medium/high, agents[], suggestion)
- photoDescriptionMatch: 0-100
- anomalyTaskMatch: 0-100
- stateAnomalyMatch: 0-100
Types: vision_description, description_task, anomaly_task, state_anomaly, photo_element, norm_violation, hallucination, redundancy`,

  quality: `Tu es Quality AI, expert en qualité EDL.
Évalue la qualité globale de l'EDL et génère des recommandations.
Retourne un JSON avec:
- scores: { overall, completeness, coherence, photoQuality, descriptionQuality, taskAccuracy } (0-100)
- recommendations: liste avec (priority: high/medium/low, category, description, action)
- systematicErrors: erreurs récurrentes avec (pattern, occurrences, suggestion)`,

  comparative: `Tu es Comparative AI, expert en comparaison EDL entrée/sortie.
Compare les états d'entrée et de sortie pour détecter les différences.
Retourne un JSON avec:
- entryExitDifferences: liste avec (element, location, entryState, exitState, severity: minor/moderate/major, suggestedTask)
- photoAlignments: correspondances photos (entryPhotoId, exitPhotoId, matchConfidence)
- generatedAnomalies: anomalies générées
- generatedTasks: tâches générées`,

  planning: `Tu es Planning AI, expert en planification de travaux.
À partir des tâches, génère un planning optimisé.
Retourne un JSON avec:
- phases: liste avec (name, familyCodes[], duration en jours, dependencies[], order)
- totalDuration: durée totale en jours
- criticalPath: chemin critique (noms des phases)
- buildingCoherence: cohérence globale immeuble`,

  autopilot: `Tu es Autopilot AI, expert en création automatique d'EDL.
À partir d'une photo ou vidéo, génère un EDL complet automatiquement.
Combine Vision + Description + Task + Normes + Quality pour un résultat optimal.`,

  orchestrator: `Tu es MyALADIN Orchestrator, chef d'orchestre du système Multi-Agent.
Tu coordonnes tous les agents, résous les conflits, et produis le résultat final optimal.
Quand il y a contradiction entre agents:
1. Analyse le contexte
2. Priorise selon la fiabilité (Vision > Description > Task)
3. Génère une résolution automatique
4. Documente la décision`
};

async function callAgent(
  agentName: AgentName,
  context: any,
  previousResults?: Record<string, any>
): Promise<AgentResult> {
  const startTime = Date.now();
  
  try {
    const systemPrompt = AGENT_PROMPTS[agentName];
    const userPrompt = buildAgentPrompt(agentName, context, previousResults);

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { raw: content };
    }

    return {
      agentName,
      result,
      confidence: result.confidence || 0.85,
      processingTimeMs: Date.now() - startTime,
      status: 'completed'
    };
  } catch (error: any) {
    console.error(`Agent ${agentName} error:`, error);
    return {
      agentName,
      result: null,
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      status: 'failed',
      error: error.message
    };
  }
}

function buildAgentPrompt(agentName: AgentName, context: any, previousResults?: Record<string, any>): string {
  let prompt = '';

  if (context.imageUrl) {
    prompt += `Image à analyser: ${context.imageUrl}\n\n`;
  }

  if (context.description) {
    prompt += `Description fournie: ${context.description}\n\n`;
  }

  if (context.location) {
    prompt += `Localisation: ${JSON.stringify(context.location)}\n\n`;
  }

  if (previousResults && Object.keys(previousResults).length > 0) {
    prompt += `Résultats des agents précédents:\n`;
    for (const [agent, result] of Object.entries(previousResults)) {
      prompt += `\n--- ${agent.toUpperCase()} ---\n${JSON.stringify(result, null, 2)}\n`;
    }
  }

  prompt += `\nRetourne uniquement un JSON valide avec les champs requis.`;
  
  return prompt;
}

async function detectInconsistencies(results: Record<AgentName, AgentResult>): Promise<any[]> {
  const inconsistencies: any[] = [];

  // Check Vision vs Description
  if (results.vision?.result && results.description?.result) {
    const visionAnomalies = results.vision.result.anomalies || [];
    const descriptions = results.description.result.descriptions || [];
    
    for (const anomaly of visionAnomalies) {
      const matchingDesc = descriptions.find((d: any) => 
        d.corrected?.toLowerCase().includes(anomaly.type?.toLowerCase())
      );
      if (!matchingDesc && anomaly.severity !== 'low') {
        inconsistencies.push({
          type: 'vision_description',
          description: `Anomalie "${anomaly.type}" détectée par Vision AI mais non mentionnée dans les descriptions`,
          severity: 'medium',
          agents: ['vision', 'description'],
          suggestion: `Ajouter description de l'anomalie: ${anomaly.description}`
        });
      }
    }
  }

  // Check Description vs Task
  if (results.description?.result && results.task?.result) {
    const anomalyMentions = (results.description.result.globalDescription || '')
      .match(/fissure|humidité|dégât|cassé|abîmé|usure/gi) || [];
    const tasks = results.task.result.tasks || [];
    
    for (const mention of anomalyMentions) {
      const hasRelatedTask = tasks.some((t: any) => 
        t.title?.toLowerCase().includes(mention.toLowerCase()) ||
        t.description?.toLowerCase().includes(mention.toLowerCase())
      );
      if (!hasRelatedTask) {
        inconsistencies.push({
          type: 'description_task',
          description: `Problème "${mention}" mentionné mais aucune tâche générée`,
          severity: 'high',
          agents: ['description', 'task'],
          suggestion: `Créer une tâche pour traiter: ${mention}`
        });
      }
    }
  }

  // Check Normes violations
  if (results.normes?.result?.violations?.length > 0) {
    for (const violation of results.normes.result.violations) {
      if (violation.severity === 'critical' || violation.severity === 'error') {
        inconsistencies.push({
          type: 'norm_violation',
          description: violation.description,
          severity: 'high',
          agents: ['normes'],
          suggestion: violation.correction
        });
      }
    }
  }

  return inconsistencies;
}

async function resolveConflicts(
  inconsistencies: any[],
  results: Record<AgentName, AgentResult>,
  supabaseAdmin: any,
  projectId: string,
  userId: string
): Promise<any[]> {
  const resolutions: any[] = [];

  for (const inconsistency of inconsistencies) {
    // Auto-resolve based on agent priority
    let resolution: any = {
      inconsistency_type: inconsistency.type,
      conflicting_agents: inconsistency.agents,
      conflict_description: inconsistency.description,
      resolution_type: 'auto_corrected',
      resolution_data: {
        suggestion: inconsistency.suggestion,
        applied: true
      },
      confidence: 0.8,
      project_id: projectId,
      user_id: userId,
      analysis_ids: []
    };

    // Determine chosen agent based on conflict type
    switch (inconsistency.type) {
      case 'vision_description':
        resolution.chosen_agent = 'vision'; // Vision is more reliable for detection
        break;
      case 'description_task':
        resolution.chosen_agent = 'task'; // Task should align with description
        break;
      case 'norm_violation':
        resolution.chosen_agent = 'normes'; // Normes always wins for legal
        break;
      default:
        resolution.chosen_agent = 'orchestrator';
    }

    resolutions.push(resolution);
  }

  // Insert resolutions
  if (resolutions.length > 0) {
    const { error } = await supabaseAdmin
      .from('multiagent_resolutions')
      .insert(resolutions);
    
    if (error) {
      console.error('Error inserting resolutions:', error);
    }
  }

  return resolutions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, triggerType, triggerItemId, imageUrl, videoUrl, sequenceId, agents, autoApplyCorrections } = await req.json();
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await createClient(
      SUPABASE_URL,
      authHeader || ''
    ).auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'analyze') {
      console.log(`[Orchestrator] Starting multi-agent analysis for project ${projectId}`);
      
      // Create session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('multiagent_sessions')
        .insert({
          project_id: projectId,
          user_id: user.id,
          trigger_type: triggerType,
          trigger_item_id: triggerItemId,
          status: 'running',
          agents_triggered: agents || ['vision', 'description', 'task', 'normes', 'coherence', 'quality'],
          processing_started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Session creation failed: ${sessionError.message}`);
      }

      const agentsToRun: AgentName[] = agents || ['vision', 'description', 'task', 'normes', 'coherence', 'quality'];
      const results: Record<AgentName, AgentResult> = {} as any;
      const context = { imageUrl, videoUrl, sequenceId, projectId };

      // Run agents in dependency order
      // Phase 1: Vision (no dependencies)
      if (agentsToRun.includes('vision')) {
        console.log('[Orchestrator] Running Vision AI...');
        results.vision = await callAgent('vision', context);
      }

      // Phase 2: Description & Normes (depend on Vision)
      const phase2Agents = agentsToRun.filter(a => ['description', 'normes'].includes(a));
      if (phase2Agents.length > 0) {
        console.log(`[Orchestrator] Running ${phase2Agents.join(', ')}...`);
        const phase2Results = await Promise.all(
          phase2Agents.map(agent => callAgent(agent as AgentName, context, { vision: results.vision?.result }))
        );
        phase2Results.forEach(r => { results[r.agentName] = r; });
      }

      // Phase 3: Task & Comparative
      const phase3Agents = agentsToRun.filter(a => ['task', 'comparative'].includes(a));
      if (phase3Agents.length > 0) {
        console.log(`[Orchestrator] Running ${phase3Agents.join(', ')}...`);
        const previousResults = {
          vision: results.vision?.result,
          description: results.description?.result
        };
        const phase3Results = await Promise.all(
          phase3Agents.map(agent => callAgent(agent as AgentName, context, previousResults))
        );
        phase3Results.forEach(r => { results[r.agentName] = r; });
      }

      // Phase 4: Coherence
      if (agentsToRun.includes('coherence')) {
        console.log('[Orchestrator] Running Coherence AI...');
        results.coherence = await callAgent('coherence', context, {
          vision: results.vision?.result,
          description: results.description?.result,
          task: results.task?.result
        });
      }

      // Phase 5: Quality & Planning
      const phase5Agents = agentsToRun.filter(a => ['quality', 'planning'].includes(a));
      if (phase5Agents.length > 0) {
        console.log(`[Orchestrator] Running ${phase5Agents.join(', ')}...`);
        const phase5Results = await Promise.all(
          phase5Agents.map(agent => callAgent(agent as AgentName, context, results as any))
        );
        phase5Results.forEach(r => { results[r.agentName] = r; });
      }

      // Store all analyses
      const analysesToInsert = Object.values(results).map(r => ({
        project_id: projectId,
        session_id: session.id,
        user_id: user.id,
        agent_name: r.agentName,
        result_json: r.result || {},
        confidence: r.confidence,
        processing_time_ms: r.processingTimeMs,
        status: r.status,
        error_message: r.error
      }));

      const { error: insertError } = await supabaseAdmin
        .from('multiagent_analysis')
        .insert(analysesToInsert);

      if (insertError) {
        console.error('Error inserting analyses:', insertError);
      }

      // Detect and resolve inconsistencies
      console.log('[Orchestrator] Detecting inconsistencies...');
      const inconsistencies = await detectInconsistencies(results);
      
      let resolutions: any[] = [];
      if (autoApplyCorrections && inconsistencies.length > 0) {
        console.log(`[Orchestrator] Resolving ${inconsistencies.length} inconsistencies...`);
        resolutions = await resolveConflicts(inconsistencies, results, supabaseAdmin, projectId, user.id);
      }

      // Calculate scores
      const completedAgents = Object.values(results).filter(r => r.status === 'completed');
      const overallConfidence = completedAgents.length > 0
        ? completedAgents.reduce((sum, r) => sum + r.confidence, 0) / completedAgents.length
        : 0;

      const qualityScore = results.quality?.result?.scores?.overall || 0;
      const coherenceScore = results.coherence?.result?.score || 0;
      const completenessScore = results.quality?.result?.scores?.completeness || 0;

      // Build final result
      const finalResult: any = {};
      for (const [agent, agentResult] of Object.entries(results)) {
        if (agentResult.status === 'completed') {
          finalResult[agent] = agentResult.result;
        }
      }

      // Update session
      await supabaseAdmin
        .from('multiagent_sessions')
        .update({
          status: 'completed',
          agents_completed: completedAgents.map(r => r.agentName),
          total_analyses: Object.keys(results).length,
          total_resolutions: resolutions.length,
          overall_confidence: overallConfidence,
          quality_score: qualityScore,
          coherence_score: coherenceScore,
          completeness_score: completenessScore,
          final_result: finalResult,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      console.log(`[Orchestrator] Analysis complete. ${Object.keys(results).length} agents, ${resolutions.length} resolutions`);

      return new Response(JSON.stringify({
        sessionId: session.id,
        status: 'completed',
        agentsTriggered: agentsToRun,
        agentsCompleted: completedAgents.map(r => r.agentName),
        totalAnalyses: Object.keys(results).length,
        totalResolutions: resolutions.length,
        overallConfidence,
        qualityScore,
        coherenceScore,
        completenessScore,
        finalResult,
        analyses: analysesToInsert,
        resolutions,
        inconsistencies,
        processingStartedAt: session.processing_started_at,
        processingCompletedAt: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'apply_resolutions') {
      const { resolutionIds } = await req.json();
      
      await supabaseAdmin
        .from('multiagent_resolutions')
        .update({ 
          applied_at: new Date().toISOString(),
          resolution_type: 'user_validated'
        })
        .in('id', resolutionIds);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Orchestrator] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
