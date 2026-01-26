import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClockDisplayMode = 'compact' | 'extended';

export const useClockDisplay = () => {
  const [clockMode, setClockMode] = useState<ClockDisplayMode>('extended');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClockMode();
  }, []);

  const loadClockMode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('myaladin_preferences')
      .select('clock_display_mode')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.clock_display_mode) {
      setClockMode(data.clock_display_mode as ClockDisplayMode);
    }
    setLoading(false);
  };

  const updateClockMode = async (mode: ClockDisplayMode) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('myaladin_preferences')
      .upsert({
        user_id: user.id,
        clock_display_mode: mode,
      }, {
        onConflict: 'user_id'
      });

    if (!error) {
      setClockMode(mode);
    }
  };

  return { clockMode, loading, updateClockMode };
};
