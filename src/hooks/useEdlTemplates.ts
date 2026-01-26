import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RoomConfig {
  name: string;
  type: string;
}

export interface EdlTemplate {
  id: string;
  name: string;
  description: string | null;
  owner_type: 'user' | 'company' | 'myhome';
  owner_id: string | null;
  company: string | null;
  template_type: 'standard' | 'entree' | 'sortie' | 'technique' | 'audit' | 'commercial';
  property_type: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  is_featured: boolean;
  rooms_config: RoomConfig[];
  elements_config: Record<string, string[]>;
  ai_rules: Record<string, any>;
  ft_mapping: Record<string, string>;
  norms_references: string[];
  checklists: any[];
  preloaded_tasks: any[];
  min_photos_required: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateRule {
  id: string;
  template_id: string;
  rule_type: string;
  rule_name: string;
  rule_data: Record<string, any>;
  is_active: boolean;
  priority: number;
}

export interface TemplateUsage {
  id: string;
  template_id: string;
  user_id: string;
  edl_id: string | null;
  applied_at: string;
  auto_applied: boolean;
  ai_confidence: number | null;
  feedback: 'positive' | 'negative' | 'neutral' | null;
}

export function useEdlTemplates() {
  const [templates, setTemplates] = useState<EdlTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<EdlTemplate[]>([]);
  const [featuredTemplates, setFeaturedTemplates] = useState<EdlTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('edl_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map(t => ({
        ...t,
        rooms_config: (t.rooms_config as unknown) as RoomConfig[],
        elements_config: (t.elements_config as unknown) as Record<string, string[]>,
        ai_rules: (t.ai_rules as unknown) as Record<string, any>,
        ft_mapping: (t.ft_mapping as unknown) as Record<string, string>,
        norms_references: (t.norms_references as unknown) as string[],
        checklists: (t.checklists as unknown) as any[],
        preloaded_tasks: (t.preloaded_tasks as unknown) as any[],
      })) as EdlTemplate[];

      setTemplates(typedData);
      setFeaturedTemplates(typedData.filter(t => t.is_featured));

      // Get current user's templates
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMyTemplates(typedData.filter(t => t.owner_id === user.id));
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Erreur lors du chargement des modèles');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplate = useCallback(async (templateId: string): Promise<EdlTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('edl_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      return {
        ...data,
        rooms_config: (data.rooms_config as unknown) as RoomConfig[],
        elements_config: (data.elements_config as unknown) as Record<string, string[]>,
        ai_rules: (data.ai_rules as unknown) as Record<string, any>,
        ft_mapping: (data.ft_mapping as unknown) as Record<string, string>,
        norms_references: (data.norms_references as unknown) as string[],
        checklists: (data.checklists as unknown) as any[],
        preloaded_tasks: (data.preloaded_tasks as unknown) as any[],
      } as EdlTemplate;
    } catch (err) {
      console.error('Error fetching template:', err);
      return null;
    }
  }, []);

  const createTemplate = useCallback(async (template: Partial<EdlTemplate>): Promise<EdlTemplate | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const insertData: any = {
        name: template.name || 'Nouveau modèle',
        description: template.description,
        owner_id: user.id,
        owner_type: 'user',
        template_type: template.template_type || 'standard',
        property_type: template.property_type,
        is_public: template.is_public || false,
        rooms_config: JSON.parse(JSON.stringify(template.rooms_config || [])),
        elements_config: JSON.parse(JSON.stringify(template.elements_config || {})),
        ai_rules: JSON.parse(JSON.stringify(template.ai_rules || {})),
        min_photos_required: template.min_photos_required || 0,
      };

      const { data, error } = await supabase
        .from('edl_templates')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Modèle créé",
        description: "Votre modèle a été enregistré avec succès",
      });

      await fetchTemplates();
      return data as unknown as EdlTemplate;
    } catch (err) {
      console.error('Error creating template:', err);
      toast({
        title: "Erreur",
        description: "Impossible de créer le modèle",
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchTemplates]);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<EdlTemplate>): Promise<boolean> => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.template_type !== undefined) updateData.template_type = updates.template_type;
      if (updates.property_type !== undefined) updateData.property_type = updates.property_type;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      if (updates.rooms_config !== undefined) updateData.rooms_config = JSON.parse(JSON.stringify(updates.rooms_config));
      if (updates.elements_config !== undefined) updateData.elements_config = JSON.parse(JSON.stringify(updates.elements_config));
      if (updates.ai_rules !== undefined) updateData.ai_rules = JSON.parse(JSON.stringify(updates.ai_rules));
      if (updates.min_photos_required !== undefined) updateData.min_photos_required = updates.min_photos_required;

      const { error } = await supabase
        .from('edl_templates')
        .update(updateData)
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Modèle mis à jour",
        description: "Les modifications ont été enregistrées",
      });

      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('Error updating template:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le modèle",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchTemplates]);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('edl_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Modèle supprimé",
        description: "Le modèle a été supprimé",
      });

      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle",
        variant: "destructive",
      });
      return false;
    }
  }, [toast, fetchTemplates]);

  const duplicateTemplate = useCallback(async (templateId: string, newName: string): Promise<EdlTemplate | null> => {
    try {
      const original = await getTemplate(templateId);
      if (!original) throw new Error('Template not found');

      const { id, created_at, updated_at, owner_id, usage_count, ...rest } = original;
      
      return await createTemplate({
        ...rest,
        name: newName,
        is_public: false,
        is_featured: false,
      });
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer le modèle",
        variant: "destructive",
      });
      return null;
    }
  }, [getTemplate, createTemplate, toast]);

  const recordTemplateUsage = useCallback(async (
    templateId: string, 
    edlId?: string, 
    autoApplied = false, 
    aiConfidence?: number
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('edl_template_usage').insert({
        template_id: templateId,
        user_id: user.id,
        edl_id: edlId,
        auto_applied: autoApplied,
        ai_confidence: aiConfidence,
      });

      // Increment usage count (manual update since RPC doesn't exist)
      const template = await getTemplate(templateId);
      if (template) {
        await supabase
          .from('edl_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', templateId);
      }
    } catch (err) {
      console.error('Error recording usage:', err);
    }
  }, [getTemplate]);

  const getTemplatesByType = useCallback((type: string): EdlTemplate[] => {
    return templates.filter(t => t.template_type === type || t.property_type === type);
  }, [templates]);

  const getTemplatesByCompany = useCallback((company: string): EdlTemplate[] => {
    return templates.filter(t => t.company === company);
  }, [templates]);

  const searchTemplates = useCallback((query: string): EdlTemplate[] => {
    const lower = query.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(lower) ||
      t.description?.toLowerCase().includes(lower) ||
      t.company?.toLowerCase().includes(lower)
    );
  }, [templates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    myTemplates,
    featuredTemplates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    recordTemplateUsage,
    getTemplatesByType,
    getTemplatesByCompany,
    searchTemplates,
  };
}
