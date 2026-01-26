import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ========================
// SUPER CONDUCTEUR TYPES
// ========================

export interface SuperConducteurState {
  // Current context
  piece: string | null;
  subZone: string | null;
  projectId: string | null;
  edlType: string | null;
  captureMode: string | null;
  
  // Detection states
  missingItems: string[];
  risksDetected: RiskItem[];
  budgetCritical: string[];
  confirmationsPending: ConfirmationItem[];
  
  // Session tracking
  capturedZones: CapturedZone[];
  lastActivity: Date;
  idleSeconds: number;
  isActive: boolean;
}

export interface RiskItem {
  type: 'structural' | 'humidity' | 'electrical' | 'safety' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  zone: string;
  detected_at: Date;
}

export interface ConfirmationItem {
  id: string;
  type: 'missing_zone' | 'risk' | 'budget' | 'inconsistency';
  message: string;
  action: 'capture' | 'confirm' | 'skip';
}

export interface CapturedZone {
  piece: string;
  subZone: string;
  timestamp: Date;
  hasMedia: boolean;
  hasTranscription: boolean;
}

export interface SuperConducteurSuggestion {
  text: string;
  voiceText: string;
  type: 'guidance' | 'warning' | 'next_action' | 'missing' | 'risk' | 'budget';
  priority: 'low' | 'normal' | 'high' | 'critical';
  actionOptions?: { label: string; action: string }[];
}

// ========================
// SUPER CONDUCTEUR HOOK
// ========================

export const useSuperConducteur = (projectId?: string) => {
  const [state, setState] = useState<SuperConducteurState>({
    piece: null,
    subZone: null,
    projectId: projectId || null,
    edlType: null,
    captureMode: null,
    missingItems: [],
    risksDetected: [],
    budgetCritical: [],
    confirmationsPending: [],
    capturedZones: [],
    lastActivity: new Date(),
    idleSeconds: 0,
    isActive: false,
  });

  const [currentSuggestion, setCurrentSuggestion] = useState<SuperConducteurSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisQueueRef = useRef<any[]>([]);

  // ========================
  // IDLE DETECTION
  // ========================
  
  useEffect(() => {
    if (!state.isActive) return;

    idleTimerRef.current = setInterval(() => {
      const now = new Date();
      const idleTime = Math.floor((now.getTime() - state.lastActivity.getTime()) / 1000);
      
      setState(prev => ({ ...prev, idleSeconds: idleTime }));

      // Trigger suggestion after 5 seconds idle
      if (idleTime >= 5 && idleTime < 7) {
        generateIdleSuggestion();
      }
    }, 1000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [state.isActive, state.lastActivity]);

  // ========================
  // ACTIVITY TRACKING
  // ========================

  const recordActivity = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastActivity: new Date(),
      idleSeconds: 0
    }));
  }, []);

  const activate = useCallback((projectId?: string, edlType?: string, captureMode?: string) => {
    setState(prev => ({
      ...prev,
      projectId: projectId || prev.projectId,
      edlType: edlType || prev.edlType,
      captureMode: captureMode || prev.captureMode,
      isActive: true,
      lastActivity: new Date()
    }));
  }, []);

  const deactivate = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
    setCurrentSuggestion(null);
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
  }, []);

  // ========================
  // ZONE MANAGEMENT
  // ========================

  const setCurrentZone = useCallback((piece: string, subZone?: string) => {
    setState(prev => ({
      ...prev,
      piece,
      subZone: subZone || null,
      lastActivity: new Date()
    }));
  }, []);

  const markZoneCaptured = useCallback((piece: string, subZone: string, hasMedia: boolean, hasTranscription: boolean) => {
    const capturedZone: CapturedZone = {
      piece,
      subZone,
      timestamp: new Date(),
      hasMedia,
      hasTranscription
    };

    setState(prev => ({
      ...prev,
      capturedZones: [...prev.capturedZones, capturedZone],
      lastActivity: new Date()
    }));

    // Remove from missing items if present
    const missingKey = `${piece}/${subZone}`;
    setState(prev => ({
      ...prev,
      missingItems: prev.missingItems.filter(item => item !== missingKey)
    }));
  }, []);

  // ========================
  // PREDICTIVE GUIDANCE
  // ========================

  const generateIdleSuggestion = useCallback(async () => {
    const { piece, subZone, capturedZones, missingItems } = state;

    // Check for missing sub-zones in current piece
    const subZones = ['mur', 'sol', 'plafond', 'ouvertures', 'equipements'];
    const capturedInPiece = capturedZones
      .filter(z => z.piece === piece)
      .map(z => z.subZone);

    const missingInPiece = subZones.filter(z => !capturedInPiece.includes(z));

    if (missingInPiece.length > 0) {
      const nextZone = missingInPiece[0];
      setCurrentSuggestion({
        text: `Tu n'as pas encore filmé le ${nextZone}.`,
        voiceText: `Tu n'as pas encore filmé le ${nextZone}.`,
        type: 'missing',
        priority: 'normal'
      });
      return;
    }

    // Suggest moving to next piece
    setCurrentSuggestion({
      text: 'Tu peux passer à la pièce suivante.',
      voiceText: 'Tu peux passer à la pièce suivante.',
      type: 'next_action',
      priority: 'low'
    });
  }, [state]);

  // ========================
  // VISION ANALYSIS
  // ========================

  const analyzeFrame = useCallback(async (imageBase64: string, context?: { piece?: string; subZone?: string }) => {
    setIsAnalyzing(true);
    recordActivity();

    try {
      const { data, error } = await supabase.functions.invoke('analyze-video-frame', {
        body: {
          imageBase64,
          timestamp: Date.now() / 1000,
          mode: 'super-conducteur',
          context: {
            ...context,
            piece: context?.piece || state.piece,
            subZone: context?.subZone || state.subZone,
            capturedZones: state.capturedZones,
            missingItems: state.missingItems
          }
        }
      });

      if (error) throw error;

      // Process vision results
      if (data) {
        processVisionResult(data);
      }

      return data;
    } catch (error) {
      console.error('Super Conducteur vision analysis error:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [state, recordActivity]);

  const processVisionResult = useCallback((result: any) => {
    const { detectedZone, elements, confidence, risks, budgetImpact, suggestion } = result;

    // Update detected zone if confident
    if (detectedZone && confidence > 0.7) {
      if (state.piece) {
        markZoneCaptured(state.piece, detectedZone, true, false);
      }
    }

    // Process detected risks
    if (risks && risks.length > 0) {
      const newRisks: RiskItem[] = risks.map((risk: any) => ({
        type: risk.type || 'other',
        description: risk.description,
        severity: risk.severity || 'medium',
        zone: `${state.piece}/${state.subZone}`,
        detected_at: new Date()
      }));

      setState(prev => ({
        ...prev,
        risksDetected: [...prev.risksDetected, ...newRisks]
      }));

      // Generate risk warning
      if (newRisks.some(r => r.severity === 'high' || r.severity === 'critical')) {
        const criticalRisk = newRisks.find(r => r.severity === 'critical' || r.severity === 'high');
        setCurrentSuggestion({
          text: `${criticalRisk?.description}. Veux-tu l'enregistrer comme observation critique ?`,
          voiceText: `${criticalRisk?.description}. Veux-tu l'enregistrer comme observation critique ?`,
          type: 'risk',
          priority: 'high',
          actionOptions: [
            { label: 'Oui', action: 'confirm_risk' },
            { label: 'Non', action: 'skip' }
          ]
        });
      }
    }

    // Process budget impact
    if (budgetImpact && budgetImpact.isSignificant) {
      setState(prev => ({
        ...prev,
        budgetCritical: [...prev.budgetCritical, budgetImpact.description]
      }));

      setCurrentSuggestion({
        text: `Cette tâche peut avoir un coût élevé. Veux-tu l'isoler dans Budget critique ?`,
        voiceText: `Cette tâche peut avoir un coût élevé. Veux-tu l'isoler en Budget critique ?`,
        type: 'budget',
        priority: 'normal',
        actionOptions: [
          { label: 'Oui', action: 'mark_budget' },
          { label: 'Non', action: 'skip' }
        ]
      });
    }

    // Display AI suggestion
    if (suggestion && !result.risks?.length && !budgetImpact?.isSignificant) {
      setCurrentSuggestion({
        text: suggestion,
        voiceText: suggestion,
        type: 'guidance',
        priority: 'low'
      });
    }
  }, [state, markZoneCaptured]);

  // ========================
  // TRANSCRIPT ANALYSIS
  // ========================

  const analyzeTranscript = useCallback(async (transcript: string) => {
    recordActivity();

    // Keywords that trigger investigation
    const riskKeywords = ['fuite', 'humidité', 'humide', 'mouillé', 'fissure', 'fissuré', 'cassé', 'bruit', 'odeur', 'moisissure'];
    const structuralKeywords = ['affaissement', 'mouvement', 'déformation', 'fissure verticale', 'fissure oblique'];
    const electricalKeywords = ['électrique', 'tableau', 'disjoncteur', 'prise', 'câble', 'obsolète'];
    const budgetKeywords = ['gros œuvre', 'structure', 'dalle', 'charpente', 'toiture', 'mise aux normes'];

    const lowerTranscript = transcript.toLowerCase();

    // Detect risks from keywords
    const detectedRisks: RiskItem[] = [];

    if (riskKeywords.some(kw => lowerTranscript.includes(kw))) {
      detectedRisks.push({
        type: 'humidity',
        description: 'Problème d\'humidité ou infiltration détecté',
        severity: 'medium',
        zone: `${state.piece}/${state.subZone}`,
        detected_at: new Date()
      });
    }

    if (structuralKeywords.some(kw => lowerTranscript.includes(kw))) {
      detectedRisks.push({
        type: 'structural',
        description: 'Possible mouvement structurel détecté',
        severity: 'high',
        zone: `${state.piece}/${state.subZone}`,
        detected_at: new Date()
      });

      setCurrentSuggestion({
        text: 'Fissure verticale détectée. Possible mouvement structurel.',
        voiceText: 'Fissure verticale détectée. Possible mouvement structurel.',
        type: 'risk',
        priority: 'critical'
      });
    }

    if (electricalKeywords.some(kw => lowerTranscript.includes(kw))) {
      if (lowerTranscript.includes('obsolète') || lowerTranscript.includes('ancien') || lowerTranscript.includes('vétuste')) {
        detectedRisks.push({
          type: 'electrical',
          description: 'Appareil électrique obsolète détecté',
          severity: 'medium',
          zone: `${state.piece}/${state.subZone}`,
          detected_at: new Date()
        });
      }
    }

    // Detect budget impact
    if (budgetKeywords.some(kw => lowerTranscript.includes(kw))) {
      setState(prev => ({
        ...prev,
        budgetCritical: [...prev.budgetCritical, transcript]
      }));

      setCurrentSuggestion({
        text: 'Cette tâche peut avoir un coût élevé. Veux-tu l\'isoler en Budget critique ?',
        voiceText: 'Cette tâche peut avoir un coût élevé. Veux-tu l\'isoler en Budget critique ?',
        type: 'budget',
        priority: 'normal'
      });
    }

    if (detectedRisks.length > 0) {
      setState(prev => ({
        ...prev,
        risksDetected: [...prev.risksDetected, ...detectedRisks]
      }));
    }

    return detectedRisks;
  }, [state, recordActivity]);

  // ========================
  // MISSING ZONE DETECTION
  // ========================

  const checkMissingZones = useCallback((piece: string): string[] => {
    const requiredZones = ['mur', 'sol', 'plafond', 'ouvertures'];
    const capturedInPiece = state.capturedZones
      .filter(z => z.piece === piece)
      .map(z => z.subZone);

    return requiredZones.filter(z => !capturedInPiece.includes(z));
  }, [state.capturedZones]);

  const onFinishPiece = useCallback((piece: string) => {
    const missing = checkMissingZones(piece);

    if (missing.length > 0) {
      const missingText = missing.join(', ');
      
      const confirmation: ConfirmationItem = {
        id: `missing-${piece}-${Date.now()}`,
        type: 'missing_zone',
        message: `Il manque ${missingText}. Veux-tu le filmer rapidement ?`,
        action: 'capture'
      };

      setState(prev => ({
        ...prev,
        confirmationsPending: [...prev.confirmationsPending, confirmation],
        missingItems: [...prev.missingItems, ...missing.map(z => `${piece}/${z}`)]
      }));

      setCurrentSuggestion({
        text: `Il manque le ${missing[0]}. Veux-tu le filmer rapidement ?`,
        voiceText: `Il manque le ${missing[0]}. Veux-tu le filmer rapidement ?`,
        type: 'missing',
        priority: 'high',
        actionOptions: [
          { label: 'Oui', action: 'capture' },
          { label: 'Non applicable', action: 'skip' }
        ]
      });

      return false;
    }

    setCurrentSuggestion({
      text: 'C\'est bon pour cette pièce. On passe à la suivante ?',
      voiceText: 'C\'est bon pour cette pièce. On passe à la suivante ?',
      type: 'next_action',
      priority: 'normal'
    });

    return true;
  }, [checkMissingZones]);

  // ========================
  // DATA CONSISTENCY CHECK
  // ========================

  const checkDataConsistency = useCallback(async (): Promise<{ valid: boolean; issues: string[] }> => {
    const issues: string[] = [];

    // Check all pieces are documented
    const piecesCaptured = [...new Set(state.capturedZones.map(z => z.piece))];
    
    if (piecesCaptured.length === 0) {
      issues.push('Aucune pièce documentée');
    }

    // Check for contradictions in risks
    const humidityMentions = state.risksDetected.filter(r => r.type === 'humidity');
    if (humidityMentions.length > 0) {
      // Check if there are conflicting statements
      const zones = humidityMentions.map(r => r.zone);
      if (zones.length !== new Set(zones).size) {
        issues.push('Informations contradictoires sur l\'humidité');
      }
    }

    // Check missing critical zones
    for (const piece of piecesCaptured) {
      const missing = checkMissingZones(piece);
      if (missing.length > 0) {
        issues.push(`${piece}: zones manquantes (${missing.join(', ')})`);
      }
    }

    if (issues.length > 0) {
      setCurrentSuggestion({
        text: `${issues.length} point(s) à vérifier avant génération.`,
        voiceText: `${issues.length} points à vérifier avant génération.`,
        type: 'warning',
        priority: 'high'
      });
    }

    return { valid: issues.length === 0, issues };
  }, [state, checkMissingZones]);

  // ========================
  // SUGGESTION HANDLING
  // ========================

  const dismissSuggestion = useCallback(() => {
    setCurrentSuggestion(null);
    recordActivity();
  }, [recordActivity]);

  const handleSuggestionAction = useCallback((action: string) => {
    recordActivity();

    switch (action) {
      case 'skip':
        dismissSuggestion();
        break;
      case 'capture':
        // Signal to parent to return to capture mode
        break;
      case 'confirm_risk':
        // Mark last risk as confirmed
        toast.success('Observation critique enregistrée');
        dismissSuggestion();
        break;
      case 'mark_budget':
        toast.success('Ajouté au Budget critique');
        dismissSuggestion();
        break;
    }

    return action;
  }, [recordActivity, dismissSuggestion]);

  // ========================
  // VOICE COMMANDS
  // ========================

  const processVoiceCommand = useCallback((command: string): { recognized: boolean; action?: string; note?: string } => {
    const lowerCommand = command.toLowerCase().trim();
    recordActivity();

    if (lowerCommand.includes('suivant') || lowerCommand.includes('suivante')) {
      return { recognized: true, action: 'next_piece' };
    }

    if (lowerCommand.includes('retour') || lowerCommand.includes('précédent')) {
      return { recognized: true, action: 'previous' };
    }

    if (lowerCommand.includes('fini') || lowerCommand.includes('terminé')) {
      if (state.piece) {
        onFinishPiece(state.piece);
      }
      return { recognized: true, action: 'finish_piece' };
    }

    if (lowerCommand.includes('refais') || lowerCommand.includes('reprend')) {
      return { recognized: true, action: 'retake' };
    }

    if (lowerCommand.startsWith('note') || lowerCommand.startsWith('observation')) {
      const note = lowerCommand.replace(/^(note|observation)\s*:?\s*/i, '');
      return { recognized: true, action: 'add_note', note };
    }

    return { recognized: false };
  }, [state.piece, recordActivity, onFinishPiece]);

  // ========================
  // RESET
  // ========================

  const reset = useCallback(() => {
    setState({
      piece: null,
      subZone: null,
      projectId: null,
      edlType: null,
      captureMode: null,
      missingItems: [],
      risksDetected: [],
      budgetCritical: [],
      confirmationsPending: [],
      capturedZones: [],
      lastActivity: new Date(),
      idleSeconds: 0,
      isActive: false,
    });
    setCurrentSuggestion(null);
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
  }, []);

  return {
    state,
    currentSuggestion,
    isAnalyzing,
    
    // Activation
    activate,
    deactivate,
    reset,
    
    // Zone management
    setCurrentZone,
    markZoneCaptured,
    checkMissingZones,
    onFinishPiece,
    
    // Analysis
    analyzeFrame,
    analyzeTranscript,
    checkDataConsistency,
    
    // Suggestions
    dismissSuggestion,
    handleSuggestionAction,
    
    // Voice
    processVoiceCommand,
    
    // Activity
    recordActivity
  };
};
