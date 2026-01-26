import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

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
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
    } catch (error) {
      console.error('Token decode error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a user object for compatibility with existing code
    const user = { id: userId };
    const { pdfFile, projectId } = await req.json();

    if (!pdfFile || typeof pdfFile !== 'string') {
      return new Response(
        JSON.stringify({ error: 'PDF file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PDF size
    const base64Data = pdfFile.split(',')[1];
    if (!base64Data) {
      return new Response(
        JSON.stringify({ error: 'Invalid PDF data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > MAX_PDF_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: `PDF size exceeds maximum of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF file...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch DTC taxonomy complète (FT/CT/SC/T) pour classification
    console.log('[extract-from-pdf] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code');

    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('ct_code, ft_code, ct_label')
      .order('ct_code');

    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('sc_code, ct_code, ft_code, sc_label, zone_type, keywords_ia')
      .order('sc_code');

    const { data: tTaches } = await supabase
      .from('t_taches')
      .select('t_code, sc_code, ct_code, ft_code, t_label, description_detaillee, unite, rendement_h_par_unite')
      .limit(5000)
      .order('t_code');

    console.log(`[extract-from-pdf] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC, ${tTaches?.length || 0} T (échantillon)`);

    // Build DTC taxonomy context
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

    const systemPrompt = `Tu es un expert en analyse de chantiers de construction et rénovation. Tu vas analyser un rapport de visite PDF qui peut contenir du texte et des images décrivant les travaux à réaliser. Utilise la nomenclature DSC (Descriptif de Consultation des Entreprises) pour classifier les tâches.

NOMENCLATURE DSC :
${taxonomyContext}

CONTEXTE : Le rapport PDF provient d'une visite d'un bien immobilier (maison, appartement, immeuble, commerce) effectuée avec une autre application. Il décrit les problèmes, défauts et travaux à réaliser.

Tu dois extraire DEUX types d'informations :

1) INFORMATIONS DU PROJET (si disponibles dans le PDF) :
- property_type: Type de bien - "building" (immeuble/bâtiment), "house" (maison), "apartment" (appartement), ou "commercial" (local commercial)
- address: Adresse complète du bien
- postal_code: Code postal
- city: Ville
- number_of_units: Nombre de logements/unités (pour immeubles)
- has_parking: Présence d'un parking (true/false)
- has_box: Présence d'un box (true/false)
- has_garage: Présence d'un garage (true/false)
- additional_info: Informations complémentaires sur le bien

2) TÂCHES DE TRAVAUX :
Pour chaque tâche identifiée dans le rapport PDF, tu dois extraire :
- family_code: Code FT## correspondant à la famille de travaux
- category_code: Code CT## de la catégorie dans cette famille  
- subcategory_code: Code SC## pour la classification précise
- title: Intitulé court et précis de la tâche en français
- description: Description détaillée des travaux à réaliser
- priority: "low", "medium" ou "high" selon l'urgence et la sécurité
- work_type: "renovation" (réhabilitation/rénovation) ou "new_build" (construction neuve/extension)
- location: Localisation précise extraite du rapport (ex: "Appartement 2 - Cuisine", "Salon RDC", "Chambre 1 étage")
- area: Catégorie générale de la zone si pertinent

IMPORTANT : 
- Extraire TOUTES les tâches mentionnées dans le rapport PDF
- Extraire les informations du projet si elles sont mentionnées dans le rapport
- Préserver la localisation précise indiquée dans le rapport
- Utiliser UNIQUEMENT les codes de la nomenclature DSC fournie
- Être précis dans la classification DSC
- Adapter les priorités au contexte immobilier (sécurité, urgence, conformité)`;

    // Send PDF to AI with multimodal understanding
    const userContent = `Analyse ce rapport de visite PDF et extrait toutes les tâches de travaux avec leur classification DSC. Le PDF peut contenir du texte descriptif et des images montrant les problèmes à traiter.

PDF en base64 :
${pdfFile}`;

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
          { 
            role: 'user', 
            content: [
              {
                type: "text",
                text: "Analyse ce rapport de visite PDF et extrait toutes les tâches de travaux avec leur classification DSC."
              },
              {
                type: "image_url",
                image_url: { url: pdfFile }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_project_and_tasks",
              description: "Extract project information and construction tasks with DSC taxonomy classification from PDF report",
              parameters: {
                type: "object",
                properties: {
                  project_info: {
                    type: "object",
                    properties: {
                      property_type: { type: "string", enum: ["building", "house", "apartment", "commercial"] },
                      address: { type: "string" },
                      postal_code: { type: "string" },
                      city: { type: "string" },
                      number_of_units: { type: "number" },
                      has_parking: { type: "boolean" },
                      has_box: { type: "boolean" },
                      has_garage: { type: "boolean" },
                      additional_info: { type: "string" }
                    },
                    additionalProperties: false
                  },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        family_code: { type: "string" },
                        category_code: { type: "string" },
                        subcategory_code: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        work_type: { type: "string", enum: ["renovation", "new_build"] },
                        location: { type: "string" },
                        area: { type: "string" }
                      },
                      required: ["family_code", "category_code", "subcategory_code", "title", "priority", "work_type"],
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
        tool_choice: { type: "function", function: { name: "extract_project_and_tasks" } }
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

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const extractedTasks = parsedArgs.tasks;
    const projectInfo = parsedArgs.project_info;
    
    console.log('AI extracted from PDF:', {
      tasks: extractedTasks.length,
      projectInfo: projectInfo ? 'found' : 'not found'
    });

    // Save tasks to database with taxonomy references
    const tasksToInsert = [];
    for (const task of extractedTasks) {
      const family = families?.find(f => f.code === task.family_code);
      const category = family?.task_categories?.find((c: any) => c.code === task.category_code);
      const subcategory = category?.task_subcategories?.find((sc: any) => sc.code === task.subcategory_code);

      tasksToInsert.push({
        title: task.title,
        description: task.description || null,
        family_id: family?.id || null,
        category_id: category?.id || null,
        subcategory_id: subcategory?.id || null,
        priority: task.priority,
        work_type: task.work_type,
        location: task.location || null,
        area: task.area || null,
        source_type: 'pdf',
        image_url: null,
        project_id: projectId || null,
        user_id: user.id
      });
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

    console.log('Tasks from PDF saved:', insertedTasks?.length);

    // Save PDF to storage
    const pdfFileName = `${user.id}/${projectId || 'no-project'}-${Date.now()}.pdf`;
    
    try {
      // Convert base64 to binary
      const base64Data = pdfFile.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('project-pdfs')
        .upload(pdfFileName, binaryData, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading PDF to storage:', uploadError);
      } else {
        console.log('PDF saved to storage:', pdfFileName);

        // Update project with PDF reference if projectId exists
        if (projectId) {
          const { data: project } = await supabase
            .from('projects')
            .select('pdf_files')
            .eq('id', projectId)
            .maybeSingle();

          const pdfFiles = project?.pdf_files || [];
          pdfFiles.push({
            name: pdfFileName.split('/').pop(),
            path: pdfFileName,
            uploaded_at: new Date().toISOString(),
            size: binaryData.length,
            processed: true
          });

          await supabase
            .from('projects')
            .update({ pdf_files: pdfFiles })
            .eq('id', projectId);
          
          console.log('Project updated with PDF reference');
        }
      }
    } catch (storageError) {
      console.error('Error saving PDF:', storageError);
      // Continue even if storage fails
    }

    return new Response(
      JSON.stringify({ 
        tasks: insertedTasks,
        projectInfo: projectInfo || null,
        pdfSaved: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-from-pdf:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
