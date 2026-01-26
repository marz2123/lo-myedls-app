import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  twinId: string;
  projectId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { twinId, projectId }: SyncRequest = await req.json();

    if (!twinId || !projectId) {
      return new Response(JSON.stringify({ error: "Twin ID and Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting sync for twin ${twinId}, project ${projectId}`);

    // Update sync status
    await supabase
      .from('digital_twin_models')
      .update({ sync_status: 'syncing' })
      .eq('id', twinId);

    // Gather data from multiple sources
    const syncSources: string[] = [];
    const updates: any[] = [];

    // 1. Fetch detected anomalies
    const { data: anomalies } = await supabase
      .from('detected_anomalies')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (anomalies && anomalies.length > 0) {
      syncSources.push('anomalies');
      for (const anomaly of anomalies) {
        updates.push({
          twin_id: twinId,
          update_type: 'anomaly',
          object_id: anomaly.frame_id || anomaly.id,
          object_type: anomaly.anomaly_type,
          new_state: {
            type: anomaly.anomaly_type,
            severity: anomaly.severity,
            description: anomaly.description,
            confidence: anomaly.confidence_score,
          },
          source: 'edl',
          source_id: anomaly.id,
          confidence_score: anomaly.confidence_score || 0.8,
        });
      }
    }

    // 2. Fetch extracted tasks
    const { data: tasks } = await supabase
      .from('extracted_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (tasks && tasks.length > 0) {
      syncSources.push('tasks');
      for (const task of tasks) {
        updates.push({
          twin_id: twinId,
          update_type: 'task',
          object_id: task.location_id || task.id,
          object_type: 'task',
          new_state: {
            title: task.title,
            status: task.status,
            priority: task.priority,
            family: task.family_code,
            category: task.category_code,
          },
          source: 'edl',
          source_id: task.id,
          confidence_score: 0.9,
        });
      }
    }

    // 3. Fetch visit sequences
    const { data: sequences } = await supabase
      .from('visit_sequences')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (sequences && sequences.length > 0) {
      syncSources.push('sequences');
      for (const seq of sequences) {
        if (seq.room_id || seq.zone_id) {
          updates.push({
            twin_id: twinId,
            update_type: 'state_change',
            object_id: seq.room_id || seq.zone_id,
            object_type: 'room',
            new_state: {
              status: seq.status,
              lastVisited: seq.created_at,
              transcription: seq.transcription_text?.substring(0, 200),
            },
            source: 'autopilot',
            source_id: seq.id,
            confidence_score: seq.ai_confidence || 0.75,
          });
        }
      }
    }

    // 4. Fetch BIM objects for element states
    const { data: bimObjects } = await supabase
      .from('edl_bim_objects')
      .select('*')
      .eq('model_id', (await supabase
        .from('digital_twin_models')
        .select('bim_model_id')
        .eq('id', twinId)
        .single()).data?.bim_model_id)
      .limit(200);

    const elementStates: Record<string, any> = {};
    if (bimObjects) {
      for (const obj of bimObjects) {
        elementStates[obj.id] = {
          id: obj.id,
          type: obj.object_type,
          name: obj.object_name || obj.object_type,
          status: obj.condition_state === 'mauvais' ? 'critical' : 
                  obj.condition_state === 'moyen' ? 'warning' : 'normal',
          condition: obj.condition_state || 'good',
          material: obj.material_type,
          anomalies: obj.anomalies || [],
          tasks: obj.linked_task_ids || [],
          lastUpdated: obj.updated_at,
        };
      }
    }

    // Insert updates in batches
    if (updates.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await supabase.from('digital_twin_updates').insert(batch);
      }
    }

    // Calculate health score
    const totalElements = Object.keys(elementStates).length;
    const criticalElements = Object.values(elementStates).filter(
      (e: any) => e.status === 'critical'
    ).length;
    const warningElements = Object.values(elementStates).filter(
      (e: any) => e.status === 'warning'
    ).length;
    
    const healthScore = totalElements > 0
      ? Math.max(0, 100 - (criticalElements * 15) - (warningElements * 5))
      : 100;

    // Update twin with new data
    await supabase
      .from('digital_twin_models')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        sync_sources: syncSources,
        element_states: elementStates,
        total_elements: totalElements,
        total_anomalies: anomalies?.length || 0,
        total_tasks: tasks?.length || 0,
        health_score: healthScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', twinId);

    console.log(`Sync completed for twin ${twinId}: ${updates.length} updates, health score: ${healthScore}`);

    return new Response(JSON.stringify({
      success: true,
      updatesCount: updates.length,
      syncSources,
      healthScore,
      totalElements,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
