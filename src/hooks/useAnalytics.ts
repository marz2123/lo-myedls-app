import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsEvent {
  category: 'user' | 'project' | 'reportage' | 'report' | 'ai' | 'export' | 'template' | 'error';
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsMetrics {
  totalProjects: number;
  totalReports: number;
  totalSequences: number;
  totalTasks: number;
  templatesUsed: number;
  exportsGenerated: {
    pdf: number;
    html: number;
    docx: number;
  };
  aiProcessingTime: number;
  averageReportGenerationTime: number;
  errorsCount: number;
  lastActivity: string | null;
}

/**
 * Hook pour gérer les analytics et métriques de l'application
 */
export function useAnalytics() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Enregistre un événement analytics
   */
  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Enregistrer l'événement dans la base de données
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          category: event.category,
          action: event.action,
          label: event.label || null,
          value: event.value || null,
          metadata: event.metadata || {},
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[useAnalytics] Error tracking event:', error);
      }

      // Log en console en développement
      if (import.meta.env.DEV) {
        console.log('[Analytics]', event);
      }
    } catch (error) {
      console.error('[useAnalytics] Error tracking event:', error);
    }
  }, []);

  /**
   * Charge les métriques de l'utilisateur
   */
  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Charger les métriques depuis la base de données
      const [
        { count: projectsCount },
        { count: reportsCount },
        { count: sequencesCount },
        { count: tasksCount },
        { data: templatesData },
        { data: exportsData },
        { data: eventsData },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('edl_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('visit_sequences').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('extracted_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('edl_templates').select('id').eq('user_id', user.id),
        supabase.from('analytics_events').select('*').eq('user_id', user.id).eq('category', 'export'),
        supabase.from('analytics_events').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      // Compter les exports par type
      const exportsByType = {
        pdf: exportsData?.filter((e: any) => e.metadata?.format === 'pdf').length || 0,
        html: exportsData?.filter((e: any) => e.metadata?.format === 'html').length || 0,
        docx: exportsData?.filter((e: any) => e.metadata?.format === 'docx').length || 0,
      };

      // Calculer le temps moyen de traitement IA
      const aiEvents = eventsData?.filter((e: any) => e.category === 'ai' && e.value) || [];
      const avgAITime = aiEvents.length > 0
        ? aiEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0) / aiEvents.length
        : 0;

      // Calculer le temps moyen de génération de rapport
      const reportEvents = eventsData?.filter((e: any) => e.category === 'report' && e.action === 'generate' && e.value) || [];
      const avgReportTime = reportEvents.length > 0
        ? reportEvents.reduce((sum: number, e: any) => sum + (e.value || 0), 0) / reportEvents.length
        : 0;

      // Compter les erreurs
      const errorsCount = eventsData?.filter((e: any) => e.category === 'error').length || 0;

      // Dernière activité
      const lastActivity = eventsData?.[0]?.created_at || null;

      setMetrics({
        totalProjects: projectsCount || 0,
        totalReports: reportsCount || 0,
        totalSequences: sequencesCount || 0,
        totalTasks: tasksCount || 0,
        templatesUsed: templatesData?.length || 0,
        exportsGenerated: exportsByType,
        aiProcessingTime: avgAITime,
        averageReportGenerationTime: avgReportTime,
        errorsCount,
        lastActivity,
      });
    } catch (error) {
      console.error('[useAnalytics] Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Enregistre le temps de traitement d'une action
   */
  const trackTiming = useCallback(async (
    category: AnalyticsEvent['category'],
    action: string,
    duration: number,
    label?: string,
    metadata?: Record<string, any>
  ) => {
    await trackEvent({
      category,
      action,
      label,
      value: duration,
      metadata,
    });
  }, [trackEvent]);

  /**
   * Enregistre une erreur
   */
  const trackError = useCallback(async (
    action: string,
    error: Error | string,
    metadata?: Record<string, any>
  ) => {
    const errorMessage = error instanceof Error ? error.message : error;
    await trackEvent({
      category: 'error',
      action,
      label: errorMessage,
      metadata: {
        ...metadata,
        errorType: error instanceof Error ? error.constructor.name : 'string',
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }, [trackEvent]);

  /**
   * Enregistre un export
   */
  const trackExport = useCallback(async (
    format: 'pdf' | 'html' | 'docx',
    projectId?: string,
    reportId?: string
  ) => {
    await trackEvent({
      category: 'export',
      action: 'generate',
      label: format.toUpperCase(),
      metadata: {
        format,
        projectId,
        reportId,
      },
    });
  }, [trackEvent]);

  // Charger les métriques au montage
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    trackEvent,
    trackTiming,
    trackError,
    trackExport,
    metrics,
    loading,
    refreshMetrics: loadMetrics,
  };
}
