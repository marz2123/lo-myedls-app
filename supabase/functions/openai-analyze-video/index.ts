import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FrameAnalysis {
  timestamp: number;
  elements: string[];
  anomalies: string[];
  description: string;
  roomType?: string;
  state?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { frames, context, mode = 'detailed' } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error('frames array is required with at least one frame');
    }

    console.log(`[OpenAI Video] Analyzing ${frames.length} frames...`);

    const systemPrompt = mode === 'quick' 
      ? `Tu es un assistant d'état des lieux. Analyse rapidement les images et identifie:
- Le type de pièce
- L'état général (bon/moyen/mauvais)
- Les anomalies évidentes
Réponds en JSON: { roomType, state, anomalies[], summary }`
      : `Tu es un expert en états des lieux immobiliers. Analyse cette séquence d'images vidéo pour:
1. Identifier chaque pièce/zone traversée
2. Lister tous les éléments visibles avec leur état
3. Détecter les anomalies (dégâts, usure, problèmes)
4. Évaluer la couverture de la visite

Réponds en JSON avec:
{
  "segments": [{ "startFrame": 0, "endFrame": 2, "roomType": "salon", "description": "..." }],
  "elements": [{ "name": "...", "state": "...", "location": "..." }],
  "anomalies": [{ "type": "...", "severity": "low|medium|high", "location": "...", "description": "..." }],
  "coverage": { "complete": true/false, "missingAreas": [] },
  "summary": "..."
}`;

    // Build content array with all frames
    const content: any[] = [
      { 
        type: "text", 
        text: context 
          ? `Analyse ces ${frames.length} images extraites d'une vidéo d'état des lieux.\n\nContexte: ${context}`
          : `Analyse ces ${frames.length} images extraites d'une vidéo d'état des lieux.`
      }
    ];

    // Add each frame as an image
    for (const frame of frames) {
      const imageUrl = frame.base64 || frame.url;
      if (imageUrl) {
        content.push({
          type: "image_url",
          image_url: { 
            url: imageUrl,
            detail: mode === 'quick' ? 'low' : 'high'
          }
        });
      }
    }

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
          { role: 'user', content }
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Video] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;

    console.log('[OpenAI Video] Analysis complete');

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch {
      analysis = { summary: analysisContent, raw: true };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      framesAnalyzed: frames.length,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OpenAI Video] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
