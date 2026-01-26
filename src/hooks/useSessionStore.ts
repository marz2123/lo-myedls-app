// Cross-Module AI Memory / Session Store
// Enables coherent suggestions across MyAladin, Guided, Ultra-Guided, Bureau, Client modes

import { useState, useCallback, useEffect } from 'react';

interface SessionStore {
  // Project context
  projectId: string | null;
  projectName: string | null;
  projectType: string | null;
  
  // Current location context
  currentPartie: string | null;
  currentLieu: string | null;
  currentEndroit: string | null;
  currentZone: string | null;
  
  // Capture context
  lastCapturedZone: string | null;
  capturedZones: string[];
  missingZones: string[];
  
  // AI detected context
  risksDetected: string[];
  budgetCriticalItems: string[];
  detectedPieces: string[];
  
  // User intent
  lastUserIntent: string | null;
  preferredMode: 'guided' | 'ultra-guided' | 'myaladin' | 'libre' | null;
  
  // Workflow state
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  
  // Session metadata
  sessionStartTime: number;
  lastActivityTime: number;
  
  // Global orchestrator context (MyAladin Global Engine)
  currentModule: string | null;
  lastScreen: string | null;
  pendingTasks: number;
  pendingCritical: number;
  timelineContext: {
    tasksLate: number;
    blockers: string[];
    nextMilestones: string[];
  };
  budgetContext: {
    pendingPurchases: number;
    urgentItems: string[];
    norms: string[];
  };
  lastSuggestion: string | null;
  lastRefusal: string | null;
}

const STORAGE_KEY = 'myedls_session_store';
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours

const createEmptySession = (): SessionStore => ({
  projectId: null,
  projectName: null,
  projectType: null,
  currentPartie: null,
  currentLieu: null,
  currentEndroit: null,
  currentZone: null,
  lastCapturedZone: null,
  capturedZones: [],
  missingZones: [],
  risksDetected: [],
  budgetCriticalItems: [],
  detectedPieces: [],
  lastUserIntent: null,
  preferredMode: null,
  currentStep: 0,
  totalSteps: 0,
  completedSteps: [],
  sessionStartTime: Date.now(),
  lastActivityTime: Date.now(),
  // Global orchestrator context
  currentModule: null,
  lastScreen: null,
  pendingTasks: 0,
  pendingCritical: 0,
  timelineContext: {
    tasksLate: 0,
    blockers: [],
    nextMilestones: [],
  },
  budgetContext: {
    pendingPurchases: 0,
    urgentItems: [],
    norms: [],
  },
  lastSuggestion: null,
  lastRefusal: null,
});

export const useSessionStore = () => {
  const [session, setSession] = useState<SessionStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if session is still valid
        if (Date.now() - parsed.lastActivityTime < SESSION_TTL) {
          return { ...createEmptySession(), ...parsed };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return createEmptySession();
  });

  // Persist to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  // Update session with new data
  const updateSession = useCallback((updates: Partial<SessionStore>) => {
    setSession(prev => ({
      ...prev,
      ...updates,
      lastActivityTime: Date.now(),
    }));
  }, []);

  // Set project context
  const setProject = useCallback((projectId: string, projectName: string, projectType?: string) => {
    updateSession({
      projectId,
      projectName,
      projectType: projectType || null,
      // Reset location on project change
      currentPartie: null,
      currentLieu: null,
      currentEndroit: null,
      currentZone: null,
      capturedZones: [],
    });
  }, [updateSession]);

  // Set current location
  const setLocation = useCallback((location: {
    partie?: string;
    lieu?: string;
    endroit?: string;
    zone?: string;
  }) => {
    updateSession({
      currentPartie: location.partie || session.currentPartie,
      currentLieu: location.lieu || session.currentLieu,
      currentEndroit: location.endroit || session.currentEndroit,
      currentZone: location.zone || session.currentZone,
    });
  }, [updateSession, session]);

  // Mark zone as captured
  const markZoneCaptured = useCallback((zone: string) => {
    updateSession({
      lastCapturedZone: zone,
      capturedZones: [...new Set([...session.capturedZones, zone])],
      missingZones: session.missingZones.filter(z => z !== zone),
    });
  }, [updateSession, session]);

  // Add detected piece from NLP
  const addDetectedPiece = useCallback((piece: string) => {
    if (!session.detectedPieces.includes(piece)) {
      updateSession({
        detectedPieces: [...session.detectedPieces, piece],
      });
    }
  }, [updateSession, session]);

  // Add risk
  const addRisk = useCallback((risk: string) => {
    if (!session.risksDetected.includes(risk)) {
      updateSession({
        risksDetected: [...session.risksDetected, risk],
      });
    }
  }, [updateSession, session]);

  // Set missing zones (from AI analysis)
  const setMissingZones = useCallback((zones: string[]) => {
    updateSession({ missingZones: zones });
  }, [updateSession]);

  // Set user intent
  const setUserIntent = useCallback((intent: string) => {
    updateSession({ lastUserIntent: intent });
  }, [updateSession]);

  // Set preferred mode
  const setPreferredMode = useCallback((mode: SessionStore['preferredMode']) => {
    updateSession({ preferredMode: mode });
  }, [updateSession]);

  // Update workflow progress
  const setWorkflowProgress = useCallback((current: number, total: number, completed?: string[]) => {
    updateSession({
      currentStep: current,
      totalSteps: total,
      completedSteps: completed || session.completedSteps,
    });
  }, [updateSession, session]);

  // Get next suggested zone based on context
  const getNextSuggestedZone = useCallback((): string | null => {
    // Standard zone order
    const standardOrder = ['mur', 'sol', 'plafond', 'menuiseries', 'équipements', 'sanitaires', 'électricité'];
    
    for (const zone of standardOrder) {
      if (!session.capturedZones.includes(zone)) {
        return zone;
      }
    }
    
    // Check missing zones
    if (session.missingZones.length > 0) {
      return session.missingZones[0];
    }
    
    return null;
  }, [session]);

  // Get context for AI prompts
  const getAIContext = useCallback(() => ({
    projectName: session.projectName,
    projectType: session.projectType,
    currentLocation: {
      partie: session.currentPartie,
      lieu: session.currentLieu,
      endroit: session.currentEndroit,
      zone: session.currentZone,
    },
    capturedZones: session.capturedZones,
    missingZones: session.missingZones,
    risksDetected: session.risksDetected,
    detectedPieces: session.detectedPieces,
    lastUserIntent: session.lastUserIntent,
    workflowProgress: {
      current: session.currentStep,
      total: session.totalSteps,
    },
  }), [session]);

  // Clear session
  const clearSession = useCallback(() => {
    setSession(createEmptySession());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Check if session is for a specific project
  const isProjectSession = useCallback((projectId: string) => {
    return session.projectId === projectId;
  }, [session.projectId]);

  return {
    session,
    updateSession,
    setProject,
    setLocation,
    markZoneCaptured,
    addDetectedPiece,
    addRisk,
    setMissingZones,
    setUserIntent,
    setPreferredMode,
    setWorkflowProgress,
    getNextSuggestedZone,
    getAIContext,
    clearSession,
    isProjectSession,
  };
};

export type { SessionStore };
export default useSessionStore;
