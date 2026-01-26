import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { projectId } = await req.json();

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    const userId = decodedPayload.sub;

    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current project info
    const { data: currentProject, error: projectError } = await supabase
      .from('projects')
      .select('property_type, number_of_units')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      console.error('Error fetching current project:', projectError);
      throw projectError;
    }

    // Get current project tasks
    const { data: currentTasks, error: currentTasksError } = await supabase
      .from('extracted_tasks')
      .select('title, description, family_id, category_id, subcategory_id')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (currentTasksError) {
      console.error('Error fetching current tasks:', currentTasksError);
      throw currentTasksError;
    }

    // Find similar completed projects (same property type, archived, with tasks)
    const { data: similarProjects, error: similarError } = await supabase
      .from('projects')
      .select(`
        id,
        address,
        extracted_tasks(
          title,
          description,
          area,
          location,
          priority,
          work_type,
          task_families(code, name),
          task_categories(code, name),
          task_subcategories(code, name)
        )
      `)
      .eq('user_id', userId)
      .eq('property_type', currentProject.property_type)
      .eq('archived', true)
      .neq('id', projectId);

    if (similarError) {
      console.error('Error fetching similar projects:', similarError);
    }

    // Analyze common tasks in similar projects
    const taskFrequency = new Map<string, {
      count: number;
      examples: any[];
    }>();

    if (similarProjects && similarProjects.length > 0) {
      similarProjects.forEach(project => {
        if (project.extracted_tasks && Array.isArray(project.extracted_tasks)) {
          project.extracted_tasks.forEach((task: any) => {
            const key = `${task.task_families?.code || 'N/A'}/${task.task_categories?.code || 'N/A'}/${task.task_subcategories?.code || 'N/A'}`;
            
            if (!taskFrequency.has(key)) {
              taskFrequency.set(key, { count: 0, examples: [] });
            }
            
            const freq = taskFrequency.get(key)!;
            freq.count++;
            if (freq.examples.length < 3) {
              freq.examples.push(task);
            }
          });
        }
      });
    }

    // Identify missing tasks (common in similar projects but not in current)
    const currentTaskKeys = new Set(
      currentTasks?.map(t => 
        `${t.family_id || 'N/A'}/${t.category_id || 'N/A'}/${t.subcategory_id || 'N/A'}`
      ) || []
    );

    const missingTasks: any[] = [];
    const minOccurrences = Math.max(2, Math.floor(similarProjects?.length || 0 * 0.5));

    taskFrequency.forEach((freq, key) => {
      if (freq.count >= minOccurrences) {
        const example = freq.examples[0];
        const taskKey = `${example.task_families?.id || 'N/A'}/${example.task_categories?.id || 'N/A'}/${example.task_subcategories?.id || 'N/A'}`;
        
        if (!currentTaskKeys.has(taskKey)) {
          missingTasks.push({
            title: example.title,
            description: example.description,
            area: example.area,
            location: example.location,
            priority: example.priority,
            work_type: example.work_type,
            family: example.task_families,
            category: example.task_categories,
            subcategory: example.task_subcategories,
            occurrence_rate: Math.round((freq.count / (similarProjects?.length || 1)) * 100),
            found_in_projects: freq.count
          });
        }
      }
    });

    // Sort by occurrence rate
    missingTasks.sort((a, b) => b.occurrence_rate - a.occurrence_rate);

    return new Response(JSON.stringify({
      missing_tasks: missingTasks.slice(0, 10),
      similar_projects_analyzed: similarProjects?.length || 0,
      current_tasks_count: currentTasks?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in detect-missing-tasks:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});