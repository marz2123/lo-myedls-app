import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript, projectContext } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context about project structure
    const lieuxContext = `
Parties Communes disponibles: ${projectContext.partiesCommunes?.join(', ') || 'Aucune'}
Parties Privatives disponibles: ${projectContext.partiesPrivatives?.join(', ') || 'Aucune'}
    `.trim();

    const systemPrompt = `Tu es un expert en extraction de localisation pour des états des lieux immobiliers.

À partir d'une description vocale d'un inspecteur, tu dois extraire:
1. partie: "commune" ou "privative" - où se trouve l'inspecteur
2. lieu: le lieu spécifique (ex: "Appartement 201", "Cage A", "Façade rue")
3. endroit: la pièce/zone dans le lieu (ex: "Cuisine", "Séjour", "Palier 3ème")
4. zone: l'élément observé (ex: "mur", "sol", "plafond", "fenetre", "porte")
5. problem: la description du problème/observation (nettoyée et reformulée)

Contexte du projet:
${lieuxContext}

RÈGLES:
- Si l'inspecteur parle d'appartement, appart, logement → partie = "privative"
- Si l'inspecteur parle de cage, escalier, hall, façade, toiture, parking commun → partie = "commune"  
- Reformule le problème de manière claire et professionnelle
- Retourne un score de confiance (0-1) basé sur la clarté des informations

Réponds UNIQUEMENT avec un JSON valide, sans markdown:
{
  "partie": "commune" | "privative" | null,
  "lieu": "string ou null",
  "endroit": "string ou null", 
  "zone": "string ou null",
  "problem": "description reformulée",
  "confidence": 0.0-1.0
}`;

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
          { role: 'user', content: `Transcription vocale: "${transcript}"` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let extracted;
    try {
      // Clean potential markdown
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      // Fallback extraction
      extracted = {
        partie: null,
        lieu: null,
        endroit: null,
        zone: null,
        problem: transcript,
        confidence: 0.3
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted,
        original_transcript: transcript
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in extract-location-from-voice:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        extracted: {
          partie: null,
          lieu: null,
          endroit: null,
          zone: null,
          problem: null,
          confidence: 0
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
