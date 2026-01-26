import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecentLocation {
  part_id: string;
  part_name: string;
  part_type: 'commune' | 'privative';
  location_id: string;
  location_name: string;
  endroit_name: string;
  zone_type: string;
  count: number;
  lastUsed: Date;
}

export const useRecentLocations = (projectId: string) => {
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    
    const fetchRecentLocations = async () => {
      try {
        // Get recent sequences with location data
        const { data: sequences, error } = await supabase
          .from('visit_sequences')
          .select(`
            location_id,
            endroit_name,
            zone_type,
            part_id,
            created_at,
            property_locations(id, name, location_type, part_id),
            property_parts:part_id(id, name, part_type)
          `)
          .eq('project_id', projectId)
          .not('location_id', 'is', null)
          .not('endroit_name', 'is', null)
          .not('zone_type', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Aggregate by unique location combinations
        const locationMap = new Map<string, RecentLocation>();
        
        (sequences || []).forEach((seq: any) => {
          if (!seq.property_locations || !seq.property_parts) return;
          
          const key = `${seq.location_id}-${seq.endroit_name}-${seq.zone_type}`;
          
          if (locationMap.has(key)) {
            const existing = locationMap.get(key)!;
            existing.count++;
            if (new Date(seq.created_at) > existing.lastUsed) {
              existing.lastUsed = new Date(seq.created_at);
            }
          } else {
            locationMap.set(key, {
              part_id: seq.part_id,
              part_name: seq.property_parts.name,
              part_type: seq.property_parts.part_type,
              location_id: seq.location_id,
              location_name: seq.property_locations.name,
              endroit_name: seq.endroit_name,
              zone_type: seq.zone_type,
              count: 1,
              lastUsed: new Date(seq.created_at),
            });
          }
        });

        // Sort by recency and frequency
        const sorted = Array.from(locationMap.values()).sort((a, b) => {
          // Prioritize recent + frequently used
          const scoreA = a.count * 2 + (Date.now() - a.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
          const scoreB = b.count * 2 + (Date.now() - b.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
          return scoreB - scoreA;
        });

        setRecentLocations(sorted);
      } catch (error) {
        console.error('Error fetching recent locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLocations();
  }, [projectId]);

  const applyQuickLocation = async (sequenceId: string, location: RecentLocation) => {
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({
          part_id: location.part_id,
          location_id: location.location_id,
          endroit_name: location.endroit_name,
          zone_type: location.zone_type,
        })
        .eq('id', sequenceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error applying quick location:', error);
      return false;
    }
  };

  return { recentLocations, loading, applyQuickLocation };
};
