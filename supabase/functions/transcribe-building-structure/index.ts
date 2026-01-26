import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, propertyType, address } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio for building structure, property type:', propertyType);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Step 1: Transcribe audio using Whisper via Lovable AI
    const binaryAudio = processBase64Chunks(audio);
    
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr');

    console.log('Transcribing audio...');
    const transcribeResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: formData,
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('Transcription error:', transcribeResponse.status, errorText);
      throw new Error(`Erreur de transcription: ${transcribeResponse.status}`);
    }

    const transcriptionResult = await transcribeResponse.json();
    const transcription = transcriptionResult.text;
    console.log('Transcription:', transcription);

    // Step 2: Analyze transcription to extract building structure
    const systemPrompt = `Tu es un expert en analyse immobilière. Tu reçois la transcription d'un enregistrement vocal où un inspecteur décrit la composition d'un bâtiment. 

Ta mission est d'extraire et structurer les informations mentionnées.

Règles:
- Extrait UNIQUEMENT les éléments clairement mentionnés dans la transcription
- Corrige les erreurs de reconnaissance vocale évidentes (ex: "salle deux bains" → "salle de bains")
- Utilise la nomenclature française standard
- Si un nombre d'appartements ou de caves est mentionné, génère les entrées correspondantes
- Sois précis sur les noms (ex: "cuisine aménagée" plutôt que "cuisine")`;

    const userPrompt = `Analyse cette description vocale d'un bâtiment et extrait la structure:

Type de bien: ${propertyType || 'Non spécifié'}
Adresse: ${address || 'Non spécifiée'}

Transcription de l'inspecteur:
"${transcription}"

IMPORTANT: Retourne UNIQUEMENT un objet JSON valide avec cette structure (pas de markdown):
{
  "commonAreas": ["éléments des parties communes mentionnés"],
  "apartments": ["appartements/logements mentionnés"],
  "basements": ["caves/sous-sols mentionnés"],
  "parking": ["parkings/stationnements mentionnés"],
  "gardens": ["jardins/extérieurs mentionnés"],
  "others": ["autres éléments mentionnés"],
  "transcription": "la transcription originale pour référence"
}

Si une catégorie n'est pas mentionnée, laisse un tableau vide.`;

    console.log('Analyzing transcription with AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // If AI fails, return just the transcription
      return new Response(
        JSON.stringify({ 
          suggestions: {
            commonAreas: [],
            apartments: [],
            basements: [],
            parking: [],
            gardens: [],
            others: [],
            transcription
          },
          transcription
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    console.log('AI response:', content.substring(0, 300));

    // Parse JSON from AI response
    let suggestions;
    try {
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      suggestions = JSON.parse(cleanContent);
      suggestions.transcription = transcription;
    } catch (parseError) {
      console.error('JSON parse error, returning transcription only:', parseError);
      suggestions = {
        commonAreas: [],
        apartments: [],
        basements: [],
        parking: [],
        gardens: [],
        others: [],
        transcription
      };
    }

    console.log('Suggestions extracted:', {
      commonAreas: suggestions.commonAreas?.length || 0,
      apartments: suggestions.apartments?.length || 0,
      basements: suggestions.basements?.length || 0,
      parking: suggestions.parking?.length || 0,
      gardens: suggestions.gardens?.length || 0,
      others: suggestions.others?.length || 0,
    });

    return new Response(
      JSON.stringify({ suggestions, transcription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-building-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
