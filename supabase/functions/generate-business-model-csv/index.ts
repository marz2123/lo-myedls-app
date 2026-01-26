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

    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error('projectId is required');
    }

    console.log(`Generating CSV for project ${projectId}`);

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      throw new Error('Project not found');
    }

    // Get property parts
    const { data: parts } = await supabase
      .from('property_parts')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index');

    // Get property locations
    const { data: locations } = await supabase
      .from('property_locations')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index');

    // Get location zones
    const { data: zones } = await supabase
      .from('location_zones')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index');

    // Get identified problems
    const { data: problems } = await supabase
      .from('identified_problems')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    // Get problem tasks with DSC classification
    const { data: tasks } = await supabase
      .from('problem_tasks')
      .select(`
        *,
        task_families(code, name),
        task_categories(code, name),
        task_subcategories(code, name)
      `)
      .eq('project_id', projectId)
      .order('created_at');

    // Get visit sequences for AR measurements
    const { data: sequences } = await supabase
      .from('visit_sequences')
      .select('*')
      .eq('project_id', projectId);

    // CSV Headers matching the new business model structure
    const headers = [
      'Bien',
      'Adresse',
      'Code Postal',
      'Ville',
      'Partie',
      'Type Partie',
      'Lieu',
      'Type Lieu',
      'Étage',
      'Surface Lieu (m²)',
      'Zone',
      'Type Zone',
      'État Zone',
      'Surface Zone (m²)',
      'Mesures AR',
      'Problème',
      'Sévérité',
      'Urgence',
      'Origine',
      'Tâche',
      'Description Tâche',
      'Famille (FT)',
      'Code FT',
      'Catégorie (CT)',
      'Code CT',
      'Sous-catégorie (ST)',
      'Code ST',
      'État Tâche',
      'Priorité',
      'Corps Métier',
      'Difficulté',
      'Type Travaux',
      'Quantité',
      'Unité',
      'Coût Min (€)',
      'Coût Max (€)',
      'Délai Estimé (jours)',
      'Ordre Exécution',
      'Statut Validation',
      'Statut',
      'Photos Problème',
      'Photos Tâche'
    ];

    const rows: string[][] = [];

    // Helper to format AR measurements
    const formatARMeasures = (measures: any) => {
      if (!measures) return '';
      const parts = [];
      if (measures.length) parts.push(`L: ${measures.length}m`);
      if (measures.width) parts.push(`l: ${measures.width}m`);
      if (measures.height) parts.push(`H: ${measures.height}m`);
      if (measures.surface) parts.push(`S: ${measures.surface}m²`);
      return parts.join(', ');
    };

    // Build hierarchical data - iterate through all tasks
    for (const task of tasks || []) {
      const problem = problems?.find(p => p.id === task.problem_id);
      const location = locations?.find(l => l.id === task.location_id);
      const part = parts?.find(p => p.id === task.part_id) || 
                   (location ? parts?.find(p => p.id === location.part_id) : null);
      const zone = zones?.find(z => z.id === task.zone_id);

      const row = [
        project.property_type || '',
        project.address || '',
        project.postal_code || '',
        project.city || '',
        part?.name || '',
        part?.part_type === 'commune' ? 'Parties Communes' : 'Parties Privatives',
        location?.name || '',
        location?.location_type || '',
        location?.floor_level || '',
        location?.surface_m2?.toString() || '',
        zone?.custom_name || '',
        zone?.zone_type || '',
        zone?.condition || '',
        zone?.surface_m2?.toString() || '',
        formatARMeasures(zone?.mesures_ar),
        problem?.title || '',
        problem?.severity || '',
        problem?.urgence || '',
        problem?.origine || '',
        task.title || '',
        task.description || '',
        task.task_families?.name || '',
        task.task_families?.code || '',
        task.task_categories?.name || '',
        task.task_categories?.code || '',
        task.task_subcategories?.name || '',
        task.task_subcategories?.code || '',
        task.condition || '',
        task.priority || '',
        task.corps_metier || '',
        task.difficulte || '',
        task.work_type || '',
        task.quantity?.toString() || '',
        task.unit || '',
        task.estimated_cost_min?.toString() || '',
        task.estimated_cost_max?.toString() || '',
        task.delai_estime_jours?.toString() || '',
        task.ordre_execution?.toString() || '',
        task.etat_validation || '',
        task.status || '',
        (problem?.photo_urls || []).join('; '),
        (task.photo_urls || []).join('; ')
      ];

      rows.push(row);
    }

    // If no tasks, add problems without tasks
    if (rows.length === 0) {
      for (const problem of problems || []) {
        const location = locations?.find(l => l.id === problem.location_id);
        const part = location ? parts?.find(p => p.id === location.part_id) : null;
        const zone = zones?.find(z => z.id === problem.zone_id);

        const row = [
          project.property_type || '',
          project.address || '',
          project.postal_code || '',
          project.city || '',
          part?.name || '',
          part?.part_type === 'commune' ? 'Parties Communes' : 'Parties Privatives',
          location?.name || '',
          location?.location_type || '',
          location?.floor_level || '',
          location?.surface_m2?.toString() || '',
          zone?.custom_name || '',
          zone?.zone_type || '',
          zone?.condition || '',
          zone?.surface_m2?.toString() || '',
          '', // No AR measures
          problem.title || '',
          problem.severity || '',
          problem.urgence || '',
          problem.origine || '',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          (problem.photo_urls || []).join('; '),
          ''
        ];

        rows.push(row);
      }
    }

    // Generate CSV content
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const filename = `EDL_${project.address?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(
      JSON.stringify({
        success: true,
        csv: csvContent,
        filename,
        stats: {
          parts: parts?.length || 0,
          locations: locations?.length || 0,
          zones: zones?.length || 0,
          problems: problems?.length || 0,
          tasks: tasks?.length || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-business-model-csv:', error);
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
