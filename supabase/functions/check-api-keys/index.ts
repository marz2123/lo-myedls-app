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
    // We only return booleans. Never return secret values.
    const result = {
      mapillary: Boolean(Deno.env.get('MAPILLARY_ACCESS_TOKEN')),
      pappers: Boolean(Deno.env.get('PAPPERS_API_KEY')),
      openai: Boolean(Deno.env.get('OPENAI_API_KEY')),
      lovableAi: Boolean(Deno.env.get('LOVABLE_API_KEY')),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
