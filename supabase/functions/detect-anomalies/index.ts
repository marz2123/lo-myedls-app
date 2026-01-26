import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all frames with pathologies for this project
    const { data: visitSessions } = await supabase
      .from('visit_sessions')
      .select('id')
      .eq('project_id', projectId);

    if (!visitSessions || visitSessions.length === 0) {
      return new Response(
        JSON.stringify({ anomalies: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionIds = visitSessions.map(s => s.id);

    const { data: frames } = await supabase
      .from('extracted_frames')
      .select('*')
      .in('visit_session_id', sessionIds)
      .not('detected_pathologies', 'is', null);

    if (!frames || frames.length === 0) {
      return new Response(
        JSON.stringify({ anomalies: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group frames by location to detect patterns
    const locationGroups: Record<string, any[]> = {};
    frames.forEach(frame => {
      const location = frame.manual_label || 'unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = [];
      }
      locationGroups[location].push(frame);
    });

    const anomalies = [];

    // Detect recurring pathologies
    for (const [location, locationFrames] of Object.entries(locationGroups)) {
      const pathologyTypes: Record<string, number> = {};
      
      locationFrames.forEach(frame => {
        const pathologies = frame.detected_pathologies as any[];
        pathologies?.forEach((p: any) => {
          pathologyTypes[p.type] = (pathologyTypes[p.type] || 0) + 1;
        });
      });

      // If a pathology appears multiple times, it's recurring
      for (const [pathType, count] of Object.entries(pathologyTypes)) {
        if (count >= 2) {
          const severity = count >= 4 ? 'critical' : count >= 3 ? 'high' : 'medium';
          
          const { error } = await supabase
            .from('detected_anomalies')
            .insert({
              project_id: projectId,
              visit_session_id: locationFrames[0].visit_session_id,
              frame_id: locationFrames[0].id,
              anomaly_type: pathType.includes('crack') ? 'crack_evolution' : 'recurring_infiltration',
              severity,
              description: `${pathType} détecté ${count} fois dans ${location}. Nécessite une attention particulière.`,
              detection_metadata: {
                location,
                occurrence_count: count,
                frame_ids: locationFrames.map(f => f.id)
              },
              confidence_score: Math.min(0.95, 0.6 + (count * 0.1))
            });

          if (!error) {
            anomalies.push({
              type: pathType,
              location,
              count,
              severity
            });
          }
        }
      }
    }

    // Use AI to analyze structural concerns
    if (frames.length > 5) {
      const pathologySummary = frames
        .filter(f => f.detected_pathologies && (f.detected_pathologies as any[]).length > 0)
        .map(f => ({
          location: f.manual_label,
          pathologies: f.detected_pathologies,
          timestamp: f.timestamp_seconds
        }));

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Analyse ces pathologies détectées et identifie les préoccupations structurelles potentielles:
${JSON.stringify(pathologySummary, null, 2)}

Génère un rapport d'anomalies structurelles si des patterns inquiétants sont détectés.`
          }],
          max_tokens: 500
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const analysis = aiData.choices[0]?.message?.content;

        if (analysis && analysis.toLowerCase().includes('préoccupation')) {
          await supabase
            .from('detected_anomalies')
            .insert({
              project_id: projectId,
              anomaly_type: 'structural_concern',
              severity: 'high',
              description: analysis,
              detection_metadata: { ai_analysis: true },
              confidence_score: 0.75
            });

          anomalies.push({
            type: 'structural_concern',
            description: analysis
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ anomalies, count: anomalies.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});