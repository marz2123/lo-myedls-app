import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoomElement {
  type: string;
  material: string | null;
  state: string | null;
  anomalies: string[];
  notes: string[];
}

interface RoomSummary {
  id: string;
  name: string;
  global_state: string;
  elements: RoomElement[];
  key_photos: string[];
  anomaly_count: number;
}

interface EDLReport {
  rooms: RoomSummary[];
  global_summary: string;
  recommendations: string;
  generated_at: string;
  stats: {
    total_rooms: number;
    total_elements: number;
    total_anomalies: number;
    rooms_with_issues: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, sessionId } = await req.json();
    
    if (!projectId || !sessionId) {
      throw new Error('Project ID and Session ID required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Generating EDL summary for project:', projectId, 'session:', sessionId);

    // Fetch all required data in parallel
    const [locationsRes, sequencesRes, anomaliesRes, framesRes, notesRes] = await Promise.all([
      // Property locations
      supabase
        .from('property_locations')
        .select('id, name, location_type, floor_number')
        .eq('project_id', projectId)
        .order('order_index'),
      
      // Visit sequences
      supabase
        .from('visit_sequences')
        .select('*, location_id, zone_id, transcription')
        .eq('visit_session_id', sessionId),
      
      // Detected anomalies
      supabase
        .from('detected_anomalies')
        .select('*')
        .eq('project_id', projectId),
      
      // Extracted frames with tags
      supabase
        .from('extracted_frames')
        .select('id, frame_url, location_id, zone_id, edl_tags, detected_pathologies, analysis_result')
        .eq('visit_session_id', sessionId),
      
      // Daily logs (notes)
      supabase
        .from('daily_logs')
        .select('id, observations, ai_summary')
        .eq('project_id', projectId)
        .order('log_date', { ascending: false })
        .limit(10)
    ]);

    const locations = locationsRes.data || [];
    const sequences = sequencesRes.data || [];
    const anomalies = anomaliesRes.data || [];
    const frames = framesRes.data || [];
    const notes = notesRes.data || [];

    console.log(`Found: ${locations.length} locations, ${sequences.length} sequences, ${anomalies.length} anomalies, ${frames.length} frames`);

    // Build room summaries
    const roomSummaries: RoomSummary[] = [];
    let totalAnomalies = 0;
    let totalElements = 0;

    for (const location of locations) {
      // Get sequences for this location
      const locationSequences = sequences.filter(s => s.location_id === location.id);
      
      // Get frames for this location
      const locationFrames = frames.filter(f => f.location_id === location.id);
      
      // Get anomalies for this location (via frames or sequences)
      const frameIds = locationFrames.map(f => f.id);
      const sequenceIds = locationSequences.map(s => s.id);
      const locationAnomalies = anomalies.filter(a => 
        (a.frame_id && frameIds.includes(a.frame_id)) ||
        (a.visit_session_id && sequenceIds.includes(a.visit_session_id))
      );

      // Extract elements from frames with tags
      const elements: RoomElement[] = [];
      const elementMap = new Map<string, RoomElement>();

      for (const frame of locationFrames) {
        const tags = frame.edl_tags as { element_type?: string; material?: string; state?: string } | null;
        if (tags?.element_type) {
          const key = `${tags.element_type}-${tags.material || 'unknown'}`;
          if (!elementMap.has(key)) {
            elementMap.set(key, {
              type: tags.element_type,
              material: tags.material || null,
              state: tags.state || null,
              anomalies: [],
              notes: []
            });
          }
          
          // Add pathologies
          const pathologies = frame.detected_pathologies as string[] | null;
          if (pathologies) {
            const elem = elementMap.get(key)!;
            pathologies.forEach(p => {
              if (!elem.anomalies.includes(p)) {
                elem.anomalies.push(p);
              }
            });
          }
        }
      }

      // Add anomaly descriptions to elements
      for (const anomaly of locationAnomalies) {
        // Find matching element or create generic one
        let foundElement = false;
        elementMap.forEach((elem) => {
          if (anomaly.anomaly_type && elem.type.toLowerCase().includes(anomaly.anomaly_type.toLowerCase())) {
            elem.anomalies.push(anomaly.description);
            foundElement = true;
          }
        });
        
        if (!foundElement && !elementMap.has('Général')) {
          elementMap.set('Général', {
            type: 'Général',
            material: null,
            state: null,
            anomalies: [anomaly.description],
            notes: []
          });
        } else if (!foundElement) {
          elementMap.get('Général')!.anomalies.push(anomaly.description);
        }
      }

      // Add transcriptions as notes
      for (const seq of locationSequences) {
        if (seq.transcription) {
          const generalElem = elementMap.get('Général') || {
            type: 'Général',
            material: null,
            state: null,
            anomalies: [],
            notes: []
          };
          generalElem.notes.push(seq.transcription);
          elementMap.set('Général', generalElem);
        }
      }

      elements.push(...elementMap.values());
      totalElements += elements.length;
      totalAnomalies += locationAnomalies.length;

      // Determine global state based on anomalies
      let globalState = 'Bon';
      const hasHighSeverity = locationAnomalies.some(a => a.severity === 'high' || a.severity === 'critical');
      const hasMediumSeverity = locationAnomalies.some(a => a.severity === 'medium');
      
      if (hasHighSeverity || locationAnomalies.length > 3) {
        globalState = 'Mauvais';
      } else if (hasMediumSeverity || locationAnomalies.length > 0) {
        globalState = 'Moyen';
      }

      // Get key photos (up to 4 per room)
      const keyPhotos = locationFrames
        .filter(f => f.frame_url)
        .slice(0, 4)
        .map(f => f.frame_url);

      roomSummaries.push({
        id: location.id,
        name: location.name,
        global_state: globalState,
        elements,
        key_photos: keyPhotos,
        anomaly_count: locationAnomalies.length
      });
    }

    // Generate AI summary using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let globalSummary = '';
    let recommendations = '';

    if (lovableApiKey) {
      try {
        const roomDescriptions = roomSummaries.map(r => 
          `${r.name}: État ${r.global_state}, ${r.anomaly_count} anomalie(s), éléments: ${r.elements.map(e => `${e.type} (${e.state || 'non évalué'})`).join(', ')}`
        ).join('\n');

        const allNotes = notes
          .filter(n => n.observations || n.ai_summary)
          .map(n => n.observations || n.ai_summary)
          .join('\n');

        const prompt = `Tu es un expert en états des lieux immobiliers. Génère un résumé professionnel basé sur les données suivantes:

PIÈCES INSPECTÉES:
${roomDescriptions}

NOTES D'INSPECTION:
${allNotes || 'Aucune note supplémentaire'}

Réponds en JSON avec exactement ce format:
{
  "summary": "Résumé global de l'état du bien en 2-3 phrases professionnelles",
  "recommendations": "Recommandations descriptives principales en 2-3 phrases (pas de liste de tâches)"
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Tu es un expert en états des lieux immobiliers. Réponds uniquement en JSON valide.' },
              { role: 'user', content: prompt }
            ]
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            globalSummary = parsed.summary || '';
            recommendations = parsed.recommendations || '';
          }
        }
      } catch (aiError) {
        console.error('AI summary generation failed:', aiError);
      }
    }

    // Fallback summary if AI didn't work
    if (!globalSummary) {
      const roomsWithIssues = roomSummaries.filter(r => r.global_state !== 'Bon').length;
      globalSummary = `Inspection de ${roomSummaries.length} pièce(s) réalisée. ${roomsWithIssues} pièce(s) présentent des points d'attention. ${totalAnomalies} anomalie(s) identifiée(s) au total.`;
    }

    if (!recommendations) {
      if (totalAnomalies > 0) {
        recommendations = 'Des travaux de remise en état sont recommandés pour les zones présentant des anomalies. Une attention particulière doit être portée aux éléments en mauvais état.';
      } else {
        recommendations = 'Le bien est globalement en bon état. Un entretien régulier permettra de maintenir cette condition.';
      }
    }

    const report: EDLReport = {
      rooms: roomSummaries,
      global_summary: globalSummary,
      recommendations,
      generated_at: new Date().toISOString(),
      stats: {
        total_rooms: roomSummaries.length,
        total_elements: totalElements,
        total_anomalies: totalAnomalies,
        rooms_with_issues: roomSummaries.filter(r => r.global_state !== 'Bon').length
      }
    };

    // Store the report in the database
    const { data: savedReport, error: saveError } = await supabase
      .from('edl_reports')
      .upsert({
        project_id: projectId,
        session_id: sessionId,
        report_json: report,
        generated_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save report:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: report,
        reportId: savedReport?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-edl-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
