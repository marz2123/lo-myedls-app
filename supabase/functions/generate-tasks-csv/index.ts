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

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch tasks with complete classification and AR measurements
    const { data: tasks, error: tasksError } = await supabase
      .from('extracted_tasks')
      .select(`
        *,
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
        ),
        detected_blocks (
          block_number,
          detected_room_type,
          manual_label,
          volume_data,
          visit_session_id
        ),
        extracted_frames (
          frame_url
        )
      `)
      .eq('visit_session_id', sessionId);

    if (tasksError) throw tasksError;

    // Get project info
    const { data: session } = await supabase
      .from('visit_sessions')
      .select(`
        projects!inner (
          address,
          postal_code,
          city,
          property_type
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    // Generate CSV content with professional columns including AR measurements
    const csvHeaders = [
      'Projet',
      'Type de bien',
      'Zone/Bloc',
      'Type',
      'FT',
      'FT Libellé',
      'CT',
      'CT Libellé',
      'ST',
      'ST Libellé',
      'Description',
      'Quantité',
      'Unité',
      'Largeur (m)',
      'Hauteur (m)',
      'Profondeur (m)',
      'Surface (m²)',
      'Volume (m³)',
      'Photo',
      'Confiance IA (%)',
      'Statut'
    ];

    const projectInfo = session?.projects as any;
    const csvRows = tasks?.map((task: any) => {
      const volumeData = task.detected_blocks?.volume_data as any || {};
      const photoUrl = task.extracted_frames?.frame_url || task.image_url || '';
      
      return [
        projectInfo?.address || '',
        projectInfo?.property_type || '',
        task.detected_blocks?.manual_label || task.detected_blocks?.detected_room_type || 'Zone non identifiée',
        task.source_type || 'auto',
        task.task_families?.code || '',
        task.task_families?.name || '',
        task.task_categories?.code || '',
        task.task_categories?.name || '',
        task.task_subcategories?.code || '',
        task.task_subcategories?.name || '',
        task.description || task.title || '',
        task.area || '',
        'm²',
        volumeData.width?.toFixed(2) || '',
        volumeData.height?.toFixed(2) || '',
        volumeData.depth?.toFixed(2) || '',
        volumeData.area?.toFixed(2) || '',
        volumeData.volume?.toFixed(2) || '',
        photoUrl,
        task.detection_confidence ? Math.round(task.detection_confidence * 100) : '',
        'auto'
      ];
    }) || [];

    // Format as CSV
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Return CSV data
    return new Response(
      JSON.stringify({ 
        success: true,
        data: csvContent,
        filename: `taches_${sessionId}_${Date.now()}.csv`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-tasks-csv:', error);
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
