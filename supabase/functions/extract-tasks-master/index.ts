import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= TYPE DEFINITIONS =============

interface ProjectContext {
  id: string;
  name: string;
  address: string;
  type: 'immeuble' | 'maison' | 'appartement' | 'local_pro' | 'commerce' | string;
}

interface EDLContext {
  typeEDL: 'avant_travaux' | 'apres_travaux' | 'entree' | 'sortie' | string;
  captureMode: 'video' | 'photo_voice' | 'text' | 'mixed' | string;
}

interface VisionElement {
  type: string;
  description: string;
  location?: string;
  condition?: 'bon' | 'moyen' | 'mauvais' | 'absent';
  confidence?: number;
}

interface ExtractTasksInput {
  projectContext: ProjectContext;
  edlContext: EDLContext;
  transcript: {
    globalTranscript: string;
    segmentTranscripts?: Array<{
      timestamp: number;
      text: string;
      location?: string;
    }>;
  };
  visionElements?: VisionElement[];
  zoneTags?: string[];
  existingTasks?: any[];
  dscFamilies?: Array<{
    code: string;
    label: string;
    categories?: Array<{
      code: string;
      label: string;
    }>;
  }>;
}

interface TaskOutput {
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string | null;
  taskName: string;
  description: string;
  pieceOrZone: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  status: 'à faire';
  observations?: string;
}

interface PieceSummary {
  piece: string;
  etatGeneral: string;
  pointsForts: string;
  pointsFaibles: string;
}

interface EDLSummary {
  resumeGlobal: string;
  parPieces: PieceSummary[];
}

interface ExtractTasksOutput {
  edlSummary: EDLSummary;
  tasks: TaskOutput[];
}

// ============= SYSTEM PROMPT =============

const SYSTEM_PROMPT = `You are IAHome, the internal technical AI for Groupe MyHome (Archi Home, Bâti Home, Déco Home, Opti Home).
You are a mix of:
- building engineer,
- architect,
- économiste de la construction,
- and site manager.

You transform raw inspection data (video transcript + image analysis) into:
1) A structured EDL (état des lieux) summary.
2) A list of actionable tasks that fit into MyHome's DSC (families of tasks FT, categories, etc.).

You MUST be precise, concise, deterministic, and always output VALID JSON.
All human-visible content must be in FRENCH.`;

// ============= USER PROMPT BUILDER =============

function buildUserPrompt(input: ExtractTasksInput): string {
  const { projectContext, edlContext, transcript, visionElements, zoneTags, dscFamilies } = input;

  const visionElementsStr = visionElements?.length 
    ? JSON.stringify(visionElements, null, 2)
    : 'Aucun élément visuel détecté.';

  const zoneTagsStr = zoneTags?.length
    ? zoneTags.join(', ')
    : 'Non spécifiés';

  const dscInfo = dscFamilies?.length
    ? `\n\nNomenclature DSC disponible:\n${JSON.stringify(dscFamilies, null, 2)}`
    : '';

  return `Contexte projet:
- Nom projet: ${projectContext.name}
- Adresse: ${projectContext.address}
- Type de projet: ${projectContext.type}
- Type d'EDL: ${edlContext.typeEDL}

Données d'entrée:
1) Transcription globale (globalTranscript) en français:
${transcript.globalTranscript}

2) Éléments visuels détectés (visionElements):
${visionElementsStr}

3) Tags de zones (si présents, issus du mode guidé: Mur/Sol/Plafond/Menuiseries/Détails):
${zoneTagsStr}
${dscInfo}

Objectif:
À partir de ces données, tu dois produire:
1) Une synthèse d'état des lieux par pièce/zone.
2) Une liste de tâches structurées selon la logique DSC MyHome (familles de tâches, catégories, etc.).

FORMAT DE SORTIE:
Tu dois retourner STRICTEMENT un JSON de la forme:

{
  "edlSummary": {
    "resumeGlobal": "string",
    "parPieces": [
      {
        "piece": "string",
        "etatGeneral": "string",
        "pointsForts": "string",
        "pointsFaibles": "string"
      }
    ]
  },
  "tasks": [
    {
      "familyCode": "string",
      "familyName": "string",
      "category": "string",
      "subCategory": "string or null",
      "taskName": "string",
      "description": "string",
      "pieceOrZone": "string",
      "priority": "basse|normale|haute|urgente",
      "status": "à faire",
      "observations": "string (optional)"
    }
  ]
}

RÈGLES POUR LA SYNTHÈSE (edlSummary):
- "resumeGlobal": 3 à 6 lignes maximum, en français, ton professionnel.
- "parPieces": chaque entrée = une pièce ou zone logique:
  - Exemples: "Hall d'entrée", "Cage d'escalier", "Façade rue", "Façade cour", "Logement R+1", "Cave n°3", etc.
- "etatGeneral": court résumé (ex: "Moyen, présence de fissures et d'humidité.").
- "pointsForts": ce qui est en bon état ou valorisable.
- "pointsFaibles": pathologies, réseaux obsolètes, non-conformités, etc.

RÈGLES POUR LES TÂCHES (tasks):
- Chaque tâche doit être:
  - claire,
  - actionnable,
  - rattachée à UNE pièce/zone.
- Chaque tâche DOIT avoir:
  - familyCode: code FT si connu (F01, F02, etc.). Si la nomenclature MyHome est inconnue du modèle, utiliser une convention générique stable comme:
    - "F-GrosOeuvre"
    - "F-SecondOeuvre"
    - "F-Finitions"
    - "F-Techniques"
    - "F-ÀVérifier"
  - familyName: nom de la famille (ex: "Gros œuvre", "Électricité", "Plomberie", "Menuiseries extérieures", "Revêtements sols", etc.).
  - category: une catégorie plus précise (ex: "Façades", "Cloisons intérieures", "Réseaux EF/EC", "VMC", etc.).
  - subCategory: sous-catégorie si utile (sinon null).
  - taskName: libellé très court (ex: "Réfection enduit façade rue", "Remplacement menuiseries simple vitrage").
  - description: phrase courte expliquant la tâche (quoi + où + pourquoi).
  - pieceOrZone: nom de la pièce/zone (cohérent avec edlSummary).
  - priority:
    - "urgente" si danger, non-conformité sévère, sécurité, gros risque d'infiltration, etc.
    - "haute" si problème important mais non vital immédiatement.
    - "normale" par défaut.
    - "basse" pour les améliorations cosmétiques ou esthétiques.
  - status: toujours "à faire" initialement.
  - observations: commentaire optionnel (ex: "À valider par l'économiste", "Soumis à accord ABF").

RÈGLES DE MAPPAGE AVEC LA DSC:
- Si la structure exacte de la DSC (codes FT détaillés MyHome) est fournie par l'outil appelant, tu dois respecter ces codes et labels.
- Sinon, utilise une nomenclature propre et stable qui pourra être remappée ensuite (par exemple F-GrosOeuvre, F-SecondOeuvre, F-Finitions, F-Techniques).
- Ne pas inventer de familles aléatoires à chaque appel. Garde une logique stable:
  - Structure (gros œuvre, structure, façade, toiture)
  - Second œuvre (cloisons, doublages, menuiseries, sols)
  - Techniques (électricité, plomberie, chauffage, VMC, climatisation)
  - Finitions (peinture, revêtements, appareillages décoratifs)
  - Divers / À vérifier (pour cas incertains)

GESTION DE L'INCERTITUDE:
- Si tu n'es pas certain de la famille ou du traitement:
  - Mets:
    - familyCode: "F-ÀVérifier"
    - familyName: "À vérifier / Arbitrage humain"
    - priority: "normale"
    - observations: "Vérification nécessaire par économiste / architecte."
- Ne JAMAIS halluciner des pathologies lourdes si les données ne le justifient pas.
- Préfère le doute explicite dans observations plutôt que l'invention.

STYLE:
- Tout le contenu textuel doit être en français correct, avec un ton professionnel.
- Pas de style bavard, pas de storytelling, pas d'emojis.
- Tu es un outil de production, pas un assistant marketing.

IMPORTANT:
- Tu dois TOUJOURS retourner un JSON valide correspondant au schéma donné.
- Ne jamais retourner de texte hors du JSON (pas de phrase introductive).
- La moindre erreur de format cassera l'app, donc sois strict.`;
}

// ============= MAIN FUNCTION =============

async function extractTasksFromEDL(input: ExtractTasksInput): Promise<ExtractTasksOutput> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const userPrompt = buildUserPrompt(input);

  console.log('[extract-tasks-master] Calling GPT-4.1 with prompt length:', userPrompt.length);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 8000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[extract-tasks-master] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    console.error('[extract-tasks-master] Invalid response structure:', data);
    throw new Error('Invalid response from OpenAI');
  }

  const content = data.choices[0].message.content;
  
  try {
    const result = JSON.parse(content) as ExtractTasksOutput;
    
    // Validate structure
    if (!result.edlSummary || !result.tasks) {
      throw new Error('Missing required fields in response');
    }
    
    // Ensure all tasks have required fields with defaults
    result.tasks = result.tasks.map(task => ({
      ...task,
      familyCode: task.familyCode || 'F-ÀVérifier',
      familyName: task.familyName || 'À vérifier / Arbitrage humain',
      category: task.category || 'Non classé',
      subCategory: task.subCategory || null,
      taskName: task.taskName || 'Tâche sans nom',
      description: task.description || '',
      pieceOrZone: task.pieceOrZone || 'Non localisé',
      priority: task.priority || 'normale',
      status: 'à faire' as const,
      observations: task.observations || undefined,
    }));

    console.log('[extract-tasks-master] Successfully extracted:', {
      summaryPieces: result.edlSummary.parPieces?.length || 0,
      tasksCount: result.tasks.length,
    });

    return result;
  } catch (parseError) {
    console.error('[extract-tasks-master] JSON parse error:', parseError, 'Content:', content.substring(0, 500));
    throw new Error('Failed to parse GPT response as JSON');
  }
}

// ============= HTTP HANDLER =============

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: ExtractTasksInput = await req.json();

    // Validate required fields
    if (!input.projectContext?.id || !input.projectContext?.name) {
      return new Response(
        JSON.stringify({ error: 'Missing projectContext.id or projectContext.name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.edlContext?.typeEDL) {
      return new Response(
        JSON.stringify({ error: 'Missing edlContext.typeEDL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.transcript?.globalTranscript) {
      return new Response(
        JSON.stringify({ error: 'Missing transcript.globalTranscript' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[extract-tasks-master] Processing request for project:', input.projectContext.name);

    const result = await extractTasksFromEDL(input);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-tasks-master] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        edlSummary: {
          resumeGlobal: 'Erreur lors de l\'extraction des tâches.',
          parPieces: []
        },
        tasks: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});