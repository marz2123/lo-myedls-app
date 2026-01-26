import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

interface ExportOptions {
  edlId: string;
  projectId: string;
  exports: {
    dpgf: boolean;
    noticeDescriptive: boolean;
    planning: boolean;
    purchaseList: boolean;
    jsonTechnique: boolean;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  family_id: string;
  category_id: string;
  subcategory_id: string;
  location: string;
  priority: string;
  work_type: string;
  area: string;
  source_type: string;
}

interface DPGFLine {
  ft_code: string;
  ft_label: string;
  category: string;
  subcategory: string;
  designation: string;
  unit: string;
  quantity: number;
  unit_price: number | null;
  total: number | null;
  room: string;
  severity: string;
}

interface PlanningTask {
  id: string;
  name: string;
  phase: string;
  duration_days: number;
  start_offset: number;
  dependencies: string[];
  ft_code: string;
  room: string;
}

interface PurchaseItem {
  product: string;
  quantity: number;
  unit: string;
  ft_code: string;
  ft_label: string;
  brand_recommended: string | null;
  estimated_price: number | null;
  room: string;
}

// Phase definitions with typical order
const PHASES = [
  { code: 'CURETAGE', label: 'Curetage / Démolition', order: 1 },
  { code: 'PREP', label: 'Préparation', order: 2 },
  { code: 'ELEC_PLOMB', label: 'Électricité / Plomberie', order: 3 },
  { code: 'ISOLATION', label: 'Isolation', order: 4 },
  { code: 'PLACO', label: 'Plâtrerie / Cloisons', order: 5 },
  { code: 'FINITIONS', label: 'Finitions', order: 6 },
  { code: 'SOLS', label: 'Revêtements de sols', order: 7 },
  { code: 'SANITAIRES', label: 'Sanitaires', order: 8 },
  { code: 'CLIM', label: 'Climatisation / Chauffage', order: 9 },
  { code: 'CONTROLE', label: 'Contrôle final', order: 10 },
];

// FT to Phase mapping
const FT_PHASE_MAP: Record<string, string> = {
  'F01': 'CURETAGE',
  'F02': 'PREP',
  'F03': 'ELEC_PLOMB',
  'F04': 'ELEC_PLOMB',
  'F05': 'ISOLATION',
  'F06': 'PLACO',
  'F07': 'PLACO',
  'F08': 'FINITIONS',
  'F09': 'FINITIONS',
  'F10': 'SOLS',
  'F11': 'SOLS',
  'F12': 'SANITAIRES',
  'F13': 'CLIM',
  'F14': 'FINITIONS',
  'F15': 'FINITIONS',
};

// Material suggestions per FT
const FT_MATERIALS: Record<string, { product: string; unit: string; ratio: number }[]> = {
  'F06': [
    { product: 'Plaque BA13', unit: 'm²', ratio: 1.1 },
    { product: 'Rail métallique', unit: 'ml', ratio: 0.3 },
    { product: 'Montant métallique', unit: 'ml', ratio: 0.5 },
    { product: 'Vis placo', unit: 'boîte', ratio: 0.02 },
  ],
  'F07': [
    { product: 'Plaque BA13', unit: 'm²', ratio: 2.2 },
    { product: 'Laine de roche', unit: 'm²', ratio: 1.0 },
    { product: 'Bande à joint', unit: 'ml', ratio: 3.0 },
    { product: 'Enduit à joint', unit: 'kg', ratio: 0.5 },
  ],
  'F08': [
    { product: 'Peinture acrylique', unit: 'L', ratio: 0.3 },
    { product: 'Enduit de lissage', unit: 'kg', ratio: 0.2 },
    { product: 'Sous-couche', unit: 'L', ratio: 0.15 },
  ],
  'F10': [
    { product: 'Carrelage', unit: 'm²', ratio: 1.05 },
    { product: 'Colle carrelage', unit: 'kg', ratio: 4.0 },
    { product: 'Joint carrelage', unit: 'kg', ratio: 0.3 },
    { product: 'Croisillons', unit: 'sachet', ratio: 0.01 },
  ],
  'F11': [
    { product: 'Parquet stratifié', unit: 'm²', ratio: 1.05 },
    { product: 'Sous-couche parquet', unit: 'm²', ratio: 1.0 },
    { product: 'Plinthes', unit: 'ml', ratio: 0.4 },
  ],
  'F03': [
    { product: 'Câble électrique 2.5mm²', unit: 'ml', ratio: 5.0 },
    { product: 'Gaine ICTA', unit: 'ml', ratio: 5.0 },
    { product: 'Interrupteur', unit: 'u', ratio: 0.5 },
    { product: 'Prise électrique', unit: 'u', ratio: 1.0 },
  ],
  'F04': [
    { product: 'Tube PER', unit: 'ml', ratio: 3.0 },
    { product: 'Raccord laiton', unit: 'u', ratio: 2.0 },
    { product: 'Vanne d\'arrêt', unit: 'u', ratio: 0.5 },
  ],
  'F12': [
    { product: 'WC suspendu', unit: 'u', ratio: 1.0 },
    { product: 'Lavabo', unit: 'u', ratio: 1.0 },
    { product: 'Robinetterie', unit: 'u', ratio: 1.0 },
    { product: 'Siphon', unit: 'u', ratio: 1.0 },
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { edlId, projectId, exports }: ExportOptions = await req.json();

    console.log(`[export-edl-to-project] Starting export for EDL: ${edlId}, Project: ${projectId}`);

    // Fetch all necessary data
    const [tasksResult, anomaliesResult, framesResult, projectResult, familiesResult] = await Promise.all([
      supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
      supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
      supabase.from('extracted_frames').select('*').eq('visit_session_id', edlId),
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('task_families').select('*'),
    ]);

    const tasks = tasksResult.data || [];
    const anomalies = anomaliesResult.data || [];
    const frames = framesResult.data || [];
    const project = projectResult.data;
    const families = familiesResult.data || [];

    console.log(`[export-edl-to-project] Found ${tasks.length} tasks, ${anomalies.length} anomalies, ${frames.length} frames`);

    // Create family lookup
    const familyLookup = new Map(families.map(f => [f.id, f]));

    const result: Record<string, any> = {
      project: {
        id: projectId,
        name: project?.name || 'Projet EDL',
        address: project?.address || '',
        created_at: new Date().toISOString(),
      },
      exports: {},
    };

    // Generate DPGF
    if (exports.dpgf) {
      console.log('[export-edl-to-project] Generating DPGF...');
      const dpgfLines: DPGFLine[] = tasks.map(task => {
        const family = task.family_id ? familyLookup.get(task.family_id) : null;
        const quantity = estimateQuantity(task);
        
        return {
          ft_code: family?.code || 'F00',
          ft_label: family?.name || 'Non classé',
          category: task.work_type || 'Travaux',
          subcategory: task.area || '',
          designation: task.title,
          unit: getUnit(task),
          quantity,
          unit_price: null,
          total: null,
          room: task.location || 'Non localisé',
          severity: task.priority || 'normal',
        };
      });

      result.exports.dpgf = {
        lines: dpgfLines,
        summary: {
          total_lines: dpgfLines.length,
          by_family: groupByFamily(dpgfLines),
        },
      };
    }

    // Generate Notice Descriptive
    if (exports.noticeDescriptive) {
      console.log('[export-edl-to-project] Generating Notice Descriptive...');
      const notice = await generateNoticeDescriptive(tasks, families, openaiApiKey);
      result.exports.noticeDescriptive = notice;
    }

    // Generate Planning
    if (exports.planning) {
      console.log('[export-edl-to-project] Generating Planning...');
      const planningTasks = generatePlanning(tasks, families);
      result.exports.planning = {
        tasks: planningTasks,
        phases: PHASES,
        total_duration: calculateTotalDuration(planningTasks),
        gantt_data: generateGanttData(planningTasks),
      };
    }

    // Generate Purchase List
    if (exports.purchaseList) {
      console.log('[export-edl-to-project] Generating Purchase List...');
      const purchaseItems = generatePurchaseList(tasks, families);
      result.exports.purchaseList = {
        items: purchaseItems,
        summary: {
          total_items: purchaseItems.length,
          by_category: groupPurchasesByCategory(purchaseItems),
        },
      };
    }

    // Generate JSON Technique for MyHome
    if (exports.jsonTechnique) {
      console.log('[export-edl-to-project] Generating JSON Technique...');
      result.exports.jsonTechnique = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        project: result.project,
        rooms: extractRooms(tasks, frames),
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          family_code: familyLookup.get(t.family_id)?.code || 'F00',
          location: t.location,
          priority: t.priority,
          work_type: t.work_type,
          quantity: estimateQuantity(t),
          unit: getUnit(t),
        })),
        materials: exports.purchaseList ? result.exports.purchaseList.items : [],
        timeline: exports.planning ? result.exports.planning.tasks : [],
        dpgf: exports.dpgf ? result.exports.dpgf.lines : [],
        notice: exports.noticeDescriptive ? result.exports.noticeDescriptive : null,
      };
    }

    // Store results in Supabase Storage
    const timestamp = Date.now();
    const storagePath = `exports/${projectId}/${timestamp}`;

    // Store JSON export
    const jsonBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    await supabase.storage
      .from('project-documents')
      .upload(`${storagePath}/export_complet.json`, jsonBlob);

    console.log(`[export-edl-to-project] Export complete, stored at ${storagePath}`);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      storage_path: storagePath,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[export-edl-to-project] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function estimateQuantity(task: Task): number {
  // AI-based quantity estimation based on task description
  const description = (task.description || '').toLowerCase();
  const title = (task.title || '').toLowerCase();
  
  // Look for explicit quantities in text
  const quantityMatch = description.match(/(\d+(?:,\d+)?)\s*(m²|m2|ml|u|pièce|unité)/i);
  if (quantityMatch) {
    return parseFloat(quantityMatch[1].replace(',', '.'));
  }
  
  // Default estimates based on work type
  if (title.includes('peinture') || title.includes('mur')) return 15;
  if (title.includes('sol') || title.includes('carrelage')) return 10;
  if (title.includes('plafond')) return 12;
  if (title.includes('porte') || title.includes('fenêtre')) return 1;
  if (title.includes('électrique') || title.includes('prise')) return 5;
  if (title.includes('plomberie')) return 1;
  
  return 1;
}

function getUnit(task: Task): string {
  const title = (task.title || '').toLowerCase();
  const area = (task.area || '').toLowerCase();
  
  if (title.includes('peinture') || title.includes('mur') || title.includes('sol')) return 'm²';
  if (title.includes('plinthe') || title.includes('corniche')) return 'ml';
  if (title.includes('porte') || title.includes('fenêtre') || title.includes('prise')) return 'u';
  
  return 'forfait';
}

function groupByFamily(lines: DPGFLine[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const line of lines) {
    const key = `${line.ft_code} - ${line.ft_label}`;
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

async function generateNoticeDescriptive(
  tasks: Task[], 
  families: any[], 
  apiKey: string | undefined
): Promise<any> {
  const familyLookup = new Map(families.map(f => [f.id, f]));
  
  // Group tasks by family
  const tasksByFamily: Record<string, Task[]> = {};
  for (const task of tasks) {
    const family = task.family_id ? familyLookup.get(task.family_id) : null;
    const key = family?.code || 'F00';
    if (!tasksByFamily[key]) tasksByFamily[key] = [];
    tasksByFamily[key].push(task);
  }
  
  // Generate notice structure
  const sections = Object.entries(tasksByFamily).map(([ftCode, ftTasks]) => {
    const family = families.find(f => f.code === ftCode);
    return {
      ft_code: ftCode,
      ft_label: family?.name || 'Non classé',
      categories: groupTasksByCategory(ftTasks),
      task_count: ftTasks.length,
    };
  }).sort((a, b) => a.ft_code.localeCompare(b.ft_code));
  
  return {
    title: 'Notice Descriptive des Travaux',
    generated_at: new Date().toISOString(),
    sections,
    total_tasks: tasks.length,
  };
}

function groupTasksByCategory(tasks: Task[]): any[] {
  const byCategory: Record<string, Task[]> = {};
  for (const task of tasks) {
    const cat = task.work_type || 'Travaux divers';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(task);
  }
  
  return Object.entries(byCategory).map(([category, catTasks]) => ({
    category,
    tasks: catTasks.map(t => ({
      title: t.title,
      description: t.description,
      location: t.location,
      quantity: estimateQuantity(t),
      unit: getUnit(t),
    })),
  }));
}

function generatePlanning(tasks: Task[], families: any[]): PlanningTask[] {
  const familyLookup = new Map(families.map(f => [f.id, f]));
  let currentOffset = 0;
  
  // Group tasks by phase
  const tasksByPhase: Record<string, Task[]> = {};
  for (const task of tasks) {
    const family = task.family_id ? familyLookup.get(task.family_id) : null;
    const ftCode = family?.code || 'F00';
    const phase = FT_PHASE_MAP[ftCode] || 'FINITIONS';
    if (!tasksByPhase[phase]) tasksByPhase[phase] = [];
    tasksByPhase[phase].push(task);
  }
  
  const planningTasks: PlanningTask[] = [];
  
  for (const phase of PHASES) {
    const phaseTasks = tasksByPhase[phase.code] || [];
    if (phaseTasks.length === 0) continue;
    
    for (const task of phaseTasks) {
      const family = task.family_id ? familyLookup.get(task.family_id) : null;
      const duration = estimateDuration(task);
      
      planningTasks.push({
        id: task.id,
        name: task.title,
        phase: phase.code,
        duration_days: duration,
        start_offset: currentOffset,
        dependencies: [],
        ft_code: family?.code || 'F00',
        room: task.location || '',
      });
      
      currentOffset += duration;
    }
  }
  
  return planningTasks;
}

function estimateDuration(task: Task): number {
  const priority = task.priority || 'normal';
  const baseDuration = 1;
  
  const multiplier = priority === 'high' ? 1.5 : priority === 'low' ? 0.5 : 1;
  return Math.ceil(baseDuration * multiplier);
}

function calculateTotalDuration(tasks: PlanningTask[]): number {
  if (tasks.length === 0) return 0;
  const lastTask = tasks[tasks.length - 1];
  return lastTask.start_offset + lastTask.duration_days;
}

function generateGanttData(tasks: PlanningTask[]): any[] {
  return tasks.map(task => ({
    id: task.id,
    name: task.name,
    start: task.start_offset,
    end: task.start_offset + task.duration_days,
    phase: task.phase,
    ft_code: task.ft_code,
  }));
}

function generatePurchaseList(tasks: Task[], families: any[]): PurchaseItem[] {
  const familyLookup = new Map(families.map(f => [f.id, f]));
  const purchaseItems: PurchaseItem[] = [];
  const itemMap = new Map<string, PurchaseItem>();
  
  for (const task of tasks) {
    const family = task.family_id ? familyLookup.get(task.family_id) : null;
    const ftCode = family?.code || 'F00';
    const materials = FT_MATERIALS[ftCode] || [];
    const quantity = estimateQuantity(task);
    
    for (const material of materials) {
      const key = `${material.product}-${ftCode}`;
      const materialQuantity = Math.ceil(quantity * material.ratio);
      
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!;
        existing.quantity += materialQuantity;
      } else {
        const item: PurchaseItem = {
          product: material.product,
          quantity: materialQuantity,
          unit: material.unit,
          ft_code: ftCode,
          ft_label: family?.name || 'Non classé',
          brand_recommended: null,
          estimated_price: null,
          room: task.location || '',
        };
        itemMap.set(key, item);
        purchaseItems.push(item);
      }
    }
  }
  
  return purchaseItems;
}

function groupPurchasesByCategory(items: PurchaseItem[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = item.ft_label;
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function extractRooms(tasks: Task[], frames: any[]): any[] {
  const roomSet = new Set<string>();
  
  for (const task of tasks) {
    if (task.location) roomSet.add(task.location);
  }
  
  for (const frame of frames) {
    if (frame.manual_label) roomSet.add(frame.manual_label);
  }
  
  return Array.from(roomSet).map((room, index) => ({
    id: `room-${index}`,
    name: room,
    tasks_count: tasks.filter(t => t.location === room).length,
  }));
}
