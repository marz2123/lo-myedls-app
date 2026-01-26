import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  MultiunitBuilding, 
  MultiunitUnit, 
  MultiunitEDLLink,
  MultiunitReport,
  ProcessingQueueItem,
  BuildingSummaryStats
} from '@/types/multiunit';

export function useMultiunitBuilding(buildingId?: string) {
  const [building, setBuilding] = useState<MultiunitBuilding | null>(null);
  const [units, setUnits] = useState<MultiunitUnit[]>([]);
  const [edlLinks, setEdlLinks] = useState<MultiunitEDLLink[]>([]);
  const [reports, setReports] = useState<MultiunitReport[]>([]);
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<BuildingSummaryStats | null>(null);

  const loadBuilding = useCallback(async () => {
    if (!buildingId) return;
    
    setLoading(true);
    try {
      const { data: buildingData, error: buildingError } = await supabase
        .from('multiunit_buildings')
        .select('*')
        .eq('id', buildingId)
        .single();
      
      if (buildingError) throw buildingError;
      setBuilding(buildingData as unknown as MultiunitBuilding);

      const { data: unitsData, error: unitsError } = await supabase
        .from('multiunit_units')
        .select('*')
        .eq('building_id', buildingId)
        .order('floor_number', { ascending: true })
        .order('unit_number', { ascending: true });
      
      if (unitsError) throw unitsError;
      setUnits(unitsData as unknown as MultiunitUnit[]);

      const unitsList = unitsData as unknown as MultiunitUnit[];
      const statsData: BuildingSummaryStats = {
        total_units: unitsList.length,
        completed_units: unitsList.filter(u => u.edl_status === 'completed' || u.edl_status === 'signed').length,
        pending_units: unitsList.filter(u => u.edl_status === 'pending').length,
        in_progress_units: unitsList.filter(u => u.edl_status === 'in_progress').length,
        critical_units: unitsList.filter(u => u.edl_status === 'critical').length,
        total_anomalies: 0,
        total_tasks: 0,
        average_quality_score: unitsList.reduce((acc, u) => acc + (u.quality_score || 0), 0) / (unitsList.length || 1)
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error loading building:', error);
      toast.error('Erreur lors du chargement de l\'immeuble');
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    loadBuilding();
  }, [loadBuilding]);

  const createBuilding = useCallback(async (data: Partial<MultiunitBuilding>, userId: string) => {
    try {
      const { data: newBuilding, error } = await supabase
        .from('multiunit_buildings')
        .insert({ ...data, user_id: userId } as any)
        .select()
        .single();
      
      if (error) throw error;
      toast.success('Immeuble créé avec succès');
      return newBuilding as unknown as MultiunitBuilding;
    } catch (error) {
      console.error('Error creating building:', error);
      toast.error('Erreur lors de la création de l\'immeuble');
      return null;
    }
  }, []);

  const createUnit = useCallback(async (data: Partial<MultiunitUnit>, userId: string) => {
    if (!buildingId) return null;
    
    try {
      const { data: newUnit, error } = await supabase
        .from('multiunit_units')
        .insert({ ...data, building_id: buildingId, user_id: userId, unit_number: data.unit_number || 'N/A' } as any)
        .select()
        .single();
      
      if (error) throw error;
      setUnits(prev => [...prev, newUnit as unknown as MultiunitUnit]);
      toast.success('Lot ajouté avec succès');
      return newUnit as unknown as MultiunitUnit;
    } catch (error) {
      console.error('Error creating unit:', error);
      toast.error('Erreur lors de l\'ajout du lot');
      return null;
    }
  }, [buildingId]);

  const updateUnit = useCallback(async (unitId: string, data: Partial<MultiunitUnit>) => {
    try {
      const { error } = await supabase
        .from('multiunit_units')
        .update(data as any)
        .eq('id', unitId);
      
      if (error) throw error;
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, ...data } : u));
      return true;
    } catch (error) {
      console.error('Error updating unit:', error);
      toast.error('Erreur lors de la mise à jour du lot');
      return false;
    }
  }, []);

  const deleteUnit = useCallback(async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('multiunit_units')
        .delete()
        .eq('id', unitId);
      
      if (error) throw error;
      setUnits(prev => prev.filter(u => u.id !== unitId));
      toast.success('Lot supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  const bulkCreateUnits = useCallback(async (unitsData: Array<{ unit_number: string } & Partial<MultiunitUnit>>, userId: string) => {
    if (!buildingId) return [];
    
    try {
      const insertData = unitsData.map(u => ({
        ...u,
        building_id: buildingId,
        user_id: userId,
        unit_number: u.unit_number
      }));
      
      const { data: newUnits, error } = await supabase
        .from('multiunit_units')
        .insert(insertData as any)
        .select();
      
      if (error) throw error;
      setUnits(prev => [...prev, ...(newUnits as unknown as MultiunitUnit[])]);
      toast.success(`${newUnits.length} lots créés avec succès`);
      return newUnits as unknown as MultiunitUnit[];
    } catch (error) {
      console.error('Error bulk creating units:', error);
      toast.error('Erreur lors de la création des lots');
      return [];
    }
  }, [buildingId]);

  const getUnitsByFloor = useCallback((floorNumber: number) => {
    return units.filter(u => u.floor_number === floorNumber);
  }, [units]);

  const getUnitsByType = useCallback((unitType: string) => {
    return units.filter(u => u.unit_type === unitType);
  }, [units]);

  const getSimilarUnits = useCallback((unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit?.similarity_group) return [];
    return units.filter(u => u.similarity_group === unit.similarity_group && u.id !== unitId);
  }, [units]);

  return {
    building,
    units,
    edlLinks,
    reports,
    processingQueue,
    loading,
    stats,
    loadBuilding,
    createBuilding,
    createUnit,
    updateUnit,
    deleteUnit,
    bulkCreateUnits,
    getUnitsByFloor,
    getUnitsByType,
    getSimilarUnits
  };
}
