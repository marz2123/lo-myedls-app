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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { imageUrl, imageBase64, prompt, context } = await req.json();

    if (!imageUrl && !imageBase64) {
      throw new Error('Either imageUrl or imageBase64 is required');
    }

    // Build the image content
    const imageContent = imageUrl 
      ? { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
      : { type: "image_url", image_url: { url: imageBase64, detail: "high" } };

    // Default prompt for EDL analysis
    const systemPrompt = `Tu es un expert en états des lieux immobiliers. Analyse les images avec précision pour identifier:
- Les éléments visibles (murs, sols, plafonds, équipements, mobilier)
- L'état de chaque élément (neuf, bon état, usure normale, dégradé, très dégradé)
- Les anomalies (fissures, taches, traces d'humidité, dégâts, usure excessive)
- Les matériaux identifiables
- Les dimensions approximatives si pertinent

Réponds en JSON structuré avec les champs: elements[], anomalies[], description, etat_general, recommandations[]`;

    const userPrompt = prompt || "Analyse cette image pour un état des lieux immobilier. Identifie tous les éléments, leur état et les éventuelles anomalies.";

    console.log('[OpenAI Vision] Analyzing image...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: "text", text: context ? `${userPrompt}\n\nContexte: ${context}` : userPrompt },
              imageContent
            ]
          }
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Vision] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    console.log('[OpenAI Vision] Analysis complete');

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { description: content, raw: true };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OpenAI Vision] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
