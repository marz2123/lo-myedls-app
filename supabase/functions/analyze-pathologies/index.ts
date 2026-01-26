import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frameId, imageUrl, arMeasurements } = await req.json();
    
    if (!frameId || !imageUrl) {
      throw new Error('Frame ID and image URL are required');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Analyzing image for pathologies:', imageUrl, 'with AR measurements:', arMeasurements);

    // Analyze image with GPT-4 Vision
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en diagnostic de bâtiments et détection de substances dangereuses. Analyse cette photo et détecte toutes les pathologies visibles, y compris les substances dangereuses réglementées.

${arMeasurements ? `Mesures AR 3D disponibles pour cette zone :
- Largeur: ${arMeasurements.width}m
- Hauteur: ${arMeasurements.height}m
- Profondeur: ${arMeasurements.depth}m
- Surface: ${arMeasurements.surfaceArea}m²
- Volume: ${arMeasurements.volume}m³

Utilise ces mesures pour calculer précisément les surfaces et volumes affectés par chaque pathologie.` : ''}

Pour chaque pathologie détectée, fournis :
- type: fissure, humidite, moisissure, infiltration, decollement, degradation, amiante, plomb, ou termites
- severity: faible, modere, grave, ou critique
- confidence: 0-1 (confiance de détection)
- location: position approximative {x, y, width, height} en pourcentages (0-100)
- description: description précise en français
- recommendations: recommandations d'intervention
- estimatedArea: surface estimée en m² ou ml
- urgency: immediate, short_term, medium_term, ou long_term

Pour les substances dangereuses (amiante, plomb, termites), ajoute aussi :
- isHazardous: true
- hazardousType: "amiante" | "plomb" | "termites"
- regulatoryCompliance: {
    crepCompliant: true/false (conforme CREP),
    requiresSpecialist: true/false (nécessite spécialiste certifié),
    legalDeadline: "délai légal" (ex: "30 jours" pour amiante)
  }

Si des mesures AR sont disponibles, calcule aussi :
- affectedSurface: surface réellement affectée en m² (basée sur les mesures AR et le pourcentage visible)
- affectedVolume: volume réellement affecté en m³ (si applicable)
- arMeasurements: { width, height, depth, surfaceArea, volume }

Réponds UNIQUEMENT avec un JSON valide suivant ce format :
{
  "pathologies": [
    {
      "type": "amiante",
      "severity": "critique",
      "confidence": 0.92,
      "location": { "x": 30, "y": 40, "width": 20, "height": 15 },
      "description": "Présence suspectée d'amiante dans revêtement de sol",
      "recommendations": "Analyse laboratoire obligatoire, intervention par entreprise certifiée uniquement",
      "estimatedArea": 1.5,
      "urgency": "immediate",
      "isHazardous": true,
      "hazardousType": "amiante",
      "regulatoryCompliance": {
        "crepCompliant": true,
        "requiresSpecialist": true,
        "legalDeadline": "Intervention immédiate requise"
      },
      "affectedSurface": 2.3,
      "affectedVolume": 0.15,
      "arMeasurements": { "width": 2.5, "height": 1.8, "depth": 0.1, "surfaceArea": 4.5, "volume": 0.45 }
    }
  ],
  "overallRiskLevel": "high",
  "aiConfidence": 0.8
}

Si aucune pathologie n'est détectée, retourne :
{
  "pathologies": [],
  "overallRiskLevel": "low",
  "aiConfidence": 0.9
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse cette photo de bâtiment et détecte toutes les pathologies visibles (fissures, humidité, moisissures, infiltrations, décollements, dégradations).'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_completion_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('OpenAI API error:', analysisResponse.status, errorText);
      throw new Error(`OpenAI API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const content = analysisData.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        pathologies: [],
        overallRiskLevel: 'low',
        aiConfidence: 0
      };
    }

    // Calculer les coûts de réparation pour chaque pathologie
    const pathologiesWithCosts = await Promise.all(
      result.pathologies.map(async (pathology: any) => {
        try {
          const costResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/calculate-repair-costs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              pathologyType: pathology.type,
              severity: pathology.severity,
              affectedSurface: pathology.affectedSurface || pathology.estimatedArea,
              affectedVolume: pathology.affectedVolume,
              arMeasurements: pathology.arMeasurements
            })
          });

          if (costResponse.ok) {
            const costData = await costResponse.json();
            return { ...pathology, repairCost: costData.estimate };
          }
        } catch (error) {
          console.error('Error calculating repair cost:', error);
        }
        return pathology;
      })
    );

    result.pathologies = pathologiesWithCosts;

    // Update frame with pathology data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('extracted_frames')
      .update({
        detected_pathologies: result
      })
      .eq('id', frameId);

    if (updateError) {
      console.error('Error updating frame:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        frameId,
        ...result,
        analysisTimestamp: Date.now()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error analyzing pathologies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
