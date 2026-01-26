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

    let correctedCategories = 0;
    let correctedSubcategories = 0;

    // Fix Categories with generic names
    const { data: genericCategories, error: catError } = await supabaseClient
      .from('task_categories')
      .select('id, name, code, family_id')
      .ilike('name', '%Compléments%');

    if (catError) throw catError;

    console.log(`Found ${genericCategories?.length || 0} generic categories`);

    for (const category of genericCategories || []) {
      // Get tasks associated with this category
      const { data: tasks } = await supabaseClient
        .from('extracted_tasks')
        .select('title, description')
        .eq('category_id', category.id)
        .limit(10);

      if (!tasks || tasks.length === 0) continue;

      // Aggregate task content
      const taskSamples = tasks.map(t => `${t.title}: ${t.description || ''}`).join('\n');

      const prompt = `Analyse ces tâches de construction et déduis le véritable thème métier de la catégorie:

Code actuel: ${category.code}
Nom générique actuel: ${category.name}

Exemples de tâches dans cette catégorie:
${taskSamples}

Réponds UNIQUEMENT avec le nom de catégorie métier précis (ex: "Électricité", "Plomberie", "Menuiserie", "Peinture").
Un seul mot ou expression courte, pas de phrase complète.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en nomenclature de construction DSC. Réponds uniquement avec le nom de la catégorie métier, rien d\'autre.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI error for category ${category.id}:`, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const suggestedName = aiData.choices[0].message.content.trim();

      if (suggestedName && suggestedName.length > 2 && suggestedName.length < 100) {
        const { error: updateError } = await supabaseClient
          .from('task_categories')
          .update({ name: suggestedName })
          .eq('id', category.id);

        if (!updateError) {
          console.log(`✅ Updated category ${category.code}: "${category.name}" → "${suggestedName}"`);
          correctedCategories++;
        } else {
          console.error(`Failed to update category ${category.id}:`, updateError);
        }
      }
    }

    // Fix Subcategories with generic names
    const { data: genericSubcategories, error: subError } = await supabaseClient
      .from('task_subcategories')
      .select('id, name, code, category_id')
      .ilike('name', '%Poste%');

    if (subError) throw subError;

    console.log(`Found ${genericSubcategories?.length || 0} generic subcategories`);

    for (const subcategory of genericSubcategories || []) {
      // Get tasks associated with this subcategory
      const { data: tasks } = await supabaseClient
        .from('extracted_tasks')
        .select('title, description')
        .eq('subcategory_id', subcategory.id)
        .limit(10);

      if (!tasks || tasks.length === 0) continue;

      const taskSamples = tasks.map(t => `${t.title}: ${t.description || ''}`).join('\n');

      const prompt = `Analyse ces tâches de construction et déduis le véritable sous-thème métier précis:

Code actuel: ${subcategory.code}
Nom générique actuel: ${subcategory.name}

Exemples de tâches dans cette sous-catégorie:
${taskSamples}

Réponds UNIQUEMENT avec le nom de sous-catégorie métier précis (ex: "Installation tableau électrique", "Pose carrelage", "Remplacement fenêtres").
Une expression courte et descriptive, pas de phrase complète.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en nomenclature de construction DSC. Réponds uniquement avec le nom de la sous-catégorie métier, rien d\'autre.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI error for subcategory ${subcategory.id}:`, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const suggestedName = aiData.choices[0].message.content.trim();

      if (suggestedName && suggestedName.length > 2 && suggestedName.length < 150) {
        const { error: updateError } = await supabaseClient
          .from('task_subcategories')
          .update({ name: suggestedName })
          .eq('id', subcategory.id);

        if (!updateError) {
          console.log(`✅ Updated subcategory ${subcategory.code}: "${subcategory.name}" → "${suggestedName}"`);
          correctedSubcategories++;
        } else {
          console.error(`Failed to update subcategory ${subcategory.id}:`, updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Correction de la taxonomie terminée',
        corrected_categories: correctedCategories,
        corrected_subcategories: correctedSubcategories,
        total_analyzed: (genericCategories?.length || 0) + (genericSubcategories?.length || 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fix-taxonomy-labels:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
