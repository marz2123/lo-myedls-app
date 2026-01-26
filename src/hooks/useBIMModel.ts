import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  BIMModel, 
  BIMObject, 
  BIMSurface, 
  BIMMetrics,
  BIMExportOptions 
} from '@/types/bim';

export const useBIMModel = (projectId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState<BIMModel | null>(null);
  const [objects, setObjects] = useState<BIMObject[]>([]);
  const [surfaces, setSurfaces] = useState<BIMSurface[]>([]);
  const [metrics, setMetrics] = useState<BIMMetrics | null>(null);

  // Load existing BIM model
  const loadBIMModel = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Load model
      const { data: modelData } = await supabase
        .from('edl_bim_models')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (modelData) {
        setModel(modelData as unknown as BIMModel);

        // Load objects
        const { data: objectsData } = await supabase
          .from('edl_bim_objects')
          .select('*')
          .eq('model_id', modelData.id)
          .order('object_type');

        if (objectsData) {
          setObjects(objectsData as unknown as BIMObject[]);
        }

        // Load surfaces
        const { data: surfacesData } = await supabase
          .from('edl_bim_surfaces')
          .select('*')
          .eq('model_id', modelData.id)
          .order('room_name');

        if (surfacesData) {
          setSurfaces(surfacesData as unknown as BIMSurface[]);
        }

        // Calculate metrics
        calculateMetrics(
          objectsData as unknown as BIMObject[] || [],
          surfacesData as unknown as BIMSurface[] || []
        );
      }
    } catch (error) {
      console.error('Error loading BIM model:', error);
      toast.error('Erreur lors du chargement du modèle BIM');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Calculate metrics from objects and surfaces
  const calculateMetrics = (objData: BIMObject[], surfData: BIMSurface[]) => {
    const totalSurface = surfData.reduce((sum, s) => sum + s.surface_m2, 0);
    const totalVolume = surfData.reduce((sum, s) => sum + s.volume_m3, 0);

    // Group materials
    const materialMap = new Map<string, number>();
    objData.forEach(obj => {
      if (obj.material_name && obj.area_m2) {
        const current = materialMap.get(obj.material_name) || 0;
        materialMap.set(obj.material_name, current + obj.area_m2);
      }
    });

    const materials = Array.from(materialMap.entries()).map(([name, area]) => ({
      name,
      area: Math.round(area * 100) / 100
    }));

    // By room
    const byRoom = surfData.map(s => ({
      name: s.room_name,
      surface: s.surface_m2,
      volume: s.volume_m3,
      objectCount: objData.filter(o => o.room_id === s.room_id).length
    }));

    setMetrics({
      totalSurface: Math.round(totalSurface * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      roomCount: surfData.length,
      objectCount: objData.length,
      anomalyCount: objData.reduce((sum, o) => sum + (o.anomalies?.length || 0), 0),
      taskCount: objData.reduce((sum, o) => sum + (o.linked_task_ids?.length || 0), 0),
      materials,
      byRoom
    });
  };

  // Generate BIM model from project data
  const generateBIMModel = useCallback(async () => {
    if (!projectId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bim-model', {
        body: { 
          projectId,
          options: {
            analyzeVideos: true,
            analyzePhotos: true,
            detectMaterials: true,
            detectEquipment: true
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Modèle BIM généré avec succès');
        await loadBIMModel();
        return data.model as BIMModel;
      }
    } catch (error) {
      console.error('Error generating BIM model:', error);
      toast.error('Erreur lors de la génération du modèle BIM');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, loadBIMModel]);

  // Export BIM model
  const exportModel = useCallback(async (options: BIMExportOptions) => {
    if (!model) {
      toast.error('Aucun modèle BIM disponible');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('export-bim-model', {
        body: { 
          modelId: model.id,
          options
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Download the file
        window.open(data.url, '_blank');
        toast.success(`Export ${options.format.toUpperCase()} téléchargé`);
      }
    } catch (error) {
      console.error('Error exporting BIM model:', error);
      toast.error('Erreur lors de l\'export du modèle');
    }
  }, [model]);

  // Get object by ID
  const getObjectById = useCallback((objectId: string) => {
    return objects.find(o => o.id === objectId);
  }, [objects]);

  // Get objects by room
  const getObjectsByRoom = useCallback((roomId: string) => {
    return objects.filter(o => o.room_id === roomId);
  }, [objects]);

  // Get objects by type
  const getObjectsByType = useCallback((type: string) => {
    return objects.filter(o => o.object_type === type);
  }, [objects]);

  // Get surface by room
  const getSurfaceByRoom = useCallback((roomId: string) => {
    return surfaces.find(s => s.room_id === roomId);
  }, [surfaces]);

  // Load on mount
  useEffect(() => {
    loadBIMModel();
  }, [loadBIMModel]);

  return {
    isLoading,
    isGenerating,
    model,
    objects,
    surfaces,
    metrics,
    loadBIMModel,
    generateBIMModel,
    exportModel,
    getObjectById,
    getObjectsByRoom,
    getObjectsByType,
    getSurfaceByRoom
  };
};
