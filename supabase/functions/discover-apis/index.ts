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
    const { currentApis, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en APIs françaises et sources de données ouvertes pour le secteur immobilier et de la construction.

Ton rôle est de découvrir et suggérer de nouvelles APIs et sources de données qui seraient utiles pour une application d'inspection immobilière (états des lieux, diagnostics, travaux).

Contexte de l'application MyEDLS:
- Inspection de biens immobiliers (maisons, appartements, immeubles)
- États des lieux d'entrée/sortie
- Détection de problèmes et pathologies du bâtiment
- Classification des travaux nécessaires
- Enrichissement des données de propriété (cadastre, risques, urbanisme, etc.)

Tu dois rechercher et suggérer des APIs françaises officielles ou services de données qui ne sont pas encore intégrés.

IMPORTANT: Ne suggère QUE des APIs/services qui existent réellement et sont accessibles. Donne les vraies URLs de documentation.`;

    const userPrompt = `APIs déjà intégrées dans l'application:
${currentApis?.join('\n') || 'Aucune information fournie'}

Recherche et suggère 5-8 nouvelles APIs ou sources de données françaises qui seraient utiles pour enrichir l'application. 

Pour chaque suggestion, fournis:
1. Nom de l'API/service
2. Description courte de ce qu'elle fournit
3. URL de documentation/accès
4. Catégorie (cadastre, geo, risks, immobilier, urbanisme, meteo, imagery, technique, juridique, energie, accessibilite)
5. Type de données fournies
6. Si c'est gratuit ou payant
7. Score de pertinence (1-10) pour MyEDLS
8. Raison de la pertinence pour l'inspection immobilière

Réponds en JSON avec ce format:
{
  "suggestions": [
    {
      "id": "identifiant-unique",
      "name": "Nom de l'API",
      "description": "Description courte",
      "docsUrl": "https://...",
      "category": "categorie",
      "dataType": "Types de données",
      "isFree": true/false,
      "relevanceScore": 8,
      "relevanceReason": "Raison de la pertinence"
    }
  ],
  "insights": "Observations générales sur les opportunités d'enrichissement de données"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content);
      result = { suggestions: [], insights: "Erreur de parsing de la réponse IA" };
    }

    return new Response(JSON.stringify({
      success: true,
      ...result,
      discoveredAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in discover-apis function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
