import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EDLRoom {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'anomalies';
  photoCount: number;
  anomalyCount: number;
  completionPercent: number;
  items: EDLItem[];
}

export interface EDLItem {
  id: string;
  roomId: string;
  name: string;
  condition: 'bon' | 'moyen' | 'mauvais' | null;
  description: string;
  photos: string[];
  anomalies: EDLAnomaly[];
  tasks: EDLTask[];
}

export interface EDLAnomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  roomName?: string;
  itemName?: string;
}

export interface EDLTask {
  id: string;
  title: string;
  familyCode: string;
  familyName: string;
  category: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  validated: boolean;
}

export interface LiveEDLReport {
  projectId: string;
  address: string;
  city: string;
  postalCode: string;
  propertyType: string;
  edlType: string;
  date: string;
  performedBy: string;
  completionScore: number;
  totalRooms: number;
  completedRooms: number;
  totalPhotos: number;
  totalAnomalies: number;
  totalTasks: number;
  urgentTasks: number;
  rooms: EDLRoom[];
  allAnomalies: EDLAnomaly[];
  allTasks: EDLTask[];
  allPhotos: Array<{
    id: string;
    url: string;
    roomName: string;
    timestamp: string;
    caption?: string;
  }>;
  summary: {
    global: string;
    anomaliesSummary: string;
    tasksSummary: string;
  };
  lastUpdated: Date;
}

export const useLiveEDLReport = (projectId: string) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<LiveEDLReport | null>(null);
  const [lastUpdate, setLastUpdate] = useState<'photo' | 'anomaly' | 'task' | 'room' | null>(null);

  const fetchReportData = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch all data in parallel
      const [
        projectResult,
        locationsResult,
        framesResult,
        tasksResult,
        anomaliesResult,
        sequencesResult
      ] = await Promise.all([
        supabase.from('edl_projects').select('*').eq('id', projectId).single(),
        supabase.from('property_locations').select('*').eq('project_id', projectId),
        supabase.from('extracted_frames').select('*').eq('visit_session_id', projectId),
        supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
        supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
        supabase.from('visit_sequences').select('*').eq('project_id', projectId)
      ]);

      const [ftRes, ctRes, scRes] = await Promise.all([
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label'),
      ]);

      const project = projectResult.data;
      if (!project) throw new Error('Project not found');

      const locations = locationsResult.data || [];
      const frames = framesResult.data || [];
      const ftMap = new Map(ftRes.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctRes.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scRes.data?.map(sc => [sc.id, sc]) || []);

      const tasks = (tasksResult.data || []).map((t: any) => {
        const ft = t.family_id ? ftMap.get(t.family_id) : null;
        const ct = t.category_id ? ctMap.get(t.category_id) : null;
        const sc = t.subcategory_id ? scMap.get(t.subcategory_id) : null;
        return {
          ...t,
          task_families: ft ? { code: ft.ft_code, name: ft.ft_label } : null,
          task_categories: ct ? { code: ct.ct_code, name: ct.ct_label } : null,
          task_subcategories: sc ? { code: sc.sc_code, name: sc.sc_label } : null,
        };
      });
      const anomalies = anomaliesResult.data || [];
      const sequences = sequencesResult.data || [];

      // Build rooms from locations + sequences
      const roomMap = new Map<string, EDLRoom>();
      
      locations.forEach((loc: any) => {
        const roomId = loc.id;
        const roomAnomalies = anomalies.filter((a: any) => 
          a.location_data?.location_id === roomId
        );
        const roomPhotos = frames.filter((f: any) => 
          f.location_id === roomId
        );
        
        roomMap.set(roomId, {
          id: roomId,
          name: loc.name || loc.location_type || 'Zone',
          status: roomAnomalies.length > 0 ? 'anomalies' : 
                  roomPhotos.length > 0 ? 'in_progress' : 'not_started',
          photoCount: roomPhotos.length,
          anomalyCount: roomAnomalies.length,
          completionPercent: Math.min(100, roomPhotos.length * 20),
          items: []
        });
      });

      // Add rooms from sequences
      sequences.forEach((seq: any) => {
        const roomName = seq.room_name || seq.lieu_name || 'Zone';
        if (!Array.from(roomMap.values()).find(r => r.name === roomName)) {
          roomMap.set(seq.id, {
            id: seq.id,
            name: roomName,
            status: 'in_progress',
            photoCount: 0,
            anomalyCount: 0,
            completionPercent: 50,
            items: []
          });
        }
      });

      // Format anomalies
      const allAnomalies: EDLAnomaly[] = anomalies.map((a: any) => ({
        id: a.id,
        type: a.anomaly_type,
        severity: a.severity as any,
        description: a.description,
        confidence: a.confidence_score || 0.8,
        roomName: a.location_data?.room_name,
        itemName: a.location_data?.element
      }));

      // Format tasks
      const allTasks: EDLTask[] = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        familyCode: t.task_families?.code || 'F-ÀVérifier',
        familyName: t.task_families?.name || 'À vérifier',
        category: t.task_categories?.name || '',
        priority: (t.priority as any) || 'normale',
        validated: false
      }));

      // Format photos
      const allPhotos = frames.map((f: any) => ({
        id: f.id,
        url: f.frame_url,
        roomName: f.manual_label || 'Capture',
        timestamp: f.created_at,
        caption: f.manual_label
      }));

      // Calculate scores
      const rooms = Array.from(roomMap.values());
      const completedRooms = rooms.filter(r => r.completionPercent >= 80).length;
      const completionScore = rooms.length > 0 
        ? Math.round(rooms.reduce((sum, r) => sum + r.completionPercent, 0) / rooms.length)
        : 0;

      // Generate summaries
      const generateGlobalSummary = () => {
        let summary = `État des lieux réalisé le ${new Date().toLocaleDateString('fr-FR')} pour le bien situé au ${project.address}, ${project.postal_code} ${project.city}. `;
        summary += `${rooms.length} zone(s) inspectée(s), ${allPhotos.length} photo(s) prise(s). `;
        if (allAnomalies.length > 0) {
          summary += `${allAnomalies.length} anomalie(s) détectée(s). `;
        }
        if (allTasks.length > 0) {
          const urgentCount = allTasks.filter(t => t.priority === 'urgente').length;
          summary += `${allTasks.length} tâche(s) générée(s)${urgentCount > 0 ? `, dont ${urgentCount} urgente(s)` : ''}.`;
        }
        return summary;
      };

      const generateAnomaliesSummary = () => {
        if (allAnomalies.length === 0) return 'Aucune anomalie détectée.';
        const bySeverity = allAnomalies.reduce((acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        let summary = `${allAnomalies.length} anomalie(s) identifiée(s): `;
        if (bySeverity.critical) summary += `${bySeverity.critical} critique(s), `;
        if (bySeverity.high) summary += `${bySeverity.high} haute(s), `;
        if (bySeverity.medium) summary += `${bySeverity.medium} moyenne(s), `;
        if (bySeverity.low) summary += `${bySeverity.low} faible(s).`;
        return summary.replace(/, $/, '.');
      };

      const generateTasksSummary = () => {
        if (allTasks.length === 0) return 'Aucune tâche générée.';
        const byFamily = allTasks.reduce((acc, t) => {
          acc[t.familyName] = (acc[t.familyName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const families = Object.entries(byFamily)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => `${name} (${count})`)
          .join(', ');
        return `${allTasks.length} tâche(s) répartie(s) principalement: ${families}.`;
      };

      setReport({
        projectId,
        address: project.address,
        city: project.city || '',
        postalCode: project.postal_code || '',
        propertyType: project.property_type || 'immeuble',
        edlType: 'Avant travaux',
        date: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        performedBy: user?.email?.split('@')[0] || 'MyEDLs',
        completionScore,
        totalRooms: rooms.length,
        completedRooms,
        totalPhotos: allPhotos.length,
        totalAnomalies: allAnomalies.length,
        totalTasks: allTasks.length,
        urgentTasks: allTasks.filter(t => t.priority === 'urgente').length,
        rooms,
        allAnomalies,
        allTasks,
        allPhotos,
        summary: {
          global: generateGlobalSummary(),
          anomaliesSummary: generateAnomaliesSummary(),
          tasksSummary: generateTasksSummary()
        },
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error fetching EDL report data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du rapport',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  // Initial fetch
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Subscribe to frames changes
    const framesChannel = supabase
      .channel('live-edl-frames')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extracted_frames'
      }, () => {
        setLastUpdate('photo');
        fetchReportData();
      })
      .subscribe();
    channels.push(framesChannel);

    // Subscribe to anomalies changes
    const anomaliesChannel = supabase
      .channel('live-edl-anomalies')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'detected_anomalies',
        filter: `project_id=eq.${projectId}`
      }, () => {
        setLastUpdate('anomaly');
        fetchReportData();
      })
      .subscribe();
    channels.push(anomaliesChannel);

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('live-edl-tasks')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'extracted_tasks',
        filter: `project_id=eq.${projectId}`
      }, () => {
        setLastUpdate('task');
        fetchReportData();
      })
      .subscribe();
    channels.push(tasksChannel);

    // Subscribe to sequences changes
    const sequencesChannel = supabase
      .channel('live-edl-sequences')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'visit_sequences',
        filter: `project_id=eq.${projectId}`
      }, () => {
        setLastUpdate('room');
        fetchReportData();
      })
      .subscribe();
    channels.push(sequencesChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [projectId, fetchReportData]);

  // Clear last update after animation
  useEffect(() => {
    if (lastUpdate) {
      const timer = setTimeout(() => setLastUpdate(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate]);

  return {
    report,
    loading,
    lastUpdate,
    refresh: fetchReportData
  };
};
