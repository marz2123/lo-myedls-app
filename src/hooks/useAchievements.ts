import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlocked_at?: string;
}

const achievementDefinitions = [
  {
    type: "first_project",
    name: "Premier pas",
    description: "Créez votre premier projet d'inspection",
    icon: "🎯",
    target: 1,
  },
  {
    type: "project_master",
    name: "Maître des projets",
    description: "Créez 10 projets d'inspection",
    icon: "🏆",
    target: 10,
  },
  {
    type: "task_extractor",
    name: "Extracteur débutant",
    description: "Extrayez 10 tâches",
    icon: "📝",
    target: 10,
  },
  {
    type: "task_master",
    name: "Expert en extraction",
    description: "Extrayez 50 tâches",
    icon: "⭐",
    target: 50,
  },
  {
    type: "audio_user",
    name: "Voix de l'inspection",
    description: "Utilisez l'extraction vocale 5 fois",
    icon: "🎤",
    target: 5,
  },
  {
    type: "photo_documenter",
    name: "Photographe pro",
    description: "Ajoutez 20 photos à vos inspections",
    icon: "📸",
    target: 20,
  },
  {
    type: "pdf_importer",
    name: "Importateur PDF",
    description: "Importez votre premier rapport PDF",
    icon: "📄",
    target: 1,
  },
  {
    type: "template_creator",
    name: "Créateur de templates",
    description: "Créez votre premier template personnalisé",
    icon: "✨",
    target: 1,
  },
  {
    type: "organizer",
    name: "Organisateur",
    description: "Archivez votre premier projet",
    icon: "📦",
    target: 1,
  },
  {
    type: "classifier",
    name: "Expert DSC",
    description: "Classifiez 20 tâches selon la structure DSC",
    icon: "🏗️",
    target: 20,
  },
];

export const useAchievements = () => {
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const { toast } = useToast();

  const initializeAchievements = async (userId: string) => {
    // Check if user already has achievements
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) return;

    // Initialize all achievements for new user
    const achievements = achievementDefinitions.map(def => ({
      user_id: userId,
      achievement_type: def.type,
      achievement_name: def.name,
      description: def.description,
      icon: def.icon,
      progress: 0,
      target: def.target,
      unlocked: false,
    }));

    await supabase.from('user_achievements').insert(achievements);
  };

  const checkAndUpdateAchievement = async (
    userId: string,
    achievementType: string,
    currentProgress: number
  ) => {
    const { data: achievement, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_type', achievementType)
      .single();

    if (error || !achievement) return;

    // Update progress
    const newProgress = Math.min(currentProgress, achievement.target);
    const shouldUnlock = !achievement.unlocked && newProgress >= achievement.target;

    const updates: any = { progress: newProgress };
    if (shouldUnlock) {
      updates.unlocked = true;
      updates.unlocked_at = new Date().toISOString();
    }

    const { data: updated } = await supabase
      .from('user_achievements')
      .update(updates)
      .eq('id', achievement.id)
      .select()
      .single();

    if (shouldUnlock && updated) {
      setNewAchievement(updated as Achievement);
    }
  };

  const trackProjectCreation = async (userId: string, projectCount: number) => {
    await checkAndUpdateAchievement(userId, 'first_project', projectCount);
    await checkAndUpdateAchievement(userId, 'project_master', projectCount);
  };

  const trackTaskExtraction = async (userId: string, taskCount: number, sourceType?: string) => {
    await checkAndUpdateAchievement(userId, 'task_extractor', taskCount);
    await checkAndUpdateAchievement(userId, 'task_master', taskCount);

    if (sourceType === 'audio') {
      const { data: audioTasks } = await supabase
        .from('extracted_tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('source_type', 'audio');
      
      await checkAndUpdateAchievement(userId, 'audio_user', audioTasks?.length || 0);
    }

    if (sourceType === 'photo') {
      const { data: photoTasks } = await supabase
        .from('extracted_tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('source_type', 'photo');
      
      await checkAndUpdateAchievement(userId, 'photo_documenter', photoTasks?.length || 0);
    }

    if (sourceType === 'pdf') {
      const { data: pdfTasks } = await supabase
        .from('extracted_tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('source_type', 'pdf');
      
      await checkAndUpdateAchievement(userId, 'pdf_importer', pdfTasks?.length || 0);
    }
  };

  const trackTemplateCreation = async (userId: string, templateCount: number) => {
    await checkAndUpdateAchievement(userId, 'template_creator', templateCount);
  };

  const trackArchiving = async (userId: string, archivedCount: number) => {
    await checkAndUpdateAchievement(userId, 'organizer', archivedCount);
  };

  const trackClassification = async (userId: string) => {
    const { data: classifiedTasks } = await supabase
      .from('extracted_tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .not('category_id', 'is', null)
      .not('family_id', 'is', null);
    
    await checkAndUpdateAchievement(userId, 'classifier', classifiedTasks?.length || 0);
  };

  return {
    newAchievement,
    setNewAchievement,
    initializeAchievements,
    trackProjectCreation,
    trackTaskExtraction,
    trackTemplateCreation,
    trackArchiving,
    trackClassification,
  };
};
