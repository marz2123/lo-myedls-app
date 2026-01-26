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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageUrl, imageBase64, videoFrames, context, mode } = await req.json();

    // Build content array for multimodal input
    const contentParts: any[] = [];

    // System prompt for EDL analysis
    const systemPrompt = `Tu es un expert en états des lieux immobiliers. Analyse les médias fournis avec précision.

Pour chaque élément détecté, fournis:
- type: catégorie (mur, sol, plafond, menuiserie, équipement, etc.)
- label: nom précis de l'élément
- state: état (neuf, bon, usé, dégradé, hors_service)
- material: matériau détecté si visible
- anomalies: liste des problèmes (fissure, tache, usure, etc.)

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "room_type": "type de pièce détecté",
  "global_state": "neuf|bon|usé|dégradé",
  "elements": [
    {
      "type": "string",
      "label": "string", 
      "state": "neuf|bon|usé|dégradé|hors_service",
      "material": "string|null",
      "anomalies": ["string"]
    }
  ],
  "anomalies": [
    {
      "type": "string",
      "severity": "mineur|modéré|majeur|critique",
      "description": "string",
      "location": "string"
    }
  ],
  "description": "description générale de la pièce/zone"
}`;

    // Add text prompt
    contentParts.push({
      type: "text",
      text: context 
        ? `Contexte additionnel: ${context}\n\nAnalyse cette image/vidéo pour un état des lieux immobilier.`
        : "Analyse cette image/vidéo pour un état des lieux immobilier."
    });

    // Add single image
    if (imageUrl) {
      contentParts.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    } else if (imageBase64) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
      });
    }

    // Add video frames (Gemini handles multiple images as video context)
    if (videoFrames && Array.isArray(videoFrames)) {
      for (const frame of videoFrames) {
        if (frame.url) {
          contentParts.push({
            type: "image_url",
            image_url: { url: frame.url }
          });
        } else if (frame.base64) {
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${frame.base64}` }
          });
        }
      }
    }

    console.log(`Analyzing with Gemini 2.5 Pro - ${videoFrames?.length || 1} frames, mode: ${mode || 'detailed'}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentParts }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    let analysis;
    try {
      // Clean potential markdown formatting
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error, returning raw content:', parseError);
      analysis = {
        room_type: 'inconnu',
        global_state: 'bon',
        elements: [],
        anomalies: [],
        description: content
      };
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      model: 'google/gemini-2.5-pro',
      framesAnalyzed: videoFrames?.length || 1,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-analyze-media:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
