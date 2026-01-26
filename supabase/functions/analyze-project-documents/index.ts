import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_CONTENT_LENGTH = 100000; // Limit content to prevent token overflow

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, documents } = await req.json();
    
    if (!projectId || !documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Project ID and documents required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing ${documents.length} documents for project ${projectId}`);

    // Fetch DTC taxonomy complète (FT/CT/SC/T) pour AI context
    console.log('[analyze-project-documents] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code')
      .limit(50); // Limit to avoid huge context

    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('ct_code, ft_code, ct_label')
      .order('ct_code');

    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('sc_code, ct_code, ft_code, sc_label')
      .order('sc_code');

    console.log(`[analyze-project-documents] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC`);

    // Build compact taxonomy context avec DTC
    const taxonomyContext = ftFamilles ? ftFamilles.slice(0, 30).map(ft => {
      const cats = ctCategories?.filter(c => c.ft_code === ft.ft_code).slice(0, 5) || [];
      return `${ft.ft_code}: ${ft.ft_label}` +
        cats.map((c: any) => `\n  ${c.ct_code}: ${c.ct_label}`).join('');
    }).join('\n') : '';

    // Download and process each document
    const documentContents: Array<{
      name: string;
      type: string;
      content?: string;
      base64?: string;
      error?: string;
    }> = [];

    for (const doc of documents) {
      try {
        console.log(`Processing document: ${doc.name} (${doc.type})`);
        
        // Try to download the document from the URL
        const response = await fetch(doc.url);
        
        if (!response.ok) {
          console.error(`Failed to download ${doc.name}: ${response.status}`);
          documentContents.push({
            name: doc.name,
            type: doc.type,
            error: `Download failed: ${response.status}`
          });
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // For PDFs and images, convert to base64 for AI vision analysis
        if (contentType.includes('pdf') || contentType.includes('image') || 
            doc.name.endsWith('.pdf') || /\.(jpg|jpeg|png|webp)$/i.test(doc.name)) {
          
          // Convert to base64
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          // Determine MIME type
          let mimeType = contentType;
          if (doc.name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (doc.name.endsWith('.png')) mimeType = 'image/png';
          else if (/\.(jpg|jpeg)$/i.test(doc.name)) mimeType = 'image/jpeg';
          else if (doc.name.endsWith('.webp')) mimeType = 'image/webp';
          
          documentContents.push({
            name: doc.name,
            type: doc.type,
            base64: `data:${mimeType};base64,${base64}`
          });
          console.log(`Document ${doc.name} loaded as base64 (${Math.round(base64.length / 1024)}KB)`);
        } else {
          // For text-based files, try to decode as text
          const decoder = new TextDecoder('utf-8');
          let textContent = decoder.decode(bytes);
          
          // Truncate if too long
          if (textContent.length > MAX_CONTENT_LENGTH) {
            textContent = textContent.substring(0, MAX_CONTENT_LENGTH) + '\n...[contenu tronqué]...';
          }
          
          documentContents.push({
            name: doc.name,
            type: doc.type,
            content: textContent
          });
          console.log(`Document ${doc.name} loaded as text (${textContent.length} chars)`);
        }
      } catch (docError) {
        console.error(`Error processing ${doc.name}:`, docError);
        documentContents.push({
          name: doc.name,
          type: doc.type,
          error: docError instanceof Error ? docError.message : 'Unknown error'
        });
      }
    }

    // Build AI messages with document contents
    const validDocs = documentContents.filter(d => d.content || d.base64);
    
    if (validDocs.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Aucun document n\'a pu être chargé',
          documentErrors: documentContents.filter(d => d.error)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${validDocs.length} documents successfully loaded for AI analysis`);

    // Prepare multimodal content for AI
    const userContent: any[] = [
      {
        type: "text",
        text: `Analysez ces ${validDocs.length} document(s) technique(s) d'un projet immobilier et extrayez TOUTES les tâches de travaux mentionnées.

DOCUMENTS À ANALYSER :
${validDocs.map(d => `- ${d.name} (${d.type})`).join('\n')}

NOMENCLATURE DSC DISPONIBLE :
${taxonomyContext}

MISSION CRITIQUE :
1. Lire et analyser le CONTENU RÉEL de chaque document
2. Extraire TOUTES les tâches/travaux/défauts/recommandations mentionnés
3. Pour CHAQUE tâche, indiquer le document source EXACT
4. Classifier selon la nomenclature DSC si possible
5. Détecter la structure du bâtiment (zones, pièces, étages)`
      }
    ];

    // Add document contents as images/text
    for (const doc of validDocs) {
      if (doc.base64) {
        userContent.push({
          type: "image_url",
          image_url: { url: doc.base64 }
        });
      } else if (doc.content) {
        userContent.push({
          type: "text", 
          text: `\n\n=== CONTENU DE ${doc.name} ===\n${doc.content}`
        });
      }
    }

    // Call Lovable AI with document content
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `Vous êtes un expert en diagnostic technique du bâtiment. Votre mission est d'extraire TOUTES les tâches de travaux depuis les documents fournis.

RÈGLES IMPORTANTES :
- Chaque tâche DOIT avoir un "source_document" indiquant le fichier d'origine
- Extraire même les petites tâches et les recommandations
- Utiliser les codes DSC (FT##, CT##, SC##) quand approprié
- Détecter la structure du bâtiment (zones, pièces, étages)
- Estimer la priorité selon l'urgence/sécurité
- Confiance 0-100 selon la clarté de l'information dans le document`
          },
          { role: 'user', content: userContent }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_tasks_from_documents",
            description: "Extraire les tâches de travaux et la structure du bâtiment depuis les documents",
            parameters: {
              type: "object",
              properties: {
                building_structure: {
                  type: "object",
                  description: "Structure du bâtiment détectée",
                  properties: {
                    property_type: { type: "string", enum: ["building", "house", "apartment", "commercial"] },
                    zones: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string" },
                          spaces: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                type: { type: "string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                predictive_tasks: {
                  type: "array",
                  description: "Toutes les tâches extraites des documents",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Titre court et précis de la tâche" },
                      description: { type: "string", description: "Description détaillée du travail" },
                      location_zone: { type: "string", description: "Zone principale (Façade, Toiture, Appartement X)" },
                      location_space: { type: "string", description: "Pièce spécifique (Cuisine, SDB, Chambre 1)" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      work_type: { type: "string", enum: ["renovation", "new_build"] },
                      family_code: { type: "string", description: "Code FT## de la famille DSC" },
                      category_code: { type: "string", description: "Code CT## de la catégorie DSC" },
                      subcategory_code: { type: "string", description: "Code SC## de la sous-catégorie DSC" },
                      source_document: { type: "string", description: "NOM EXACT du fichier source (OBLIGATOIRE)" },
                      source_page: { type: "string", description: "Page ou section du document" },
                      source_quote: { type: "string", description: "Citation exacte du texte source si disponible" },
                      confidence: { type: "number", description: "Confiance 0-100 dans l'extraction" }
                    },
                    required: ["title", "source_document", "confidence", "priority"]
                  }
                },
                summary: {
                  type: "object",
                  properties: {
                    total_tasks_found: { type: "number" },
                    high_priority_count: { type: "number" },
                    documents_analyzed: { type: "number" },
                    main_issues: { type: "array", items: { type: "string" } }
                  }
                }
              },
              required: ["predictive_tasks", "building_structure"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_tasks_from_documents" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const extractionResult = JSON.parse(toolCall.function.arguments);

    console.log('Document analysis completed:', {
      tasks: extractionResult.predictive_tasks?.length || 0,
      zones: extractionResult.building_structure?.zones?.length || 0
    });

    // Enrich tasks with taxonomy IDs
    const enrichedTasks = (extractionResult.predictive_tasks || []).map((task: any) => {
      const family = families?.find(f => f.code === task.family_code);
      const category = family?.task_categories?.find((c: any) => c.code === task.category_code);
      const subcategory = category?.task_subcategories?.find((sc: any) => sc.code === task.subcategory_code);

      return {
        ...task,
        family_id: family?.id || null,
        family_name: family?.name || null,
        category_id: category?.id || null,
        category_name: category?.name || null,
        subcategory_id: subcategory?.id || null,
        subcategory_name: subcategory?.name || null
      };
    });

    const visitPreparation = {
      building_structure: extractionResult.building_structure,
      predictive_tasks: enrichedTasks,
      summary: extractionResult.summary || {
        total_tasks_found: enrichedTasks.length,
        documents_analyzed: validDocs.length
      }
    };

    // Store preparation in project metadata
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        template_data: {
          visit_preparation: visitPreparation,
          analyzed_at: new Date().toISOString(),
          document_count: documents.length,
          documents_analyzed: validDocs.map(d => d.name)
        }
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        visit_preparation: visitPreparation,
        documents_processed: validDocs.length,
        documents_failed: documentContents.filter(d => d.error).length,
        message: `${enrichedTasks.length} tâche(s) extraite(s) depuis ${validDocs.length} document(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-project-documents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
