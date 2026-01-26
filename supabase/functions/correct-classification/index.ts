import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract meaningful keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'à', 'en', 'pour', 'sur', 'dans', 'avec', 'au'];
  const words = text.toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  return [...new Set(words)].slice(0, 10); // Top 10 unique keywords
}

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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, familyId, categoryId, subcategoryId } = await req.json();
    
    if (!taskId || !familyId || !categoryId || !subcategoryId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch task details
    const { data: task, error: taskError } = await supabase
      .from('extracted_tasks')
      .select('title, description, family_id, category_id, subcategory_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract keywords for learning
    const taskText = `${task.title} ${task.description || ''}`;
    const keywords = extractKeywords(taskText);

    console.log('Manual correction:', {
      taskId,
      original: { family: task.family_id, category: task.category_id, subcategory: task.subcategory_id },
      corrected: { family: familyId, category: categoryId, subcategory: subcategoryId },
      keywords
    });

    // Save learning correction
    const { error: learningError } = await supabase
      .from('dsc_learning_corrections')
      .upsert({
        task_id: taskId,
        task_title: task.title,
        task_description: task.description,
        original_family_id: task.family_id,
        original_category_id: task.category_id,
        original_subcategory_id: task.subcategory_id,
        corrected_family_id: familyId,
        corrected_category_id: categoryId,
        corrected_subcategory_id: subcategoryId,
        correction_type: 'manual',
        corrected_by: userId,
        keywords_extracted: { keywords, timestamp: new Date().toISOString() },
        confidence_score: 1
      }, {
        onConflict: 'task_id'
      });

    if (learningError) {
      console.error('Learning save error:', learningError);
    }

    // Update task with corrected classification
    const { error: updateError } = await supabase
      .from('extracted_tasks')
      .update({
        family_id: familyId,
        category_id: categoryId,
        subcategory_id: subcategoryId
      })
      .eq('id', taskId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Classification corrected and learned',
        keywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in correct-classification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
