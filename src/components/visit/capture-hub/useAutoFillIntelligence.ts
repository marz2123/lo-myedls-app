import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CaptureAnalysis, CaptureResult, GeneratedTask, DetectedAnomaly } from './useCaptureAI';

// EDL Professional description templates
const EDL_TEMPLATES = {
  bon: [
    "Bon état général, aucun défaut apparent.",
    "État d'usage normal, aucune anomalie constatée.",
    "Bon état, conforme aux attentes.",
    "État satisfaisant, aucune intervention requise.",
  ],
  moyen: [
    "État d'usage avec traces visibles.",
    "État moyen, usure normale constatée.",
    "Présente des signes d'usure légers.",
    "État correct nécessitant une attention.",
  ],
  mauvais: [
    "État dégradé nécessitant intervention.",
    "Défauts importants constatés.",
    "État insatisfaisant, travaux à prévoir.",
    "Dégradations visibles, réparation recommandée.",
  ],
};

// Anomaly type to task family mapping
const ANOMALY_TO_FT: Record<string, { ft_code: string; ft_label: string; category: string }> = {
  fissure: { ft_code: 'FT02', ft_label: 'Maçonnerie', category: 'Gros œuvre' },
  humidité: { ft_code: 'FT21', ft_label: 'Étanchéité', category: 'Finitions' },
  moisissure: { ft_code: 'FT21', ft_label: 'Traitement', category: 'Finitions' },
  peinture: { ft_code: 'FT19', ft_label: 'Peinture', category: 'Finitions' },
  carrelage: { ft_code: 'FT14', ft_label: 'Carrelage', category: 'Revêtements' },
  parquet: { ft_code: 'FT15', ft_label: 'Parquet', category: 'Revêtements' },
  électricité: { ft_code: 'FT09', ft_label: 'Électricité', category: 'Électricité' },
  plomberie: { ft_code: 'FT10', ft_label: 'Plomberie', category: 'Plomberie' },
  menuiserie: { ft_code: 'FT07', ft_label: 'Menuiseries', category: 'Menuiseries extérieures' },
  vitre: { ft_code: 'FT08', ft_label: 'Vitrerie', category: 'Menuiseries' },
  chauffage: { ft_code: 'FT11', ft_label: 'Chauffage', category: 'CVC' },
  ventilation: { ft_code: 'FT12', ft_label: 'Ventilation', category: 'CVC' },
  default: { ft_code: 'FT28', ft_label: 'Divers', category: 'Autres travaux' },
};

// Anomaly icons mapping
export const ANOMALY_ICONS: Record<string, string> = {
  fissure: '🔍',
  crack: '🔍',
  humidité: '💧',
  humidity: '💧',
  moisissure: '🦠',
  mold: '🦠',
  tache: '🎨',
  stain: '🎨',
  peinture: '🖌️',
  paint: '🖌️',
  rayure: '✂️',
  scratch: '✂️',
  électricité: '⚡',
  electrical: '⚡',
  casse: '💔',
  broken: '💔',
  rouille: '🟤',
  rust: '🟤',
};

export interface AutoFillConfig {
  autoSaveDelay: number; // ms before auto-save (default 1500)
  enableFlowMode: boolean; // auto-advance to next item
  generateProfessionalDescriptions: boolean;
}

export function useAutoFillIntelligence(
  projectId?: string,
  config: Partial<AutoFillConfig> = {}
) {
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());

  const finalConfig: AutoFillConfig = {
    autoSaveDelay: config.autoSaveDelay ?? 1500,
    enableFlowMode: config.enableFlowMode ?? true,
    generateProfessionalDescriptions: config.generateProfessionalDescriptions ?? true,
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Generate professional EDL description
  const generateProfessionalDescription = useCallback((
    analysis: CaptureAnalysis,
    roomType?: string,
    elementType?: string
  ): string => {
    const parts: string[] = [];
    const state = analysis.general_state;
    
    // Room and element context
    if (roomType || analysis.room_type) {
      parts.push(roomType || analysis.room_type);
    }
    
    if (elementType || analysis.elements?.[0]?.name) {
      const element = elementType || analysis.elements[0]?.name;
      parts.push(`- ${element}`);
    }

    // State-based template
    const templates = EDL_TEMPLATES[state] || EDL_TEMPLATES.moyen;
    const baseDescription = templates[Math.floor(Math.random() * templates.length)];
    parts.push(': ' + baseDescription);

    // Add specific observations
    if (analysis.pathologies?.length > 0) {
      const anomalyDescriptions = analysis.pathologies.map(p => {
        return `${p.type} constaté(e) (${p.location})`;
      });
      parts.push(anomalyDescriptions.join('. ') + '.');
    }

    // Materials if relevant
    if (analysis.materials?.length > 0 && analysis.materials.length <= 3) {
      parts.push(`Matériaux : ${analysis.materials.join(', ')}.`);
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }, []);

  // Intelligent condition classification
  const classifyCondition = useCallback((analysis: CaptureAnalysis): 'bon' | 'moyen' | 'mauvais' => {
    // If any severe anomaly, it's mauvais
    if (analysis.pathologies?.some(p => p.severity === 'grave')) {
      return 'mauvais';
    }

    // If multiple anomalies or medium severity, it's mauvais
    if (analysis.pathologies?.length >= 2 || analysis.pathologies?.some(p => p.severity === 'moyenne')) {
      return 'mauvais';
    }

    // If single light anomaly, it's moyen
    if (analysis.pathologies?.length === 1) {
      return 'moyen';
    }

    // Check elements
    const hasBadElements = analysis.elements?.some(e => e.etat === 'mauvais' || e.etat === 'absent');
    const hasMediumElements = analysis.elements?.some(e => e.etat === 'moyen');

    if (hasBadElements) return 'mauvais';
    if (hasMediumElements) return 'moyen';

    return 'bon';
  }, []);

  // Enhanced task generation with DSC mapping
  const generateIntelligentTasks = useCallback((analysis: CaptureAnalysis): GeneratedTask[] => {
    const tasks: GeneratedTask[] = [];

    // Generate from pathologies
    if (analysis.pathologies) {
      for (const patho of analysis.pathologies) {
        const anomalyType = patho.type.toLowerCase();
        const ftMapping = Object.entries(ANOMALY_TO_FT).find(([key]) => 
          anomalyType.includes(key)
        )?.[1] || ANOMALY_TO_FT.default;

        tasks.push({
          title: `Traitement ${patho.type}`,
          description: `${patho.type} détecté(e) au niveau ${patho.location}. Intervention ${patho.severity === 'grave' ? 'urgente' : 'recommandée'}.`,
          ft_code: ftMapping.ft_code,
          ft_label: ftMapping.ft_label,
          priority: patho.severity === 'grave' ? 'high' : patho.severity === 'moyenne' ? 'medium' : 'low',
          estimated_cost: patho.severity === 'grave' ? '500-1500€' : patho.severity === 'moyenne' ? '200-500€' : '50-200€',
        });
      }
    }

    // Generate from elements in bad condition
    if (analysis.elements) {
      for (const element of analysis.elements) {
        if (element.etat === 'mauvais' || element.etat === 'absent') {
          const elementType = element.name.toLowerCase();
          const ftMapping = Object.entries(ANOMALY_TO_FT).find(([key]) =>
            elementType.includes(key)
          )?.[1] || { ft_code: element.ft_code || 'FT28', ft_label: element.ft_label || 'Travaux', category: 'Divers' };

          tasks.push({
            title: element.etat === 'absent'
              ? `Installation ${element.name}`
              : `Réparation/remplacement ${element.name}`,
            description: element.description || `${element.name} en état ${element.etat}. ${element.defauts?.join(', ') || ''}`,
            ft_code: ftMapping.ft_code,
            ft_label: ftMapping.ft_label,
            priority: element.etat === 'absent' ? 'high' : 'medium',
          });
        }
      }
    }

    return tasks;
  }, []);

  // Start auto-save countdown
  const startAutoSaveCountdown = useCallback((
    onAutoSave: () => Promise<void>,
    delay?: number
  ) => {
    const saveDelay = delay ?? finalConfig.autoSaveDelay;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveCountdown(saveDelay / 1000);

    // Countdown interval
    const countdownInterval = setInterval(() => {
      setAutoSaveCountdown(prev => {
        if (prev === null || prev <= 0.1) {
          clearInterval(countdownInterval);
          return null;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    // Auto-save timer
    autoSaveTimerRef.current = setTimeout(async () => {
      clearInterval(countdownInterval);
      setAutoSaveCountdown(null);
      setIsAutoSaving(true);
      await onAutoSave();
      setIsAutoSaving(false);
    }, saveDelay);

    return () => {
      clearTimeout(autoSaveTimerRef.current!);
      clearInterval(countdownInterval);
      setAutoSaveCountdown(null);
    };
  }, [finalConfig.autoSaveDelay]);

  // Cancel auto-save
  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setAutoSaveCountdown(null);
  }, []);

  // Track changed fields for highlighting
  const markFieldChanged = useCallback((fieldName: string) => {
    setChangedFields(prev => new Set([...prev, fieldName]));
  }, []);

  const clearChangedFields = useCallback(() => {
    setChangedFields(new Set());
  }, []);

  // Toggle task selection
  const toggleTaskSelection = useCallback((taskIndex: number) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskIndex)) {
        newSet.delete(taskIndex);
      } else {
        newSet.add(taskIndex);
      }
      return newSet;
    });
  }, []);

  // Initialize all tasks as selected
  const selectAllTasks = useCallback((count: number) => {
    setSelectedTasks(new Set(Array.from({ length: count }, (_, i) => i)));
  }, []);

  // Get anomaly icon
  const getAnomalyIcon = useCallback((anomalyType: string): string => {
    const type = anomalyType.toLowerCase();
    for (const [key, icon] of Object.entries(ANOMALY_ICONS)) {
      if (type.includes(key)) return icon;
    }
    return '⚠️';
  }, []);

  // Process and enhance analysis result
  const enhanceAnalysis = useCallback((analysis: CaptureAnalysis): CaptureAnalysis => {
    // Auto-classify condition
    const classifiedState = classifyCondition(analysis);
    
    // Generate professional description
    const description = generateProfessionalDescription({
      ...analysis,
      general_state: classifiedState,
    });

    // Generate intelligent tasks
    const tasks = generateIntelligentTasks({
      ...analysis,
      general_state: classifiedState,
    });

    // Mark all fields as changed for highlighting
    setChangedFields(new Set(['room_type', 'general_state', 'description', 'elements', 'pathologies', 'tasks']));
    
    // Select all tasks by default
    selectAllTasks(tasks.length);

    return {
      ...analysis,
      general_state: classifiedState,
      generated_description: description,
      generated_tasks: tasks,
    };
  }, [classifyCondition, generateProfessionalDescription, generateIntelligentTasks, selectAllTasks]);

  return {
    // Auto-save
    isAutoSaving,
    autoSaveCountdown,
    startAutoSaveCountdown,
    cancelAutoSave,
    
    // Field tracking
    changedFields,
    markFieldChanged,
    clearChangedFields,
    
    // Task selection
    selectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    
    // Analysis enhancement
    enhanceAnalysis,
    generateProfessionalDescription,
    classifyCondition,
    generateIntelligentTasks,
    
    // Utilities
    getAnomalyIcon,
    config: finalConfig,
  };
}
