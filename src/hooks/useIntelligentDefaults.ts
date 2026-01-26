// Intelligent Defaults Hook
// Provides smart defaults and automatic piece detection from NLP

import { useCallback, useMemo } from 'react';
import { useSessionStore } from './useSessionStore';

// French room/piece patterns for NLP detection
const PIECE_PATTERNS: Array<{ pattern: RegExp; name: string; type: 'commune' | 'privative' }> = [
  // Common areas (parties communes)
  { pattern: /\b(hall|entrée|accueil)\b/i, name: 'Hall d\'entrée', type: 'commune' },
  { pattern: /\b(cage\s*(d[''])?escalier|escalier)\b/i, name: 'Cage d\'escalier', type: 'commune' },
  { pattern: /\b(couloir|circulation|dégagement)\b/i, name: 'Couloir', type: 'commune' },
  { pattern: /\b(palier)\b/i, name: 'Palier', type: 'commune' },
  { pattern: /\b(cave|sous[-\s]?sol)\b/i, name: 'Cave', type: 'commune' },
  { pattern: /\b(parking|stationnement)\b/i, name: 'Parking', type: 'commune' },
  { pattern: /\b(local\s*(technique|poubelle|vélo))\b/i, name: 'Local technique', type: 'commune' },
  { pattern: /\b(toiture|toit)\b/i, name: 'Toiture', type: 'commune' },
  { pattern: /\b(façade)\s*(rue|cour|principale|arrière)?\b/i, name: 'Façade', type: 'commune' },
  { pattern: /\b(jardin|espace\s*vert)\b/i, name: 'Jardin', type: 'commune' },
  
  // Private areas (parties privatives)
  { pattern: /\b(salon|séjour|living)\b/i, name: 'Séjour', type: 'privative' },
  { pattern: /\b(cuisine)\b/i, name: 'Cuisine', type: 'privative' },
  { pattern: /\b(chambre)\s*(\d+|principale|parentale|enfant)?\b/i, name: 'Chambre', type: 'privative' },
  { pattern: /\b(salle\s*(de\s*)?(bain|eau|douche)|sdb)\b/i, name: 'Salle de bain', type: 'privative' },
  { pattern: /\b(wc|toilette|cabinet)\b/i, name: 'WC', type: 'privative' },
  { pattern: /\b(bureau)\b/i, name: 'Bureau', type: 'privative' },
  { pattern: /\b(dressing|placard)\b/i, name: 'Dressing', type: 'privative' },
  { pattern: /\b(balcon|terrasse|loggia)\b/i, name: 'Balcon', type: 'privative' },
  { pattern: /\b(cellier|buanderie)\b/i, name: 'Cellier', type: 'privative' },
  { pattern: /\b(garage|box)\b/i, name: 'Garage', type: 'privative' },
];

// Zone patterns
const ZONE_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(mur|murs|cloison|paroi)\b/i, name: 'mur' },
  { pattern: /\b(sol|plancher|carrelage|parquet)\b/i, name: 'sol' },
  { pattern: /\b(plafond)\b/i, name: 'plafond' },
  { pattern: /\b(fenêtre|vitre|vitrage|ouverture)\b/i, name: 'menuiseries' },
  { pattern: /\b(porte)\b/i, name: 'menuiseries' },
  { pattern: /\b(radiateur|chauffage|convecteur)\b/i, name: 'équipements' },
  { pattern: /\b(prise|interrupteur|tableau\s*électrique)\b/i, name: 'électricité' },
  { pattern: /\b(robinet|lavabo|douche|baignoire|wc|toilette)\b/i, name: 'sanitaires' },
  { pattern: /\b(évier|plaque|hotte|four)\b/i, name: 'équipements' },
  { pattern: /\b(vmc|ventilation|aération)\b/i, name: 'équipements' },
];

// Condition patterns
const CONDITION_PATTERNS: Array<{ pattern: RegExp; condition: string }> = [
  { pattern: /\b(neuf|excellent|parfait|impeccable)\b/i, condition: 'neuf' },
  { pattern: /\b(bon\s*état|correct|propre|entretenu)\b/i, condition: 'bon' },
  { pattern: /\b(usé|vieilli|à\s*refaire|dégradé|abîmé|fissuré|humide|moisi)\b/i, condition: 'à refaire' },
];

export const useIntelligentDefaults = () => {
  const { session, addDetectedPiece, setLocation } = useSessionStore();

  // Detect pieces from transcript text
  const detectPiecesFromText = useCallback((text: string): Array<{ name: string; type: 'commune' | 'privative' }> => {
    const detected: Array<{ name: string; type: 'commune' | 'privative' }> = [];
    
    for (const { pattern, name, type } of PIECE_PATTERNS) {
      if (pattern.test(text)) {
        detected.push({ name, type });
        addDetectedPiece(name);
      }
    }
    
    return detected;
  }, [addDetectedPiece]);

  // Detect zones from transcript text
  const detectZonesFromText = useCallback((text: string): string[] => {
    const detected: string[] = [];
    
    for (const { pattern, name } of ZONE_PATTERNS) {
      if (pattern.test(text) && !detected.includes(name)) {
        detected.push(name);
      }
    }
    
    return detected;
  }, []);

  // Detect condition from transcript text
  const detectConditionFromText = useCallback((text: string): string | null => {
    for (const { pattern, condition } of CONDITION_PATTERNS) {
      if (pattern.test(text)) {
        return condition;
      }
    }
    return null;
  }, []);

  // Get default EDL type based on context
  const getDefaultEDLType = useCallback((): string => {
    // Default to "Avant travaux" unless context suggests otherwise
    const context = session.lastUserIntent?.toLowerCase() || '';
    
    if (context.includes('après') || context.includes('réception') || context.includes('fin')) {
      return 'apres_travaux';
    }
    if (context.includes('entrée') || context.includes('locataire')) {
      return 'location_entree';
    }
    if (context.includes('sortie') || context.includes('départ')) {
      return 'location_sortie';
    }
    
    return 'avant_travaux';
  }, [session.lastUserIntent]);

  // Get default capture mode
  const getDefaultCaptureMode = useCallback((): string => {
    return 'video'; // Video is always the default
  }, []);

  // Get default zone based on captured zones
  const getDefaultZone = useCallback((): string | null => {
    // Return current detected zone or first missing zone
    if (session.currentZone) return session.currentZone;
    
    const standardOrder = ['mur', 'sol', 'plafond', 'menuiseries', 'équipements'];
    for (const zone of standardOrder) {
      if (!session.capturedZones.includes(zone)) {
        return zone;
      }
    }
    
    return null;
  }, [session.currentZone, session.capturedZones]);

  // Get default priority
  const getDefaultPriority = useCallback((): string => {
    return 'normale';
  }, []);

  // Suggest next action based on context
  const suggestNextAction = useCallback((): {
    action: string;
    label: string;
    confidence: number;
  } | null => {
    // If no piece selected, suggest selecting one
    if (!session.currentLieu) {
      return {
        action: 'select_piece',
        label: 'Sélectionnez une pièce',
        confidence: 0.9,
      };
    }

    // If piece selected but no zone captured
    if (session.capturedZones.length === 0) {
      return {
        action: 'capture_zone',
        label: 'Filmez les murs',
        confidence: 0.85,
      };
    }

    // Suggest next zone
    const nextZone = getDefaultZone();
    if (nextZone) {
      return {
        action: 'capture_zone',
        label: `Passez aux ${nextZone}s`,
        confidence: 0.8,
      };
    }

    // All zones captured, suggest next piece
    return {
      action: 'next_piece',
      label: 'Passez à la pièce suivante',
      confidence: 0.75,
    };
  }, [session.currentLieu, session.capturedZones, getDefaultZone]);

  // Get recovery options when something fails
  const getRecoveryOptions = useCallback((errorType: string): Array<{
    action: string;
    label: string;
  }> => {
    switch (errorType) {
      case 'no_transcript':
        return [
          { action: 'retry', label: 'Réessayer' },
          { action: 'skip', label: 'Passer et continuer' },
          { action: 'manual', label: 'Saisir manuellement' },
        ];
      case 'no_location':
        return [
          { action: 'select', label: 'Choisir la pièce' },
          { action: 'auto', label: 'Laisser l\'IA détecter' },
        ];
      case 'api_error':
        return [
          { action: 'retry', label: 'Réessayer' },
          { action: 'offline', label: 'Continuer hors ligne' },
        ];
      default:
        return [
          { action: 'retry', label: 'Réessayer' },
          { action: 'skip', label: 'Passer' },
        ];
    }
  }, []);

  // Parse location from natural speech
  const parseLocationFromSpeech = useCallback((text: string): {
    partie?: 'commune' | 'privative';
    lieu?: string;
    endroit?: string;
    zone?: string;
  } => {
    const result: {
      partie?: 'commune' | 'privative';
      lieu?: string;
      endroit?: string;
      zone?: string;
    } = {};

    // Detect piece/lieu
    const detectedPieces = detectPiecesFromText(text);
    if (detectedPieces.length > 0) {
      result.partie = detectedPieces[0].type;
      result.lieu = detectedPieces[0].name;
    }

    // Detect zone
    const detectedZones = detectZonesFromText(text);
    if (detectedZones.length > 0) {
      result.zone = detectedZones[0];
    }

    // Detect specific location (côté fenêtre, côté porte, etc.)
    const endroitMatch = text.match(/\bcôté\s+(fenêtre|porte|entrée|cuisine|salon|nord|sud|est|ouest)\b/i);
    if (endroitMatch) {
      result.endroit = `Côté ${endroitMatch[1]}`;
    }

    // Update session if location found
    if (Object.keys(result).length > 0) {
      setLocation(result);
    }

    return result;
  }, [detectPiecesFromText, detectZonesFromText, setLocation]);

  return {
    detectPiecesFromText,
    detectZonesFromText,
    detectConditionFromText,
    getDefaultEDLType,
    getDefaultCaptureMode,
    getDefaultZone,
    getDefaultPriority,
    suggestNextAction,
    getRecoveryOptions,
    parseLocationFromSpeech,
    detectedPieces: session.detectedPieces,
  };
};

export default useIntelligentDefaults;
