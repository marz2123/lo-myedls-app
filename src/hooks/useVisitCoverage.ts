import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePropertyStructure } from './usePropertyStructure';

export interface CoverageItem {
  name: string;
  type?: string;
  partie?: string;
  lieu?: string;
  seen: boolean;
  confidence: number;
  sequenceIds?: string[];
}

export interface VisitCoverage {
  parties: CoverageItem[];
  lieux: CoverageItem[];
  zones: CoverageItem[];
  completionPercent: number;
}

export const useVisitCoverage = (projectId: string | undefined) => {
  const [coverage, setCoverage] = useState<VisitCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const { parts, locations, zones, loading: structureLoading } = usePropertyStructure(projectId);

  const computeCoverage = useCallback(async () => {
    if (!projectId || structureLoading) return;
    
    setLoading(true);
    
    try {
      // Fetch completed visit sequences for this project
      const { data: sequences, error } = await supabase
        .from('visit_sequences')
        .select('id, part_id, location_id, zone_type, endroit_name, metadata, status')
        .eq('project_id', projectId)
        .in('status', ['completed', 'segmented', 'raw']);

      if (error) {
        console.error('Error fetching sequences:', error);
        return;
      }

      // Track what's been seen by ID
      const seenPartIds = new Set<string>();
      const seenLocationIds = new Set<string>();
      const seenZoneKeys = new Map<string, { lieu: string; confidence: number; sequenceIds: string[] }>();

      // Process sequences to extract coverage
      for (const seq of sequences || []) {
        // Track parts and locations by ID
        if (seq.part_id) {
          seenPartIds.add(seq.part_id);
        }

        if (seq.location_id) {
          seenLocationIds.add(seq.location_id);
        }

        // Track zones by endroit + zone_type
        if (seq.zone_type && seq.endroit_name) {
          const key = `${seq.endroit_name}:${seq.zone_type}`;
          const existing = seenZoneKeys.get(key);
          if (existing) {
            existing.sequenceIds.push(seq.id);
            existing.confidence = Math.max(existing.confidence, 0.8);
          } else {
            seenZoneKeys.set(key, { lieu: seq.endroit_name, confidence: 0.8, sequenceIds: [seq.id] });
          }
        }

        // Also check metadata for coverage info from AI processing
        const metadata = seq.metadata as Record<string, unknown> | null;
        if (metadata?.coverage) {
          const aiCoverage = metadata.coverage as {
            parties?: Array<{ name: string; seen: boolean; confidence?: number }>;
            lieux?: Array<{ partie: string; name: string; seen: boolean; confidence?: number }>;
            zones?: Array<{ lieu: string; name: string; seen: boolean; confidence?: number }>;
          };
          
          // AI coverage will be used to supplement ID-based tracking
          // when we have more sophisticated AI location detection
        }
      }

      // Build coverage from property structure
      const partiesCoverage: CoverageItem[] = parts.map(part => {
        const seen = seenPartIds.has(part.id);
        return {
          name: part.name,
          type: part.part_type,
          seen,
          confidence: seen ? 0.8 : 0,
        };
      });

      const lieuxCoverage: CoverageItem[] = locations.map(loc => {
        const part = parts.find(p => p.id === loc.part_id);
        const seen = seenLocationIds.has(loc.id);
        return {
          name: loc.name,
          partie: part?.name,
          seen,
          confidence: seen ? 0.8 : 0,
        };
      });

      const zonesCoverage: CoverageItem[] = zones.map(zone => {
        const loc = locations.find(l => l.id === zone.location_id);
        const key = `${loc?.name}:${zone.zone_type}`;
        const seenData = seenZoneKeys.get(key);
        return {
          name: zone.custom_name || zone.zone_type,
          lieu: loc?.name,
          seen: !!seenData,
          confidence: seenData?.confidence || 0,
          sequenceIds: seenData?.sequenceIds
        };
      });

      // Calculate completion percentage based on parties (main level)
      const totalParties = partiesCoverage.length || 1;
      const seenPartiesCount = partiesCoverage.filter(p => p.seen).length;
      const completionPercent = Math.round((seenPartiesCount / totalParties) * 100);

      setCoverage({
        parties: partiesCoverage,
        lieux: lieuxCoverage,
        zones: zonesCoverage,
        completionPercent
      });

    } catch (error) {
      console.error('Error computing coverage:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, parts, locations, zones, structureLoading]);

  useEffect(() => {
    computeCoverage();
  }, [computeCoverage]);

  return {
    coverage,
    loading: loading || structureLoading,
    refresh: computeCoverage
  };
};
