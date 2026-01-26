import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Forbidden terms in EDL (legal risk)
const FORBIDDEN_TERMS = [
  "usure normale",
  "mauvaise utilisation",
  "causé par le locataire",
  "négligence",
  "responsabilité",
  "faute",
  "dégradation volontaire",
  "manque d'entretien",
  "abus",
  "détérioration intentionnelle",
];

// Vague terms to detect
const VAGUE_TERMS = [
  "état moyen",
  "à voir",
  "peut-être",
  "semble",
  "probablement",
  "assez bien",
  "plutôt bon",
  "correct",
];

interface AnalysisRequest {
  projectId: string;
  sessionId?: string;
  includePhotos?: boolean;
  includeDescriptions?: boolean;
  includeAnomalies?: boolean;
  includeTasks?: boolean;
  includeEntryExit?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { projectId, sessionId, includePhotos = true, includeDescriptions = true, includeAnomalies = true, includeTasks = true, includeEntryExit = true }: AnalysisRequest = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create analysis record
    const { data: analysisRecord, error: createError } = await supabase
      .from("deep_analysis_results")
      .insert({
        project_id: projectId,
        user_id: user.id,
        session_id: sessionId || null,
        status: "analyzing",
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    const analysisId = analysisRecord.id;
    const inconsistencies: any[] = [];

    // Fetch all relevant data
    const [
      { data: sequences },
      { data: frames },
      { data: anomalies },
      { data: tasks },
      { data: medias },
      { data: locations },
    ] = await Promise.all([
      supabase.from("visit_sequences").select("*").eq("project_id", projectId),
      supabase.from("extracted_frames").select("*, visit_sessions!inner(project_id)").eq("visit_sessions.project_id", projectId),
      supabase.from("detected_anomalies").select("*").eq("project_id", projectId),
      supabase.from("extracted_tasks").select("*").eq("project_id", projectId),
      supabase.from("visit_medias").select("*").eq("project_id", projectId),
      supabase.from("property_locations").select("*").eq("project_id", projectId),
    ]);

    // 1. Analyze descriptions for forbidden/vague terms
    if (includeDescriptions) {
      const allDescriptions = [
        ...(sequences || []).map(s => ({ id: s.id, type: "sequence", text: s.description || s.transcription })),
        ...(tasks || []).map(t => ({ id: t.id, type: "task", text: t.description })),
        ...(anomalies || []).map(a => ({ id: a.id, type: "anomaly", text: a.description })),
      ];

      for (const item of allDescriptions) {
        if (!item.text) continue;

        const lowerText = item.text.toLowerCase();

        // Check forbidden terms
        for (const term of FORBIDDEN_TERMS) {
          if (lowerText.includes(term.toLowerCase())) {
            inconsistencies.push({
              analysis_id: analysisId,
              project_id: projectId,
              inconsistency_type: "forbidden_term",
              severity: "critical",
              category: "legal",
              title: `Terme interdit détecté: "${term}"`,
              description: `Le terme "${term}" est interdit dans un EDL car il implique une responsabilité. Utilisez une formulation neutre et factuelle.`,
              affected_item_id: item.id,
              affected_item_type: item.type,
              original_text: item.text,
              suggested_correction: item.text.replace(new RegExp(term, "gi"), "[à reformuler]"),
              auto_correctable: true,
              confidence_score: 0.95,
            });
          }
        }

        // Check vague terms
        for (const term of VAGUE_TERMS) {
          if (lowerText.includes(term.toLowerCase())) {
            inconsistencies.push({
              analysis_id: analysisId,
              project_id: projectId,
              inconsistency_type: "vague_description",
              severity: "warning",
              category: "writing_quality",
              title: `Formulation vague détectée: "${term}"`,
              description: `Le terme "${term}" est trop vague pour un EDL professionnel. Précisez avec des détails mesurables.`,
              affected_item_id: item.id,
              affected_item_type: item.type,
              original_text: item.text,
              auto_correctable: true,
              confidence_score: 0.85,
            });
          }
        }

        // Check too short descriptions
        if (item.text.length < 15 && item.text.length > 0) {
          inconsistencies.push({
            analysis_id: analysisId,
            project_id: projectId,
            inconsistency_type: "vague_description",
            severity: "info",
            category: "writing_quality",
            title: "Description trop courte",
            description: "Cette description est trop courte pour être suffisamment précise. Ajoutez des détails.",
            affected_item_id: item.id,
            affected_item_type: item.type,
            original_text: item.text,
            auto_correctable: false,
            confidence_score: 0.7,
          });
        }
      }
    }

    // 2. Check state vs anomaly coherence
    if (includeAnomalies) {
      for (const sequence of (sequences || [])) {
        if (sequence.detected_condition === "good" || sequence.user_condition === "good") {
          // Find anomalies for this location
          const relatedAnomalies = (anomalies || []).filter(a => 
            a.location_data?.location_id === sequence.location_id ||
            a.location_data?.zone_id === sequence.zone_id
          );

          if (relatedAnomalies.length > 0) {
            inconsistencies.push({
              analysis_id: analysisId,
              project_id: projectId,
              inconsistency_type: "state_anomaly_conflict",
              severity: "critical",
              category: "state_coherence",
              title: "Incohérence état ↔ anomalie",
              description: `État déclaré "bon" mais ${relatedAnomalies.length} anomalie(s) détectée(s). Vérifiez l'état réel.`,
              affected_item_id: sequence.id,
              affected_item_type: "sequence",
              location_context: {
                location_id: sequence.location_id,
                zone_id: sequence.zone_id,
                endroit_name: sequence.endroit_name,
              },
              auto_correctable: true,
              confidence_score: 0.9,
              metadata: { anomaly_count: relatedAnomalies.length },
            });
          }
        }
      }
    }

    // 3. Check photo coverage
    if (includePhotos) {
      for (const location of (locations || [])) {
        const locationMedia = (medias || []).filter(m => 
          m.metadata?.location_id === location.id
        );

        const locationFrames = (frames || []).filter(f => 
          f.location_id === location.id
        );

        const totalPhotos = locationMedia.length + locationFrames.length;

        if (totalPhotos === 0) {
          inconsistencies.push({
            analysis_id: analysisId,
            project_id: projectId,
            inconsistency_type: "missing_photo",
            severity: "warning",
            category: "coverage",
            title: "Aucune photo pour cette pièce",
            description: `La pièce "${location.name}" n'a aucune photo. Ajoutez des photos pour documenter l'état.`,
            affected_item_id: location.id,
            affected_item_type: "location",
            location_context: { location_id: location.id, name: location.name },
            auto_correctable: false,
            confidence_score: 1.0,
          });
        } else if (totalPhotos < 3) {
          inconsistencies.push({
            analysis_id: analysisId,
            project_id: projectId,
            inconsistency_type: "missing_angle",
            severity: "info",
            category: "coverage",
            title: "Couverture photo insuffisante",
            description: `La pièce "${location.name}" n'a que ${totalPhotos} photo(s). Minimum recommandé: 3-4 angles.`,
            affected_item_id: location.id,
            affected_item_type: "location",
            location_context: { location_id: location.id, name: location.name },
            auto_correctable: false,
            confidence_score: 0.8,
          });
        }
      }
    }

    // 4. Check tasks without anomalies
    if (includeTasks && includeAnomalies) {
      for (const task of (tasks || [])) {
        const hasAnomaly = (anomalies || []).some(a => 
          a.location_data?.location_id === task.location ||
          a.id === task.frame_id
        );

        if (!hasAnomaly && task.priority === "high") {
          inconsistencies.push({
            analysis_id: analysisId,
            project_id: projectId,
            inconsistency_type: "ai_error",
            severity: "warning",
            category: "ai_detection",
            title: "Tâche prioritaire sans anomalie associée",
            description: `La tâche "${task.title}" est prioritaire mais n'a pas d'anomalie détectée. Vérifiez la cohérence.`,
            affected_item_id: task.id,
            affected_item_type: "task",
            auto_correctable: false,
            confidence_score: 0.75,
          });
        }
      }
    }

    // 5. Use AI to analyze photo-description coherence for a sample
    if (includePhotos && (frames || []).length > 0) {
      const sampleFrames = (frames || []).slice(0, 5); // Limit to 5 for performance

      for (const frame of sampleFrames) {
        if (!frame.frame_url || !frame.manual_label) continue;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Tu es un expert en état des lieux immobilier. Analyse la cohérence entre une description et une photo.
                  
Réponds UNIQUEMENT en JSON avec ce format:
{
  "coherent": true/false,
  "issues": ["liste des incohérences si présentes"],
  "confidence": 0.0-1.0
}`,
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: `Description: "${frame.manual_label}"\n\nAnalyse si cette description correspond bien à la photo.` },
                    { type: "image_url", image_url: { url: frame.frame_url } },
                  ],
                },
              ],
              max_tokens: 500,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;

            if (content) {
              try {
                const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
                
                if (!parsed.coherent && parsed.issues?.length > 0) {
                  inconsistencies.push({
                    analysis_id: analysisId,
                    project_id: projectId,
                    inconsistency_type: "photo_description_mismatch",
                    severity: "warning",
                    category: "photo_analysis",
                    title: "Incohérence photo ↔ description",
                    description: parsed.issues.join(". "),
                    affected_item_id: frame.id,
                    affected_item_type: "frame",
                    photo_url: frame.frame_url,
                    original_text: frame.manual_label,
                    auto_correctable: true,
                    confidence_score: parsed.confidence || 0.8,
                  });
                }
              } catch (e) {
                console.error("Failed to parse AI response:", e);
              }
            }
          }
        } catch (e) {
          console.error("AI analysis error:", e);
        }
      }
    }

    // Insert all inconsistencies
    if (inconsistencies.length > 0) {
      const { error: insertError } = await supabase
        .from("inconsistency_items")
        .insert(inconsistencies);

      if (insertError) {
        console.error("Error inserting inconsistencies:", insertError);
      }
    }

    // Calculate scores
    const criticalCount = inconsistencies.filter(i => i.severity === "critical").length;
    const warningCount = inconsistencies.filter(i => i.severity === "warning").length;
    const infoCount = inconsistencies.filter(i => i.severity === "info").length;
    const autoCorrectableCount = inconsistencies.filter(i => i.auto_correctable).length;

    // Score calculation (100 - penalties)
    const penalty = (criticalCount * 10) + (warningCount * 5) + (infoCount * 2);
    const overallScore = Math.max(0, Math.min(100, 100 - penalty));

    // Category scores
    const photoDescScore = 100 - (inconsistencies.filter(i => i.category === "photo_analysis").length * 15);
    const stateAnomalyScore = 100 - (inconsistencies.filter(i => i.category === "state_coherence").length * 20);
    const writingScore = 100 - (inconsistencies.filter(i => i.category === "writing_quality").length * 10);
    const coverageScore = 100 - (inconsistencies.filter(i => i.category === "coverage").length * 10);

    // Generate summary
    let summary = "";
    if (overallScore >= 90) {
      summary = "Excellent ! Votre EDL est très cohérent et professionnel.";
    } else if (overallScore >= 80) {
      summary = "Bon travail. Quelques ajustements mineurs recommandés.";
    } else if (overallScore >= 60) {
      summary = "Attention. Plusieurs incohérences détectées nécessitent correction.";
    } else {
      summary = "Action requise. Des problèmes critiques doivent être corrigés avant validation.";
    }

    // Update analysis record
    const { error: updateError } = await supabase
      .from("deep_analysis_results")
      .update({
        status: "completed",
        overall_score: overallScore,
        photo_description_score: Math.max(0, photoDescScore),
        state_anomaly_score: Math.max(0, stateAnomalyScore),
        writing_quality_score: Math.max(0, writingScore),
        photo_coverage_score: Math.max(0, coverageScore),
        analysis_summary: summary,
        total_inconsistencies: inconsistencies.length,
        critical_count: criticalCount,
        warning_count: warningCount,
        info_count: infoCount,
        auto_corrections_available: autoCorrectableCount,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      analysisId,
      overallScore,
      summary,
      inconsistencyCount: inconsistencies.length,
      criticalCount,
      warningCount,
      infoCount,
      autoCorrectableCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-edl-consistency:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Analysis failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
