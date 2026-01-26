import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectStructure {
  parts: { id: string; name: string; part_type: string }[];
  locations: { id: string; name: string; location_type: string; part_id: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sequenceDescription, projectStructure } = await req.json() as {
      sequenceDescription: string;
      projectStructure: ProjectStructure;
    };

    if (!sequenceDescription || !projectStructure) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build context about available structure
    const structureContext = projectStructure.parts.map(part => {
      const partLocations = projectStructure.locations.filter(l => l.part_id === part.id);
      return `${part.part_type === 'commune' ? 'COMMUNE' : 'PRIVATIVE'} - ${part.name}: ${partLocations.map(l => l.name).join(', ')}`;
    }).join('\n');

    const prompt = `Tu es un expert en inspection immobilière. Analyse cette description de problème et suggère la localisation la plus probable.

STRUCTURE DU BIEN:
${structureContext}

DESCRIPTION DU PROBLÈME:
"${sequenceDescription}"

TYPES DE ZONES POSSIBLES:
- mur: problèmes sur les murs (fissures, humidité, peinture écaillée)
- sol: problèmes au sol (carrelage cassé, parquet abîmé, moquette usée)
- plafond: problèmes au plafond (taches, fissures, peinture)
- equipements: équipements (radiateur, VMC, prises)
- menuiseries: portes, fenêtres, volets
- sanitaires: WC, lavabo, douche, baignoire
- electricite: problèmes électriques
- revetement: revêtements de façade
- toiture: problèmes de toiture
- gouttieres: gouttières et évacuations

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "confidence": 0.85,
  "suggestions": [
    {
      "part_type": "privative",
      "location_name": "Appartement 201",
      "endroit": "Cuisine",
      "zone_type": "mur",
      "reasoning": "La description mentionne des fissures murales dans une cuisine"
    }
  ]
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
          { role: "system", content: "Tu es un assistant expert en inspection immobilière. Réponds toujours en JSON valide." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      parsed = { confidence: 0.5, suggestions: [] };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
