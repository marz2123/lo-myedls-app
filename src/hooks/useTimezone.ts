import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string>("Europe/Paris");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimezone();
  }, []);

  const loadTimezone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('myaladin_preferences')
      .select('timezone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.timezone) {
      setTimezone(data.timezone);
    }
    setLoading(false);
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return { timezone, loading, formatDateTime };
};
