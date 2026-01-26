import { supabase } from '@/integrations/supabase/client';

// ============= TYPE DEFINITIONS =============

export interface ProjectContext {
  id: string;
  name: string;
  address: string;
  type: 'immeuble' | 'maison' | 'appartement' | 'local_pro' | 'commerce' | string;
}

export interface EDLContext {
  typeEDL: 'avant_travaux' | 'apres_travaux' | 'entree' | 'sortie' | string;
  captureMode: 'video' | 'photo_voice' | 'text' | 'mixed' | string;
}

export interface VisionElement {
  type: string;
  description: string;
  location?: string;
  condition?: 'bon' | 'moyen' | 'mauvais' | 'absent';
  confidence?: number;
}

export interface SegmentTranscript {
  timestamp: number;
  text: string;
  location?: string;
}

export interface DSCFamily {
  code: string;
  label: string;
  categories?: Array<{
    code: string;
    label: string;
  }>;
}

export interface ExtractTasksInput {
  projectContext: ProjectContext;
  edlContext: EDLContext;
  transcript: {
    globalTranscript: string;
    segmentTranscripts?: SegmentTranscript[];
  };
  visionElements?: VisionElement[];
  zoneTags?: string[];
  existingTasks?: any[];
  dscFamilies?: DSCFamily[];
}

export interface TaskOutput {
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string | null;
  taskName: string;
  description: string;
  pieceOrZone: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  status: 'à faire';
  observations?: string;
}

export interface PieceSummary {
  piece: string;
  etatGeneral: string;
  pointsForts: string;
  pointsFaibles: string;
}

export interface EDLSummary {
  resumeGlobal: string;
  parPieces: PieceSummary[];
}

export interface ExtractTasksOutput {
  edlSummary: EDLSummary;
  tasks: TaskOutput[];
  error?: string;
}

// ============= MAIN SERVICE FUNCTION =============

/**
 * Extract tasks from EDL data using the centralized Task Extraction Master function.
 * This function is used by both MyAladin orchestrator and Guided Reportage Mode.
 * 
 * @param input - The extraction input containing project context, EDL context, transcript, and vision elements
 * @returns The extracted EDL summary and tasks
 */
export async function extractTasksFromEDL(input: ExtractTasksInput): Promise<ExtractTasksOutput> {
  console.log('[taskExtractionMaster] Starting extraction for project:', input.projectContext.name);
  console.log('[taskExtractionMaster] Transcript length:', input.transcript.globalTranscript.length);
  console.log('[taskExtractionMaster] Vision elements:', input.visionElements?.length || 0);
  console.log('[taskExtractionMaster] Zone tags:', input.zoneTags?.join(', ') || 'none');

  try {
    const { data, error } = await supabase.functions.invoke('extract-tasks-master', {
      body: input,
    });

    if (error) {
      console.error('[taskExtractionMaster] Supabase function error:', error);
      throw new Error(error.message || 'Failed to invoke extract-tasks-master function');
    }

    if (data.error) {
      console.error('[taskExtractionMaster] Extraction error:', data.error);
      return {
        edlSummary: data.edlSummary || {
          resumeGlobal: 'Erreur lors de l\'extraction.',
          parPieces: [],
        },
        tasks: data.tasks || [],
        error: data.error,
      };
    }

    console.log('[taskExtractionMaster] Extraction successful:', {
      summaryPieces: data.edlSummary?.parPieces?.length || 0,
      tasksCount: data.tasks?.length || 0,
    });

    return data as ExtractTasksOutput;

  } catch (err) {
    console.error('[taskExtractionMaster] Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    return {
      edlSummary: {
        resumeGlobal: 'Erreur lors de l\'extraction des tâches.',
        parPieces: [],
      },
      tasks: [],
      error: errorMessage,
    };
  }
}

// ============= HELPER FUNCTIONS =============

/**
 * Build project context from project data
 */
export function buildProjectContext(project: {
  id: string;
  name?: string;
  address?: string;
  property_type?: string;
}): ProjectContext {
  return {
    id: project.id,
    name: project.name || 'Projet sans nom',
    address: project.address || 'Adresse non renseignée',
    type: project.property_type || 'immeuble',
  };
}

/**
 * Build EDL context from session data
 */
export function buildEDLContext(options: {
  typeEDL?: string;
  captureMode?: string;
}): EDLContext {
  return {
    typeEDL: options.typeEDL || 'avant_travaux',
    captureMode: options.captureMode || 'video',
  };
}

/**
 * Combine multiple transcripts into a single global transcript
 */
export function combineTranscripts(segments: SegmentTranscript[]): string {
  return segments
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(s => {
      const location = s.location ? `[${s.location}] ` : '';
      return `${location}${s.text}`;
    })
    .join('\n');
}

/**
 * Map vision analysis results to VisionElement format
 */
export function mapVisionResults(analysisResults: any[]): VisionElement[] {
  return analysisResults.map(result => ({
    type: result.element_type || result.type || 'unknown',
    description: result.description || '',
    location: result.location || result.zone || undefined,
    condition: mapConditionState(result.condition || result.state),
    confidence: result.confidence || undefined,
  }));
}

function mapConditionState(state: string | undefined): 'bon' | 'moyen' | 'mauvais' | 'absent' | undefined {
  if (!state) return undefined;
  
  const normalized = state.toLowerCase();
  if (normalized.includes('bon') || normalized.includes('neuf') || normalized.includes('good')) {
    return 'bon';
  }
  if (normalized.includes('moyen') || normalized.includes('average') || normalized.includes('medium')) {
    return 'moyen';
  }
  if (normalized.includes('mauvais') || normalized.includes('bad') || normalized.includes('poor') || normalized.includes('refaire')) {
    return 'mauvais';
  }
  if (normalized.includes('absent') || normalized.includes('missing') || normalized.includes('manquant')) {
    return 'absent';
  }
  return undefined;
}

/**
 * Load DSC families from the database
 */
export async function loadDSCFamilies(): Promise<DSCFamily[]> {
  try {
    // First get families
    const { data: families, error: familiesError } = await supabase
      .from('task_families')
      .select('id, code, name')
      .order('code');

    if (familiesError) {
      console.error('[taskExtractionMaster] Error loading DSC families:', familiesError);
      return [];
    }

    // Then get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('task_categories')
      .select('id, code, name, family_id')
      .order('code');

    if (categoriesError) {
      console.error('[taskExtractionMaster] Error loading DSC categories:', categoriesError);
    }

    // Map families with their categories
    return (families || []).map(f => ({
      code: f.code,
      label: f.name,
      categories: (categories || [])
        .filter((c: any) => c.family_id === f.id)
        .map((c: any) => ({
          code: c.code,
          label: c.name,
        })),
    }));
  } catch (err) {
    console.error('[taskExtractionMaster] Error loading DSC families:', err);
    return [];
  }
}

/**
 * Save extracted tasks to the database
 */
export async function saveExtractedTasks(
  projectId: string,
  tasks: TaskOutput[],
  sourceType: 'edl_master' | 'myaladin' | 'guided_reportage' = 'edl_master'
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) {
      return { success: false, savedCount: 0, error: 'User not authenticated' };
    }

    const userId = session.session.user.id;

    const tasksToInsert = tasks.map(task => ({
      project_id: projectId,
      user_id: userId,
      title: task.taskName,
      description: task.description,
      location: task.pieceOrZone,
      priority: task.priority,
      source_type: sourceType,
      work_type: task.familyName,
      area: task.category,
      analysis_metadata: {
        familyCode: task.familyCode,
        familyName: task.familyName,
        category: task.category,
        subCategory: task.subCategory,
        observations: task.observations,
        extractedBy: 'extract-tasks-master',
      },
    }));

    const { data, error } = await supabase
      .from('extracted_tasks')
      .insert(tasksToInsert)
      .select();

    if (error) {
      console.error('[taskExtractionMaster] Error saving tasks:', error);
      return { success: false, savedCount: 0, error: error.message };
    }

    console.log('[taskExtractionMaster] Saved', data?.length || 0, 'tasks');
    return { success: true, savedCount: data?.length || 0 };

  } catch (err) {
    console.error('[taskExtractionMaster] Error saving tasks:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, savedCount: 0, error: errorMessage };
  }
}