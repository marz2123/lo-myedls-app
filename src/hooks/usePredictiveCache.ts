import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface CachedPrediction {
  id: string;
  prediction_type: string;
  prediction_data: any;
  confidence_score: number;
  expires_at: string;
}

export const usePredictiveCache = (predictionType: string, userId: string | undefined) => {
  const cacheKey = `${predictionType}_${userId}`;

  // Load from cache
  const { data: cachedData, isLoading } = useQuery({
    queryKey: ['cache', cacheKey],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('cache_predictions')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Cache load error:', error);
        return null;
      }

      // Update hit count
      if (data) {
        await supabase
          .from('cache_predictions')
          .update({
            hit_count: (data.hit_count || 0) + 1,
            last_hit_at: new Date().toISOString()
          })
          .eq('id', data.id);
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const saveToCache = async (predictionData: any, confidenceScore: number, expiresInHours: number = 24) => {
    if (!userId) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const { error } = await supabase
      .from('cache_predictions')
      .upsert({
        user_id: userId,
        prediction_type: predictionType,
        prediction_data: predictionData,
        confidence_score: confidenceScore,
        cache_key: cacheKey,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, {
        onConflict: 'cache_key'
      });

    if (error) {
      console.error('Cache save error:', error);
    }
  };

  return {
    cachedData: cachedData?.prediction_data,
    isCacheHit: !!cachedData,
    isLoading,
    saveToCache,
    confidenceScore: cachedData?.confidence_score
  };
};