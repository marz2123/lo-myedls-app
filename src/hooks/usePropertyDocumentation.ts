import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PropertyPart, 
  PropertyLocation, 
  LocationZone, 
  IdentifiedProblem 
} from '@/types/businessModel';

export interface DocumentationStats {
  totalZones: number;
  documentedZones: number;
  partialZones: number;
  undocumentedZones: number;
  hasVideo: boolean;
  hasPhoto: boolean;
  hasText: boolean;
  hasAudio: boolean;
  tasksCount: number;
  problemsCount: number;
  progress: number;
}

export interface LocationDocStats extends DocumentationStats {
  locationId: string;
  locationName: string;
}

export interface PartDocStats extends DocumentationStats {
  partId: string;
  partName: string;
  partType: 'commune' | 'privative';
  locations: LocationDocStats[];
}

export const usePropertyDocumentation = (projectId: string | undefined) => {
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  const [zones, setZones] = useState<LocationZone[]>([]);
  const [problems, setProblems] = useState<IdentifiedProblem[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    loadAllData();
  }, [projectId]);

  const loadAllData = async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const [partsRes, locsRes, zonesRes, probsRes, seqsRes, tasksRes] = await Promise.all([
        supabase.from('property_parts').select('*').eq('project_id', projectId),
        supabase.from('property_locations').select('*').eq('project_id', projectId),
        supabase.from('location_zones').select('*').eq('project_id', projectId),
        supabase.from('identified_problems').select('*').eq('project_id', projectId),
        supabase.from('visit_sequences').select('*').eq('project_id', projectId),
        supabase.from('problem_tasks').select('*').eq('project_id', projectId),
      ]);

      setParts((partsRes.data || []) as PropertyPart[]);
      setLocations((locsRes.data || []) as PropertyLocation[]);
      setZones((zonesRes.data || []) as LocationZone[]);
      setProblems((probsRes.data || []) as IdentifiedProblem[]);
      setSequences(seqsRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (error) {
      console.error('Error loading documentation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate documentation stats for a zone
  const getZoneStats = (zoneId: string): DocumentationStats => {
    const zoneProblems = problems.filter(p => p.zone_id === zoneId);
    const zoneTasks = tasks.filter(t => t.zone_id === zoneId);
    
    const hasContent = zoneProblems.length > 0 || zoneTasks.length > 0;
    const hasPhotos = zoneProblems.some(p => p.photo_urls && p.photo_urls.length > 0);
    const hasVideo = sequences.some(s => s.video_url && problems.some(p => p.sequence_id === s.id && p.zone_id === zoneId));
    
    return {
      totalZones: 1,
      documentedZones: hasContent ? 1 : 0,
      partialZones: 0,
      undocumentedZones: hasContent ? 0 : 1,
      hasVideo,
      hasPhoto: hasPhotos,
      hasText: zoneProblems.some(p => p.description && p.description.length > 0),
      hasAudio: sequences.some(s => s.audio_url && problems.some(p => p.sequence_id === s.id && p.zone_id === zoneId)),
      tasksCount: zoneTasks.length,
      problemsCount: zoneProblems.length,
      progress: hasContent ? 100 : 0,
    };
  };

  // Calculate documentation stats for a location
  const getLocationStats = (locationId: string): LocationDocStats => {
    const locationZones = zones.filter(z => z.location_id === locationId);
    const location = locations.find(l => l.id === locationId);
    
    let documented = 0;
    let partial = 0;
    let hasVideo = false;
    let hasPhoto = false;
    let hasText = false;
    let hasAudio = false;
    let totalTasks = 0;
    let totalProblems = 0;

    locationZones.forEach(zone => {
      const stats = getZoneStats(zone.id);
      if (stats.documentedZones > 0) documented++;
      if (stats.partialZones > 0) partial++;
      if (stats.hasVideo) hasVideo = true;
      if (stats.hasPhoto) hasPhoto = true;
      if (stats.hasText) hasText = true;
      if (stats.hasAudio) hasAudio = true;
      totalTasks += stats.tasksCount;
      totalProblems += stats.problemsCount;
    });

    // Also count location-level sequences
    const locationSequences = sequences.filter(s => s.location_id === locationId);
    const locationProblems = problems.filter(p => p.location_id === locationId);
    
    if (locationSequences.some(s => s.video_url)) hasVideo = true;
    if (locationSequences.some(s => s.audio_url)) hasAudio = true;
    if (locationProblems.some(p => p.photo_urls?.length > 0)) hasPhoto = true;
    if (locationProblems.some(p => p.description)) hasText = true;
    totalProblems += locationProblems.filter(p => !p.zone_id).length;

    const totalZones = locationZones.length || 1; // At least 1 to avoid division by zero
    const progress = Math.round(((documented + partial * 0.5) / totalZones) * 100);

    return {
      locationId,
      locationName: location?.name || 'Unknown',
      totalZones: locationZones.length,
      documentedZones: documented,
      partialZones: partial,
      undocumentedZones: totalZones - documented - partial,
      hasVideo,
      hasPhoto,
      hasText,
      hasAudio,
      tasksCount: totalTasks,
      problemsCount: totalProblems,
      progress: Math.min(progress, 100),
    };
  };

  // Calculate documentation stats for a part
  const getPartStats = (partId: string): PartDocStats => {
    const partLocations = locations.filter(l => l.part_id === partId);
    const part = parts.find(p => p.id === partId);

    const locationStats = partLocations.map(loc => getLocationStats(loc.id));
    
    const totalZones = locationStats.reduce((sum, s) => sum + s.totalZones, 0);
    const documentedZones = locationStats.reduce((sum, s) => sum + s.documentedZones, 0);
    const partialZones = locationStats.reduce((sum, s) => sum + s.partialZones, 0);
    
    return {
      partId,
      partName: part?.name || 'Unknown',
      partType: part?.part_type || 'commune',
      locations: locationStats,
      totalZones,
      documentedZones,
      partialZones,
      undocumentedZones: totalZones - documentedZones - partialZones,
      hasVideo: locationStats.some(s => s.hasVideo),
      hasPhoto: locationStats.some(s => s.hasPhoto),
      hasText: locationStats.some(s => s.hasText),
      hasAudio: locationStats.some(s => s.hasAudio),
      tasksCount: locationStats.reduce((sum, s) => sum + s.tasksCount, 0),
      problemsCount: locationStats.reduce((sum, s) => sum + s.problemsCount, 0),
      progress: totalZones > 0 
        ? Math.round(((documentedZones + partialZones * 0.5) / totalZones) * 100)
        : 0,
    };
  };

  // Get overall project stats
  const projectStats = useMemo((): DocumentationStats => {
    const partStats = parts.map(p => getPartStats(p.id));
    
    const totalZones = partStats.reduce((sum, s) => sum + s.totalZones, 0);
    const documentedZones = partStats.reduce((sum, s) => sum + s.documentedZones, 0);
    const partialZones = partStats.reduce((sum, s) => sum + s.partialZones, 0);
    
    return {
      totalZones,
      documentedZones,
      partialZones,
      undocumentedZones: totalZones - documentedZones - partialZones,
      hasVideo: partStats.some(s => s.hasVideo),
      hasPhoto: partStats.some(s => s.hasPhoto),
      hasText: partStats.some(s => s.hasText),
      hasAudio: partStats.some(s => s.hasAudio),
      tasksCount: partStats.reduce((sum, s) => sum + s.tasksCount, 0),
      problemsCount: partStats.reduce((sum, s) => sum + s.problemsCount, 0),
      progress: totalZones > 0
        ? Math.round(((documentedZones + partialZones * 0.5) / totalZones) * 100)
        : 0,
    };
  }, [parts, locations, zones, problems, sequences, tasks]);

  // Get all parts with their documentation stats
  const partsWithStats = useMemo((): PartDocStats[] => {
    return parts.map(p => getPartStats(p.id));
  }, [parts, locations, zones, problems, sequences, tasks]);

  return {
    parts,
    locations,
    zones,
    problems,
    sequences,
    tasks,
    loading,
    projectStats,
    partsWithStats,
    getZoneStats,
    getLocationStats,
    getPartStats,
    refresh: loadAllData,
  };
};
