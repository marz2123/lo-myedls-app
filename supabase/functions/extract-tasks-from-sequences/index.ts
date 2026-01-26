import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, sequenceIds } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // sequenceIds is optional - if provided, only extract from those sequences
    const hasSpecificSequences = Array.isArray(sequenceIds) && sequenceIds.length > 0;
    console.log(`[extract-tasks-from-sequences] Mode: ${hasSpecificSequences ? 'Selected sequences' : 'All sequences'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[extract-tasks-from-sequences] Starting extraction for project: ${projectId}`);

    // 1. Fetch visit sequences for the project (optionally filtered by sequenceIds)
    let query = supabase
      .from('visit_sequences')
      .select(`
        id,
        description,
        transcription,
        photos,
        video_url,
        detected_condition,
        user_condition,
        detected_zones,
        zone_type,
        endroit_name,
        metadata,
        property_locations!visit_sequences_location_id_fkey (
          id,
          name,
          location_type
        ),
        property_parts!visit_sequences_part_id_fkey (
          id,
          name,
          part_type
        )
      `)
      .eq('project_id', projectId);
    
    // Filter by specific sequence IDs if provided
    if (hasSpecificSequences) {
      query = query.in('id', sequenceIds);
    }
    
    const { data: sequences, error: seqError } = await query.order('created_at', { ascending: true });

    if (seqError) {
      console.error('Error fetching sequences:', seqError);
      throw new Error(`Failed to fetch sequences: ${seqError.message}`);
    }

    if (!sequences || sequences.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucune séquence de visite à traiter',
          tasks: [],
          summary: { totalSequences: 0, totalTasks: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-tasks-from-sequences] Found ${sequences.length} sequences to process`);

    // 2. Fetch DTC taxonomy complète (FT/CT/SC/T) pour classification
    console.log('[extract-tasks-from-sequences] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    // Charger les familles (FT)
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code');

    // Charger les catégories (CT)
    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('ct_code, ft_code, ct_label')
      .order('ct_code');

    // Charger les sous-catégories (SC)
    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('sc_code, ct_code, ft_code, sc_label, zone_type, keywords_ia')
      .order('sc_code');

    // Charger les tâches (T) - échantillon représentatif pour le contexte IA
    // On charge un échantillon de tâches représentatives par sous-catégorie
    const { data: tTaches } = await supabase
      .from('t_taches')
      .select('t_code, sc_code, ct_code, ft_code, t_label, description_detaillee, unite, rendement_h_par_unite')
      .limit(5000) // Limiter pour ne pas surcharger le contexte IA
      .order('t_code');

    console.log(`[extract-tasks-from-sequences] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC, ${tTaches?.length || 0} T (échantillon)`);

    // 3. Fetch learning corrections for self-improvement
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
      .limit(200);

    console.log(`[extract-tasks-from-sequences] Loaded ${learningCorrections?.length || 0} learning patterns for deep learning enhancement`);

    // Build DTC taxonomy context complet avec les tâches
    let taxonomyContext = '';
    
    if (ftFamilles && ctCategories && scSousCategories) {
      // Construire la hiérarchie FT -> CT -> SC -> T
      const taxonomyMap = new Map();
      
      // Organiser par famille
      ftFamilles.forEach(ft => {
        const categories = ctCategories.filter(ct => ct.ft_code === ft.ft_code);
        const scList = categories.flatMap(ct => 
          scSousCategories.filter(sc => sc.ct_code === ct.ct_code && sc.ft_code === ft.ft_code)
        );
        
        // Pour chaque SC, récupérer quelques tâches représentatives
        const scWithTasks = scList.map(sc => {
          const tasks = tTaches?.filter(t => t.sc_code === sc.sc_code) || [];
          // Prendre max 3 tâches par SC pour ne pas surcharger
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
      
      // Construire le contexte formaté
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
            if (sc.sc.keywords_ia) {
              context += ` [keywords: ${sc.sc.keywords_ia}]`;
            }
            context += '\n';
            
            // Ajouter les tâches représentatives
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

    // Build learning patterns context
    let learningContext = '';
    if (learningCorrections && learningCorrections.length > 0) {
      const patternGroups = new Map<string, { keywords: string[], count: number }>();
      
      for (const correction of learningCorrections) {
        if (correction.keywords_extracted?.keywords) {
          const key = `${correction.corrected_family_id}_${correction.corrected_category_id}_${correction.corrected_subcategory_id}`;
          const existing = patternGroups.get(key) || { keywords: [], count: 0 };
          existing.keywords.push(...(correction.keywords_extracted.keywords as string[]));
          existing.count++;
          patternGroups.set(key, existing);
        }
      }
      
      learningContext = `\n\n🧠 APPRENTISSAGE PROFOND - PATTERNS VALIDÉS PAR LES EXPERTS :
Ces corrections ont été validées manuellement et doivent guider tes classifications futures :
${Array.from(patternGroups.entries()).slice(0, 50).map(([key, data]) => 
  `- Mots-clés: ${[...new Set(data.keywords)].slice(0, 10).join(', ')} (${data.count} validations)`
).join('\n')}`;
    }

    // 4. Prepare sequences context for AI
    const sequencesContext = sequences.map((seq, idx) => {
      const partie = (seq as any).property_parts?.name || 'Non spécifié';
      const partieType = (seq as any).property_parts?.part_type || '';
      const lieu = (seq as any).property_locations?.name || 'Non spécifié';
      const lieuType = (seq as any).property_locations?.location_type || '';
      const endroit = seq.endroit_name || '';
      const zone = seq.zone_type || '';
      const condition = seq.user_condition || seq.detected_condition || 'non_evalue';
      
      // Récupérer les préconisations depuis metadata si disponibles
      const recommendations = (seq.metadata as any)?.recommendations || '';
      
      return `
=== SÉQUENCE ${idx + 1} ===
📍 LOCALISATION COMPLÈTE:
- Partie: ${partie} (${partieType === 'commune' ? 'Parties Communes' : 'Parties Privatives'})
- Lieu: ${lieu} (${lieuType})
- Endroit: ${endroit || 'Non spécifié'}
- Zone: ${zone || 'Non spécifié'}

📝 DESCRIPTION DU PROBLÈME:
${seq.description || 'Pas de description'}

${(seq.metadata as any)?.recommendations ? `💡 PRÉCONISATIONS / TRAVAUX RECOMMANDÉS:
${(seq.metadata as any).recommendations}

⚠️ IMPORTANT: Les préconisations ci-dessus sont des recommandations de l'utilisateur pour résoudre le problème. Utilise-les pour enrichir et préciser les tâches à extraire.` : ''}

🎤 TRANSCRIPTION AUDIO:
${seq.transcription || 'Pas de transcription'}

📊 ÉTAT CONSTATÉ: ${condition === 'neuf' ? 'NEUF' : condition === 'bon' ? 'BON' : condition === 'a_refaire' ? 'À REFAIRE' : 'Non évalué'}

📸 PHOTOS: ${seq.photos ? (seq.photos as any[]).length : 0} photo(s)
🎬 VIDÉO: ${seq.video_url ? 'Oui' : 'Non'}

🔍 ZONES DÉTECTÉES: ${seq.detected_zones?.join(', ') || 'Aucune'}
`;
    }).join('\n');

    // 5. Build the AI system prompt
    const totalTasks = tTaches?.length || 0;
    const systemPrompt = `Tu es un expert SENIOR en analyse de chantiers de construction et rénovation avec 25 ans d'expérience.
Tu utilises EXCLUSIVEMENT la nomenclature DTC (Descriptif Technique Commun) ci-dessous pour classifier TOUTES les tâches avec une PRÉCISION EXCEPTIONNELLE.

📋 NOMENCLATURE DTC COMPLÈTE (${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC, ${totalTasks > 0 ? '~17 000' : '0'} T) :
${taxonomyContext}
${learningContext}

🎯 TA MISSION CRITIQUE :
Tu dois extraire TOUTES les tâches de travaux identifiables dans les séquences de visite, les classifier selon le DTC, et les rattacher à leur localisation exacte.

⚡ RÈGLES DE CLASSIFICATION (DEEP LEARNING) :

1. ANALYSE SÉMANTIQUE PROFONDE :
   - Analyse chaque mot de la description et transcription
   - Identifie les symptômes (fissure, humidité, décollement, etc.)
   - Déduis le type de travaux nécessaires
   - Évalue la gravité et l'urgence

2. CLASSIFICATION DTC QUADRUPLE VALIDATION :
   a) FAMILLE (FT##) : Type de travail général (maçonnerie, électricité, plomberie...)
   b) CATÉGORIE (CT##) : Nature spécifique de l'intervention (format: FT##/CT##)
   c) SOUS-CATÉGORIE (SC##) : Tâche précise à réaliser (format: FT##/CT##/SC##)
   d) TÂCHE (T##) : Tâche détaillée avec description, unité, rendement (format: FT##/CT##/SC##/T##)
   
   ⚠️ VÉRIFIE 4 FOIS que chaque code existe dans la nomenclature ci-dessus !
   ⚠️ Utilise les codes COMPLETS (ex: FT01/CT01/SC01/T01) et non juste les numéros !

3. LOCALISATION HIÉRARCHIQUE :
   - partie_type: "commune" ou "privative"
   - partie_name: Nom exact de la partie
   - lieu_name: Nom du lieu visité
   - endroit_name: Endroit précis dans le lieu
   - zone_type: Zone concernée (mur, sol, plafond, etc.)

4. AUTO-CORRECTION & AMÉLIORATION CONTINUE :
   - Si une description est ambiguë, analyse le contexte complet
   - Utilise les patterns d'apprentissage validés pour guider ta classification
   - En cas de doute, choisis la classification la plus conservatrice
   - Génère un score de confiance honnête (0-100)

5. QUALITÉ EXCEPTIONNELLE :
   - Title: Court, technique, précis (max 60 caractères)
   - Description: Détaillée, technique, actionnable
   - Priority: "high" si sécurité/structure, "medium" si confort/esthétique, "low" si entretien préventif
   - work_type: "renovation" ou "new_build"

🚫 INTERDICTIONS ABSOLUES :
- Ne JAMAIS inventer de codes DSC
- Ne JAMAIS omettre la localisation
- Ne JAMAIS créer de tâches vagues ou génériques
- Ne JAMAIS classifier sans vérifier l'existence du code`;

    const userPrompt = `ANALYSE CES ${sequences.length} SÉQUENCES DE VISITE ET EXTRAIT TOUTES LES TÂCHES :

${sequencesContext}

EXTRAIS MAINTENANT TOUTES LES TÂCHES identifiées, avec classification DTC complète (FT/CT/SC/T) et localisation exacte.
Sois EXHAUSTIF : une séquence peut contenir plusieurs problèmes = plusieurs tâches.
Sois PRÉCIS : chaque tâche doit avoir une classification FT/CT/SC valide, et si possible le code T## correspondant.

💡 UTILISE LES PRÉCONISATIONS : Si des préconisations sont fournies, elles indiquent les travaux recommandés par l'utilisateur. Utilise-les pour :
- Identifier les tâches spécifiques à réaliser
- Enrichir les descriptions des tâches
- Valider que les tâches extraites correspondent aux recommandations`;

    // 6. Call AI for extraction
    console.log(`[extract-tasks-from-sequences] Calling AI for task extraction...`);
    
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
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks_from_sequences",
              description: "Extract and classify all construction tasks from visit sequences",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sequence_index: { type: "number", description: "Index de la séquence source (1-based)" },
                        family_code: { type: "string", description: "Code FT## de la famille DTC (ex: FT01)" },
                        category_code: { type: "string", description: "Code CT## de la catégorie DTC (ex: FT01/CT01)" },
                        subcategory_code: { type: "string", description: "Code SC## de la sous-catégorie DTC (ex: FT01/CT01/SC01)" },
                        task_code: { type: "string", description: "Code T## de la tâche DTC (ex: FT01/CT01/SC01/T01) - OPTIONNEL mais recommandé" },
                        title: { type: "string", description: "Titre court et technique" },
                        description: { type: "string", description: "Description détaillée des travaux" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        work_type: { type: "string", enum: ["renovation", "new_build"] },
                        partie_type: { type: "string", enum: ["commune", "privative"] },
                        partie_name: { type: "string" },
                        lieu_name: { type: "string" },
                        endroit_name: { type: "string" },
                        zone_type: { type: "string" },
                        condition: { type: "string", enum: ["neuf", "bon", "a_refaire"] },
                        confidence_score: { type: "number", description: "Score de confiance 0-100" }
                      },
                      required: ["sequence_index", "family_code", "category_code", "subcategory_code", "title", "priority", "work_type", "partie_type", "confidence_score"],
                      additionalProperties: false
                    }
                  },
                  analysis_summary: {
                    type: "object",
                    properties: {
                      total_problems_detected: { type: "number" },
                      high_priority_count: { type: "number" },
                      medium_priority_count: { type: "number" },
                      low_priority_count: { type: "number" },
                      most_affected_zones: { type: "array", items: { type: "string" } },
                      key_findings: { type: "array", items: { type: "string" } }
                    },
                    additionalProperties: false
                  }
                },
                required: ["tasks", "analysis_summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks_from_sequences" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' }),
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
      throw new Error('No tool call in AI response');
    }

    const aiResult = JSON.parse(toolCall.function.arguments);
    const extractedTasks = aiResult.tasks || [];
    const analysisSummary = aiResult.analysis_summary || {};

    console.log(`[extract-tasks-from-sequences] AI extracted ${extractedTasks.length} tasks`);

    // 7. Validate and map DTC codes to IDs
    const validatedTasks = [];
    const classificationLogs = [];

    for (const task of extractedTasks) {
      // Find family (FT)
      const family = ftFamilles?.find(f => f.ft_code === task.family_code);
      let familyId = family?.id || null;
      let categoryId = null;
      let subcategoryId = null;
      let taskId = null;
      
      if (family) {
        // Find category (CT) - peut être au format FT##/CT## ou juste CT##
        const categoryCode = task.category_code.includes('/') 
          ? task.category_code.split('/').pop() 
          : task.category_code;
        const category = ctCategories?.find((c: any) => 
          c.ct_code === categoryCode && c.ft_code === family.ft_code
        );
        categoryId = category?.id || null;
        
        if (category) {
          // Find subcategory (SC) - peut être au format FT##/CT##/SC## ou juste SC##
          const subcategoryCode = task.subcategory_code.includes('/')
            ? task.subcategory_code.split('/').pop()
            : task.subcategory_code;
          const subcategory = scSousCategories?.find((sc: any) => 
            sc.sc_code === subcategoryCode && sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
          );
          subcategoryId = subcategory?.id || null;
          
          if (subcategory && task.task_code) {
            // Find task (T) - peut être au format FT##/CT##/SC##/T## ou juste T##
            const taskCode = task.task_code.includes('/')
              ? task.task_code.split('/').pop()
              : task.task_code;
            const dtcTask = tTaches?.find((t: any) => 
              t.t_code === taskCode && t.sc_code === subcategory.sc_code && 
              t.ct_code === category.ct_code && t.ft_code === family.ft_code
            );
            taskId = dtcTask?.id || null;
          }
        }
      }

      // Log classification validation
      const isValid = familyId && categoryId && subcategoryId;
      classificationLogs.push({
        task_title: task.title,
        family_code: task.family_code,
        category_code: task.category_code,
        subcategory_code: task.subcategory_code,
        task_code: task.task_code || null,
        valid: isValid,
        confidence: task.confidence_score || 0
      });

      // Build location string
      const locationParts = [
        task.partie_name,
        task.lieu_name,
        task.endroit_name,
        task.zone_type
      ].filter(Boolean);

      validatedTasks.push({
        title: task.title,
        description: task.description,
        priority: task.priority,
        work_type: task.work_type,
        location: locationParts.join(' > ') || null,
        area: task.partie_type === 'commune' ? 'Parties Communes' : 'Parties Privatives',
        family_id: familyId || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        // Note: task_id pourrait être ajouté si la table tasks supporte une référence directe à t_taches
        source_type: 'text',
        project_id: projectId,
        analysis_metadata: {
          sequence_index: task.sequence_index,
          dtc_codes: {
            ft_code: task.family_code,
            ct_code: task.category_code,
            sc_code: task.subcategory_code,
            t_code: task.task_code || null
          },
          partie_type: task.partie_type,
          partie_name: task.partie_name,
          lieu_name: task.lieu_name,
          endroit_name: task.endroit_name,
          zone_type: task.zone_type,
          condition: task.condition,
          confidence_score: task.confidence_score,
          original_codes: {
            family: task.family_code,
            category: task.category_code,
            subcategory: task.subcategory_code,
            task: task.task_code || null
          },
          dtc_codes: {
            ft_code: task.family_code,
            ct_code: task.category_code,
            sc_code: task.subcategory_code,
            t_code: task.task_code || null
          }
        },
        detection_confidence: task.confidence_score / 100
      });

      // Log classification for learning
      classificationLogs.push({
        task_title: task.title,
        ai_family_code: task.family_code,
        ai_category_code: task.category_code,
        ai_subcategory_code: task.subcategory_code,
        matched_family_id: familyId,
        matched_category_id: categoryId,
        matched_subcategory_id: subcategoryId,
        family_match_type: familyId ? 'exact' : 'none',
        category_match_type: categoryId ? 'exact' : 'none',
        subcategory_match_type: subcategoryId ? 'exact' : 'none',
        needs_review: !subcategoryId
      });
    }

    // 8. Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || payload.user_id || payload.id;
      } catch (e) {
        console.error('Token decode error:', e);
      }
    }

    // 9. Delete existing extracted tasks for this project to avoid duplicates
    const { error: deleteError } = await supabase
      .from('extracted_tasks')
      .delete()
      .eq('project_id', projectId)
      .eq('source_type', 'text');

    if (deleteError) {
      console.warn('[extract-tasks-from-sequences] Warning deleting old tasks:', deleteError);
    } else {
      console.log('[extract-tasks-from-sequences] Cleared existing tasks for project');
    }

    // 10. Insert tasks into database
    let insertedTasks: any[] = [];
    if (validatedTasks.length > 0 && userId) {
      const tasksWithUser = validatedTasks.map(task => ({
        ...task,
        user_id: userId
      }));

      const { data, error: insertError } = await supabase
        .from('extracted_tasks')
        .insert(tasksWithUser)
        .select();
      
      insertedTasks = data || [];

      if (insertError) {
        console.error('Error inserting tasks:', insertError);
      } else {
        console.log(`[extract-tasks-from-sequences] Inserted ${insertedTasks?.length || 0} tasks`);
      }

      // Log classifications for learning
      if (classificationLogs.length > 0) {
        const logsWithUser = classificationLogs.map((log, idx) => ({
          ...log,
          user_id: userId,
          task_id: insertedTasks[idx]?.id
        }));

        const { error: logError } = await supabase.from('dsc_classification_logs').insert(logsWithUser);
        if (logError) {
          console.error('Error logging classifications:', logError);
        }
      }
    }

    // 11. Return results
    return new Response(
      JSON.stringify({
        success: true,
        tasks: validatedTasks,
        summary: {
          totalSequences: sequences.length,
          totalTasks: validatedTasks.length,
          ...analysisSummary
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-tasks-from-sequences] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
