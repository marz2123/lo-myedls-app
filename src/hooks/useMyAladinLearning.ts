import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackData {
  conversationId: string;
  messageContent: string;
  feedbackType: 'positive' | 'negative' | 'correction';
  correctionData?: {
    originalSuggestion: string;
    userCorrection: string;
    context?: string;
  };
}

export const useMyAladinLearning = () => {
  
  // Submit user feedback for continuous learning
  const submitFeedback = useCallback(async (data: FeedbackData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update expertise log with feedback
      const { data: logs } = await supabase
        .from('myaladin_expertise_logs')
        .select('id')
        .eq('conversation_id', data.conversationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (logs && logs.length > 0) {
        await supabase
          .from('myaladin_expertise_logs')
          .update({ 
            user_feedback: data.feedbackType
          })
          .eq('id', logs[0].id);
      }

      console.log('Feedback submitted for learning:', data.feedbackType);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  }, []);

  // Track user actions for implicit feedback
  const trackAction = useCallback(async (action: string, context: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store action patterns for learning
      await supabase.from('myaladin_expertise_logs').insert({
        conversation_id: crypto.randomUUID(),
        query_type: 'user_action',
        query_context: { action, ...context },
        response_data: { tracked: true },
        confidence_score: 1
      });
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }, []);

  // Get personalized suggestions based on learning
  const getPersonalizedSuggestions = useCallback(async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch user's successful patterns
      const { data: successfulLogs } = await supabase
        .from('myaladin_expertise_logs')
        .select('query_context, response_data')
        .eq('user_feedback', 'positive')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch user's project patterns
      const { data: projects } = await supabase
        .from('projects')
        .select('property_type, template_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const suggestions: string[] = [];

      // Generate suggestions based on patterns
      if (successfulLogs && successfulLogs.length > 0) {
        const topQueryTypes = successfulLogs
          .filter(l => l.query_context && typeof l.query_context === 'object' && 'action' in (l.query_context as Record<string, unknown>))
          .map(l => (l.query_context as Record<string, unknown>).action as string);
        
        if (topQueryTypes.includes('task_extraction')) {
          suggestions.push('Continuez avec l\'extraction de tâches - vous êtes efficace !');
        }
        if (topQueryTypes.includes('dsc_classification')) {
          suggestions.push('Vos classifications DSC s\'améliorent - gardez le rythme !');
        }
      }

      // Project-based suggestions
      if (projects && projects.length > 0) {
        const types = [...new Set(projects.map(p => p.property_type))];
        if (types.length === 1) {
          suggestions.push(`Spécialisez-vous dans les ${types[0]}s pour devenir expert`);
        } else {
          suggestions.push('Votre polyvalence est un atout - diversifiez vos inspections');
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      return [];
    }
  }, []);

  return {
    submitFeedback,
    trackAction,
    getPersonalizedSuggestions
  };
};
