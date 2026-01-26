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
    const { text, mode } = await req.json();

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Quick mode: just suggest improvements
    if (mode === 'quick') {
      const hints: string[] = [];

      // Detect missing elements
      if (!text.toLowerCase().includes('pièce') && 
          !text.toLowerCase().includes('zone') && 
          !text.toLowerCase().includes('local')) {
        hints.push('💡 Ajouter la localisation (ex: cuisine, salon)');
      }

      if (!text.toLowerCase().match(/réparer|remplacer|refaire|peindre|changer/)) {
        hints.push('🔧 Préciser le type de travaux');
      }

      if (!text.toLowerCase().match(/m²|m2|ml|unité/)) {
        hints.push('📏 Mentionner les quantités si possible');
      }

      const words = text.split(/\s+/).length;
      if (words < 5) {
        hints.push('📝 Description trop courte, plus de détails amélioreront l\'extraction');
      }

      return new Response(
        JSON.stringify({ hints }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AI-powered suggestions
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyse cette description de travaux et suggère 3 améliorations courtes pour mieux extraire les tâches:

"${text}"

Réponds uniquement avec 3 suggestions courtes (10 mots max chacune), séparées par des retours à la ligne.`
        }],
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const aiText = data.choices[0]?.message?.content || '';
    const hints = aiText.split('\n').filter((h: string) => h.trim()).slice(0, 3);

    return new Response(
      JSON.stringify({ hints }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', hints: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});