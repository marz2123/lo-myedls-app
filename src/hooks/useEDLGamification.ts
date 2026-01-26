import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

export interface EDLBadge {
  id: string;
  type: 'room' | 'session' | 'detection' | 'milestone';
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: Date;
}

export interface EDLScore {
  totalScore: number;
  level: 'basic' | 'advanced' | 'premium' | 'master';
  levelLabel: string;
  roomsCompleted: number;
  totalRooms: number;
  itemsCompleted: number;
  totalItems: number;
  photosCount: number;
  anomaliesCount: number;
  tasksGenerated: number;
  precision: number;
}

const BADGE_DEFINITIONS: Record<string, Omit<EDLBadge, 'id' | 'unlockedAt'>> = {
  // Room badges
  room_completed: {
    type: 'room',
    name: 'Salle complétée',
    description: 'Vous avez validé une pièce',
    icon: '🎉',
    color: 'from-emerald-500 to-emerald-600'
  },
  room_no_anomaly: {
    type: 'room',
    name: 'Zéro anomalie',
    description: 'Pièce sans aucune anomalie détectée',
    icon: '🟦',
    color: 'from-blue-500 to-blue-600'
  },
  room_perfect_ai: {
    type: 'room',
    name: 'Analyse parfaite IA',
    description: 'L\'IA a parfaitement analysé cette pièce',
    icon: '🔥',
    color: 'from-orange-500 to-orange-600'
  },
  room_all_photos: {
    type: 'room',
    name: 'Photos complètes',
    description: 'Toutes les photos obligatoires prises',
    icon: '📸',
    color: 'from-purple-500 to-purple-600'
  },
  // Session badges
  edl_50_percent: {
    type: 'session',
    name: 'EDL 50% terminé',
    description: 'Vous avez atteint la moitié de l\'EDL',
    icon: '🌓',
    color: 'from-cyan-500 to-cyan-600'
  },
  edl_100_percent: {
    type: 'session',
    name: 'EDL 100% terminé',
    description: 'EDL complètement terminé',
    icon: '🎊',
    color: 'from-amber-500 to-amber-600'
  },
  no_missing_tasks: {
    type: 'session',
    name: 'Aucune tâche manquante',
    description: 'Toutes les tâches ont été traitées',
    icon: '🧠',
    color: 'from-violet-500 to-violet-600'
  },
  report_complete: {
    type: 'session',
    name: 'Rapport complet',
    description: 'Rapport propre et complet',
    icon: '📝',
    color: 'from-teal-500 to-teal-600'
  },
  // Detection badges
  first_anomaly: {
    type: 'detection',
    name: '1ère anomalie',
    description: 'Première anomalie détectée',
    icon: '🔍',
    color: 'from-rose-500 to-rose-600'
  },
  auto_task_generated: {
    type: 'detection',
    name: 'Tâche auto-générée',
    description: 'Une tâche a été générée automatiquement',
    icon: '⚡',
    color: 'from-yellow-500 to-yellow-600'
  },
  ten_anomalies: {
    type: 'detection',
    name: '10 anomalies analysées',
    description: 'L\'IA a analysé 10 anomalies',
    icon: '🎯',
    color: 'from-indigo-500 to-indigo-600'
  },
  // Milestone badges
  speed_demon: {
    type: 'milestone',
    name: 'Speed Demon',
    description: 'EDL complété en moins de 30 minutes',
    icon: '⚡',
    color: 'from-pink-500 to-pink-600'
  },
  perfectionist: {
    type: 'milestone',
    name: 'Perfectionniste',
    description: 'Score de 100% sur un EDL',
    icon: '💎',
    color: 'from-sky-500 to-sky-600'
  }
};

export const useEDLGamification = (projectId?: string) => {
  const [badges, setBadges] = useState<EDLBadge[]>([]);
  const [pendingBadge, setPendingBadge] = useState<EDLBadge | null>(null);
  const [score, setScore] = useState<EDLScore>({
    totalScore: 0,
    level: 'basic',
    levelLabel: 'Basic Inspector',
    roomsCompleted: 0,
    totalRooms: 0,
    itemsCompleted: 0,
    totalItems: 0,
    photosCount: 0,
    anomaliesCount: 0,
    tasksGenerated: 0,
    precision: 0
  });
  const [showCelebration, setShowCelebration] = useState<'room' | 'edl' | null>(null);
  const { trigger } = useHapticFeedback();

  // Calculate EDL score
  const calculateScore = useCallback((data: {
    roomsCompleted: number;
    totalRooms: number;
    itemsCompleted: number;
    totalItems: number;
    photosCount: number;
    anomaliesCount: number;
    tasksGenerated: number;
    precision?: number;
  }) => {
    const roomWeight = 40;
    const itemWeight = 30;
    const photoWeight = 15;
    const precisionWeight = 15;

    const roomScore = data.totalRooms > 0 
      ? (data.roomsCompleted / data.totalRooms) * roomWeight 
      : 0;
    const itemScore = data.totalItems > 0 
      ? (data.itemsCompleted / data.totalItems) * itemWeight 
      : 0;
    const photoScore = Math.min(data.photosCount / 20, 1) * photoWeight;
    const precisionScore = (data.precision || 0.8) * precisionWeight;

    const total = Math.round(roomScore + itemScore + photoScore + precisionScore);

    let level: EDLScore['level'] = 'basic';
    let levelLabel = 'Basic Inspector';
    
    if (total >= 95) {
      level = 'master';
      levelLabel = 'Master Expert';
    } else if (total >= 80) {
      level = 'premium';
      levelLabel = 'Premium Inspector';
    } else if (total >= 60) {
      level = 'advanced';
      levelLabel = 'Advanced Inspector';
    }

    setScore({
      totalScore: total,
      level,
      levelLabel,
      ...data,
      precision: data.precision || 0.8
    });

    return total;
  }, []);

  // Award a badge
  const awardBadge = useCallback((badgeKey: string) => {
    const definition = BADGE_DEFINITIONS[badgeKey];
    if (!definition) return;

    const existingBadge = badges.find(b => b.id === badgeKey);
    if (existingBadge) return;

    const newBadge: EDLBadge = {
      id: badgeKey,
      ...definition,
      unlockedAt: new Date()
    };

    setBadges(prev => [...prev, newBadge]);
    setPendingBadge(newBadge);

    // Haptic feedback based on badge type
    if (definition.type === 'detection') {
      trigger('critical_observation');
    } else {
      trigger('piece_complete');
    }
  }, [badges, trigger]);

  // Check and award badges based on current state
  const checkBadges = useCallback((data: {
    roomCompleted?: boolean;
    roomAnomalies?: number;
    roomPhotosComplete?: boolean;
    aiPerfect?: boolean;
    edlProgress?: number;
    totalAnomalies?: number;
    tasksGenerated?: number;
    allTasksDone?: boolean;
    reportComplete?: boolean;
  }) => {
    // Room badges
    if (data.roomCompleted) {
      awardBadge('room_completed');
      setShowCelebration('room');
      setTimeout(() => setShowCelebration(null), 3000);
    }
    if (data.roomCompleted && data.roomAnomalies === 0) {
      awardBadge('room_no_anomaly');
    }
    if (data.roomPhotosComplete) {
      awardBadge('room_all_photos');
    }
    if (data.aiPerfect) {
      awardBadge('room_perfect_ai');
    }

    // Session badges
    if (data.edlProgress && data.edlProgress >= 50 && data.edlProgress < 100) {
      awardBadge('edl_50_percent');
    }
    if (data.edlProgress === 100) {
      awardBadge('edl_100_percent');
      setShowCelebration('edl');
    }
    if (data.allTasksDone) {
      awardBadge('no_missing_tasks');
    }
    if (data.reportComplete) {
      awardBadge('report_complete');
    }

    // Detection badges
    if (data.totalAnomalies === 1) {
      awardBadge('first_anomaly');
    }
    if (data.totalAnomalies && data.totalAnomalies >= 10) {
      awardBadge('ten_anomalies');
    }
    if (data.tasksGenerated && data.tasksGenerated > 0) {
      awardBadge('auto_task_generated');
    }
  }, [awardBadge]);

  // Trigger room completion celebration
  const celebrateRoomCompletion = useCallback(() => {
    setShowCelebration('room');
    trigger('piece_complete');
    setTimeout(() => setShowCelebration(null), 3000);
  }, [trigger]);

  // Trigger EDL completion celebration  
  const celebrateEDLCompletion = useCallback(() => {
    setShowCelebration('edl');
    trigger('edl_complete');
    setTimeout(() => setShowCelebration(null), 5000);
  }, [trigger]);

  // Dismiss pending badge
  const dismissBadge = useCallback(() => {
    setPendingBadge(null);
  }, []);

  // Load existing badges from storage/DB
  useEffect(() => {
    if (!projectId) return;
    
    // Load from localStorage for now
    const storedBadges = localStorage.getItem(`edl_badges_${projectId}`);
    if (storedBadges) {
      try {
        setBadges(JSON.parse(storedBadges));
      } catch (e) {
        console.error('Failed to parse stored badges');
      }
    }
  }, [projectId]);

  // Save badges when they change
  useEffect(() => {
    if (!projectId || badges.length === 0) return;
    localStorage.setItem(`edl_badges_${projectId}`, JSON.stringify(badges));
  }, [badges, projectId]);

  return {
    badges,
    pendingBadge,
    dismissBadge,
    score,
    calculateScore,
    checkBadges,
    awardBadge,
    showCelebration,
    setShowCelebration,
    celebrateRoomCompletion,
    celebrateEDLCompletion
  };
};
