import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Labels for display
const PART_TYPE_LABELS: Record<string, string> = {
  commune: 'Parties Communes',
  privative: 'Parties Privatives',
};

const CONDITION_LABELS: Record<string, string> = {
  neuf: 'Neuf',
  bon: 'Bon',
  a_refaire: 'À refaire',
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  murs: 'Murs',
  sol: 'Sol',
  plafond: 'Plafond',
  menuiseries: 'Menuiseries',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  equipements: 'Équipements',
  ventilation: 'Ventilation',
  chauffage: 'Chauffage',
  facade: 'Façade',
  toiture: 'Toiture',
  autre: 'Autre',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
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

    console.log(`Generating PDF data for project ${projectId}`);

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

    // Get property composition
    const { data: composition } = await supabase
      .from('property_composition')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

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

    // Get visit sequences
    const { data: sequences } = await supabase
      .from('visit_sequences')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at');

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

    // Build hierarchical PDF content structure
    const pdfContent = {
      title: `État des Lieux - ${project.address}`,
      generatedAt: new Date().toISOString(),
      
      project: {
        type: project.property_type,
        address: project.address,
        postalCode: project.postal_code,
        city: project.city,
        additionalInfo: project.additional_info,
      },

      composition: composition ? {
        buildingYear: composition.building_year,
        buildingType: composition.building_type,
        totalFloors: composition.total_floors,
        nbApartments: composition.nb_apartments,
        nbStaircases: composition.nb_staircases,
        nbParkingSpots: composition.nb_parking_spots,
        nbBoxes: composition.nb_boxes,
        nbGarages: composition.nb_garages,
        nbFacades: composition.nb_facades,
        nbGardens: composition.nb_gardens,
        historyNotes: composition.history_notes,
        previousWorks: composition.previous_works,
        knownIssues: composition.known_issues,
      } : null,

      structure: (parts || []).map(part => ({
        id: part.id,
        name: part.name,
        type: PART_TYPE_LABELS[part.part_type] || part.part_type,
        partType: part.part_type,
        locations: (locations || [])
          .filter(loc => loc.part_id === part.id)
          .map(location => ({
            id: location.id,
            name: location.name,
            type: location.location_type,
            floor: location.floor_level,
            surface: location.surface_m2,
            condition: CONDITION_LABELS[location.overall_condition] || location.overall_condition,
            zones: (zones || [])
              .filter(z => z.location_id === location.id)
              .map(zone => ({
                id: zone.id,
                type: ZONE_TYPE_LABELS[zone.zone_type] || zone.zone_type,
                customName: zone.custom_name,
                condition: CONDITION_LABELS[zone.condition] || zone.condition,
                notes: zone.notes,
              })),
            sequences: (sequences || [])
              .filter(s => s.location_id === location.id)
              .map(seq => ({
                id: seq.id,
                startedAt: seq.started_at,
                endedAt: seq.ended_at,
                duration: seq.duration_seconds,
                condition: CONDITION_LABELS[seq.user_condition || seq.detected_condition] || '',
                detectedZones: (seq.detected_zones || []).map((z: string) => ZONE_TYPE_LABELS[z] || z),
                transcription: seq.transcription,
                photos: seq.photos,
                videoUrl: seq.video_url,
              })),
            problems: (problems || [])
              .filter(p => p.location_id === location.id)
              .map(problem => ({
                id: problem.id,
                title: problem.title,
                description: problem.description,
                severity: SEVERITY_LABELS[problem.severity] || problem.severity,
                zoneType: ZONE_TYPE_LABELS[problem.zone_type] || problem.zone_type,
                aiDetected: problem.ai_detected,
                isConfirmed: problem.is_confirmed,
                isResolved: problem.is_resolved,
                photos: problem.photo_urls,
                tasks: (tasks || [])
                  .filter(t => t.problem_id === problem.id)
                  .map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    family: task.task_families?.name,
                    familyCode: task.task_families?.code,
                    category: task.task_categories?.name,
                    categoryCode: task.task_categories?.code,
                    subcategory: task.task_subcategories?.name,
                    subcategoryCode: task.task_subcategories?.code,
                    condition: CONDITION_LABELS[task.condition] || task.condition,
                    priority: task.priority,
                    workType: task.work_type,
                    quantity: task.quantity,
                    unit: task.unit,
                    estimatedCostMin: task.estimated_cost_min,
                    estimatedCostMax: task.estimated_cost_max,
                    status: task.status,
                    photos: task.photo_urls,
                  })),
              })),
          })),
      })),

      summary: {
        totalParts: parts?.length || 0,
        totalLocations: locations?.length || 0,
        totalZones: zones?.length || 0,
        totalSequences: sequences?.length || 0,
        totalProblems: problems?.length || 0,
        totalTasks: tasks?.length || 0,
        problemsBySeverity: {
          low: problems?.filter(p => p.severity === 'low').length || 0,
          medium: problems?.filter(p => p.severity === 'medium').length || 0,
          high: problems?.filter(p => p.severity === 'high').length || 0,
          critical: problems?.filter(p => p.severity === 'critical').length || 0,
        },
        conditionOverview: {
          neuf: locations?.filter(l => l.overall_condition === 'neuf').length || 0,
          bon: locations?.filter(l => l.overall_condition === 'bon').length || 0,
          a_refaire: locations?.filter(l => l.overall_condition === 'a_refaire').length || 0,
        },
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        content: pdfContent,
        filename: `EDL_${project.address?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-business-model-pdf:', error);
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
