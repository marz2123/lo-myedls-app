import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      throw new Error('Missing authorization header');
    }

    const { taskTitle, taskDescription } = await req.json();

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    const userId = decodedPayload.sub;

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user's learning corrections (personalized patterns)
    const { data: corrections, error: correctionsError } = await supabase
      .from('dsc_learning_corrections')
      .select(`
        task_title,
        task_description,
        keywords_extracted,
        corrected_family_id,
        corrected_category_id,
        corrected_subcategory_id,
        confidence_score,
        task_families!corrected_family_id(code, name),
        task_categories!corrected_category_id(code, name),
        task_subcategories!corrected_subcategory_id(code, name)
      `)
      .eq('corrected_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (correctionsError) {
      console.error('Error fetching corrections:', correctionsError);
    }

    // Simple similarity matching
    const taskLower = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
    const words = taskLower.split(/\s+/).filter(w => w.length > 3);

    const recommendations: any[] = [];

    if (corrections && corrections.length > 0) {
      // Calculate similarity scores for each correction
      corrections.forEach((correction: any) => {
        const correctionText = `${correction.task_title} ${correction.task_description || ''}`.toLowerCase();
        
        // Count matching words
        let matchCount = 0;
        words.forEach(word => {
          if (correctionText.includes(word)) {
            matchCount++;
          }
        });

        const similarity = words.length > 0 ? (matchCount / words.length) * 100 : 0;

        // Also check keywords if available
        let keywordBonus = 0;
        if (correction.keywords_extracted && Array.isArray(correction.keywords_extracted)) {
          const keywordMatches = (correction.keywords_extracted as string[]).filter(keyword =>
            taskLower.includes(keyword.toLowerCase())
          ).length;
          keywordBonus = keywordMatches * 10;
        }

        const totalScore = Math.min(100, similarity + keywordBonus);

        if (totalScore > 30) {
          recommendations.push({
            family: correction.task_families,
            category: correction.task_categories,
            subcategory: correction.task_subcategories,
            confidence: totalScore,
            reasoning: `Basé sur votre correction précédente pour une tâche similaire (${similarity.toFixed(0)}% similarité)`,
            source: 'user_learning'
          });
        }
      });
    }

    // Sort by confidence and take top 3
    recommendations.sort((a, b) => b.confidence - a.confidence);
    const topRecommendations = recommendations.slice(0, 3);

    return new Response(JSON.stringify({
      recommendations: topRecommendations,
      totalPatternsAnalyzed: corrections?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-dsc-recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});