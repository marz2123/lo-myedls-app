import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  PropertyPart,
  PropertyLocation,
  LocationZone,
  PropertyComposition,
  PropertyPartType,
  ZoneType,
  ConditionState,
} from '@/types/businessModel';

export const usePropertyStructure = (projectId: string | undefined) => {
  const [composition, setComposition] = useState<PropertyComposition | null>(null);
  const [parts, setParts] = useState<PropertyPart[]>([]);
  const [locations, setLocations] = useState<PropertyLocation[]>([]);
  const [zones, setZones] = useState<LocationZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all structure data
  const loadStructure = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      // Load composition
      const { data: compData } = await supabase
        .from('property_composition')
        .select('*')
        .eq('project_id', projectId)
        .single();
      
      setComposition(compData as PropertyComposition | null);

      // Load parts with locations
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');
      
      setParts((partsData || []) as PropertyPart[]);

      // Load all locations for project
      const { data: locsData } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');
      
      setLocations((locsData || []) as PropertyLocation[]);

      // Load all zones for project
      const { data: zonesData } = await supabase
        .from('location_zones')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');
      
      setZones((zonesData || []) as LocationZone[]);

    } catch (error) {
      console.error('Error loading property structure:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  // Create or update composition
  const saveComposition = async (data: Partial<PropertyComposition>) => {
    if (!projectId) return null;

    try {
      if (composition?.id) {
        const { data: updated, error } = await supabase
          .from('property_composition')
          .update(data)
          .eq('id', composition.id)
          .select()
          .single();
        
        if (error) throw error;
        setComposition(updated as PropertyComposition);
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('property_composition')
          .insert({ ...data, project_id: projectId })
          .select()
          .single();
        
        if (error) throw error;
        setComposition(created as PropertyComposition);
        return created;
      }
    } catch (error) {
      console.error('Error saving composition:', error);
      toast.error('Erreur lors de la sauvegarde');
      return null;
    }
  };

  // Create a part
  const createPart = async (partType: PropertyPartType, name: string, description?: string) => {
    if (!projectId) return null;

    try {
      const { data, error } = await supabase
        .from('property_parts')
        .insert({
          project_id: projectId,
          part_type: partType,
          name,
          description,
          order_index: parts.length,
        })
        .select()
        .single();
      
      if (error) throw error;
      setParts(prev => [...prev, data as PropertyPart]);
      return data;
    } catch (error) {
      console.error('Error creating part:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  };

  // Create a location
  const createLocation = async (
    partId: string,
    name: string,
    locationType?: string,
    floorLevel?: string
  ) => {
    if (!projectId) return null;

    try {
      const { data, error } = await supabase
        .from('property_locations')
        .insert({
          project_id: projectId,
          part_id: partId,
          name,
          location_type: locationType,
          floor_level: floorLevel,
          order_index: locations.filter(l => l.part_id === partId).length,
        })
        .select()
        .single();
      
      if (error) throw error;
      setLocations(prev => [...prev, data as PropertyLocation]);
      return data;
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  };

  // Create a zone
  const createZone = async (
    locationId: string,
    zoneType: ZoneType,
    customName?: string
  ) => {
    if (!projectId) return null;

    try {
      const { data, error } = await supabase
        .from('location_zones')
        .insert({
          project_id: projectId,
          location_id: locationId,
          zone_type: zoneType,
          custom_name: customName,
          order_index: zones.filter(z => z.location_id === locationId).length,
        })
        .select()
        .single();
      
      if (error) throw error;
      setZones(prev => [...prev, data as LocationZone]);
      return data;
    } catch (error) {
      console.error('Error creating zone:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  };

  // Update location condition
  const updateLocationCondition = async (locationId: string, condition: ConditionState) => {
    try {
      const { error } = await supabase
        .from('property_locations')
        .update({ overall_condition: condition })
        .eq('id', locationId);
      
      if (error) throw error;
      setLocations(prev => 
        prev.map(l => l.id === locationId ? { ...l, overall_condition: condition } : l)
      );
    } catch (error) {
      console.error('Error updating condition:', error);
    }
  };

  // Delete a part (cascades to locations and zones)
  const deletePart = async (partId: string) => {
    try {
      const { error } = await supabase
        .from('property_parts')
        .delete()
        .eq('id', partId);
      
      if (error) throw error;
      setParts(prev => prev.filter(p => p.id !== partId));
      setLocations(prev => prev.filter(l => l.part_id !== partId));
      toast.success('Partie supprimée');
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Delete a location
  const deleteLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('property_locations')
        .delete()
        .eq('id', locationId);
      
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== locationId));
      setZones(prev => prev.filter(z => z.location_id !== locationId));
      toast.success('Lieu supprimé');
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Get locations for a specific part
  const getLocationsForPart = (partId: string) => {
    return locations.filter(l => l.part_id === partId);
  };

  // Get zones for a specific location
  const getZonesForLocation = (locationId: string) => {
    return zones.filter(z => z.location_id === locationId);
  };

  // Initialize default structure for a project
  const initializeDefaultStructure = async () => {
    if (!projectId || parts.length > 0) return;

    try {
      // Create default parts
      const communePart = await createPart('commune', 'Parties Communes');
      const privativePart = await createPart('privative', 'Parties Privatives');

      toast.success('Structure initiale créée');
      return { communePart, privativePart };
    } catch (error) {
      console.error('Error initializing structure:', error);
    }
  };

  return {
    composition,
    parts,
    locations,
    zones,
    loading,
    loadStructure,
    saveComposition,
    createPart,
    createLocation,
    createZone,
    updateLocationCondition,
    deletePart,
    deleteLocation,
    getLocationsForPart,
    getZonesForLocation,
    initializeDefaultStructure,
  };
};
