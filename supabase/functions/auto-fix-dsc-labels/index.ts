import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      throw new Error('Invalid user token');
    }

    // Get tasks with generic labels
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('extracted_tasks')
      .select(`
        id,
        title,
        description,
        category_id,
        subcategory_id,
        task_categories!inner(id, name, code),
        task_subcategories!inner(id, name, code)
      `)
      .or('task_categories.name.ilike.%Compléments%,task_subcategories.name.ilike.%Poste%')
      .eq('user_id', user.id);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucune tâche à corriger', corrected: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tasks.length} tasks with generic labels`);

    // Process each task with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let correctedCount = 0;

    for (const task of tasks) {
      const taskContent = `${task.title}\n${task.description || ''}`;
      const needsCategoryFix = task.task_categories?.name?.includes('Compléments');
      const needsSubcategoryFix = task.task_subcategories?.name?.includes('Poste');

      if (!needsCategoryFix && !needsSubcategoryFix) continue;

      // Ask AI to extract proper business themes
      const prompt = `Analyse cette tâche de construction/inspection et extrait les thèmes métiers précis:

Tâche: ${taskContent}

${needsCategoryFix ? '- Catégorie actuelle générique: ' + task.task_categories.name : ''}
${needsSubcategoryFix ? '- Sous-catégorie actuelle générique: ' + task.task_subcategories.name : ''}

Réponds UNIQUEMENT au format JSON:
{
  "category_theme": "thème métier de catégorie (ex: Électricité, Plomberie, Peinture)",
  "subcategory_theme": "sous-thème métier précis (ex: Installation tableau électrique, Remplacement robinetterie)"
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en classification de tâches de construction. Réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI API error for task ${task.id}:`, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices[0].message.content;
      
      let extractedThemes;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        extractedThemes = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiContent);
      } catch (e) {
        console.error(`Failed to parse AI response for task ${task.id}:`, aiContent);
        continue;
      }

      // Find matching categories/subcategories in taxonomy
      let newCategoryId = task.category_id;
      let newSubcategoryId = task.subcategory_id;

      if (needsCategoryFix && extractedThemes.category_theme) {
        const { data: matchingCategories } = await supabaseClient
          .from('task_categories')
          .select('id, name')
          .ilike('name', `%${extractedThemes.category_theme}%`)
          .limit(1);

        if (matchingCategories && matchingCategories.length > 0) {
          newCategoryId = matchingCategories[0].id;
          console.log(`Corrected category for task ${task.id}: ${matchingCategories[0].name}`);
        }
      }

      if (needsSubcategoryFix && extractedThemes.subcategory_theme) {
        const { data: matchingSubcategories } = await supabaseClient
          .from('task_subcategories')
          .select('id, name')
          .ilike('name', `%${extractedThemes.subcategory_theme}%`)
          .limit(1);

        if (matchingSubcategories && matchingSubcategories.length > 0) {
          newSubcategoryId = matchingSubcategories[0].id;
          console.log(`Corrected subcategory for task ${task.id}: ${matchingSubcategories[0].name}`);
        }
      }

      // Update task if changes were made
      if (newCategoryId !== task.category_id || newSubcategoryId !== task.subcategory_id) {
        const { error: updateError } = await supabaseClient
          .from('extracted_tasks')
          .update({
            category_id: newCategoryId,
            subcategory_id: newSubcategoryId,
          })
          .eq('id', task.id);

        if (!updateError) {
          correctedCount++;
        } else {
          console.error(`Failed to update task ${task.id}:`, updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `${correctedCount} tâche(s) corrigée(s) avec succès`,
        total_analyzed: tasks.length,
        corrected: correctedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-fix-dsc-labels:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
