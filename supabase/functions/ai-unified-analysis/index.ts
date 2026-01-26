import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONTENT_LENGTH = 80000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, analysisType = 'full' } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Starting unified AI analysis for project ${projectId}, type: ${analysisType}`);

    // 1. FETCH ALL PROJECT DATA
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Projet introuvable');
    }

    // 2. FETCH EXISTING TASKS FOR CONTEXT
    const { data: existingTasks } = await supabase
      .from('extracted_tasks')
      .select('title, description, location, family_id, category_id')
      .eq('project_id', projectId)
      .limit(50);

    // 3. FETCH DTC TAXONOMY FOR CLASSIFICATION
    console.log('[ai-unified-analysis] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code')
      .limit(40);

    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('ct_code, ft_code, ct_label')
      .order('ct_code');

    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('sc_code, ct_code, ft_code, sc_label')
      .order('sc_code');

    console.log(`[ai-unified-analysis] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC`);

    // Build compact taxonomy context avec DTC
    const taxonomyContext = ftFamilles?.slice(0, 25).map(ft => {
      const cats = ctCategories?.filter(c => c.ft_code === ft.ft_code).slice(0, 4) || [];
      return `${ft.ft_code}: ${ft.ft_label}` +
        cats.map((c: any) => {
          const scs = scSousCategories?.filter(sc => sc.ct_code === c.ct_code && sc.ft_code === ft.ft_code).slice(0, 3) || [];
          return `\n  ${c.ct_code}: ${c.ct_label}` +
            scs.map((sc: any) => `\n    ${sc.sc_code}: ${sc.sc_label}`).join('');
        }).join('');
    }).join('\n') || '';

    // 4. PROCESS DOCUMENTS CONTENT
    const documents = project.project_documents || [];
    const documentContents: Array<{
      name: string;
      type: string;
      content?: string;
      base64?: string;
      error?: string;
    }> = [];

    console.log(`Processing ${documents.length} documents...`);

    for (const doc of documents) {
      try {
        if (!doc.url) continue;
        
        const response = await fetch(doc.url);
        if (!response.ok) {
          documentContents.push({ name: doc.name, type: doc.type, error: `HTTP ${response.status}` });
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Limit file size for processing
        if (bytes.length > 5 * 1024 * 1024) {
          documentContents.push({ name: doc.name, type: doc.type, error: 'File too large' });
          continue;
        }

        if (contentType.includes('pdf') || contentType.includes('image') || 
            /\.(pdf|jpg|jpeg|png|webp)$/i.test(doc.name)) {
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          let mimeType = contentType;
          if (doc.name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (doc.name.endsWith('.png')) mimeType = 'image/png';
          else if (/\.(jpg|jpeg)$/i.test(doc.name)) mimeType = 'image/jpeg';
          
          documentContents.push({
            name: doc.name,
            type: doc.type,
            base64: `data:${mimeType};base64,${base64}`
          });
          console.log(`✓ ${doc.name} loaded as base64 (${Math.round(base64.length / 1024)}KB)`);
        } else {
          let textContent = new TextDecoder('utf-8').decode(bytes);
          if (textContent.length > MAX_CONTENT_LENGTH) {
            textContent = textContent.substring(0, MAX_CONTENT_LENGTH) + '\n...[tronqué]...';
          }
          documentContents.push({ name: doc.name, type: doc.type, content: textContent });
          console.log(`✓ ${doc.name} loaded as text (${textContent.length} chars)`);
        }
      } catch (docError) {
        console.error(`✗ Error processing ${doc.name}:`, docError);
        documentContents.push({ name: doc.name, type: doc.type, error: String(docError) });
      }
    }

    const validDocs = documentContents.filter(d => d.content || d.base64);
    console.log(`${validDocs.length}/${documents.length} documents successfully loaded`);

    // 5. BUILD EXISTING CONTEXT
    const existingComposition = project.template_data?.building_composition || null;
    const existingTasksContext = existingTasks?.length 
      ? existingTasks.map(t => `- ${t.title} (${t.location || 'Non localisé'})`).join('\n')
      : 'Aucune tâche existante';

    // 6. BUILD AI PROMPT WITH ALL CONTEXT
    const systemPrompt = `Tu es un EXPERT en diagnostic immobilier et technique du bâtiment avec 20 ans d'expérience.

MISSION COMPLÈTE :
1. ANALYSER en profondeur TOUS les documents fournis (plans, diagnostics, photos, rapports)
2. DÉTECTER la structure complète du bâtiment (zones, pièces, niveaux)
3. EXTRAIRE TOUTES les tâches/travaux/défauts/recommandations mentionnées
4. CLASSIFIER selon la nomenclature DSC fournie
5. COMPLÉTER et ENRICHIR les informations manquantes par déduction logique

RÈGLES CRITIQUES :
- Analyse le CONTENU RÉEL des documents, pas seulement les titres
- Chaque tâche DOIT référencer son document source
- Déduis intelligemment ce qui n'est pas explicitement dit (ex: si "fissure façade" → probablement travaux maçonnerie)
- Propose des tâches complémentaires logiques basées sur le contexte
- Priorité haute = sécurité/urgence, moyenne = confort/réglementaire, basse = esthétique/amélioration
- Confiance: 90-100 = explicitement dans le document, 70-89 = fortement déduit, 50-69 = suggestion logique`;

    const userContent: any[] = [
      {
        type: "text",
        text: `ANALYSE COMPLÈTE DU PROJET IMMOBILIER

═══════════════════════════════════════
INFORMATIONS DU PROJET
═══════════════════════════════════════
• Type de bien: ${project.property_type}
• Adresse: ${project.address}, ${project.postal_code || ''} ${project.city || ''}
• Nombre de logements: ${project.number_of_units || 'Non spécifié'}
• Parking: ${project.has_parking ? 'Oui' : 'Non'} | Box: ${project.has_box ? 'Oui' : 'Non'} | Garage: ${project.has_garage ? 'Oui' : 'Non'}
• Informations complémentaires: ${project.additional_info || 'Aucune'}

═══════════════════════════════════════
COMPOSITION EXISTANTE (À COMPLÉTER)
═══════════════════════════════════════
${existingComposition ? JSON.stringify(existingComposition, null, 2) : 'Aucune composition définie - À GÉNÉRER'}

═══════════════════════════════════════
TÂCHES DÉJÀ EXTRAITES (CONTEXTE)
═══════════════════════════════════════
${existingTasksContext}

═══════════════════════════════════════
DOCUMENTS À ANALYSER (${validDocs.length})
═══════════════════════════════════════
${validDocs.map(d => `• ${d.name} (${d.type})`).join('\n') || 'Aucun document - Générer des suggestions basées sur le type de bien'}

═══════════════════════════════════════
NOMENCLATURE DSC (POUR CLASSIFICATION)
═══════════════════════════════════════
${taxonomyContext}

═══════════════════════════════════════
MISSION
═══════════════════════════════════════
1. Génère/complète la STRUCTURE du bâtiment (zones, pièces, espaces)
2. Extrait TOUTES les tâches des documents
3. Ajoute des tâches SUGGÉRÉES logiques basées sur le contexte
4. Classifie avec les codes DSC appropriés`
      }
    ];

    // Add document contents
    for (const doc of validDocs) {
      if (doc.base64) {
        userContent.push({
          type: "image_url",
          image_url: { url: doc.base64 }
        });
      } else if (doc.content) {
        userContent.push({
          type: "text",
          text: `\n\n══════ DOCUMENT: ${doc.name} ══════\n${doc.content}`
        });
      }
    }

    // 7. CALL AI
    console.log('Calling Lovable AI for unified analysis...');
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
          { role: 'user', content: userContent }
        ],
        tools: [{
          type: "function",
          function: {
            name: "complete_project_analysis",
            description: "Analyse complète: structure du bâtiment + extraction de toutes les tâches",
            parameters: {
              type: "object",
              properties: {
                building_structure: {
                  type: "object",
                  description: "Structure complète du bâtiment",
                  properties: {
                    commonAreas: { type: "array", items: { type: "string" }, description: "Parties communes (hall, escaliers, couloirs, local poubelles...)" },
                    apartments: { type: "array", items: { type: "string" }, description: "Appartements/logements (Appartement 1, Studio A...)" },
                    basements: { type: "array", items: { type: "string" }, description: "Caves et sous-sols (Cave 1, Sous-sol...)" },
                    parking: { type: "array", items: { type: "string" }, description: "Parkings et boxes (Place 1, Box A...)" },
                    gardens: { type: "array", items: { type: "string" }, description: "Espaces extérieurs (Jardin, Cour, Terrasse...)" },
                    others: { type: "array", items: { type: "string" }, description: "Autres espaces (Buanderie, Local technique...)" }
                  },
                  required: ["commonAreas", "apartments", "basements", "parking", "gardens", "others"]
                },
                predictive_tasks: {
                  type: "array",
                  description: "TOUTES les tâches: extraites des documents + suggérées",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Titre court et actionnable" },
                      description: { type: "string", description: "Description détaillée du travail à effectuer" },
                      location: { type: "string", description: "Localisation précise (Façade nord, Appartement 3 - Cuisine...)" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      work_type: { type: "string", enum: ["renovation", "new_build"] },
                      family_code: { type: "string", description: "Code FT## DSC" },
                      family_name: { type: "string" },
                      category_code: { type: "string", description: "Code CT## DSC" },
                      category_name: { type: "string" },
                      subcategory_code: { type: "string", description: "Code SC## DSC" },
                      subcategory_name: { type: "string" },
                      source_document: { type: "string", description: "Nom du document source ou 'Suggestion IA'" },
                      source_type: { type: "string", enum: ["document", "suggestion"], description: "Origine de la tâche" },
                      confidence: { type: "number", minimum: 0, maximum: 100 }
                    },
                    required: ["title", "priority", "confidence", "source_type"]
                  }
                },
                analysis_summary: {
                  type: "object",
                  properties: {
                    total_tasks: { type: "number" },
                    extracted_from_docs: { type: "number" },
                    ai_suggestions: { type: "number" },
                    high_priority: { type: "number" },
                    documents_analyzed: { type: "number" },
                    key_findings: { type: "array", items: { type: "string" }, description: "Points clés découverts" },
                    recommendations: { type: "array", items: { type: "string" }, description: "Recommandations générales" }
                  }
                }
              },
              required: ["building_structure", "predictive_tasks", "analysis_summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "complete_project_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      throw new Error(`Erreur IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('Réponse IA invalide');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // 8. ENRICH TASKS WITH TAXONOMY IDS
    const enrichedTasks = (analysis.predictive_tasks || []).map((task: any) => {
      const family = families?.find(f => f.code === task.family_code);
      const category = family?.task_categories?.find((c: any) => c.code === task.category_code);
      const subcategory = category?.task_subcategories?.find((sc: any) => sc.code === task.subcategory_code);

      return {
        ...task,
        family_id: family?.id || null,
        family_name: task.family_name || family?.name || null,
        category_id: category?.id || null,
        category_name: task.category_name || category?.name || null,
        subcategory_id: subcategory?.id || null,
        subcategory_name: task.subcategory_name || subcategory?.name || null
      };
    });

    const result = {
      building_structure: analysis.building_structure,
      predictive_tasks: enrichedTasks,
      summary: {
        ...analysis.analysis_summary,
        total_tasks: enrichedTasks.length,
        documents_processed: validDocs.length,
        documents_failed: documentContents.filter(d => d.error).length,
        analyzed_at: new Date().toISOString()
      }
    };

    console.log('Analysis complete:', {
      structure_categories: Object.keys(analysis.building_structure || {}).length,
      tasks: enrichedTasks.length,
      from_docs: enrichedTasks.filter((t: any) => t.source_type === 'document').length,
      suggestions: enrichedTasks.filter((t: any) => t.source_type === 'suggestion').length
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-unified-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
