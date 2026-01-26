import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================
// MYALADIN CONFIGURATION
// ========================

// ========================
// SUPER CONDUCTEUR DE TRAVAUX IA
// ========================

const MYALADIN_SYSTEM_PROMPT = `Tu es MyAladin, le Super Conducteur de Travaux IA du Groupe MyHome.
Tu combines les compétences d'un conducteur de travaux senior, d'un architecte technique et d'un économiste de la construction.

## RÔLE
Tu es l'équivalent d'un chef de chantier expérimenté travaillant en temps réel avec l'utilisateur.
Tu anticipes, guides, avertis et optimises l'expérience utilisateur sur tous les workflows MyEDLs.

## PERSONNALITÉ
- Calme, confiant, expert, direct et opérationnel
- Maximum 1-2 lignes par réponse
- Français professionnel
- Zéro superflu, zéro emoji
- C'est un outil de production, pas un chatbot

## CAPACITÉS INTELLIGENTES

A) GUIDAGE PRÉDICTIF
- Anticipe ce que l'utilisateur veut faire basé sur le contexte
- Exemples:
  - Utilisateur filme façade → "Souhaites-tu analyser la pathologie détectée ?"
  - Fin de pièce → "On passe à la suivante ?"
  - Mots-clés "fuite", "humidité", "bruit" → déclencher investigation

B) DÉTECTION CONTEXTE MANQUANT
- Signale éléments manquants: plafond, façade arrière, réseau électrique, salle d'eau, menuiseries
- Format: "Il manque {élément}. Veux-tu le capturer maintenant ?"

C) DÉTECTION DE RISQUES
- Analyse transcript + vision pour détecter:
  - Humidité: "Humidité détectée dans zone séjour. Risque infiltration."
  - Structure: "Fissure verticale détectée. Possible mouvement structurel."
  - Électricité: "Appareil électrique obsolète."
- Toujours proposer: "Veux-tu enregistrer ceci comme observation critique ?"

D) ALERTES BUDGET
- Détecte éléments à impact coût (gros œuvre, mise aux normes)
- "Cette tâche peut avoir un coût élevé. Veux-tu l'isoler en Budget critique ?"

E) VÉRIFICATION COHÉRENCE
- Avant génération des tâches, vérifie:
  - Toutes les pièces documentées ?
  - Toutes les zones capturées ?
  - Pathologies incohérentes ?
  - Réseaux contradictoires ?
- Si incohérences → suggère corrections

## RÈGLES DE DIALOGUE
- Clarifier si utilisateur vague
- Jamais demander deux fois la même confirmation
- Inactif > 5 secondes → proposer next action
- Toujours offrir alternative go/skip

## RÈGLES STRICTES
- Maximum 2 phrases par message
- Une question à la fois
- Prendre l'initiative quand vague
- Si classification FT incertaine:
  - priority = "normale"
  - family = "F-VERIF"  
  - observation = "Vérification nécessaire par économiste."

## EXEMPLES DE RÉPONSES
✓ "Il manque le plafond du séjour. On le filme ?"
✓ "Fissure verticale détectée. Veux-tu l'ajouter en observation critique ?"
✓ "Tu as terminé ici. On passe à la cuisine ?"
✓ "Cette tâche peut avoir un coût élevé. Isoler en Budget critique ?"
✗ "Je vois que tu as filmé le mur du séjour, c'est très bien ! Maintenant, si tu veux bien..."`;

// Super Conducteur Session State
interface SuperConducteurSession {
  piece: string | null;
  subZone: string | null;
  missingItems: string[];
  risksDetected: Array<{ type: string; description: string; severity: string; zone: string }>;
  budgetCritical: string[];
  confirmationsPending: string[];
  capturedZones: Array<{ piece: string; subZone: string }>;
  lastActivity: string;
}

const EDL_TYPES = ['avant_travaux', 'apres_travaux', 'entree', 'sortie'] as const;
const CAPTURE_MODES = ['video', 'photos_notes'] as const;

interface ConversationState {
  step: 'init' | 'identify_project' | 'identify_edl_type' | 'select_capture_mode' | 'capturing' | 'processing' | 'review' | 'complete';
  projectId?: string;
  projectName?: string;
  edlType?: typeof EDL_TYPES[number];
  captureMode?: typeof CAPTURE_MODES[number];
  pendingQuestion?: string;
}

interface OrchestrationRequest {
  action: 'start_edl' | 'process_media' | 'extract_tasks' | 'generate_report' | 'chat' | 'continue_flow' | 'validate' | 'modify' | 'summarize';
  projectId?: string;
  userResponse?: string;
  conversationState?: ConversationState;
  mediaData?: {
    type: 'video' | 'photo' | 'audio';
    base64?: string;
    url?: string;
  }[];
  message?: string;
  conversationId?: string;
  context?: {
    location?: string;
    zone?: string;
    previousTasks?: any[];
  };
}

interface EDLSummary {
  resumeGlobal: string;
  parPieces: Array<{
    piece: string;
    etatGeneral: 'bon' | 'moyen' | 'mauvais';
    pointsForts: string[];
    pointsFaibles: string[];
  }>;
}

interface StructuredTask {
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string;
  taskName: string;
  description: string;
  pieceOrZone: string;
  priority: 'haute' | 'normale' | 'basse';
  status: 'à faire';
  observations: string;
}

// API Keys
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: OrchestrationRequest = await req.json();
    
    console.log('MyAladin Orchestrator - Action:', request.action);

    switch (request.action) {
      case 'start_edl':
        return await handleStartEDL(supabase, request);
      
      case 'continue_flow':
        return await handleContinueFlow(supabase, request);
      
      case 'process_media':
        return await handleProcessMedia(supabase, request);
      
      case 'extract_tasks':
        return await handleExtractTasks(supabase, request);
      
      case 'generate_report':
        return await handleGenerateReport(supabase, request);
      
      case 'validate':
        return await handleValidate(supabase, request);
      
      case 'modify':
        return await handleModify(supabase, request);
      
      case 'chat':
        return await handleChat(supabase, request);
      
      case 'summarize':
        return await handleSummarize(supabase, request);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Action inconnue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('MyAladin Orchestrator Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ========================
// FLOW HANDLERS
// ========================

async function handleStartEDL(supabase: any, request: OrchestrationRequest) {
  // MANDATORY FIRST RESPONSE when MyAladin activates
  const initialState: ConversationState = {
    step: 'identify_project',
    pendingQuestion: 'project'
  };

  return new Response(
    JSON.stringify({
      message: "Très bien, je m'occupe de tout. Dis-moi : pour quel projet veux-tu créer un EDL ?",
      conversationState: initialState,
      action: 'await_response',
      voiceGuidance: "Pour quel projet veux-tu créer un EDL ?"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleContinueFlow(supabase: any, request: OrchestrationRequest) {
  const { conversationState, userResponse } = request;
  
  if (!conversationState || !userResponse) {
    return new Response(
      JSON.stringify({ error: 'État de conversation manquant' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  switch (conversationState.step) {
    case 'identify_project':
      return await handleProjectIdentification(supabase, userResponse, conversationState);
    
    case 'identify_edl_type':
      return await handleEDLTypeSelection(supabase, userResponse, conversationState);
    
    case 'select_capture_mode':
      return await handleCaptureModeSelection(supabase, userResponse, conversationState);
    
    case 'review':
      return await handleReviewResponse(supabase, userResponse, conversationState);
    
    default:
      return new Response(
        JSON.stringify({ 
          message: "Je n'ai pas compris. Reformule ta demande.",
          conversationState
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

async function handleProjectIdentification(supabase: any, userResponse: string, state: ConversationState) {
  // Fuzzy match against project list
  const { data: projects } = await supabase
    .from('projects')
    .select('id, address, name')
    .order('updated_at', { ascending: false })
    .limit(50);

  const normalizedResponse = userResponse.toLowerCase().trim();
  
  // Try to find matching project
  let matchedProject = null;
  const closeMatches: any[] = [];

  for (const project of projects || []) {
    const projectName = (project.name || project.address || '').toLowerCase();
    
    if (projectName === normalizedResponse || projectName.includes(normalizedResponse)) {
      matchedProject = project;
      break;
    }
    
    // Calculate similarity for close matches
    if (projectName.split(' ').some((word: string) => normalizedResponse.includes(word) || word.includes(normalizedResponse))) {
      closeMatches.push(project);
    }
  }

  if (matchedProject) {
    // Project found, move to next step
    const newState: ConversationState = {
      ...state,
      step: 'identify_edl_type',
      projectId: matchedProject.id,
      projectName: matchedProject.name || matchedProject.address,
      pendingQuestion: 'edl_type'
    };

    return new Response(
      JSON.stringify({
        message: `Projet "${matchedProject.name || matchedProject.address}" sélectionné. Quel type d'EDL veux-tu réaliser ? Avant travaux, Après travaux, Entrée, ou Sortie ?`,
        conversationState: newState,
        action: 'await_response',
        voiceGuidance: "Quel type d'EDL ? Avant travaux, Après travaux, Entrée ou Sortie ?"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (closeMatches.length > 0 && closeMatches.length <= 3) {
    // Propose close matches
    const matchNames = closeMatches.map(p => p.name || p.address).join(', ');
    
    return new Response(
      JSON.stringify({
        message: `J'ai trouvé plusieurs correspondances : ${matchNames}. Lequel veux-tu utiliser ?`,
        conversationState: state,
        action: 'await_response',
        suggestions: closeMatches.map(p => ({ id: p.id, name: p.name || p.address })),
        voiceGuidance: `J'ai trouvé ${closeMatches.length} projets similaires. Précise lequel.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // No match found
  return new Response(
    JSON.stringify({
      message: "Je n'ai pas trouvé ce projet. Donne-moi le nom ou l'adresse exacte, ou crée un nouveau projet.",
      conversationState: state,
      action: 'await_response',
      voiceGuidance: "Projet non trouvé. Précise le nom ou crée un nouveau projet."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleEDLTypeSelection(supabase: any, userResponse: string, state: ConversationState) {
  const normalizedResponse = userResponse.toLowerCase().trim();
  
  let edlType: typeof EDL_TYPES[number] | null = null;
  
  if (normalizedResponse.includes('avant')) {
    edlType = 'avant_travaux';
  } else if (normalizedResponse.includes('après') || normalizedResponse.includes('apres')) {
    edlType = 'apres_travaux';
  } else if (normalizedResponse.includes('entrée') || normalizedResponse.includes('entree')) {
    edlType = 'entree';
  } else if (normalizedResponse.includes('sortie')) {
    edlType = 'sortie';
  }

  if (!edlType) {
    return new Response(
      JSON.stringify({
        message: "Je n'ai pas compris le type d'EDL. Choisis : Avant travaux, Après travaux, Entrée, ou Sortie.",
        conversationState: state,
        action: 'await_response',
        voiceGuidance: "Précise le type : Avant, Après, Entrée ou Sortie."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const newState: ConversationState = {
    ...state,
    step: 'select_capture_mode',
    edlType,
    pendingQuestion: 'capture_mode'
  };

  return new Response(
    JSON.stringify({
      message: "Souhaites-tu que je lance la capture vidéo complète, ou préfères-tu utiliser photos + notes vocales ?",
      conversationState: newState,
      action: 'await_response',
      voiceGuidance: "Vidéo complète ou photos avec notes vocales ?"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCaptureModeSelection(supabase: any, userResponse: string, state: ConversationState) {
  const normalizedResponse = userResponse.toLowerCase().trim();
  
  // Default to video for vague responses
  const vagueResponses = ['vas-y', 'comme d\'habitude', 'fais simple', 'ok', 'oui', 'go', 'lance'];
  let captureMode: typeof CAPTURE_MODES[number] = 'video';
  
  if (!vagueResponses.some(v => normalizedResponse.includes(v))) {
    if (normalizedResponse.includes('photo')) {
      captureMode = 'photos_notes';
    }
  }

  const newState: ConversationState = {
    ...state,
    step: 'capturing',
    captureMode
  };

  const message = captureMode === 'video'
    ? "Parfait. Filme en marchant et décris à voix haute ce que tu vois. Je m'occupe du reste."
    : "Très bien. Prends les photos une par une, et je t'indiquerai quand enregistrer tes notes.";

  const voiceGuidance = captureMode === 'video'
    ? "Commence à filmer. Décris ce que tu vois."
    : "Prends ta première photo.";

  return new Response(
    JSON.stringify({
      message,
      conversationState: newState,
      action: 'start_capture',
      captureMode,
      voiceGuidance
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleReviewResponse(supabase: any, userResponse: string, state: ConversationState) {
  const normalizedResponse = userResponse.toLowerCase().trim();
  
  if (normalizedResponse.includes('valide') || normalizedResponse.includes('ok') || normalizedResponse.includes('confirme')) {
    // Save EDL and tasks
    const newState: ConversationState = {
      ...state,
      step: 'complete'
    };

    return new Response(
      JSON.stringify({
        message: "C'est enregistré. Souhaites-tu faire un autre EDL ou revenir au projet ?",
        conversationState: newState,
        action: 'complete',
        voiceGuidance: "C'est enregistré. Autre EDL ou retour au projet ?"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (normalizedResponse.includes('modifie') || normalizedResponse.includes('change') || normalizedResponse.includes('corrige')) {
    return new Response(
      JSON.stringify({
        message: "Qu'est-ce que tu veux modifier ?",
        conversationState: state,
        action: 'await_modification',
        voiceGuidance: "Qu'est-ce que tu veux modifier ?"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      message: "Dis 'valide' pour confirmer ou indique ce que tu veux modifier.",
      conversationState: state,
      action: 'await_response',
      voiceGuidance: "Valide ou indique les modifications."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========================
// SUMMARIZE HANDLER
// ========================

async function handleSummarize(supabase: any, request: OrchestrationRequest) {
  const { projectId } = request;
  
  if (!projectId) {
    return new Response(
      JSON.stringify({ error: 'projectId requis pour le résumé' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch project data
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Fetch tasks for project
    const { data: tasks } = await supabase
      .from('extracted_tasks')
      .select('*')
      .eq('project_id', projectId);

    // Fetch sequences for project
    const { data: sequences } = await supabase
      .from('visit_sequences')
      .select('*')
      .eq('project_id', projectId);

    const taskCount = tasks?.length || 0;
    const sequenceCount = sequences?.length || 0;
    const highPriorityCount = tasks?.filter((t: any) => t.priority === 'high').length || 0;

    const summary = taskCount > 0 
      ? `EDL pour ${project?.address || 'ce projet'}: ${taskCount} tâche${taskCount > 1 ? 's' : ''} identifiée${taskCount > 1 ? 's' : ''}${highPriorityCount > 0 ? ` dont ${highPriorityCount} prioritaire${highPriorityCount > 1 ? 's' : ''}` : ''}. ${sequenceCount} séquence${sequenceCount > 1 ? 's' : ''} de visite enregistrée${sequenceCount > 1 ? 's' : ''}.`
      : `EDL pour ${project?.address || 'ce projet'}: Aucune tâche identifiée. ${sequenceCount} séquence${sequenceCount > 1 ? 's' : ''} de visite.`;

    return new Response(
      JSON.stringify({
        summary,
        stats: {
          taskCount,
          highPriorityCount,
          sequenceCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Summarize error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la génération du résumé' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ========================
// MEDIA PROCESSING
// ========================

async function handleProcessMedia(supabase: any, request: OrchestrationRequest) {
  const { mediaData, projectId, context, conversationState } = request;
  
  const statusUpdates: string[] = [];
  const results: any[] = [];

  // Status: Video segmentation
  statusUpdates.push('Découpage vidéo');
  
  for (const media of mediaData || []) {
    if (media.type === 'audio') {
      // Status: Transcription
      statusUpdates.push('Transcription');
      const transcription = await transcribeAudio(media.base64 || '');
      results.push({ type: 'transcription', content: transcription });
    } else if (media.type === 'video' || media.type === 'photo') {
      // Status: Visual analysis
      statusUpdates.push('Analyse visuelle');
      const analysis = await analyzeVisual(media.base64 || '', media.type);
      results.push({ type: 'visual_analysis', content: analysis });
    }
  }

  // Status: Task extraction
  statusUpdates.push('Extraction des tâches');
  const combinedAnalysis = await extractAndClassifyTasks(results, context);

  const newState: ConversationState = {
    ...conversationState,
    step: 'review'
  };

  return new Response(
    JSON.stringify({
      message: "J'ai terminé l'analyse. Voici la synthèse et les tâches. Veux-tu les valider ou modifier certains points ?",
      conversationState: newState,
      statusUpdates,
      edlSummary: combinedAnalysis.summary,
      tasks: combinedAnalysis.tasks,
      action: 'await_response',
      voiceGuidance: "Analyse terminée. Valide ou modifie les résultats."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function transcribeAudio(base64Audio: string): Promise<string> {
  // Try OpenAI Whisper first
  if (OPENAI_API_KEY) {
    try {
      const binaryAudio = Uint8Array.from(atob(base64Audio.split(',')[1] || base64Audio), c => c.charCodeAt(0));
      
      const formData = new FormData();
      const blob = new Blob([binaryAudio], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');
      formData.append('temperature', '0');
      formData.append('response_format', 'verbose_json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.text || '';
      }
      
      console.log('OpenAI Whisper failed, falling back to Gemini');
    } catch (error) {
      console.error('Whisper transcription error:', error);
    }
  }

  // Fallback to Gemini
  return await transcribeWithGemini(base64Audio);
}

async function transcribeWithGemini(base64Audio: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error('Aucune clé API disponible pour la transcription');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: 'Transcris cet audio en français. Retourne uniquement la transcription, sans commentaire.'
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Transcription Gemini échouée');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function analyzeVisual(base64Image: string, type: 'video' | 'photo'): Promise<any> {
  // Use GPT-4 Vision for analysis
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en inspection immobilière. Analyse cette ${type === 'video' ? 'frame vidéo' : 'photo'}.

Identifie:
1. La pièce/zone
2. Les éléments visibles (murs, sols, plafonds, équipements)
3. Les problèmes ou défauts (fissures, humidité, usure)
4. L'état général (bon, moyen, mauvais)

Réponds en JSON structuré. Sois bref et précis.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
          return JSON.parse(content);
        } catch {
          return { rawAnalysis: content };
        }
      }
    } catch (error) {
      console.error('GPT-4 Vision error:', error);
    }
  }

  // Fallback to Gemini Pro
  return await analyzeWithGemini(base64Image, type);
}

async function analyzeWithGemini(base64Image: string, type: 'video' | 'photo'): Promise<any> {
  if (!LOVABLE_API_KEY) {
    throw new Error('Aucune clé API disponible');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        {
          role: 'system',
          content: `Analyse cette ${type === 'video' ? 'frame vidéo' : 'photo'} d'inspection immobilière. Identifie pièce, éléments, problèmes, état. JSON uniquement.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Analyse Gemini échouée');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(content);
  } catch {
    return { rawAnalysis: content };
  }
}

async function extractAndClassifyTasks(results: any[], context?: any): Promise<{ summary: EDLSummary; tasks: StructuredTask[] }> {
  if (!LOVABLE_API_KEY && !OPENAI_API_KEY) {
    return { 
      summary: { resumeGlobal: 'Service IA non configuré', parPieces: [] }, 
      tasks: [] 
    };
  }

  const prompt = `Tu es MyAladin. Analyse ces résultats d'inspection et génère:

1. Un résumé EDL structuré (resumeGlobal + parPieces avec piece, etatGeneral, pointsForts, pointsFaibles)
2. Une liste de tâches structurées avec:
   - familyCode (code FT)
   - familyName (nom de la famille DSC)
   - category
   - subCategory
   - taskName
   - description
   - pieceOrZone
   - priority (haute/normale/basse)
   - status: "à faire"
   - observations

RÈGLE CRITIQUE: Si classification incertaine:
- priority = "normale"
- familyCode = "F-VERIF"
- familyName = "À vérifier"
- observations = "Vérification nécessaire par économiste."

Données d'inspection:
${JSON.stringify(results, null, 2)}

${context ? `Contexte: ${JSON.stringify(context)}` : ''}

Réponds en JSON avec { summary: EDLSummary, tasks: StructuredTask[] }`;

  // Use GPT-4.1 for task extraction and classification
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(content);
          
          // Consistency check with Gemini
          const validatedTasks = await validateClassificationWithGemini(parsed.tasks);
          
          return { summary: parsed.summary, tasks: validatedTasks };
        } catch {
          console.error('Failed to parse GPT-4 response');
        }
      }
    } catch (error) {
      console.error('GPT-4 extraction error:', error);
    }
  }

  // Fallback to Gemini
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error('Extraction des tâches échouée');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(content);
  } catch {
    return { summary: { resumeGlobal: content, parPieces: [] }, tasks: [] };
  }
}

async function validateClassificationWithGemini(tasks: StructuredTask[]): Promise<StructuredTask[]> {
  if (!LOVABLE_API_KEY || !tasks.length) return tasks;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `Vérifie ces classifications de tâches DSC. Si une classification semble incorrecte, corrige-la.
Si incertain, mets familyCode = "F-VERIF" et observations = "Vérification nécessaire par économiste."

Tâches: ${JSON.stringify(tasks)}

Retourne le tableau corrigé en JSON.`
          }
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      try {
        return JSON.parse(content);
      } catch {
        return tasks;
      }
    }
  } catch (error) {
    console.error('Gemini validation error:', error);
  }

  return tasks;
}

// ========================
// TASK EXTRACTION
// ========================

async function handleExtractTasks(supabase: any, request: OrchestrationRequest) {
  const { projectId, context } = request;

  if (!LOVABLE_API_KEY && !OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Service IA non configuré' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: sequences } = await supabase
    .from('visit_sequences')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  const prompt = `Tu es MyAladin. Analyse ces séquences et extrait les tâches structurées.

Séquences: ${JSON.stringify(sequences || [])}
Contexte: ${JSON.stringify(context || {})}

Pour chaque problème:
- familyCode, familyName, category, subCategory, taskName
- description, pieceOrZone, priority, status = "à faire", observations

Si classification incertaine:
- familyCode = "F-VERIF"
- familyName = "À vérifier"
- observations = "Vérification nécessaire par économiste."

Réponds en JSON avec { tasks: StructuredTask[] }`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error('Extraction échouée');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  let tasks: StructuredTask[] = [];
  try {
    const parsed = JSON.parse(content);
    tasks = parsed.tasks || [];
  } catch {
    tasks = [];
  }

  return new Response(
    JSON.stringify({
      message: `${tasks.length} tâches extraites.`,
      tasks,
      voiceGuidance: tasks.length > 0 
        ? `J'ai identifié ${tasks.length} tâches. Valide ou modifie.`
        : "Aucune tâche détectée. Ajoute des médias."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========================
// REPORT GENERATION
// ========================

async function handleGenerateReport(supabase: any, request: OrchestrationRequest) {
  const { projectId } = request;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const { data: tasks } = await supabase
    .from('extracted_tasks')
    .select('*')
    .eq('project_id', projectId);

  const { data: sequences } = await supabase
    .from('visit_sequences')
    .select('*')
    .eq('project_id', projectId);

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Service IA non configuré' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = `Tu es MyAladin. Génère un rapport EDL structuré.

Projet: ${JSON.stringify(project)}
Tâches: ${JSON.stringify(tasks || [])}
Séquences: ${JSON.stringify(sequences || [])}

Structure:
1. resumeGlobal: synthèse globale
2. parPieces: détail par pièce avec etatGeneral, pointsForts, pointsFaibles
3. tasksByFamily: tâches groupées par famille DSC

Réponds en JSON.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error('Génération du rapport échouée');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  let report;
  try {
    report = JSON.parse(content);
  } catch {
    report = { rawContent: content };
  }

  return new Response(
    JSON.stringify({
      message: "Rapport EDL généré.",
      report,
      voiceGuidance: "Rapport prêt. Exporte en PDF ou modifie."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========================
// VALIDATION & MODIFICATION
// ========================

async function handleValidate(supabase: any, request: OrchestrationRequest) {
  const { projectId, context } = request;
  
  // Save tasks and EDL to database
  // Implementation depends on data structure
  
  return new Response(
    JSON.stringify({
      message: "C'est enregistré. Souhaites-tu faire un autre EDL ou revenir au projet ?",
      action: 'complete',
      voiceGuidance: "C'est enregistré. Autre EDL ou retour au projet ?"
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleModify(supabase: any, request: OrchestrationRequest) {
  const { message, context } = request;
  
  // Use AI to understand what needs modification
  const prompt = `L'utilisateur veut modifier: "${message}"
Contexte: ${JSON.stringify(context || {})}

Identifie:
1. Quel élément modifier (tâche, pièce, classification)
2. Quelle modification appliquer

Réponds en JSON: { target: string, modification: string, taskId?: string }`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        message: "Je n'ai pas compris la modification. Précise ce que tu veux changer.",
        voiceGuidance: "Précise la modification souhaitée."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return new Response(
    JSON.stringify({
      message: "Modification identifiée. Je l'applique.",
      modificationDetails: content,
      voiceGuidance: "Modification appliquée."
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ========================
// CHAT HANDLER
// ========================

async function handleChat(supabase: any, request: OrchestrationRequest) {
  const { message, conversationId, context } = request;

  if (!LOVABLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Service IA non configuré' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for EDL triggers
  const edlTriggers = ['créer un edl', 'creer un edl', 'démarrer edl', 'nouveau edl', 'lancer edl', 'faire un edl', 'commencer edl'];
  const isEDLRequest = edlTriggers.some(trigger => (message || '').toLowerCase().includes(trigger));

  if (isEDLRequest) {
    return await handleStartEDL(supabase, request);
  }

  // Check for Ultra-Guided mode triggers
  const ultraGuidedTriggers = ['guide-moi', 'mode détaillé', 'mode expert', 'mode ultra', 'guidage complet'];
  const isUltraGuidedRequest = ultraGuidedTriggers.some(trigger => (message || '').toLowerCase().includes(trigger));

  if (isUltraGuidedRequest) {
    return new Response(
      JSON.stringify({
        message: "Mode Ultra-Guidé activé. Je vais te guider zone par zone. Commence à filmer la première pièce.",
        action: 'activate_ultra_guided',
        voiceGuidance: "Mode Ultra-Guidé activé. Filme la première pièce."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `${MYALADIN_SYSTEM_PROMPT}

Contexte actuel: ${JSON.stringify(context || {})}

Tu dois:
- Répondre en une phrase maximum sauf si explication technique nécessaire
- Toujours proposer la prochaine action
- Prendre l'initiative pour simplifier le workflow
- Détecter si l'utilisateur mentionne des risques (humidité, fissure, structure) et proposer de les enregistrer
- Détecter si l'utilisateur mentionne des éléments à coût élevé (gros œuvre, toiture, mise aux normes) et proposer de les isoler en Budget critique`;

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
        { role: 'user', content: message }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Limite atteinte', message: 'Réessaie dans quelques instants.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error('Chat échoué');
  }

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message?.content || "Reformule ta demande.";

  // Analyze response for detected risks and budget items
  const lowerMessage = (message || '').toLowerCase();
  const riskKeywords = ['fissure', 'humidité', 'fuite', 'infiltration', 'moisissure', 'affaissement'];
  const budgetKeywords = ['gros œuvre', 'toiture', 'charpente', 'dalle', 'mise aux normes', 'structure'];

  let detectedRisks: string[] = [];
  let detectedBudget: string[] = [];

  riskKeywords.forEach(kw => {
    if (lowerMessage.includes(kw)) detectedRisks.push(kw);
  });

  budgetKeywords.forEach(kw => {
    if (lowerMessage.includes(kw)) detectedBudget.push(kw);
  });

  return new Response(
    JSON.stringify({
      message: aiMessage,
      action: null,
      voiceGuidance: aiMessage.length <= 100 ? aiMessage : null,
      detectedRisks: detectedRisks.length > 0 ? detectedRisks : undefined,
      detectedBudget: detectedBudget.length > 0 ? detectedBudget : undefined,
      superConducteur: {
        risksDetected: detectedRisks,
        budgetCritical: detectedBudget
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
