import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Helper function to calculate text similarity
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.split(/\s+/).filter(w => w.length > 3);
  
  const commonWords = words1.filter(w => words2.includes(w));
  return commonWords.length / Math.max(words1.length, words2.length);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      if (!userId) throw new Error('User ID not found');
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { taskIds } = await req.json();
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Task IDs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Re-classifying ${taskIds.length} tasks for user ${userId}`);

    // Fetch tasks to re-classify
    const { data: tasks, error: fetchError } = await supabase
      .from('extracted_tasks')
      .select('*')
      .in('id', taskIds)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;
    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tasks found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch DTC taxonomy complète (FT/CT/SC/T) pour classification
    console.log('[reclassify-tasks] Loading DTC taxonomy (FT/CT/SC/T)...');
    
    const { data: ftFamilles } = await supabase
      .from('ft_familles')
      .select('id, ft_code, ft_label, commentaire_type_equipe')
      .order('ft_code');

    const { data: ctCategories } = await supabase
      .from('ct_categories')
      .select('id, ct_code, ft_code, ct_label')
      .order('ct_code');

    const { data: scSousCategories } = await supabase
      .from('sc_sous_categories')
      .select('id, sc_code, ct_code, ft_code, sc_label, zone_type, keywords_ia')
      .order('sc_code');

    const { data: tTaches } = await supabase
      .from('t_taches')
      .select('t_code, sc_code, ct_code, ft_code, t_label, description_detaillee')
      .limit(5000)
      .order('t_code');

    console.log(`[reclassify-tasks] DTC loaded: ${ftFamilles?.length || 0} FT, ${ctCategories?.length || 0} CT, ${scSousCategories?.length || 0} SC, ${tTaches?.length || 0} T (échantillon)`);

    if (!ftFamilles || ftFamilles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'DTC taxonomy not loaded' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's manual corrections for learning
    const { data: userCorrections } = await supabase
      .from('dsc_learning_corrections')
      .select(`
        task_title,
        task_description,
        corrected_family_id,
        corrected_category_id,
        corrected_subcategory_id,
        task_families:corrected_family_id(code, name),
        task_categories:corrected_category_id(code, name),
        task_subcategories:corrected_subcategory_id(code, name)
      `)
      .eq('corrected_by', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`Found ${userCorrections?.length || 0} manual corrections for learning`);

    const reclassified = [];
    const classificationLogs = [];

    for (const task of tasks) {
      console.log(`Re-classifying task: "${task.title}"`);
      
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      let family = null;
      let category = null;
      let subcategory = null;
      let familyMatchType = 'none';
      let categoryMatchType = 'none';
      let subcategoryMatchType = 'none';
      const warnings: string[] = [];

      // First, check if similar task was manually corrected before
      let learnedMatch = false;
      if (userCorrections && userCorrections.length > 0) {
        for (const correction of userCorrections) {
          const correctionText = `${correction.task_title} ${correction.task_description || ''}`.toLowerCase();
          const similarity = calculateSimilarity(taskText, correctionText);
          
          if (similarity > 0.7) {
            // High similarity - use the corrected classification avec DTC
            family = ftFamilles.find(f => f.id === correction.corrected_family_id);
            if (family) {
              category = ctCategories?.find((c: any) => c.id === correction.corrected_category_id && c.ft_code === family.ft_code);
              if (category) {
                subcategory = scSousCategories?.find((sc: any) => 
                  sc.id === correction.corrected_subcategory_id && 
                  sc.ct_code === category.ct_code && 
                  sc.ft_code === family.ft_code
                );
              }
            }
            
            if (family && category && subcategory) {
              familyMatchType = 'learned';
              categoryMatchType = 'learned';
              subcategoryMatchType = 'learned';
              learnedMatch = true;
              console.log(`🎓 Learned from correction: ${family.ft_code}/${category.ct_code}/${subcategory.sc_code}`);
              break;
            }
          }
        }
      }

      if (!learnedMatch) {

      // Semantic matching for family avec DTC
      family = ftFamilles.find(f => {
        const familyName = f.ft_label.toLowerCase();
        const keywords = familyName.split(' ').filter((k: string) => k.length > 3);
        return keywords.some((keyword: string) => 
          taskText.includes(keyword) || keyword.includes(taskText)
        );
      });

      if (family) {
        familyMatchType = 'semantic';
        console.log(`✅ Semantic matched family: ${family.ft_code} (${family.ft_label})`);
      } else {
        family = ftFamilles[0];
        if (family) {
          familyMatchType = 'fallback';
          warnings.push(`Fallback family: ${family.ft_code}`);
          console.warn(`⚠️ Using fallback family: ${family.ft_code}`);
        }
      }

      // Semantic matching for category avec DTC
      if (family && ctCategories) {
        const familyCategories = ctCategories.filter(c => c.ft_code === family.ft_code);
        category = familyCategories.find((c: any) => {
          const categoryName = c.ct_label.toLowerCase();
          const keywords = categoryName.split(' ').filter((k: string) => k.length > 3);
          return keywords.some((keyword: string) => taskText.includes(keyword));
        });

        if (category) {
          categoryMatchType = 'semantic';
          console.log(`✅ Semantic matched category: ${category.ct_code} (${category.ct_label})`);
        } else if (familyCategories.length > 0) {
          category = familyCategories[0];
          categoryMatchType = 'fallback';
          warnings.push(`Fallback category: ${category.ct_code}`);
          console.warn(`⚠️ Using fallback category: ${category.ct_code}`);
        }
      }

      // Semantic matching for subcategory avec DTC
      if (category && scSousCategories) {
        const categorySubcategories = scSousCategories.filter(sc => 
          sc.ct_code === category.ct_code && sc.ft_code === family.ft_code
        );
        subcategory = categorySubcategories.find((sc: any) => {
          const subcategoryName = sc.sc_label.toLowerCase();
          const keywords = subcategoryName.split(' ').filter((k: string) => k.length > 3);
          return keywords.some((keyword: string) => taskText.includes(keyword));
        });

        if (subcategory) {
          subcategoryMatchType = 'semantic';
          console.log(`✅ Semantic matched subcategory: ${subcategory.sc_code} (${subcategory.sc_label})`);
        } else if (categorySubcategories.length > 0) {
          subcategory = categorySubcategories[0];
          subcategoryMatchType = 'fallback';
          warnings.push(`Fallback subcategory: ${subcategory.sc_code}`);
          console.warn(`⚠️ Using fallback subcategory: ${subcategory.sc_code}`);
        }
      }
      }

      // Update task with new classification
      const { error: updateError } = await supabase
        .from('extracted_tasks')
        .update({
          family_id: family?.id || null,
          category_id: category?.id || null,
          subcategory_id: subcategory?.id || null
        })
        .eq('id', task.id);

      if (updateError) {
        console.error(`Error updating task ${task.id}:`, updateError);
      } else {
        console.log(`✅ Task re-classified: ${task.title}`);
        reclassified.push({
          id: task.id,
          title: task.title,
          family: family?.code,
          category: category?.code,
          subcategory: subcategory?.code
        });

        // Log classification
        classificationLogs.push({
          user_id: userId,
          task_id: task.id,
          task_title: task.title,
          matched_family_id: family?.id || null,
          matched_category_id: category?.id || null,
          matched_subcategory_id: subcategory?.id || null,
          family_match_type: familyMatchType,
          category_match_type: categoryMatchType,
          subcategory_match_type: subcategoryMatchType,
          needs_review: familyMatchType === 'fallback' || categoryMatchType === 'fallback' || subcategoryMatchType === 'fallback',
          warnings: warnings.length > 0 ? warnings : null
        });
      }
    }

    // Save classification logs
    if (classificationLogs.length > 0) {
      await supabase
        .from('dsc_classification_logs')
        .insert(classificationLogs);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reclassified: reclassified.length,
        tasks: reclassified
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reclassify-tasks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
