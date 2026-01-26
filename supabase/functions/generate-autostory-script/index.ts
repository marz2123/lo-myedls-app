import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, edlId, title, style } = await req.json();

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      throw new Error("Project not found");
    }

    // Fetch visit sequences
    const { data: sequences } = await supabase
      .from("visit_sequences")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    // Fetch anomalies
    const { data: anomalies } = await supabase
      .from("detected_anomalies")
      .select("*")
      .eq("project_id", projectId);

    // Fetch extracted tasks
    const { data: tasks } = await supabase
      .from("extracted_tasks")
      .select("*")
      .eq("project_id", projectId);

    // Fetch energy profile if exists
    const { data: energyProfile } = await supabase
      .from("edl_energy_profiles")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    // Build context for AI
    const projectAddress = project.address || "Adresse non renseignée";
    const projectType = project.property_type || "Logement";
    const roomCount = sequences?.length || 0;
    const anomalyCount = anomalies?.length || 0;
    const taskCount = tasks?.length || 0;

    const styleInstructions: Record<string, string> = {
      professional: "Adoptez un ton formel, précis et professionnel. Utilisez un vocabulaire technique approprié.",
      calm: "Adoptez un ton neutre, posé et rassurant. Soyez clair et concis.",
      expert: "Adoptez un ton d'expert du bâtiment. Utilisez des termes techniques et donnez des détails précis.",
      friendly: "Adoptez un ton convivial et accessible. Expliquez simplement les observations."
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Tu es un expert en états des lieux immobiliers. Tu génères un script de narration pour une vidéo EDL automatique.
${styleInstructions[style] || styleInstructions.professional}

Le script doit être structuré en sections claires:
1. Introduction (présentation du bien)
2. Visite pièce par pièce (état, anomalies, observations)
3. Points forts du logement
4. Points de vigilance
5. Synthèse et conclusion

Génère un script fluide et professionnel, adapté à une narration audio.`;

    const userPrompt = `Génère un script de narration pour l'EDL de ce bien:

**Informations du projet:**
- Titre: ${title}
- Type: ${projectType}
- Adresse: ${projectAddress}
- Nombre de pièces visitées: ${roomCount}
- Anomalies détectées: ${anomalyCount}
- Tâches identifiées: ${taskCount}

**Séquences de visite:**
${sequences?.map((s: any, i: number) => `${i + 1}. ${s.room_type || 'Pièce'}: ${s.transcription || 'Observation visuelle'}`).join('\n') || 'Aucune séquence'}

**Anomalies détectées:**
${anomalies?.map((a: any) => `- ${a.anomaly_type}: ${a.description} (${a.severity})`).join('\n') || 'Aucune anomalie'}

**Profil énergétique:**
${energyProfile ? `Classe énergie: ${energyProfile.classe_energie}, Classe GES: ${energyProfile.classe_ges}` : 'Non évalué'}

Génère le script au format JSON avec cette structure:
{
  "sections": [
    {
      "id": "string",
      "type": "intro|room_overview|anomaly_detail|comparison|energy_summary|conclusion",
      "title": "string",
      "content": "string (texte de narration)",
      "room_id": "string|null",
      "duration_estimate": number (secondes),
      "order": number
    }
  ],
  "narrationText": "string (texte complet de narration)",
  "wordCount": number
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
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let scriptData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scriptData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback structure
      scriptData = {
        sections: [
          {
            id: "intro",
            type: "intro",
            title: "Introduction",
            content: `Bienvenue dans l'état des lieux de ${title}. Ce bien situé au ${projectAddress} va être présenté en détail.`,
            duration_estimate: 15,
            order: 1
          },
          {
            id: "conclusion",
            type: "conclusion",
            title: "Conclusion",
            content: `Ceci conclut notre visite de ${title}. ${anomalyCount} anomalies ont été relevées et ${taskCount} tâches identifiées.`,
            duration_estimate: 10,
            order: 2
          }
        ],
        narrationText: `Bienvenue dans l'état des lieux de ${title}. Ce bien situé au ${projectAddress} présente ${anomalyCount} anomalies et ${taskCount} tâches à réaliser.`,
        wordCount: 50
      };
    }

    console.log("Script generated successfully");

    return new Response(
      JSON.stringify(scriptData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-autostory-script:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
