// @ts-nocheck
// Contexte Deno (Edge Function) : neutralise les erreurs TS dans l'éditeur.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper pour appeler Gemini directement
async function callGeminiDirect(
  model: string,
  messages: Array<{ role: string; content: string | any[] }>,
  systemPrompt?: string,
  apiKey?: string
): Promise<any> {
  const googleApiKey = apiKey || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
  
  if (!googleApiKey) {
    throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured. Please set it in Supabase Edge Functions secrets.');
  }

  // Convertir les messages en format Gemini
  const contents: any[] = [];
  let systemInstruction: any = undefined;
  
  if (systemPrompt) {
    systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  for (const msg of messages) {
    if (msg.role === 'system' && !systemInstruction) {
      systemInstruction = {
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
      };
      continue;
    }

    if (msg.role === 'user' || msg.role === 'model') {
      const parts: any[] = [];

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'text') {
            parts.push({ text: item.text });
          } else if (item.type === 'image_url') {
            const imageUrl = item.image_url?.url || '';
            if (imageUrl.startsWith('data:')) {
              const match = imageUrl.match(/data:([^;]+);base64,(.+)/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1] || 'image/jpeg',
                    data: match[2]
                  }
                });
              }
            }
          }
        }
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts
        });
      }
    }
  }

  const requestBody: any = {
    contents,
    ...(systemInstruction && { systemInstruction }),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };

  const geminiModelName = model.includes('gemini') 
    ? model.replace('google/', '').replace('gemini-', 'gemini-')
    : `gemini-${model}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelName}:generateContent?key=${googleApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error('Rate limit exceeded');
    if (response.status === 401 || response.status === 403) throw new Error('Invalid Google API key');
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No candidates returned from Gemini API');
  }

  // Convertir en format compatible Lovable
  const candidate = data.candidates[0];
  const text = candidate.content.parts[0]?.text || '';
  
  return {
    choices: [{
      message: {
        content: text,
        role: 'assistant'
      },
      finish_reason: candidate.finishReason
    }],
    usage: data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount,
      completion_tokens: data.usageMetadata.candidatesTokenCount,
      total_tokens: data.usageMetadata.totalTokenCount
    } : undefined
  };
}

// Helper avec retry simple sur rate limit
async function callGeminiWithRetry(
  model: string,
  messages: Array<{ role: string; content: string | any[] }>,
  systemPrompt?: string,
  apiKey?: string,
  attempts = 5,
  baseDelayMs = 1200
): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiDirect(model, messages, systemPrompt, apiKey);
    } catch (err: any) {
      const msg = err?.message || '';
      const isRateLimit = msg.toLowerCase().includes('rate limit') || msg.includes('429');
      if (!isRateLimit || i === attempts - 1) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, i);
      console.warn(`[edl-ai-pipeline] Gemini rate limit, retry ${i + 2}/${attempts} in ${delay}ms`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  // Should never reach here
  throw new Error('Unexpected retry exhaustion');
}

// Explicit export to satisfy bundlers/TS
export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY'); // Support les deux noms
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

interface PipelineRequest {
  step: 'segment' | 'transcribe' | 'vision' | 'extract';
  videoUrl?: string;
  audioBase64?: string;
  photoUrls?: string[];
  segments?: any[];
  globalTranscript?: string;
  visionElements?: any[];
  projectContext?: {
    projectId: string;
    address: string;
    edlType: string;
  };
  captureMode: 'video' | 'photo_voice';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: PipelineRequest | null = null;

  try {
    requestBody = await req.json();
    const { step, captureMode } = requestBody;

    console.log(`EDL AI Pipeline - Step: ${step}, Mode: ${captureMode}`);

    let result: any = {};

    switch (step) {
      case 'segment':
        result = await runSegmentation(requestBody);
        break;
      case 'transcribe':
        result = await runTranscription(requestBody);
        break;
      case 'vision':
        result = await runVisionAnalysis(requestBody);
        break;
      case 'extract':
        result = await runTaskExtraction(requestBody);
        break;
      default:
        throw new Error(`Unknown step: ${step}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('EDL AI Pipeline error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Pipeline error';
    
    // Déterminer le status code approprié
    let status = 500;
    if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
      status = 429;
    } else if (errorMessage.includes('Payment') || errorMessage.includes('402')) {
      status = 402;
    } else if (errorMessage.includes('Failed to fetch') || 
               errorMessage.includes('Network') || 
               errorMessage.includes('DNS') ||
               errorMessage.includes('ECONNREFUSED')) {
      status = 503; // Service Unavailable pour erreurs réseau
    } else if (errorMessage.includes('DTC taxonomy') || 
               errorMessage.includes('nomenclature') ||
               errorMessage.includes('empty or incomplete')) {
      status = 500; // Server error pour problèmes de données
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        step: requestBody?.step || 'unknown'
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Step 1: Video Segmentation using Gemini
async function runSegmentation(body: PipelineRequest) {
  const { videoUrl, captureMode, projectContext } = body;

  // Skip segmentation for photo_voice mode
  if (captureMode === 'photo_voice') {
    return { segments: [], skipped: true };
  }

  if (!videoUrl) {
    throw new Error('Video URL required for segmentation');
  }

  const prompt = `You are IAHome, a building inspection AI.
Analyze this video URL and provide time-based segmentation.
For each distinct room or area shown, return a segment with:
- startTime (seconds)
- endTime (seconds)
- location (detected room/area name in French)
- description (brief description of what is visible)

Return a JSON array of segments.
Video URL: ${videoUrl}
Project context: ${JSON.stringify(projectContext)}`;

  // Utiliser Gemini directement
  if (!GOOGLE_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Supabase Edge Functions secrets.');
  }

  const data = await callGeminiDirect(
    'gemini-1.0-pro-001',
    [
      { role: 'system', content: 'You are a building inspection video analyzer. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    'You are a building inspection video analyzer. Return only valid JSON.',
    GOOGLE_API_KEY
  );
  const content = data.choices?.[0]?.message?.content || '[]';
  
  let segments = [];
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      segments = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Could not parse segmentation response:', e);
    // Return default segment covering whole video
    segments = [{
      startTime: 0,
      endTime: 300,
      location: 'Visite globale',
      description: 'Parcours vidéo complet'
    }];
  }

  return { segments };
}

// Step 2: Transcription using Whisper (with Gemini fallback)
async function runTranscription(body: PipelineRequest) {
  const { audioBase64, captureMode, segments } = body;

  if (!audioBase64) {
    return { globalTranscript: '', segmentTranscripts: [] };
  }

  let globalTranscript = '';
  let transcriptionSource = 'whisper';

  // Try OpenAI Whisper first
  if (OPENAI_API_KEY) {
    try {
      // Convert base64 to blob
      const binaryAudio = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([binaryAudio], { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'fr');
      formData.append('response_format', 'verbose_json');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (whisperResponse.ok) {
        const whisperData = await whisperResponse.json();
        globalTranscript = whisperData.text || '';
        console.log('Whisper transcription successful');
      } else {
        throw new Error('Whisper failed');
      }
    } catch (whisperError) {
      console.warn('Whisper transcription failed, using Gemini fallback:', whisperError);
      transcriptionSource = 'gemini';
    }
  } else {
    transcriptionSource = 'gemini';
  }

  // Gemini fallback
  if (transcriptionSource === 'gemini' || !globalTranscript) {
    const geminiPrompt = `Transcribe the following audio recording in French. 
This is a building inspection (état des lieux) recording.
Add proper punctuation and structure.
Audio content (base64): [Audio data attached]`;

    // Utiliser Gemini directement
    if (GOOGLE_API_KEY) {
      try {
        const geminiData = await callGeminiDirect(
          'gemini-1.0-pro-001',
          [
            { role: 'system', content: 'You are a French transcription specialist for building inspections.' },
            { role: 'user', content: geminiPrompt }
          ],
          'You are a French transcription specialist for building inspections.',
          GOOGLE_API_KEY
        );
        
        globalTranscript = geminiData.choices?.[0]?.message?.content || 
          'Transcription non disponible. Le contenu sera analysé visuellement.';
        transcriptionSource = 'gemini';
      } catch (error) {
        console.warn('Gemini transcription failed:', error);
      }
    }
  }

  // Create segment transcripts if we have segments
  const segmentTranscripts = (segments || []).map((seg: any) => ({
    startTime: seg.startTime,
    endTime: seg.endTime,
    location: seg.location,
    text: globalTranscript // In production, we'd slice by timestamp
  }));

  return { 
    globalTranscript, 
    segmentTranscripts,
    source: transcriptionSource 
  };
}

// Step 3: Vision Analysis using GPT-4 Vision
async function runVisionAnalysis(body: PipelineRequest) {
  const { photoUrls, videoUrl, segments, captureMode } = body;

  const visionPrompt = `You are IAHome, the internal building expert AI for Groupe MyHome.
From this image of a building or interior (EDL), identify all visible technical elements:
- structure (walls, ceilings, floors),
- openings (windows, doors),
- networks (electricity, plumbing, heating, VMC),
- façades, roofing, menuiseries,
- pathologies (humidity, cracks, degradation).

For each element, return a compact JSON object in an array:
{ "name": string, "type": string, "state": "very_good" | "good" | "medium" | "bad" | "missing", "locationHint": string, "comments": string }

Focus only on what is clearly visible. Return ONLY a valid JSON array.`;

  const visionElements: any[] = [];
  let imagesToAnalyze: string[] = [];

  // Collect images to analyze
  if (captureMode === 'photo_voice' && photoUrls && photoUrls.length > 0) {
    imagesToAnalyze = photoUrls;
  } else if (videoUrl) {
    // For video mode, we'll analyze the video URL or extracted frames
    imagesToAnalyze = [videoUrl];
  }

  // Analyze each image
  for (const imageUrl of imagesToAnalyze.slice(0, 10)) { // Limit to 10 images
    try {
      // Utiliser Gemini directement
      if (GOOGLE_API_KEY) {
        const data = await callGeminiDirect(
          'gemini-1.0-pro-001',
          [
            { role: 'system', content: 'You are a building inspection AI. Return only valid JSON arrays.' },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: visionPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ],
          'You are a building inspection AI. Return only valid JSON arrays.',
          GOOGLE_API_KEY
        );
        
        const content = data.choices?.[0]?.message?.content || '[]';
        
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const elements = JSON.parse(jsonMatch[0]);
            visionElements.push(...elements);
          }
        } catch (e) {
          console.warn('Could not parse vision response for image:', e);
        }
      } else {
        console.warn('GEMINI_API_KEY not configured, skipping vision analysis');
      }
    } catch (e) {
      console.warn('Vision analysis failed for image:', e);
    }
  }

  return { visionElements };
}

// Step 4: Task Extraction and Structuring using GPT-4.1 equivalent
async function runTaskExtraction(body: PipelineRequest) {
  const { globalTranscript, visionElements, projectContext } = body;

  // Charger la nomenclature DTC complète depuis Supabase
  let dtcTaxonomy = '';
  let ftFamilles: any[] = [];
  let ctCategories: any[] = [];
  let scSousCategories: any[] = [];
  let tTaches: any[] = [];
  
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    
    console.log('[edl-ai-pipeline] Loading DTC taxonomy for task extraction...');
    
    // Charger les familles (FT) avec ID pour le mapping
    const { data: ftData, error: ftError } = await supabase
      .from('ft_familles')
      .select('id, ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code')
      .limit(100); // Limiter pour le prompt
    
    if (ftError) {
      console.error('[edl-ai-pipeline] Error loading FT families:', ftError);
      throw new Error(`Failed to load DTC taxonomy: ${ftError.message}`);
    }
    ftFamilles = ftData || [];
    
    // Charger les catégories (CT) avec ID pour le mapping
    const { data: ctData, error: ctError } = await supabase
      .from('ct_categories')
      .select('id, ct_code, ft_code, ct_label')
      .order('ct_code')
      .limit(500);
    
    if (ctError) {
      console.error('[edl-ai-pipeline] Error loading CT categories:', ctError);
      throw new Error(`Failed to load DTC taxonomy: ${ctError.message}`);
    }
    ctCategories = ctData || [];
    
    // Charger les sous-catégories (SC) avec ID pour le mapping
    const { data: scData, error: scError } = await supabase
      .from('sc_sous_categories')
      .select('id, sc_code, ct_code, ft_code, sc_label, zone_type')
      .order('sc_code')
      .limit(1000);
    
    if (scError) {
      console.error('[edl-ai-pipeline] Error loading SC subcategories:', scError);
      throw new Error(`Failed to load DTC taxonomy: ${scError.message}`);
    }
    scSousCategories = scData || [];
    
    // Charger un échantillon de tâches (T) avec ID pour le mapping
    const { data: tData, error: tError } = await supabase
      .from('t_taches')
      .select('id, t_code, sc_code, ct_code, ft_code, t_label, description_detaillee')
      .limit(2000)
      .order('t_code');
    
    if (tError) {
      console.warn('[edl-ai-pipeline] Error loading T tasks (non-critical):', tError);
      // Les tâches ne sont pas critiques, on continue sans elles
    } else {
      tTaches = tData || [];
    }
    
    // Vérifier que les données essentielles sont présentes
    if (ftFamilles.length === 0 || ctCategories.length === 0 || scSousCategories.length === 0) {
      throw new Error('DTC taxonomy is empty or incomplete. Please verify database connection and data import.');
    }
    
    // Construire le contexte DTC pour le prompt
    if (ftFamilles.length > 0 && ctCategories.length > 0 && scSousCategories.length > 0) {
      const taxonomyMap = new Map();
      
      ftFamilles.forEach((ft: any) => {
        const categories = ctCategories.filter((ct: any) => ct.ft_code === ft.ft_code);
        const scList = categories.flatMap((ct: any) => 
          scSousCategories.filter((sc: any) => sc.ct_code === ct.ct_code && sc.ft_code === ft.ft_code)
        );
        
        const scWithTasks = scList.map((sc: any) => {
          const tasks = tTaches?.filter((t: any) => t.sc_code === sc.sc_code) || [];
          const sampleTasks = tasks.slice(0, 2); // 2 tâches par sous-catégorie
          return { sc, tasks: sampleTasks };
        });
        
        taxonomyMap.set(ft.ft_code, {
          ft,
          categories: categories.map((ct: any) => ({
            ct,
            sousCategories: scWithTasks.filter((item: any) => item.sc.ct_code === ct.ct_code)
          }))
        });
      });
      
      dtcTaxonomy = Array.from(taxonomyMap.entries()).slice(0, 20).map(([ftCode, data]: [string, any]) => {
        const ft = data.ft;
        let context = `${ft.ft_code}: ${ft.ft_label}`;
        if (ft.commentaire_type_equipe) {
          context += ` (${ft.commentaire_type_equipe})`;
        }
        context += '\n';
        
        data.categories.slice(0, 5).forEach(({ ct, sousCategories }: any) => {
          if (!ct?.ct_code || !ct?.ct_label) return;
          context += `  ${ct.ct_code}: ${ct.ct_label}\n`;
          
          sousCategories.slice(0, 3).forEach(({ sc, tasks }: any) => {
            // sc is already the subcategory object from scWithTasks, no need for sc?.sc
            if (!sc || !sc.sc_code || !sc.sc_label) return;

            context += `    ${sc.sc_code}: ${sc.sc_label}`;
            if (sc.zone_type) {
              context += ` [zone: ${sc.zone_type}]`;
            }
            context += '\n';
            
            // Ensure tasks is an array before iterating
            if (Array.isArray(tasks)) {
              tasks.forEach((t: any) => {
                if (!t || !t.t_code || !t.t_label) return;
                context += `      ${t.t_code}: ${t.t_label}`;
                if (t.description_detaillee) {
                  context += ` - ${t.description_detaillee.substring(0, 80)}`;
                }
                context += '\n';
              });
            }
          });
        });
        
        return context;
      }).join('\n');
      
      console.log(`[edl-ai-pipeline] DTC taxonomy loaded: ${ftFamilles.length} FT, ${ctCategories.length} CT, ${scSousCategories.length} SC, ${tTaches?.length || 0} T (sample)`);
    }
  } catch (error) {
    console.error('[edl-ai-pipeline] Critical error loading DTC taxonomy:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Vérifier si c'est une erreur de connexion Supabase
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Network') || 
        errorMessage.includes('DNS') ||
        errorMessage.includes('ECONNREFUSED')) {
      throw new Error(`Erreur de connexion à Supabase: ${errorMessage}. Vérifiez votre connexion réseau.`);
    }
    
    // Retourner une erreur claire au lieu de continuer sans DTC
    throw new Error(`Impossible de charger la nomenclature DTC: ${errorMessage}. Vérifiez votre connexion réseau et que les données DTC sont bien importées.`);
  }

  const extractionPrompt = `You are IAHome, the AI of Groupe MyHome (Archi Home, Bâti Home, Déco Home, Opti Home).
Your goal is to transform an inspection (EDL) into:
1) A structured EDL summary per piece/zone.
2) A list of tasks using the COMPLETE DTC NOMENCLATURE (FT/CT/SC/T) with 4 levels.

**IMPORTANT: You MUST use the DTC nomenclature provided below. Each task MUST have valid codes:**
- familyCode: FT## (e.g., "FT01", "FT02") - MUST match a code from the DTC list
- categoryCode: CT## (e.g., "CT01", "CT02") - MUST match a code from the DTC list
- subcategoryCode: SC## (e.g., "SC01", "SC02") - MUST match a code from the DTC list
- taskCode: T## (e.g., "T01", "T02") - OPTIONAL, can be null if no exact match

**DTC NOMENCLATURE COMPLÈTE (16,992 tâches disponibles):**
${dtcTaxonomy || '⚠️ Nomenclature DTC non disponible. Utilisez des codes génériques.'}

Inputs:
- globalTranscript: ${globalTranscript || 'Non disponible'}
- visionElements: ${JSON.stringify(visionElements || [])}
- projectContext: ${JSON.stringify(projectContext || {})}

Output:
Return a strict JSON object with two keys: edlSummary and tasks.

edlSummary:
  - resumeGlobal: short global summary in French.
  - parPieces: array of { piece: string, etatGeneral: string, pointsForts: string[], pointsFaibles: string[] }

tasks:
  - array of task objects.
  - Each task object MUST have:
    - familyCode: string (FT##) - MUST be a valid code from the DTC list above
    - categoryCode: string (CT##) - MUST be a valid code from the DTC list above
    - subcategoryCode: string (SC##) - MUST be a valid code from the DTC list above
    - taskCode: string (T##) or null - OPTIONAL, use if you find an exact match in the DTC list
    - familyName: string (nom de la famille FT)
    - categoryName: string (nom de la catégorie CT)
    - subcategoryName: string (nom de la sous-catégorie SC)
    - taskName: string (nom de la tâche T, or short label if no T code)
    - description: more detailed explanation in French.
    - pieceOrZone: piece/zone name (hall, cage d'escalier, façade rue, façade cour, logement R+1, etc.).
    - priority: one of ["basse", "normale", "haute", "urgente"].
    - status: always "à faire" initially.
    - observations: optional short comment.

Rules:
- ALWAYS verify that familyCode, categoryCode, and subcategoryCode exist in the DTC list above.
- If you cannot find an exact match, use the closest match from the DTC list.
- NEVER invent codes that are not in the DTC list.
- Always output VALID JSON that matches this structure.
- Be concise but precise.
- language: always French for all labels and descriptions.
- If no clear tasks can be extracted, return an empty tasks array with a summary noting insufficient data.

Return ONLY the JSON object, no markdown or explanation.`;

  // Utiliser Gemini directement au lieu de Lovable
  if (!GOOGLE_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Supabase Edge Functions secrets.');
  }

  const data = await callGeminiWithRetry(
    'gemini-1.0-pro-001',
    [
      { role: 'system', content: 'You are a professional building inspection AI. Return only valid JSON.' },
      { role: 'user', content: extractionPrompt }
    ],
    'You are a professional building inspection AI. Return only valid JSON.',
    GOOGLE_API_KEY
  );

  // La réponse est déjà parsée par callGeminiDirect
  const content = data.choices?.[0]?.message?.content || '{}';
  
  let result: any = { edlSummary: null, tasks: [] };
  
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Could not parse extraction response:', e);
    result = {
      edlSummary: {
        resumeGlobal: 'Analyse automatique en cours. Données insuffisantes pour une synthèse complète.',
        parPieces: []
      },
      tasks: []
    };
  }

  // Transform tasks and map DTC codes to IDs using the already loaded taxonomy
  const extractedTasks = [];
  
  // Create lookup maps for faster ID resolution
  const ftMap = new Map(ftFamilles.map((ft: any) => [ft.ft_code, ft]));
  const ctMap = new Map(ctCategories.map((ct: any) => [`${ct.ft_code}_${ct.ct_code}`, ct]));
  const scMap = new Map(scSousCategories.map((sc: any) => [`${sc.ft_code}_${sc.ct_code}_${sc.sc_code}`, sc]));
  const tMap = new Map(tTaches.map((t: any) => [`${t.ft_code}_${t.ct_code}_${t.sc_code}_${t.t_code}`, t]));
  
  for (const task of result.tasks || []) {
    const familyCode = task.familyCode || task.family_code;
    const categoryCode = task.categoryCode || task.category_code;
    const subcategoryCode = task.subcategoryCode || task.subcategory_code || task.subCategory;
    const taskCode = task.taskCode || task.task_code;
    
    // Map DTC codes to IDs using lookup maps (much faster than individual queries)
    let familyId = null;
    let categoryId = null;
    let subcategoryId = null;
    let taskId = null;
    
    try {
      // Get family ID from map
      if (familyCode) {
        const ft = ftMap.get(familyCode);
        if (ft && ft.id) familyId = ft.id;
      }
      
      // Get category ID from map
      if (categoryCode && familyCode) {
        const ct = ctMap.get(`${familyCode}_${categoryCode}`);
        if (ct && ct.id) categoryId = ct.id;
      }
      
      // Get subcategory ID from map
      if (subcategoryCode && categoryCode && familyCode) {
        const sc = scMap.get(`${familyCode}_${categoryCode}_${subcategoryCode}`);
        if (sc && sc.id) subcategoryId = sc.id;
      }
      
      // Get task ID from map (optional)
      if (taskCode && subcategoryCode && categoryCode && familyCode) {
        const t = tMap.get(`${familyCode}_${categoryCode}_${subcategoryCode}_${taskCode}`);
        if (t && t.id) taskId = t.id;
      }
    } catch (error) {
      console.warn('[edl-ai-pipeline] Error mapping DTC codes to IDs for task:', task.title, error);
      // Continue without IDs if mapping fails - codes will still be in metadata
    }
    
    extractedTasks.push({
      id: `task_${Date.now()}_${extractedTasks.length}`,
      title: task.taskName || task.title || 'Tâche non nommée',
      description: task.description || '',
      // DTC codes (for reference and fallback)
      familyCode: familyCode,
      categoryCode: categoryCode,
      subcategoryCode: subcategoryCode,
      taskCode: taskCode,
      // DTC IDs (for database insertion - null if mapping failed)
      familyId: familyId,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      taskId: taskId,
      // Labels
      familyName: task.familyName || task.family_name || 'Non classé',
      categoryName: task.categoryName || task.category_name || task.category || '',
      subcategoryName: task.subcategoryName || task.subcategory_name || task.subCategory || '',
      taskName: task.taskName || task.title || 'Tâche non nommée',
      // Location and metadata
      location: task.pieceOrZone || task.location || '',
      zone: task.zone || '',
      priority: task.priority || 'normale',
      status: task.status || 'à faire',
      observations: task.observations || '',
      confidence: 0.85
    });
  }
  
  console.log(`[edl-ai-pipeline] Mapped ${extractedTasks.length} tasks with DTC classification`);

  const edlSummary = result.edlSummary ? {
    generalState: result.edlSummary.resumeGlobal || '',
    criticalIssues: extractedTasks
      .filter((t: any) => t.priority === 'urgente' || t.priority === 'haute')
      .map((t: any) => t.title),
    byLocation: (result.edlSummary.parPieces || []).map((p: any) => ({
      location: p.piece,
      state: p.etatGeneral,
      observations: [...(p.pointsForts || []), ...(p.pointsFaibles || [])],
      photoUrls: []
    }))
  } : null;

  return { extractedTasks, edlSummary };
}
