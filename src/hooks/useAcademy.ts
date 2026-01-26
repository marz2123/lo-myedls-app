import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AcademyModule {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: Record<string, unknown>;
  video_url: string | null;
  duration_minutes: number;
  difficulty: string;
  order_index: number;
  is_active: boolean;
}

export interface QuizQuestion {
  id: string;
  module_id: string | null;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
  points: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  progress_percent: number;
  completed_at: string | null;
  quiz_score: number | null;
  time_spent_minutes: number;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  modules_completed: number;
  quizzes_passed: number;
  streak_days: number;
  last_activity_at: string | null;
  badges: string[];
}

export interface Certificate {
  id: string;
  user_id: string;
  certificate_level: string;
  certificate_name: string;
  pdf_url: string | null;
  badge_url: string | null;
  issued_at: string;
}

export const useAcademy = () => {
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchModules = useCallback(async () => {
    const { data, error } = await supabase
      .from('academy_modules')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching modules:', error);
      return;
    }

    setModules(data as AcademyModule[]);
  }, []);

  const fetchUserProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('academy_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching progress:', error);
      return;
    }

    setUserProgress(data as UserProgress[]);
  }, []);

  const fetchUserStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('academy_user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    if (data) {
      setUserStats(data as UserStats);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('academy_certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
      return;
    }

    setCertificates(data as Certificate[]);
  }, []);

  const fetchQuizQuestions = useCallback(async (moduleId: string): Promise<QuizQuestion[]> => {
    const { data, error } = await supabase
      .from('academy_quiz')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index');

    if (error) {
      console.error('Error fetching quiz:', error);
      return [];
    }

    return (data || []).map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
    })) as QuizQuestion[];
  }, []);

  const updateProgress = useCallback(async (moduleId: string, progressPercent: number, quizScore?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const completed = progressPercent >= 100;
    
    const { error } = await supabase
      .from('academy_progress')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        progress_percent: progressPercent,
        completed_at: completed ? new Date().toISOString() : null,
        quiz_score: quizScore,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_id'
      });

    if (error) {
      console.error('Error updating progress:', error);
      return;
    }

    await fetchUserProgress();
    
    if (completed) {
      await addXP(50);
      toast({
        title: "Module terminé !",
        description: "+50 XP gagnés"
      });
    }
  }, [fetchUserProgress, toast]);

  const addXP = useCallback(async (xp: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentXP = userStats?.total_xp || 0;
    const newXP = currentXP + xp;
    const newLevel = Math.floor(newXP / 500) + 1;

    const { error } = await supabase
      .from('academy_user_stats')
      .upsert({
        user_id: user.id,
        total_xp: newXP,
        current_level: newLevel,
        modules_completed: (userStats?.modules_completed || 0) + 1,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error adding XP:', error);
      return;
    }

    await fetchUserStats();
  }, [userStats, fetchUserStats]);

  const issueCertificate = useCallback(async (level: string, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = certificates.find(c => c.certificate_level === level);
    if (existing) {
      toast({
        title: "Certificat déjà obtenu",
        description: `Vous avez déjà le certificat ${name}`
      });
      return;
    }

    const { error } = await supabase
      .from('academy_certificates')
      .insert({
        user_id: user.id,
        certificate_level: level,
        certificate_name: name
      });

    if (error) {
      console.error('Error issuing certificate:', error);
      return;
    }

    await fetchCertificates();
    toast({
      title: "🎉 Félicitations !",
      description: `Vous avez obtenu le certificat : ${name}`
    });
  }, [certificates, fetchCertificates, toast]);

  const getModuleProgress = useCallback((moduleId: string): number => {
    const progress = userProgress.find(p => p.module_id === moduleId);
    return progress?.progress_percent || 0;
  }, [userProgress]);

  const isModuleCompleted = useCallback((moduleId: string): boolean => {
    const progress = userProgress.find(p => p.module_id === moduleId);
    return progress?.completed_at !== null && progress?.completed_at !== undefined;
  }, [userProgress]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchModules(),
        fetchUserProgress(),
        fetchUserStats(),
        fetchCertificates()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchModules, fetchUserProgress, fetchUserStats, fetchCertificates]);

  return {
    modules,
    userProgress,
    userStats,
    certificates,
    isLoading,
    fetchQuizQuestions,
    updateProgress,
    addXP,
    issueCertificate,
    getModuleProgress,
    isModuleCompleted,
    refetch: () => Promise.all([fetchModules(), fetchUserProgress(), fetchUserStats(), fetchCertificates()])
  };
};
