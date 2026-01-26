import type { EDLType, CaptureMode } from './CaptureWizard';

/**
 * SmartDefaults - Intelligent default values for capture workflow
 * 
 * Principle: Never block on a missing field if a safe default exists
 */

export const SMART_DEFAULTS = {
  // Default EDL type when user is vague
  edlType: 'avant_travaux' as EDLType,
  
  // Default capture mode (video is fastest for field use)
  captureMode: 'video_walkthrough' as CaptureMode,
  
  // Default piece name until AI detects better
  pieceName: 'Pièce principale',
  
  // Default zone when unspecified
  defaultZone: 'autre',
  
  // Default priority for extracted tasks
  priority: 'normale' as const,
  
  // Minimum recording time before allowing stop (seconds)
  minRecordingTime: 3,
  
  // Auto-advance delay after piece completion (ms)
  autoAdvanceDelay: 1500,
};

/**
 * Apply smart defaults to incomplete capture data
 */
export function applySmartDefaults<T extends Record<string, any>>(
  data: T,
  defaults: Partial<T>
): T {
  const result = { ...data };
  
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (result[key] === null || result[key] === undefined || result[key] === '') {
      (result as any)[key] = defaultValue;
    }
  }
  
  return result;
}

/**
 * Determine EDL type from context clues
 */
export function inferEdlType(
  projectNotes?: string,
  existingEdlType?: EDLType | null
): EDLType {
  if (existingEdlType) return existingEdlType;
  
  if (projectNotes) {
    const lower = projectNotes.toLowerCase();
    
    if (lower.includes('après') || lower.includes('réception') || lower.includes('fin')) {
      return 'apres_travaux';
    }
    if (lower.includes('entrée') || lower.includes('arrivée') || lower.includes('locataire')) {
      return 'location_entree';
    }
    if (lower.includes('sortie') || lower.includes('départ')) {
      return 'location_sortie';
    }
  }
  
  return SMART_DEFAULTS.edlType;
}

/**
 * Determine capture mode from device/context
 */
export function inferCaptureMode(
  userPreference?: CaptureMode | null,
  isMobile: boolean = true
): CaptureMode {
  if (userPreference) return userPreference;
  
  // Video is default for mobile (faster workflow)
  return isMobile ? 'video_walkthrough' : SMART_DEFAULTS.captureMode;
}

/**
 * Get contextual hint based on current state
 */
export function getContextualHint(state: {
  isRecording: boolean;
  recordingTime: number;
  currentZone?: string;
  completedZones: number;
  totalZones: number;
}): string {
  const { isRecording, recordingTime, currentZone, completedZones, totalZones } = state;
  
  // Not started yet
  if (!isRecording && recordingTime === 0) {
    return "Filme en marchant et décris ce que tu vois.";
  }
  
  // Just started
  if (isRecording && recordingTime < 5) {
    return "Commence par te situer : 'Je suis dans la cuisine...'";
  }
  
  // Recording in progress
  if (isRecording) {
    if (completedZones === 0) {
      return "Pense à vérifier le plafond avant de quitter.";
    }
    if (completedZones < totalZones - 1) {
      return `${totalZones - completedZones} zones restantes.`;
    }
    return "Dis 'Suivant' pour passer à la prochaine pièce.";
  }
  
  // After recording
  if (completedZones === totalZones) {
    return "Parfait ! Toutes les zones sont vérifiées.";
  }
  
  return "Appuie pour continuer.";
}
