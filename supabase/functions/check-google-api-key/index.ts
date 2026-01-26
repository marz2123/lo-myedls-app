// @ts-nocheck
// Contexte Edge Function (Deno) : on neutralise les erreurs TS dans VS Code/Node.
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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Utiliser GEMINI_API_KEY en priorité, sinon GOOGLE_API_KEY
    const activeKey = GEMINI_API_KEY || GOOGLE_API_KEY;
    
    const status = {
      geminiApiKey: {
        configured: !!GEMINI_API_KEY,
        length: GEMINI_API_KEY?.length || 0,
        preview: GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET'
      },
      googleApiKey: {
        configured: !!GOOGLE_API_KEY,
        length: GOOGLE_API_KEY?.length || 0,
        preview: GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : 'NOT SET'
      },
      activeKey: {
        configured: !!activeKey,
        name: GEMINI_API_KEY ? 'GEMINI_API_KEY' : GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 'NONE',
        length: activeKey?.length || 0,
        preview: activeKey ? `${activeKey.substring(0, 10)}...` : 'NOT SET'
      },
      lovableApiKey: {
        configured: !!LOVABLE_API_KEY,
        length: LOVABLE_API_KEY?.length || 0,
        preview: LOVABLE_API_KEY ? `${LOVABLE_API_KEY.substring(0, 10)}...` : 'NOT SET'
      },
      recommendation: activeKey 
        ? `✅ ${GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'GOOGLE_API_KEY'} est configurée. La migration Gemini direct est active.` 
        : '⚠️ GEMINI_API_KEY (ou GOOGLE_API_KEY) n\'est pas configurée. Veuillez l\'ajouter dans Supabase Secrets.'
    };

    return new Response(
      JSON.stringify(status, null, 2),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        googleApiKey: { configured: false }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
