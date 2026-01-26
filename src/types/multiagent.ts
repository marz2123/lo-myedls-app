// Multi-Agent AI System Types

export type AgentName = 
  | 'vision' 
  | 'description' 
  | 'task' 
  | 'normes' 
  | 'coherence' 
  | 'quality' 
  | 'comparative' 
  | 'planning' 
  | 'autopilot' 
  | 'orchestrator';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'invalidated';

export type InconsistencyType = 
  | 'vision_description' 
  | 'description_task' 
  | 'anomaly_task' 
  | 'entry_exit' 
  | 'state_anomaly' 
  | 'photo_element' 
  | 'norm_violation' 
  | 'hallucination' 
  | 'redundancy' 
  | 'other';

export type ResolutionType = 'auto_corrected' | 'merged' | 'user_validated' | 'rejected' | 'pending';

export type SessionStatus = 'initializing' | 'running' | 'merging' | 'resolving' | 'completed' | 'failed';

export type TriggerType = 'photo' | 'video' | 'sequence' | 'manual' | 'autopilot' | 'batch';

// Vision AI Results
export interface VisionAnalysisResult {
  elements: Array<{
    type: string;
    label: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
    material?: string;
    state?: 'neuf' | 'bon' | 'moyen' | 'mauvais' | 'absent';
  }>;
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    confidence: number;
    location?: string;
  }>;
  roomType?: string;
  lighting?: 'good' | 'poor' | 'very_poor';
  frameQuality?: 'good' | 'blur' | 'dark' | 'overexposed';
  missingAngles?: string[];
}

// Description AI Results
export interface DescriptionAnalysisResult {
  descriptions: Array<{
    elementId?: string;
    original?: string;
    corrected: string;
    isNeutral: boolean;
    normCompliant: boolean;
    corrections?: string[];
  }>;
  globalDescription?: string;
  style: 'edl_standard' | 'edl_detailed' | 'technical';
}

// Task AI Results
export interface TaskAnalysisResult {
  tasks: Array<{
    title: string;
    description: string;
    familyCode: string;
    familyName: string;
    categoryCode?: string;
    categoryName?: string;
    subcategoryCode?: string;
    subcategoryName?: string;
    unit?: string;
    quantity?: number;
    linkedAnomalyId?: string;
    priority: 'haute' | 'normale' | 'basse';
  }>;
  dpgfCoherence?: boolean;
}

// Normes AI Results
export interface NormesAnalysisResult {
  compliance: {
    alur: boolean;
    rtRe: boolean;
    european: boolean;
    overall: number;
  };
  violations: Array<{
    normId: string;
    normName: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    correction?: string;
  }>;
  forbiddenTerms: Array<{
    term: string;
    context: string;
    replacement: string;
  }>;
  missingObligations: string[];
}

// Coherence AI Results
export interface CoherenceAnalysisResult {
  score: number;
  inconsistencies: Array<{
    type: InconsistencyType;
    description: string;
    severity: 'low' | 'medium' | 'high';
    agents: AgentName[];
    suggestion?: string;
  }>;
  photoDescriptionMatch: number;
  anomalyTaskMatch: number;
  entryExitMatch?: number;
  stateAnomalyMatch: number;
}

// Quality AI Results
export interface QualityAnalysisResult {
  scores: {
    overall: number;
    completeness: number;
    coherence: number;
    photoQuality: number;
    descriptionQuality: number;
    taskAccuracy: number;
  };
  heatmaps?: {
    coverage: Record<string, number>;
    issues: Record<string, number>;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    action?: string;
  }>;
  systematicErrors?: Array<{
    pattern: string;
    occurrences: number;
    suggestion: string;
  }>;
}

// Comparative AI Results
export interface ComparativeAnalysisResult {
  entryExitDifferences: Array<{
    element: string;
    location: string;
    entryState: string;
    exitState: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestedTask?: string;
  }>;
  photoAlignments: Array<{
    entryPhotoId: string;
    exitPhotoId: string;
    matchConfidence: number;
  }>;
  generatedAnomalies: string[];
  generatedTasks: string[];
}

// Planning AI Results
export interface PlanningAnalysisResult {
  phases: Array<{
    name: string;
    familyCodes: string[];
    duration: number;
    dependencies: string[];
    order: number;
  }>;
  totalDuration: number;
  criticalPath: string[];
  ganttData?: any;
  buildingCoherence?: boolean;
}

// Orchestrator Session
export interface MultiAgentSession {
  id: string;
  projectId: string;
  triggerType: TriggerType;
  status: SessionStatus;
  agentsTriggered: AgentName[];
  agentsCompleted: AgentName[];
  totalAnalyses: number;
  totalResolutions: number;
  overallConfidence: number;
  qualityScore: number;
  coherenceScore: number;
  completenessScore: number;
  finalResult: {
    vision?: VisionAnalysisResult;
    description?: DescriptionAnalysisResult;
    task?: TaskAnalysisResult;
    normes?: NormesAnalysisResult;
    coherence?: CoherenceAnalysisResult;
    quality?: QualityAnalysisResult;
    comparative?: ComparativeAnalysisResult;
    planning?: PlanningAnalysisResult;
  };
  processingStartedAt?: string;
  processingCompletedAt?: string;
}

// Agent Analysis Record
export interface AgentAnalysis {
  id: string;
  projectId: string;
  sessionId?: string;
  frameId?: string;
  sequenceId?: string;
  agentName: AgentName;
  resultJson: any;
  confidence: number;
  processingTimeMs?: number;
  status: AnalysisStatus;
  errorMessage?: string;
  createdAt: string;
}

// Resolution Record
export interface AgentResolution {
  id: string;
  projectId: string;
  analysisIds: string[];
  inconsistencyType: InconsistencyType;
  conflictingAgents: AgentName[];
  conflictDescription?: string;
  chosenAgent?: AgentName;
  resolutionType: ResolutionType;
  resolutionData: any;
  confidence: number;
  appliedAt?: string;
}

// Agent Configuration
export interface AgentConfig {
  name: AgentName;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  priority: number;
  dependencies?: AgentName[];
}

export const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  vision: {
    name: 'vision',
    displayName: 'Vision AI',
    description: 'Analyse images et vidéos : pièces, éléments, matériaux, anomalies',
    icon: 'Eye',
    color: 'hsl(var(--primary))',
    priority: 1
  },
  description: {
    name: 'description',
    displayName: 'Description AI',
    description: 'Rédige descriptions neutres et conformes aux normes',
    icon: 'FileText',
    color: 'hsl(220, 70%, 50%)',
    priority: 2,
    dependencies: ['vision']
  },
  task: {
    name: 'task',
    displayName: 'Task AI',
    description: 'Génère tâches FT/CT/ST avec quantités',
    icon: 'ListTodo',
    color: 'hsl(280, 70%, 50%)',
    priority: 3,
    dependencies: ['vision', 'description']
  },
  normes: {
    name: 'normes',
    displayName: 'Normes AI',
    description: 'Vérifie conformité ALUR, RT/RE, EU',
    icon: 'Scale',
    color: 'hsl(340, 70%, 50%)',
    priority: 2,
    dependencies: ['description']
  },
  coherence: {
    name: 'coherence',
    displayName: 'Cohérence AI',
    description: 'Détecte incohérences photos/descriptions/tâches',
    icon: 'Link',
    color: 'hsl(40, 70%, 50%)',
    priority: 4,
    dependencies: ['vision', 'description', 'task']
  },
  quality: {
    name: 'quality',
    displayName: 'Quality AI',
    description: 'Score qualité, complétude, recommandations',
    icon: 'Award',
    color: 'hsl(160, 70%, 40%)',
    priority: 5,
    dependencies: ['vision', 'description', 'task', 'coherence']
  },
  comparative: {
    name: 'comparative',
    displayName: 'Comparative AI',
    description: 'Compare entrée/sortie, détecte différences',
    icon: 'GitCompare',
    color: 'hsl(200, 70%, 50%)',
    priority: 3
  },
  planning: {
    name: 'planning',
    displayName: 'Planning AI',
    description: 'Génère planning travaux, Gantt, phasage',
    icon: 'Calendar',
    color: 'hsl(100, 50%, 45%)',
    priority: 6,
    dependencies: ['task']
  },
  autopilot: {
    name: 'autopilot',
    displayName: 'Autopilot AI',
    description: 'Création EDL automatique photo/vidéo',
    icon: 'Zap',
    color: 'hsl(50, 80%, 50%)',
    priority: 1
  },
  orchestrator: {
    name: 'orchestrator',
    displayName: 'MyALADIN Orchestrator',
    description: 'Chef d\'orchestre, coordonne tous les agents',
    icon: 'Brain',
    color: 'hsl(var(--primary))',
    priority: 0
  }
};
