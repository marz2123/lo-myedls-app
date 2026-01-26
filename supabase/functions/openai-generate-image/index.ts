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

    const { 
      prompt, 
      size = "1024x1024",
      quality = "auto",
      background = "auto",
      outputFormat = "png",
      n = 1
    } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('[OpenAI Image] Generating image with prompt:', prompt.substring(0, 100));

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n,
        size,
        quality,
        background,
        output_format: outputFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI Image] API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[OpenAI Image] Generation complete, received', data.data?.length, 'images');

    // gpt-image-1 returns base64 directly
    const images = data.data?.map((item: any) => ({
      b64_json: item.b64_json,
      url: item.b64_json ? `data:image/${outputFormat};base64,${item.b64_json}` : item.url
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      images,
      created: data.created
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[OpenAI Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
