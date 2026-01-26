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
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    const { fields, existingData, propertyType, language, projectInfo } = body;
    
    if (!fields || !Array.isArray(fields)) {
      throw new Error('Invalid fields parameter');
    }
    
    console.log('Fields count:', fields.length);
    console.log('Property type:', propertyType);
    console.log('Language:', language);
    console.log('Project info:', projectInfo);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context from project info
    const propertyTypeLabels: Record<string, { fr: string; en: string }> = {
      building: { fr: 'Immeuble', en: 'Building' },
      house: { fr: 'Maison', en: 'House' },
      apartment: { fr: 'Appartement', en: 'Apartment' },
      commercial: { fr: 'Local commercial', en: 'Commercial property' },
    };

    const lang = language === 'fr' ? 'fr' : 'en';
    const propertyLabel = propertyTypeLabels[propertyType]?.[lang] || propertyType;

    // Build detailed context
    let contextParts: string[] = [];
    
    if (projectInfo) {
      if (projectInfo.address) contextParts.push(language === 'fr' ? `Adresse: ${projectInfo.address}` : `Address: ${projectInfo.address}`);
      if (projectInfo.city) contextParts.push(language === 'fr' ? `Ville: ${projectInfo.city}` : `City: ${projectInfo.city}`);
      if (projectInfo.postal_code) contextParts.push(language === 'fr' ? `Code postal: ${projectInfo.postal_code}` : `Postal code: ${projectInfo.postal_code}`);
      if (projectInfo.number_of_units) contextParts.push(language === 'fr' ? `Nombre d'unités: ${projectInfo.number_of_units}` : `Number of units: ${projectInfo.number_of_units}`);
      if (projectInfo.has_parking !== undefined) contextParts.push(language === 'fr' ? `Parking: ${projectInfo.has_parking ? 'Oui' : 'Non'}` : `Parking: ${projectInfo.has_parking ? 'Yes' : 'No'}`);
      if (projectInfo.has_garage !== undefined) contextParts.push(language === 'fr' ? `Garage: ${projectInfo.has_garage ? 'Oui' : 'Non'}` : `Garage: ${projectInfo.has_garage ? 'Yes' : 'No'}`);
      if (projectInfo.has_box !== undefined) contextParts.push(language === 'fr' ? `Box: ${projectInfo.has_box ? 'Oui' : 'Non'}` : `Box: ${projectInfo.has_box ? 'Yes' : 'No'}`);
    }

    // Add existing data to context
    if (existingData && Object.keys(existingData).length > 0) {
      Object.entries(existingData)
        .filter(([_, value]) => value && typeof value === 'string' && value.trim())
        .forEach(([key, value]) => {
          contextParts.push(`${key}: ${value}`);
        });
    }

    const context = contextParts.join('\n');

    // Build fields list with more detail
    const fieldsWithDetails = fields.map((f: any, idx: number) => `${idx + 1}. ${f.label}`).join('\n');
    
    console.log('Context to send to AI:', context);
    console.log('Fields list to send to AI:', fieldsWithDetails);

    const systemPrompt = language === 'fr'
      ? `Tu es un expert en inspection immobilière. Tu dois générer des suggestions concrètes et réalistes pour remplir des champs de template d'inspection.

RÈGLES STRICTES:
- Génère TOUJOURS une suggestion pour CHAQUE champ demandé
- Les suggestions doivent être CONCRÈTES avec des chiffres, dates, descriptions précises
- Adapte les suggestions au type de bien et aux informations disponibles
- Limite chaque suggestion à 1-2 phrases courtes
- JAMAIS de suggestions vagues comme "À déterminer"`
      : `You are a property inspection expert. You must generate concrete and realistic suggestions to fill inspection template fields.

STRICT RULES:
- ALWAYS generate a suggestion for EVERY requested field
- Suggestions must be CONCRETE with numbers, dates, precise descriptions
- Adapt suggestions to property type and available information
- Limit each suggestion to 1-2 short sentences
- NEVER use vague suggestions like "To be determined"`;

    // Build example suggestions to show AI the expected format
    const exampleSuggestions: Record<string, string> = {};
    fields.slice(0, Math.min(3, fields.length)).forEach((field: any) => {
      const label = field.label.toLowerCase();
      if (language === 'fr') {
        if (label.includes('année') || label.includes('construction')) {
          exampleSuggestions[field.label] = "1985";
        } else if (label.includes('état') || label.includes('condition')) {
          exampleSuggestions[field.label] = "Bon état général, quelques fissures mineures visibles";
        } else if (label.includes('travaux') || label.includes('rénovation')) {
          exampleSuggestions[field.label] = "Réfection de la toiture prévue, remplacement des fenêtres";
        } else {
          exampleSuggestions[field.label] = "Valeur exemple à compléter selon inspection";
        }
      } else {
        if (label.includes('year') || label.includes('construction')) {
          exampleSuggestions[field.label] = "1985";
        } else if (label.includes('condition') || label.includes('state')) {
          exampleSuggestions[field.label] = "Good general condition, some minor visible cracks";
        } else if (label.includes('work') || label.includes('renovation')) {
          exampleSuggestions[field.label] = "Roof repair planned, window replacement";
        } else {
          exampleSuggestions[field.label] = "Example value to complete according to inspection";
        }
      }
    });

    const userPrompt = language === 'fr'
      ? `Type de bien: ${propertyLabel}

Contexte du projet:
${context || 'Aucune information spécifique'}

Liste des champs à remplir:
${fieldsWithDetails}

Génère une suggestion CONCRÈTE pour CHAQUE champ listé ci-dessus.

Format de réponse attendu (EXEMPLE):
${JSON.stringify(exampleSuggestions, null, 2)}

IMPORTANT: Tu DOIS générer une suggestion pour TOUS les ${fields.length} champs listés, pas seulement les exemples.`
      : `Property type: ${propertyLabel}

Project context:
${context || 'No specific information'}

List of fields to fill:
${fieldsWithDetails}

Generate a CONCRETE suggestion for EVERY field listed above.

Expected response format (EXAMPLE):
${JSON.stringify(exampleSuggestions, null, 2)}

IMPORTANT: You MUST generate a suggestion for ALL ${fields.length} listed fields, not just the examples.`;

    console.log('Calling AI gateway...');

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'fill_fields',
              description: language === 'fr' 
                ? `Générer des suggestions pour ${fields.length} champs de template d'inspection` 
                : `Generate suggestions for ${fields.length} inspection template fields`,
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'object',
                    description: language === 'fr'
                      ? `Objet avec EXACTEMENT ${fields.length} paires clé-valeur. Chaque clé doit être le nom EXACT d'un champ de la liste fournie.`
                      : `Object with EXACTLY ${fields.length} key-value pairs. Each key must be the EXACT name of a field from the provided list.`,
                    properties: fields.reduce((acc: any, field: any) => {
                      acc[field.label] = {
                        type: 'string',
                        description: language === 'fr'
                          ? `Suggestion concrète pour le champ "${field.label}"`
                          : `Concrete suggestion for field "${field.label}"`
                      };
                      return acc;
                    }, {}),
                    required: fields.map((f: any) => f.label),
                    additionalProperties: false
                  }
                },
                required: ['suggestions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'fill_fields' } }
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response data:', JSON.stringify(data, null, 2));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in response');
      throw new Error('No tool call in response');
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;
    console.log('Extracted suggestions:', JSON.stringify(suggestions, null, 2));

    // Validate that we got suggestions
    if (!suggestions || Object.keys(suggestions).length === 0) {
      console.warn('Empty suggestions object received');
      throw new Error('AI returned empty suggestions');
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fill-template-fields:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
