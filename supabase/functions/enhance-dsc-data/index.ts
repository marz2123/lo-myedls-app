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

    // Verify admin role
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { operation } = await req.json();

    let results = {
      operation,
      taxonomyFixed: 0,
      tasksFixed: 0,
      duplicatesRemoved: 0,
      descriptionsEnhanced: 0,
      total: 0,
    };

    // Operation 1: Fix generic taxonomy labels
    if (operation === 'all' || operation === 'taxonomy') {
      console.log('🔧 Fixing taxonomy labels...');
      
      const { data: genericCategories } = await supabaseClient
        .from('task_categories')
        .select('id, name, code, family_id')
        .or('name.ilike.%Compléments%,name.ilike.%Complements%');

      for (const category of genericCategories || []) {
        const { data: tasks } = await supabaseClient
          .from('extracted_tasks')
          .select('title, description')
          .eq('category_id', category.id)
          .limit(10);

        if (!tasks || tasks.length === 0) continue;

        const taskSamples = tasks.map(t => `${t.title}: ${t.description || ''}`).join('\n');
        const prompt = `Analyse ces tâches de construction et déduis le véritable thème métier de la catégorie:

Code actuel: ${category.code}
Nom générique actuel: ${category.name}

Exemples de tâches:
${taskSamples}

Réponds UNIQUEMENT avec le nom de catégorie métier précis (ex: "Électricité", "Plomberie", "Menuiserie").`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert en nomenclature de construction DSC.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const suggestedName = aiData.choices[0].message.content.trim();

          if (suggestedName && suggestedName.length > 2 && suggestedName.length < 100) {
            await supabaseClient
              .from('task_categories')
              .update({ name: suggestedName })
              .eq('id', category.id);
            
            results.taxonomyFixed++;
          }
        }
      }

      const { data: genericSubcategories } = await supabaseClient
        .from('task_subcategories')
        .select('id, name, code, category_id')
        .or('name.ilike.%Poste%,name.ilike.%poste%');

      for (const subcategory of genericSubcategories || []) {
        const { data: tasks } = await supabaseClient
          .from('extracted_tasks')
          .select('title, description')
          .eq('subcategory_id', subcategory.id)
          .limit(10);

        if (!tasks || tasks.length === 0) continue;

        const taskSamples = tasks.map(t => `${t.title}: ${t.description || ''}`).join('\n');
        const prompt = `Analyse ces tâches de construction et déduis le véritable sous-thème métier:

Code actuel: ${subcategory.code}
Nom générique actuel: ${subcategory.name}

Exemples de tâches:
${taskSamples}

Réponds UNIQUEMENT avec le nom de sous-catégorie métier précis.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert en nomenclature de construction DSC.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const suggestedName = aiData.choices[0].message.content.trim();

          if (suggestedName && suggestedName.length > 2 && suggestedName.length < 150) {
            await supabaseClient
              .from('task_subcategories')
              .update({ name: suggestedName })
              .eq('id', subcategory.id);
            
            results.taxonomyFixed++;
          }
        }
      }
    }

    // Operation 2: Fix existing tasks with generic classifications
    if (operation === 'all' || operation === 'tasks') {
      console.log('🔧 Fixing task classifications...');
      
      const { data: tasksToFix } = await supabaseClient
        .from('extracted_tasks')
        .select(`
          id,
          title,
          description,
          category:task_categories!category_id(id, name, code),
          subcategory:task_subcategories!subcategory_id(id, name, code)
        `)
        .or('task_categories.name.ilike.%Compléments%,task_subcategories.name.ilike.%Poste%')
        .limit(50);

      for (const task of tasksToFix || []) {
        const prompt = `Analyse cette tâche de construction et extrait les thèmes métiers précis:

Titre: ${task.title}
Description: ${task.description || 'N/A'}

Réponds en JSON avec:
{
  "category_theme": "thème principal (ex: Électricité, Plomberie)",
  "subcategory_theme": "sous-thème précis (ex: Installation tableau électrique)"
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
              { role: 'system', content: 'Tu es un expert en classification DSC. Réponds uniquement en JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          let themes;
          try {
            themes = JSON.parse(aiData.choices[0].message.content);
          } catch {
            continue;
          }

          let updateData: any = {};

          if (themes.category_theme) {
            const { data: matchedCategory } = await supabaseClient
              .from('task_categories')
              .select('id')
              .ilike('name', `%${themes.category_theme}%`)
              .not('name', 'ilike', '%Compléments%')
              .limit(1)
              .single();

            if (matchedCategory) {
              updateData.category_id = matchedCategory.id;
            }
          }

          if (themes.subcategory_theme) {
            const { data: matchedSubcategory } = await supabaseClient
              .from('task_subcategories')
              .select('id')
              .ilike('name', `%${themes.subcategory_theme}%`)
              .not('name', 'ilike', '%Poste%')
              .limit(1)
              .single();

            if (matchedSubcategory) {
              updateData.subcategory_id = matchedSubcategory.id;
            }
          }

          if (Object.keys(updateData).length > 0) {
            await supabaseClient
              .from('extracted_tasks')
              .update(updateData)
              .eq('id', task.id);
            
            results.tasksFixed++;
          }
        }
      }
    }

    // Operation 3: Remove duplicate taxonomy entries
    if (operation === 'all' || operation === 'duplicates') {
      console.log('🔧 Removing duplicates...');
      
      const { data: categories } = await supabaseClient
        .from('task_categories')
        .select('code, name, id, family_id');

      const categoryMap = new Map();
      for (const cat of categories || []) {
        const key = `${cat.family_id}-${cat.code}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, []);
        }
        categoryMap.get(key).push(cat);
      }

      for (const [_, duplicates] of categoryMap) {
        if (duplicates.length > 1) {
          const keepId = duplicates[0].id;
          const removeIds = duplicates.slice(1).map((d: any) => d.id);

          await supabaseClient
            .from('extracted_tasks')
            .update({ category_id: keepId })
            .in('category_id', removeIds);

          await supabaseClient
            .from('task_categories')
            .delete()
            .in('id', removeIds);

          results.duplicatesRemoved += removeIds.length;
        }
      }
    }

    // Operation 4: Enhance task descriptions
    if (operation === 'all' || operation === 'enhance') {
      console.log('🔧 Enhancing descriptions...');
      
      const { data: tasksToEnhance } = await supabaseClient
        .from('extracted_tasks')
        .select('id, title, description')
        .or('description.is.null,description.eq.')
        .limit(30);

      for (const task of tasksToEnhance || []) {
        const prompt = `Génère une description professionnelle pour cette tâche de construction:

Titre: ${task.title}

Fournis une description concise (2-3 phrases) qui explique la nature de la tâche, les travaux à effectuer, et les points d'attention.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert en description de tâches de construction.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const description = aiData.choices[0].message.content.trim();

          if (description && description.length > 10) {
            await supabaseClient
              .from('extracted_tasks')
              .update({ description })
              .eq('id', task.id);
            
            results.descriptionsEnhanced++;
          }
        }
      }
    }

    results.total = results.taxonomyFixed + results.tasksFixed + results.duplicatesRemoved + results.descriptionsEnhanced;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'DSC data enhancement completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-dsc-data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
