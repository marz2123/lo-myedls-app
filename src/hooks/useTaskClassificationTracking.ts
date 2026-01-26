import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAchievements } from "./useAchievements";

export const useTaskClassificationTracking = () => {
  const { trackClassification } = useAchievements();

  useEffect(() => {
    const setupRealtimeTracking = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to task updates
      const channel = supabase
        .channel('task-classification-tracking')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'extracted_tasks',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            // Check if classification was added
            const newTask = payload.new as any;
            if (newTask.category_id && newTask.family_id) {
              await trackClassification(user.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeTracking();
  }, [trackClassification]);

  return null;
};
