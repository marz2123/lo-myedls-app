import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { visitSessionId, frames, audioSegments } = await req.json();
    
    if (!visitSessionId) {
      throw new Error('visitSessionId is required');
    }

    console.log(`Processing visit session ${visitSessionId} for user ${user.id}`);

    await supabase
      .from('visit_sessions')
      .update({ status: 'processing' })
      .eq('id', visitSessionId)
      .eq('user_id', user.id);

    // Les frames sont DÉJÀ créées par MobileVisitRecorder - on les récupère juste
    const { data: existingFrames } = await supabase
      .from('extracted_frames')
      .select('*')
      .eq('visit_session_id', visitSessionId)
      .order('timestamp_seconds', { ascending: true });

    console.log(`Found ${existingFrames?.length || 0} existing frames`);

    // Organiser les frames en blocs si pas déjà fait
    let currentBlockNumber = 0;
    let currentBlockId = null;
    let previousRoomType = null;

    for (const frame of existingFrames || []) {
      const analysis = frame.analysis_result;
      if (!analysis) continue;

      const roomType = analysis.room_type || analysis.roomType || 'unknown';
      const isTransition = analysis.transition_detected || 
                          (previousRoomType && previousRoomType !== roomType);
      
      if (isTransition || currentBlockId === null) {
        currentBlockNumber++;
        
        const { data: newBlock } = await supabase
          .from('detected_blocks')
          .insert({
            visit_session_id: visitSessionId,
            block_number: currentBlockNumber,
            detected_room_type: roomType,
            timestamp_start: frame.timestamp_seconds,
            timestamp_end: frame.timestamp_seconds,
            transition_detected: isTransition
          })
          .select()
          .single();
        
        if (newBlock) {
          currentBlockId = newBlock.id;
          console.log(`Created new block #${currentBlockNumber}: ${roomType}`);
        }
      } else if (currentBlockId) {
        await supabase
          .from('detected_blocks')
          .update({ 
            timestamp_end: frame.timestamp_seconds
          })
          .eq('id', currentBlockId);
      }

      // Associer le frame au bloc
      if (currentBlockId) {
        await supabase
          .from('extracted_frames')
          .update({ block_id: currentBlockId })
          .eq('id', frame.id);
      }

      previousRoomType = roomType;
    }

    // Extraire les tâches par bloc
    console.log('Extracting tasks from visit session...');
    
    const { data: blocks } = await supabase
      .from('detected_blocks')
      .select(`
        *,
        extracted_frames(*)
      `)
      .eq('visit_session_id', visitSessionId)
      .order('block_number', { ascending: true });

    let totalTasksExtracted = 0;

    for (const block of blocks || []) {
      // Rassembler toutes les infos du bloc
      const elements = block.extracted_frames?.flatMap((f: any) => 
        f.analysis_result?.elements || []
      ) || [];
      
      const materials = block.extracted_frames?.flatMap((f: any) => 
        f.analysis_result?.materials || []
      ) || [];
      
      const pathologies = block.extracted_frames?.flatMap((f: any) => 
        f.analysis_result?.pathologies || []
      ) || [];

      // Construire la description du bloc pour l'IA
      const blockDescription = `
Zone détectée: ${block.detected_room_type}

Éléments observés:
${elements.filter((e: string) => e).join('\n- ')}

Matériaux identifiés:
${materials.filter((m: string) => m).join('\n- ')}

Défauts et pathologies:
${pathologies.filter((p: string) => p).join('\n- ')}
      `.trim();

      // Appeler extract-tasks avec le BON format
      const { data: tasksData, error: tasksError } = await supabase.functions.invoke(
        'extract-tasks',
        {
          body: {
            content: blockDescription,
            contentType: 'text'  // Format TEXT obligatoire
          }
        }
      );

      if (tasksError) {
        console.error('Error extracting tasks:', tasksError);
        continue;
      }

      // Sauvegarder les tâches extraites
      if (tasksData?.tasks && tasksData.tasks.length > 0) {
        const tasksToInsert = tasksData.tasks.map((task: any) => ({
          ...task,
          user_id: user.id,
          visit_session_id: visitSessionId,
          block_id: block.id,
          source_type: 'visit',
          location: block.detected_room_type
        }));

        const { error: insertError } = await supabase
          .from('extracted_tasks')
          .insert(tasksToInsert);

        if (!insertError) {
          totalTasksExtracted += tasksToInsert.length;
          console.log(`Extracted ${tasksToInsert.length} tasks from block #${block.block_number}`);
        } else {
          console.error('Error inserting tasks:', insertError);
        }
      }
    }

    // Finaliser la session
    await supabase
      .from('visit_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          blocks_detected: currentBlockNumber,
          frames_processed: existingFrames?.length || 0,
          tasks_extracted: totalTasksExtracted
        }
      })
      .eq('id', visitSessionId);

    console.log(`Visit session ${visitSessionId} processed successfully - ${totalTasksExtracted} tasks extracted`);

    return new Response(
      JSON.stringify({ 
        success: true,
        blocks_count: currentBlockNumber,
        tasks_count: totalTasksExtracted,
        message: 'Visit session processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-visit-session:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
