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
    const { text, context } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ correctedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ correctedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Tu es un correcteur orthographique et grammatical expert pour le français dans le domaine du bâtiment et de l'inspection immobilière.

RÈGLES STRICTES:
1. Corrige TOUTES les fautes d'orthographe et de grammaire
2. Corrige la ponctuation (points, virgules, majuscules)
3. Améliore la clarté si nécessaire SANS changer le sens
4. Garde le style et le ton original
5. Ne supprime AUCUNE information
6. Conserve les termes techniques du bâtiment
7. Retourne UNIQUEMENT le texte corrigé, rien d'autre

Exemples de corrections:
- "fisure sur le mure" → "Fissure sur le mur"
- "plafon humide infiltration deau" → "Plafond humide, infiltration d'eau"
- "menuisrie porte fenetre cassé" → "Menuiserie porte-fenêtre cassée"
- "carrelage decollé sol cuisine" → "Carrelage décollé au sol de la cuisine"`;

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
          { role: 'user', content: `Corrige ce texte (contexte: ${context || 'description de problème bâtiment'}):\n\n${text}` }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ correctedText: text, error: 'rate_limit' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ correctedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const correctedText = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(
      JSON.stringify({ correctedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in correct-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
