import { useState, useCallback, useMemo, useEffect } from 'react';
import type { StorylineRoom } from './useEDLProgress';
import type { ChecklistItem } from './useRoomChecklist';

export type FilterType = 
  | 'all'
  | 'anomalies'
  | 'moyen'
  | 'mauvais'
  | 'missing_photos'
  | 'not_filled'
  | 'not_started'
  | 'tasks_generated'
  | 'completed';

export interface FilterConfig {
  id: FilterType;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}

export const FILTER_CONFIGS: FilterConfig[] = [
  { id: 'all', label: 'Tous', icon: 'LayoutGrid', color: 'bg-muted text-muted-foreground', activeColor: 'bg-primary text-primary-foreground' },
  { id: 'anomalies', label: 'Anomalies', icon: 'AlertTriangle', color: 'bg-red-500/10 text-red-500', activeColor: 'bg-red-500 text-white' },
  { id: 'moyen', label: 'Moyen état', icon: 'AlertCircle', color: 'bg-amber-500/10 text-amber-500', activeColor: 'bg-amber-500 text-white' },
  { id: 'mauvais', label: 'Mauvais état', icon: 'XCircle', color: 'bg-red-500/10 text-red-500', activeColor: 'bg-red-500 text-white' },
  { id: 'missing_photos', label: 'Photos manquantes', icon: 'Camera', color: 'bg-purple-500/10 text-purple-500', activeColor: 'bg-purple-500 text-white' },
  { id: 'not_filled', label: 'Non remplis', icon: 'CircleDashed', color: 'bg-slate-500/10 text-slate-500', activeColor: 'bg-slate-500 text-white' },
  { id: 'not_started', label: 'Non commencés', icon: 'Square', color: 'bg-slate-500/10 text-slate-500', activeColor: 'bg-slate-500 text-white' },
  { id: 'tasks_generated', label: 'Tâches générées', icon: 'Wrench', color: 'bg-blue-500/10 text-blue-500', activeColor: 'bg-blue-500 text-white' },
  { id: 'completed', label: 'Complétés', icon: 'CheckCircle2', color: 'bg-green-500/10 text-green-500', activeColor: 'bg-green-500 text-white' },
];

interface UseMagicFiltersOptions {
  autoHighlight?: boolean;
}

export function useMagicFilters(options: UseMagicFiltersOptions = {}) {
  const { autoHighlight = true } = options;
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set(['all']));

  const toggleFilter = useCallback((filterId: FilterType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      
      if (filterId === 'all') {
        // Selecting "all" clears other filters
        return new Set(['all']);
      }
      
      // Remove "all" when selecting specific filter
      next.delete('all');
      
      if (next.has(filterId)) {
        next.delete(filterId);
        // If no filters left, reset to "all"
        if (next.size === 0) {
          return new Set(['all']);
        }
      } else {
        next.add(filterId);
      }
      
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(new Set(['all']));
  }, []);

  // Auto-highlight based on data context
  const autoHighlightFilters = useCallback((
    hasAnomalies: boolean,
    hasMissingItems: boolean,
    isComplete: boolean
  ) => {
    if (!autoHighlight) return;
    
    if (hasAnomalies) {
      setActiveFilters(new Set(['anomalies']));
    } else if (hasMissingItems) {
      setActiveFilters(new Set(['not_filled']));
    } else if (isComplete) {
      setActiveFilters(new Set(['completed']));
    }
  }, [autoHighlight]);

  // Filter rooms for Storyline
  const filterRooms = useCallback((rooms: StorylineRoom[]): StorylineRoom[] => {
    if (activeFilters.has('all')) return rooms;
    
    return rooms.filter(room => {
      const checks: boolean[] = [];
      
      if (activeFilters.has('anomalies')) {
        checks.push(room.hasAnomaly);
      }
      if (activeFilters.has('moyen')) {
        checks.push(room.elements.some(e => e.status === 'done' && !room.hasAnomaly));
      }
      if (activeFilters.has('mauvais')) {
        checks.push(room.hasAnomaly);
      }
      if (activeFilters.has('missing_photos')) {
        checks.push(room.elements.some(e => e.photoCount === 0 && e.status !== 'pending'));
      }
      if (activeFilters.has('not_filled')) {
        checks.push(room.elements.some(e => e.status === 'pending'));
      }
      if (activeFilters.has('not_started')) {
        checks.push(room.status === 'not_started');
      }
      if (activeFilters.has('tasks_generated')) {
        checks.push(room.elements.some(e => e.anomalyCount > 0));
      }
      if (activeFilters.has('completed')) {
        checks.push(room.status === 'completed');
      }
      
      return checks.length === 0 || checks.some(c => c);
    });
  }, [activeFilters]);

  // Filter checklist items for Room Checklist
  const filterChecklistItems = useCallback((items: ChecklistItem[]): ChecklistItem[] => {
    if (activeFilters.has('all')) return items;
    
    return items.filter(item => {
      const checks: boolean[] = [];
      
      if (activeFilters.has('anomalies')) {
        checks.push(item.hasAnomaly);
      }
      if (activeFilters.has('moyen')) {
        checks.push(item.status === 'moyen');
      }
      if (activeFilters.has('mauvais')) {
        checks.push(item.status === 'mauvais');
      }
      if (activeFilters.has('missing_photos')) {
        checks.push(item.photoCount === 0 && item.status !== 'pending');
      }
      if (activeFilters.has('not_filled')) {
        checks.push(item.status === 'pending');
      }
      if (activeFilters.has('tasks_generated')) {
        checks.push(item.tasks.length > 0);
      }
      if (activeFilters.has('completed')) {
        checks.push(item.status !== 'pending' && item.photoCount > 0);
      }
      
      return checks.length === 0 || checks.some(c => c);
    });
  }, [activeFilters]);

  // Get count for each filter type
  const getFilterCounts = useCallback((
    rooms?: StorylineRoom[],
    checklistItems?: ChecklistItem[]
  ): Record<FilterType, number> => {
    const counts: Record<FilterType, number> = {
      all: rooms?.length || checklistItems?.length || 0,
      anomalies: 0,
      moyen: 0,
      mauvais: 0,
      missing_photos: 0,
      not_filled: 0,
      not_started: 0,
      tasks_generated: 0,
      completed: 0,
    };

    if (rooms) {
      rooms.forEach(room => {
        if (room.hasAnomaly) counts.anomalies++;
        if (room.status === 'not_started') counts.not_started++;
        if (room.status === 'completed') counts.completed++;
        if (room.elements.some(e => e.status === 'pending')) counts.not_filled++;
        if (room.elements.some(e => e.photoCount === 0 && e.status !== 'pending')) counts.missing_photos++;
        if (room.elements.some(e => e.anomalyCount > 0)) counts.tasks_generated++;
      });
    }

    if (checklistItems) {
      checklistItems.forEach(item => {
        if (item.hasAnomaly) counts.anomalies++;
        if (item.status === 'moyen') counts.moyen++;
        if (item.status === 'mauvais') counts.mauvais++;
        if (item.status === 'pending') counts.not_filled++;
        if (item.photoCount === 0 && item.status !== 'pending') counts.missing_photos++;
        if (item.tasks.length > 0) counts.tasks_generated++;
        if (item.status !== 'pending' && item.photoCount > 0) counts.completed++;
      });
    }

    return counts;
  }, []);

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    autoHighlightFilters,
    filterRooms,
    filterChecklistItems,
    getFilterCounts,
    isFilterActive: (id: FilterType) => activeFilters.has(id),
  };
}
