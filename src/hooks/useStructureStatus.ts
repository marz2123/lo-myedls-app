import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useStructureStatus = () => {
  const [isStructureImported, setIsStructureImported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStructureStatus = async () => {
      try {
        const { count, error } = await supabase
          .from('ft_familles')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        setIsStructureImported((count ?? 0) > 0);
      } catch (error) {
        console.error('Error checking structure status:', error);
        setIsStructureImported(false);
      } finally {
        setLoading(false);
      }
    };

    checkStructureStatus();
  }, []);

  return { isStructureImported, loading };
};
