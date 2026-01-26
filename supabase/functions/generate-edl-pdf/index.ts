import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error('Session ID required');
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role for data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch complete session data
    const { data: session, error: sessionError } = await supabase
      .from('visit_sessions')
      .select(`
        *,
        projects (
          id,
          address,
          postal_code,
          city,
          property_type
        ),
        detected_blocks (
          id,
          block_number,
          detected_room_type,
          manual_label,
          confidence_score,
          timestamp_start,
          timestamp_end,
          extracted_frames (
            id,
            frame_url,
            timestamp_seconds
          ),
          audio_segments (
            id,
            transcription,
            timestamp_start,
            timestamp_end
          ),
          extracted_tasks (
            id,
            title,
            description,
            location,
            detection_confidence,
            task_families (
              name,
              code
            ),
            task_categories (
              name,
              code
            ),
            task_subcategories (
              name,
              code
            )
          )
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    
    if (!session) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Session de visite non trouvée',
          noData: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate PDF content (HTML that will be converted to PDF client-side)
    const pdfContent = {
      title: `État des Lieux - ${session.projects.address}`,
      project: {
        address: session.projects.address,
        postalCode: session.projects.postal_code,
        city: session.projects.city,
        propertyType: session.projects.property_type,
      },
      visitInfo: {
        date: new Date(session.started_at).toLocaleDateString('fr-FR'),
        duration: session.duration_seconds ? Math.floor(session.duration_seconds / 60) : 0,
        blocksCount: session.detected_blocks?.length || 0,
      },
      blocks: session.detected_blocks?.map((block: any) => ({
        number: block.block_number,
        roomType: block.manual_label || block.detected_room_type || 'Zone non identifiée',
        confidence: block.confidence_score ? Math.round(block.confidence_score * 100) : null,
        duration: block.timestamp_start && block.timestamp_end 
          ? Math.floor(block.timestamp_end - block.timestamp_start) 
          : null,
        photos: block.extracted_frames?.map((frame: any) => frame.frame_url) || [],
        transcription: block.audio_segments?.map((seg: any) => seg.transcription).join(' ') || '',
        tasks: block.extracted_tasks?.map((task: any) => ({
          title: task.title,
          description: task.description,
          family: task.task_families?.name || '',
          category: task.task_categories?.name || '',
          subcategory: task.task_subcategories?.name || '',
          confidence: task.detection_confidence ? Math.round(task.detection_confidence * 100) : null,
        })) || [],
      })) || [],
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        data: pdfContent 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-edl-pdf:', error);
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
