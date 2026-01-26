import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserLevel {
  level: string;
  levelNumber: number;
  points: number;
  nextLevelPoints: number;
  progress: number;
  color: string;
  icon: string;
}

const levels = [
  { name: "Bronze", number: 1, minPoints: 0, maxPoints: 100, color: "from-orange-400 to-orange-600", icon: "🥉" },
  { name: "Argent", number: 2, minPoints: 100, maxPoints: 300, color: "from-gray-300 to-gray-500", icon: "🥈" },
  { name: "Or", number: 3, minPoints: 300, maxPoints: 600, color: "from-yellow-400 to-yellow-600", icon: "🥇" },
  { name: "Platine", number: 4, minPoints: 600, maxPoints: 1000, color: "from-cyan-400 to-cyan-600", icon: "💎" },
  { name: "Diamant", number: 5, minPoints: 1000, maxPoints: Infinity, color: "from-purple-400 to-purple-600", icon: "💠" },
];

const achievementPoints: Record<string, number> = {
  first_project: 10,
  project_master: 50,
  task_extractor: 15,
  task_master: 40,
  audio_user: 25,
  photo_documenter: 30,
  pdf_importer: 20,
  template_creator: 35,
  organizer: 15,
  classifier: 30,
};

export const useUserLevel = () => {
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserLevel();
  }, []);

  const loadUserLevel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('achievement_type, unlocked')
      .eq('user_id', user.id)
      .eq('unlocked', true);

    let totalPoints = 0;
    achievements?.forEach(achievement => {
      totalPoints += achievementPoints[achievement.achievement_type] || 0;
    });

    const currentLevel = levels.find(
      level => totalPoints >= level.minPoints && totalPoints < level.maxPoints
    ) || levels[levels.length - 1];

    const nextLevel = levels.find(level => level.number === currentLevel.number + 1);
    const nextLevelPoints = nextLevel ? nextLevel.minPoints : currentLevel.maxPoints;
    const progress = nextLevel 
      ? ((totalPoints - currentLevel.minPoints) / (nextLevelPoints - currentLevel.minPoints)) * 100
      : 100;

    setUserLevel({
      level: currentLevel.name,
      levelNumber: currentLevel.number,
      points: totalPoints,
      nextLevelPoints,
      progress,
      color: currentLevel.color,
      icon: currentLevel.icon,
    });

    setLoading(false);
  };

  return { userLevel, loading, refreshLevel: loadUserLevel };
};
