// @ts-nocheck
// Contexte Deno (Edge Functions) : on désactive les erreurs TS côté IDE.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 10000; // 10,000 characters

// Input validation schemas
interface ExtractTasksInput {
  content: string;
  contentType: 'text' | 'image';
  imageFile?: string;
  projectId?: string;
}

function validateInput(input: any): { valid: boolean; error?: string; data?: ExtractTasksInput } {
  // Check required fields
  if (!input.content || typeof input.content !== 'string') {
    return { valid: false, error: 'Content is required and must be a string' };
  }

  // Validate content type
  if (!input.contentType || !['text', 'image'].includes(input.contentType)) {
    return { valid: false, error: 'Content type must be either "text" or "image"' };
  }

  // Validate text content length
  if (input.contentType === 'text') {
    const sanitizedText = input.content.trim();
    if (sanitizedText.length === 0) {
      return { valid: false, error: 'Text content cannot be empty' };
    }
    if (sanitizedText.length > MAX_TEXT_LENGTH) {
      return { valid: false, error: `Text content exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
    }
  }

  // Validate image content
  if (input.contentType === 'image') {
    if (!input.imageFile || typeof input.imageFile !== 'string') {
      return { valid: false, error: 'Image file is required for image content type' };
    }
    
    // Validate base64 format
    if (!input.imageFile.startsWith('data:image/')) {
      return { valid: false, error: 'Invalid image format. Must be a valid base64 data URL' };
    }

    // Validate image size
    const base64Data = input.imageFile.split(',')[1];
    if (!base64Data) {
      return { valid: false, error: 'Invalid base64 image data' };
    }
    
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: `Image size exceeds maximum of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB` };
    }

    // Validate content is a valid URL for image type
    try {
      new URL(input.content);
    } catch {
      return { valid: false, error: 'Invalid image URL' };
    }
  }

  return {
    valid: true,
    data: {
      content: input.content,
      contentType: input.contentType,
      imageFile: input.imageFile,
      projectId: input.projectId
    }
  };
}

async function checkRateLimit(supabase: any, userId: string, endpoint: string): Promise<{ allowed: boolean; error?: string }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Get current request count in window
  const { data: existingLimits, error: fetchError } = await supabase
    .from('rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Rate limit check error:', fetchError);
    return { allowed: true }; // Allow on error to prevent blocking legitimate users
  }

  // Check if rate limit exceeded
  if (existingLimits && existingLimits.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute allowed.`
    };
  }

  // Update or create rate limit record
  if (existingLimits) {
    await supabase
      .from('rate_limits')
      .update({ request_count: existingLimits.request_count + 1 })
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString());
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        user_id: userId,
        endpoint: endpoint,
        request_count: 1,
        window_start: new Date()
      });
  }

  // Cleanup old records periodically (1 in 10 requests)
  if (Math.random() < 0.1) {
    await supabase.rpc('cleanup_old_rate_limits').catch((err: any) => {
      console.error('Cleanup error:', err);
    });
  }

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from authorization header (JWT is already verified by Supabase)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and decode to get user ID
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      // Decode JWT to extract user ID (token is already verified by Supabase)
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Try multiple possible user ID claims
      userId = payload.sub || payload.user_id || payload.id;
      
      if (!userId) {
        console.error('Full JWT payload:', JSON.stringify(payload, null, 2));
        throw new Error('User ID not found in token - tried sub, user_id, and id claims');
      }
      console.log('User ID extracted:', userId);
    } catch (error) {
      console.error('Token decode error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a user object for compatibility with existing code
    const user = { id: userId };

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 'extract-tasks');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const requestBody = await req.json();
    const validation = validateInput(requestBody);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, contentType, imageFile, projectId } = validation.data!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Extracting tasks from content type:', contentType);

    // Fetch project context from documents if projectId provided
    let documentContext = '';
    if (projectId) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('template_data')
        .eq('id', projectId)
        .single();
      
      if (projectData?.template_data?.document_analysis) {
        documentContext = `\n\n📄 CONTEXTE DES DOCUMENTS DU PROJET :\n${projectData.template_data.document_analysis}\n\nUtilise ces informations pour mieux identifier les tâches et leur contexte.`;
        console.log('Loaded document context for project:', projectId);
      }
    }

    // Fetch DTC taxonomy complète (FT/CT/SC/T) pour classification
    console.log('[extract-tasks] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    let ftFamilles: any[] = [];
    let ctCategories: any[] = [];
    let scSousCategories: any[] = [];
    let tTaches: any[] = [];
    
    try {
      // Charger les familles (FT)
      const { data: ftData, error: ftError } = await supabase
        .from('ft_familles')
        .select('ft_code, ft_label, commentaire_type_equipe')
        .order('ft_code');
      
      if (ftError) {
        console.error('[extract-tasks] Error loading FT families:', ftError);
        throw new Error(`Failed to load DTC taxonomy: ${ftError.message}`);
      }
      ftFamilles = ftData || [];

      // Charger les catégories (CT)
      const { data: ctData, error: ctError } = await supabase
        .from('ct_categories')
        .select('ct_code, ft_code, ct_label')
        .order('ct_code');
      
      if (ctError) {
        console.error('[extract-tasks] Error loading CT categories:', ctError);
        throw new Error(`Failed to load DTC taxonomy: ${ctError.message}`);
      }
      ctCategories = ctData || [];

      // Charger les sous-catégories (SC)
      const { data: scData, error: scError } = await supabase
        .from('sc_sous_categories')
        .select('sc_code, ct_code, ft_code, sc_label, zone_type, keywords_ia')
        .order('sc_code');
      
      if (scError) {
        console.error('[extract-tasks] Error loading SC subcategories:', scError);
        throw new Error(`Failed to load DTC taxonomy: ${scError.message}`);
      }
      scSousCategories = scData || [];

      // Charger les tâches (T) - échantillon représentatif pour le contexte IA
      const { data: tData, error: tError } = await supabase
        .from('t_taches')
        .select('t_code, sc_code, ct_code, ft_code, t_label, description_detaillee, unite, rendement_h_par_unite')
        .limit(5000)
        .order('t_code');
      
      if (tError) {
        console.error('[extract-tasks] Error loading T tasks:', tError);
        // Les tâches ne sont pas critiques, on continue sans elles
        console.warn('[extract-tasks] Continuing without task samples');
      } else {
        tTaches = tData || [];
      }

      console.log(`[extract-tasks] DTC loaded: ${ftFamilles.length} FT, ${ctCategories.length} CT, ${scSousCategories.length} SC, ${tTaches.length} T (échantillon)`);
      
      // Vérifier que les données essentielles sont présentes
      if (ftFamilles.length === 0 || ctCategories.length === 0 || scSousCategories.length === 0) {
        throw new Error('DTC taxonomy is empty or incomplete. Please verify database connection and data import.');
      }
    } catch (error) {
      console.error('[extract-tasks] Critical error loading DTC taxonomy:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ 
          error: `Impossible de charger la nomenclature DTC: ${errorMessage}. Vérifiez votre connexion réseau et que les données DTC sont bien importées.`,
          tasks: []
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch learning corrections to improve classification
    const { data: learningCorrections } = await supabase
      .from('dsc_learning_corrections')
      .select(`
        task_title,
        task_description,
        keywords_extracted,
        corrected_family_id,
        corrected_category_id,
        corrected_subcategory_id,
        confidence_score
      `)
      .order('confidence_score', { ascending: false })
      .limit(100);

    console.log(`Loaded ${learningCorrections?.length || 0} learning patterns for smart classification`);

    // Build DTC taxonomy context complet avec les tâches
    let taxonomyContext = '';
    
    if (ftFamilles && ctCategories && scSousCategories) {
      const taxonomyMap = new Map();
      
      ftFamilles.forEach(ft => {
        const categories = ctCategories.filter(ct => ct.ft_code === ft.ft_code);
        const scList = categories.flatMap(ct => 
          scSousCategories.filter(sc => sc.ct_code === ct.ct_code && sc.ft_code === ft.ft_code)
        );
        
        const scWithTasks = scList.map(sc => {
          const tasks = tTaches?.filter(t => t.sc_code === sc.sc_code) || [];
          const sampleTasks = tasks.slice(0, 3);
          return { sc, tasks: sampleTasks };
        });
        
        taxonomyMap.set(ft.ft_code, {
          ft,
          categories: categories.map(ct => ({
            ct,
            sousCategories: scWithTasks.filter(item => item.sc.ct_code === ct.ct_code)
          }))
        });
      });
      
      taxonomyContext = Array.from(taxonomyMap.entries()).map(([ftCode, data]) => {
        const ft = data.ft;
        let context = `${ft.ft_code}: ${ft.ft_label}`;
        if (ft.commentaire_type_equipe) {
          context += ` (${ft.commentaire_type_equipe})`;
        }
        context += '\n';
        
        data.categories.forEach(({ ct, sousCategories }) => {
          context += `  ${ct.ct_code}: ${ct.ct_label}\n`;
          
          sousCategories.forEach(({ sc, tasks }) => {
            context += `    ${sc.sc.sc_code}: ${sc.sc.sc_label}`;
            if (sc.sc.zone_type) {
              context += ` [zone: ${sc.sc.zone_type}]`;
            }
            context += '\n';
            
            tasks.forEach(t => {
              context += `      ${t.t_code}: ${t.t_label}`;
              if (t.description_detaillee) {
                context += ` - ${t.description_detaillee.substring(0, 100)}`;
              }
              if (t.unite && t.rendement_h_par_unite) {
                context += ` [${t.rendement_h_par_unite}h/${t.unite}]`;
              }
              context += '\n';
            });
          });
        });
        
        return context;
      }).join('\n');
    }

    const totalTasks = tTaches?.length || 0;
    const systemPrompt = `Tu es un expert en analyse de chantiers de construction et rénovation. Tu structures TOUTES les tâches selon la hiérarchie DTC (Descriptif Technique Commun) complète.

📋 NOMENCLATURE DTC COMPLÈTE (${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC, ${totalTasks > 0 ? '~17 000' : '0'} T) :
${taxonomyContext}
${documentContext}

🎯 STRUCTURE DE SORTIE OBLIGATOIRE pour CHAQUE tâche :

1. **FT (Famille de Tâches)** : Code FT## et libellé exact de la famille
2. **CT (Catégorie)** : Code CT## et libellé exact de la catégorie (format: FT##/CT##)
3. **SC (Sous-Catégorie)** : Code SC## et libellé exact de la sous-catégorie (format: FT##/CT##/SC##)
4. **T (Tâche)** : Code T## et libellé exact de la tâche (format: FT##/CT##/SC##/T##) - OPTIONNEL mais recommandé
5. **Tâche** : Intitulé court et professionnel
6. **Description** : Description technique détaillée des travaux à réaliser
7. **Quantité** : Estimation chiffrée avec unité (m², ml, U, forfait, etc.)
8. **Observations** : Notes complémentaires, contraintes, points d'attention

⚠️ RÈGLES CRITIQUES :
- COPIE les codes EXACTS depuis la nomenclature (FT##, CT##, SC##, T##)
- NE JAMAIS inventer de codes
- TOUJOURS fournir les 3 niveaux minimum : FT + CT + SC (T est optionnel mais recommandé)
- Utilise les codes COMPLETS (ex: FT01/CT01/SC01/T01) et non juste les numéros
- Quantité OBLIGATOIRE avec unité appropriée
- Description technique et professionnelle

EXEMPLE DE SORTIE :
{
  "family_code": "FT12",
  "family_label": "Peinture - Finitions",
  "category_code": "CT1201",
  "category_label": "Peintures intérieures",
  "subcategory_code": "SC120101",
  "subcategory_label": "Peinture murale",
  "title": "Reprise peinture murale séjour",
  "description": "Préparation des supports (rebouchage fissures, ponçage), application primaire d'accrochage, 2 couches de peinture acrylique satinée blanc RAL 9010",
  "quantity": "25",
  "unit": "m²",
  "observations": "Fissures à traiter avant peinture. Prévoir bâchage du mobilier.",
  "priority": "medium",
  "location": "Séjour - mur côté fenêtre",
  "etat": "mauvais"
}`;

    let userContent;
    if (contentType === 'text') {
      userContent = `Analyse cette description de chantier et extrait TOUTES les tâches avec classification DSC complète :\n\n${content}`;
    } else if (contentType === 'image') {
      userContent = [
        {
          type: "text",
          text: "Analyse cette image de bien immobilier et identifie TOUTES les tâches de rénovation/travaux avec classification DSC complète. Recherche : dégradations, éléments vétustes, zones à réparer."
        },
        {
          type: "image_url",
          image_url: { url: content, detail: "high" }
        }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks",
              description: "Extract construction tasks with complete DSC taxonomy classification",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        family_code: { type: "string", description: "Code FT## de la famille" },
                        family_label: { type: "string", description: "Libellé de la famille" },
                        category_code: { type: "string", description: "Code CT## de la catégorie" },
                        category_label: { type: "string", description: "Libellé de la catégorie" },
                        subcategory_code: { type: "string", description: "Code SC## de la sous-catégorie" },
                        subcategory_label: { type: "string", description: "Libellé de la sous-catégorie" },
                        title: { type: "string", description: "Intitulé court de la tâche" },
                        description: { type: "string", description: "Description technique détaillée" },
                        quantity: { type: "string", description: "Quantité estimée" },
                        unit: { type: "string", description: "Unité (m², ml, U, forfait, etc.)" },
                        observations: { type: "string", description: "Notes et contraintes" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        work_type: { type: "string", enum: ["renovation", "new_build"] },
                        location: { type: "string", description: "Localisation précise" },
                        etat: { type: "string", enum: ["bon", "moyen", "mauvais", "absent"] }
                      },
                      required: ["family_code", "category_code", "subcategory_code", "title", "description", "quantity", "unit", "priority", "work_type"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["tasks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const extractedTasks = JSON.parse(toolCall.function.arguments).tasks;
    console.log('AI extracted tasks:', extractedTasks.length);

    // Upload image to storage if provided (organized by user_id)
    let imageUrl = null;
    if (imageFile && contentType === 'image') {
      const timestamp = new Date().getTime();
      // Organize images by user_id folder
      const fileName = `${user.id}/task-${timestamp}.jpg`;
      
      // Decode base64 image
      const base64Data = imageFile.split(',')[1];
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
      } else {
        // Store the file path (not public URL since bucket is now private)
        imageUrl = fileName;
        console.log('Image uploaded to private bucket:', imageUrl);
      }
    }

    // Save tasks to database with taxonomy references
    const tasksToInsert = [];
    const classificationLogs = [];
    const classificationWarnings: string[] = [];
    
    for (const task of extractedTasks) {
      console.log(`Processing task: "${task.title}" with codes: Family=${task.family_code}, Category=${task.category_code}, Subcategory=${task.subcategory_code}`);
      
      // Track match types for logging
      let familyMatchType = 'none';
      let categoryMatchType = 'none';
      let subcategoryMatchType = 'none';
      const warnings: string[] = [];
      
      // Generate multiple suggestions with confidence scores
      const suggestions: Array<{
        family_id: string;
        category_id: string;
        subcategory_id: string;
        confidence: number;
        source: string;
      }> = [];

      // 1. Learning-based suggestions
      if (learningCorrections && learningCorrections.length > 0) {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        for (const correction of learningCorrections) {
          if (!correction.keywords_extracted || !correction.keywords_extracted.keywords) continue;
          
          const correctionKeywords = correction.keywords_extracted.keywords as string[];
          const matchingKeywords = correctionKeywords.filter((kw: string) => 
            taskText.includes(kw.toLowerCase())
          );
          
          const score = (matchingKeywords.length / correctionKeywords.length) * (correction.confidence_score || 1);
          
          if (score > 0.3) { // At least 30% keyword match
            suggestions.push({
              family_id: correction.corrected_family_id,
              category_id: correction.corrected_category_id,
              subcategory_id: correction.corrected_subcategory_id,
              confidence: Math.min(0.95, score),
              source: 'learning'
            });
          }
        }
      }

      // Préparer une structure hiérarchique pour le matching sémantique (DTC)
      const families = (ftFamilles || []).map(ft => ({
        ...ft,
        task_categories: (ctCategories || [])
          .filter(ct => ct.ft_code === ft.ft_code)
          .map(ct => ({
            ...ct,
            task_subcategories: (scSousCategories || [])
              .filter(sc => sc.ct_code === ct.ct_code && sc.ft_code === ft.ft_code)
          }))
      }));

      // 2. Exact match suggestion avec DTC
      const categoryCode = task.category_code.includes('/') 
        ? task.category_code.split('/').pop() 
        : task.category_code;
      const subcategoryCode = task.subcategory_code.includes('/')
        ? task.subcategory_code.split('/').pop()
        : task.subcategory_code;
      
      const exactFamily = ftFamilles?.find(f => f.ft_code === task.family_code);
      if (exactFamily) {
        const exactCategory = ctCategories?.find((c: any) => 
          c.ct_code === categoryCode && c.ft_code === exactFamily.ft_code
        );
        if (exactCategory) {
          const exactSubcategory = scSousCategories?.find((sc: any) => 
            sc.sc_code === subcategoryCode && sc.ct_code === exactCategory.ct_code && sc.ft_code === exactFamily.ft_code
          );
          if (exactSubcategory) {
            suggestions.push({
              family_id: exactFamily.id,
              category_id: exactCategory.id,
              subcategory_id: exactSubcategory.id,
              confidence: 1.0,
              source: 'exact'
            });
          }
        }
      }

      // 3. Semantic matching suggestions
      if (families && families.length > 0) {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        for (const fam of families.slice(0, 3)) { // Top 3 families
          const familyName = fam.name.toLowerCase();
          const familyKeywords = familyName.split(' ');
          const familyScore = familyKeywords.filter((kw: string) => taskText.includes(kw)).length / familyKeywords.length;
          
          if (familyScore > 0.2 && fam.task_categories && fam.task_categories.length > 0) {
            for (const cat of fam.task_categories.slice(0, 2)) { // Top 2 categories per family
              const categoryName = cat.name.toLowerCase();
              const categoryKeywords = categoryName.split(' ');
              const categoryScore = categoryKeywords.filter((kw: string) => taskText.includes(kw)).length / categoryKeywords.length;
              
              if (categoryScore > 0.2 && cat.task_subcategories && cat.task_subcategories.length > 0) {
                const subcategory = cat.task_subcategories[0]; // Best subcategory
                const confidence = (familyScore + categoryScore) / 2;
                
                suggestions.push({
                  family_id: fam.id,
                  category_id: cat.id,
                  subcategory_id: subcategory.id,
                  confidence: Math.min(0.85, confidence * 0.8), // Semantic is less confident
                  source: 'semantic'
                });
              }
            }
          }
        }
      }

      // Sort suggestions by confidence and remove duplicates
      suggestions.sort((a, b) => b.confidence - a.confidence);
      const uniqueSuggestions = suggestions.filter((s, i, arr) => 
        arr.findIndex(t => t.family_id === s.family_id && t.category_id === s.category_id && t.subcategory_id === s.subcategory_id) === i
      ).slice(0, 5); // Keep top 5 unique suggestions

      console.log(`Generated ${uniqueSuggestions.length} classification suggestions for task: ${task.title}`);
      if (uniqueSuggestions.length > 0) {
        console.log(`Best suggestion: ${uniqueSuggestions[0].source} with ${Math.round(uniqueSuggestions[0].confidence * 100)}% confidence`);
      }

      // ALWAYS use best suggestion if available (even with lower confidence)
      // This ensures ALL tasks are classified, never left unclassified
      let family, category, subcategory;
      if (uniqueSuggestions.length > 0) {
        family = ftFamilles?.find(f => f.id === uniqueSuggestions[0].family_id);
        category = ctCategories?.find((c: any) => c.id === uniqueSuggestions[0].category_id);
        subcategory = scSousCategories?.find((sc: any) => sc.id === uniqueSuggestions[0].subcategory_id);
        
        familyMatchType = uniqueSuggestions[0].source;
        categoryMatchType = uniqueSuggestions[0].source;
        subcategoryMatchType = uniqueSuggestions[0].source;
        
        // Mark as needs_review if confidence is below threshold
        if (uniqueSuggestions[0].confidence < 0.7) {
          warnings.push(`Low confidence: ${Math.round(uniqueSuggestions[0].confidence * 100)}%`);
          console.log(`⚠️ Applied suggestion with low confidence: ${uniqueSuggestions[0].source} (${Math.round(uniqueSuggestions[0].confidence * 100)}%)`);
        } else {
          console.log(`🎯 Best suggestion applied: ${uniqueSuggestions[0].source} match with ${Math.round(uniqueSuggestions[0].confidence * 100)}% confidence`);
        }
      }

      // If no high-confidence suggestion, use existing matching logic avec DTC
      if (!family) {
        family = ftFamilles?.find(f => f.ft_code === task.family_code);
        
        if (family) {
          familyMatchType = 'exact';
          console.log(`✅ Exact family match: ${task.family_code}`);
        }
      }
      
      // Fuzzy matching: try to find by name if code doesn't match
      if (!family && task.family_code) {
        family = ftFamilles?.find(f => 
          f.ft_label.toLowerCase().includes(task.family_code.toLowerCase()) ||
          task.family_code.toLowerCase().includes(f.ft_label.toLowerCase())
        );
        
        if (family) {
          familyMatchType = 'fuzzy';
          console.log(`✅ Fuzzy matched family: ${task.family_code} → ${family.ft_code} (${family.ft_label})`);
          warnings.push(`Fuzzy match family: ${task.family_code} → ${family.ft_code}`);
        } else {
          warnings.push(`Family not found: ${task.family_code}`);
          classificationWarnings.push(`❌ Family not found: ${task.family_code} for task "${task.title}"`);
          console.error(`❌ CRITICAL: Family not found in DTC: ${task.family_code} - AI returned invalid code!`);
        }
      }
      
      // Enhanced semantic matching: try to find family by keywords in task title/description
      if (!family && ftFamilles && ftFamilles.length > 0) {
        console.log(`🔄 Attempting semantic matching for task: ${task.title}`);
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        // Try to match by keywords in family names
        family = families.find(f => {
          const familyName = f.name.toLowerCase();
          const keywords = familyName.split(' ');
          return keywords.some((keyword: string) => taskText.includes(keyword) || keyword.includes(taskText));
        });
        
        if (family) {
          familyMatchType = 'semantic';
          console.log(`✅ Semantic matched family: ${family.code} (${family.name}) for task "${task.title}"`);
          warnings.push(`Semantic match family: ${family.code}`);
        } else {
          // Absolute fallback: choose the first family as default to avoid NULL classification
          family = ftFamilles?.[0];
          if (family) {
            familyMatchType = 'fallback';
            console.warn(`⚠️ Using fallback family: ${family.ft_code} (${family.ft_label})`);
            warnings.push(`Fallback family: ${family.ft_code}`);
          }
          classificationWarnings.push(`⚠️ Auto-assigned fallback family ${family.code} for task "${task.title}"`);
        }
      }
      
      if (!category && family) {
        category = ctCategories?.find((c: any) => 
          c.ct_code === categoryCode && c.ft_code === family.ft_code
        );
        
        if (category) {
          categoryMatchType = 'exact';
          console.log(`✅ Exact category match: ${task.category_code}`);
        }
      }
      
      // Fuzzy matching for category
      if (!category && task.category_code && family) {
        category = ctCategories?.find((c: any) => 
          (c.ct_label.toLowerCase().includes(categoryCode.toLowerCase()) ||
          categoryCode.toLowerCase().includes(c.ct_label.toLowerCase())) &&
          c.ft_code === family.ft_code
        );
        
        if (category) {
          categoryMatchType = 'fuzzy';
          console.log(`✅ Fuzzy matched category: ${task.category_code} → ${category.ct_code} (${category.ct_label})`);
          warnings.push(`Fuzzy match category: ${task.category_code} → ${category.ct_code}`);
        } else {
          warnings.push(`Category not found: ${task.category_code}`);
          classificationWarnings.push(`❌ Category not found: ${task.category_code} in family ${family.ft_code}`);
          console.error(`❌ CRITICAL: Category not found in DTC: ${task.category_code} - AI returned invalid code!`);
        }
      }
      
      // Enhanced semantic matching for category
      if (!category && family && ctCategories && ctCategories.length > 0) {
        console.log(`🔄 Attempting semantic category matching for task: ${task.title}`);
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        // Try to match by keywords in category names
        category = family.task_categories.find((c: any) => {
          const categoryName = c.name.toLowerCase();
          const keywords = categoryName.split(' ');
          return keywords.some((keyword: string) => taskText.includes(keyword));
        });
        
        if (category) {
          categoryMatchType = 'semantic';
          console.log(`✅ Semantic matched category: ${category.code} (${category.name}) for task "${task.title}"`);
          warnings.push(`Semantic match category: ${category.code}`);
        } else {
          // Fallback to first category
          category = family.task_categories[0];
          categoryMatchType = 'fallback';
          console.warn(`⚠️ Using fallback category: ${category.code} (${category.name})`);
          warnings.push(`Fallback category: ${category.code}`);
          classificationWarnings.push(`⚠️ Auto-assigned fallback category ${category.code} for task "${task.title}"`);
        }
      }
      
      if (!subcategory && category) {
        subcategory = scSousCategories?.find((sc: any) => 
          sc.sc_code === subcategoryCode && sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
        );
        
        if (subcategory) {
          subcategoryMatchType = 'exact';
          console.log(`✅ Exact subcategory match: ${task.subcategory_code}`);
        }
      }
      
      // Fuzzy matching for subcategory
      if (!subcategory && task.subcategory_code && category) {
        subcategory = scSousCategories?.find((sc: any) => 
          (sc.sc_label.toLowerCase().includes(subcategoryCode.toLowerCase()) ||
          subcategoryCode.toLowerCase().includes(sc.sc_label.toLowerCase())) &&
          sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
        );
        
        if (subcategory) {
          subcategoryMatchType = 'fuzzy';
          console.log(`✅ Fuzzy matched subcategory: ${task.subcategory_code} → ${subcategory.sc_code} (${subcategory.sc_label})`);
          warnings.push(`Fuzzy match subcategory: ${task.subcategory_code} → ${subcategory.sc_code}`);
        } else {
          warnings.push(`Subcategory not found: ${task.subcategory_code}`);
          classificationWarnings.push(`❌ Subcategory not found: ${task.subcategory_code} in category ${category.ct_code}`);
          console.error(`❌ CRITICAL: Subcategory not found in DTC: ${task.subcategory_code} - AI returned invalid code!`);
        }
      }
      
      // Enhanced semantic matching for subcategory avec DTC
      if (!subcategory && category && scSousCategories && scSousCategories.length > 0) {
        console.log(`🔄 Attempting semantic subcategory matching for task: ${task.title}`);
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        // Try to match by keywords in subcategory names
        const categorySubcategories = scSousCategories.filter((sc: any) => 
          sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
        );
        
        subcategory = categorySubcategories.find((sc: any) => {
          const subcategoryName = sc.sc_label.toLowerCase();
          const keywords = subcategoryName.split(' ');
          return keywords.some((keyword: string) => taskText.includes(keyword));
        });
        
        if (subcategory) {
          subcategoryMatchType = 'semantic';
          console.log(`✅ Semantic matched subcategory: ${subcategory.sc_code} (${subcategory.sc_label}) for task "${task.title}"`);
          warnings.push(`Semantic match subcategory: ${subcategory.sc_code}`);
        } else if (categorySubcategories.length > 0) {
          // Fallback to first subcategory
          subcategory = categorySubcategories[0];
          subcategoryMatchType = 'fallback';
          console.warn(`⚠️ Using fallback subcategory: ${subcategory.sc_code} (${subcategory.sc_label})`);
          warnings.push(`Fallback subcategory: ${subcategory.sc_code}`);
          classificationWarnings.push(`⚠️ Auto-assigned fallback subcategory ${subcategory.sc_code} for task "${task.title}"`);
        }
      }
      
      // CRITICAL: Ensure ALL tasks have complete classification (Family + Category + Subcategory)
      // If any level is missing, use fallback to ensure complete DTC classification
      if (!family && ftFamilles && ftFamilles.length > 0) {
        family = ftFamilles[0];
        familyMatchType = 'fallback';
        warnings.push(`FALLBACK: Using default family ${family.ft_code}`);
        classificationWarnings.push(`⚠️ FALLBACK: Using default family ${family.ft_code} for task "${task.title}"`);
      }
      
      if (!category && family && ctCategories) {
        const familyCategories = ctCategories.filter(c => c.ft_code === family.ft_code);
        if (familyCategories.length > 0) {
          category = familyCategories[0];
          categoryMatchType = 'fallback';
          warnings.push(`FALLBACK: Using default category ${category.ct_code}`);
          classificationWarnings.push(`⚠️ FALLBACK: Using default category ${category.ct_code} for task "${task.title}"`);
        }
      }
      
      if (!subcategory && category && scSousCategories) {
        const categorySubcategories = scSousCategories.filter(sc => 
          sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
        );
        if (categorySubcategories.length > 0) {
          subcategory = categorySubcategories[0];
          subcategoryMatchType = 'fallback';
          warnings.push(`FALLBACK: Using default subcategory ${subcategory.sc_code}`);
          classificationWarnings.push(`⚠️ FALLBACK: Using default subcategory ${subcategory.sc_code} for task "${task.title}"`);
        }
      }
      
      // Final validation: ensure complete classification exists
      if (!family || !category || !subcategory) {
        console.error(`❌ FATAL: Incomplete classification for task "${task.title}" - Family=${family?.ft_code}, Category=${category?.ct_code}, Subcategory=${subcategory?.sc_code}`);
        warnings.push(`FATAL: Incomplete classification`);
        classificationWarnings.push(`❌ FATAL: Task "${task.title}" missing complete DTC classification - taxonomy may be incomplete!`);
        continue; // Skip this task - do not insert incomplete classifications
      }
      
      console.log(`✅ Complete classification for "${task.title}": Family=${family.ft_code}, Category=${category.ct_code}, Subcategory=${subcategory.sc_code}`);

      // Prepare classification log entry with suggestions
      // Mark as needs_review if using fallback or low confidence suggestion
      const needsReview = 
        familyMatchType === 'fallback' || 
        categoryMatchType === 'fallback' || 
        subcategoryMatchType === 'fallback' ||
        (uniqueSuggestions.length > 0 && uniqueSuggestions[0].confidence < 0.7);
        
      classificationLogs.push({
        user_id: user.id,
        task_title: task.title,
        ai_family_code: task.family_code || null,
        ai_category_code: task.category_code || null,
        ai_subcategory_code: task.subcategory_code || null,
        matched_family_id: family.id, // ALWAYS required
        matched_category_id: category.id, // ALWAYS required
        matched_subcategory_id: subcategory.id, // ALWAYS required
        family_match_type: familyMatchType,
        category_match_type: categoryMatchType,
        subcategory_match_type: subcategoryMatchType,
        needs_review: needsReview,
        warnings: warnings.length > 0 ? warnings : null,
        suggestions: uniqueSuggestions.length > 0 ? uniqueSuggestions : null
      });

      tasksToInsert.push({
        title: task.title,
        description: task.description || null,
        family_id: family.id, // ALWAYS required - validated above
        category_id: category.id, // ALWAYS required - validated above
        subcategory_id: subcategory.id, // ALWAYS required - validated above
        priority: task.priority,
        work_type: task.work_type,
        location: task.location || null,
        area: task.area || null,
        source_type: contentType,
        image_url: imageUrl,
        project_id: projectId || null,
        user_id: user.id
      });
    }
    
    // Log classification warnings if any
    if (classificationWarnings.length > 0) {
      console.warn(`⚠️ Classification warnings (${classificationWarnings.length}):`, classificationWarnings);
    }

    const { data: insertedTasks, error: insertError } = await supabase
      .from('extracted_tasks')
      .insert(tasksToInsert)
      .select(`
        *,
        task_families (code, name),
        task_categories (code, name),
        task_subcategories (code, name)
      `);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Tasks saved:', insertedTasks?.length);

    // Log classification results with task IDs
    if (insertedTasks && classificationLogs.length > 0) {
      const logsWithTaskIds = classificationLogs.map((log, index) => ({
        ...log,
        task_id: insertedTasks[index]?.id || null
      }));

      const { error: logError } = await supabase
        .from('dsc_classification_logs')
        .insert(logsWithTaskIds);

      if (logError) {
        console.error('Classification logging error:', logError);
        // Don't throw - logging failure shouldn't break task creation
      } else {
        console.log('Classification logs saved:', logsWithTaskIds.length);
      }
    }

    return new Response(
      JSON.stringify({ tasks: insertedTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
