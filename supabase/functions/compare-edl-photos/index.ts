import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoData {
  id: string;
  frame_url: string;
  manual_label?: string;
  edl_tags?: {
    element_type?: string;
    state?: string;
    material?: string;
  };
}

interface DetectedDifference {
  type: string;
  severity: string;
  description: string;
  roomName: string;
  elementType: string;
  entryPhotoUrl: string;
  exitPhotoUrl: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, entryPhotos, exitPhotos } = await req.json();
    
    console.log(`Comparing EDL photos for project ${projectId}`);
    console.log(`Entry photos: ${entryPhotos?.length || 0}, Exit photos: ${exitPhotos?.length || 0}`);

    if (!entryPhotos?.length || !exitPhotos?.length) {
      return new Response(JSON.stringify({ 
        differences: [],
        message: 'No photos to compare'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const differences: DetectedDifference[] = [];
    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    // Match photos by room/element
    for (const exitPhoto of exitPhotos as PhotoData[]) {
      const roomName = exitPhoto.manual_label || 'Pièce';
      const elementType = exitPhoto.edl_tags?.element_type || 'Élément';
      
      // Find matching entry photo
      const matchingEntry = (entryPhotos as PhotoData[]).find(ep => 
        (ep.manual_label === exitPhoto.manual_label) ||
        (ep.edl_tags?.element_type === exitPhoto.edl_tags?.element_type)
      );

      if (matchingEntry && exitPhoto.frame_url && matchingEntry.frame_url) {
        try {
          // Use AI to compare the two photos
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `Tu es un expert en inspection immobilière. Compare ces deux photos (avant/après) et détecte les dégradations.
                  
Réponds en JSON strict avec ce format:
{
  "hasDifference": boolean,
  "differences": [
    {
      "type": "fissure|casse|salissure|rayure|decollement|moisissure|jaunissement|tache|deformation|manquant",
      "severity": "faible|moyen|fort",
      "description": "description courte et professionnelle",
      "confidence": 0.0-1.0
    }
  ]
}`
                },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `Compare ces deux photos de ${roomName} - ${elementType}. Photo 1 = état d'entrée, Photo 2 = état de sortie. Détecte toute dégradation.` },
                    { type: 'image_url', image_url: { url: matchingEntry.frame_url } },
                    { type: 'image_url', image_url: { url: exitPhoto.frame_url } }
                  ]
                }
              ],
              max_tokens: 1000
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              if (parsed.hasDifference && parsed.differences?.length > 0) {
                for (const diff of parsed.differences) {
                  differences.push({
                    type: diff.type || 'salissure',
                    severity: diff.severity || 'moyen',
                    description: diff.description || 'Dégradation détectée',
                    roomName,
                    elementType,
                    entryPhotoUrl: matchingEntry.frame_url,
                    exitPhotoUrl: exitPhoto.frame_url,
                    confidence: diff.confidence || 0.85
                  });
                }
              }
            }
          }
        } catch (aiError) {
          console.error('AI comparison error:', aiError);
        }
      }
    }

    console.log(`Found ${differences.length} differences`);

    return new Response(JSON.stringify({ differences }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Compare EDL photos error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      differences: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
