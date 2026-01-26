import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export const useAdminNotifications = (isAdmin: boolean) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-classification-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dsc_classification_logs',
          filter: 'needs_review=eq.true',
        },
        (payload) => {
          const taskTitle = (payload.new as any).task_title;
          toast.info(
            t('cancel') === 'Annuler'
              ? `Nouvelle tâche à réviser: ${taskTitle || 'Sans titre'}`
              : `New task needs review: ${taskTitle || 'Untitled'}`,
            {
              duration: 5000,
              action: {
                label: t('cancel') === 'Annuler' ? 'Voir' : 'View',
                onClick: () => {
                  window.location.hash = '#dsc-admin';
                },
              },
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, t]);
};
