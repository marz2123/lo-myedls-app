import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CompanyType = 'archi_home' | 'bati_home' | 'deco_home' | 'opti_home';
export type EdlType = 'entree' | 'sortie' | 'technique' | 'comparatif';
export type EdlStatus = 'draft' | 'in_progress' | 'completed' | 'signed';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface Site {
  id: string;
  project_id: string | null;
  user_id: string;
  company: CompanyType;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  building_type: string | null;
  building_identifier: string | null;
  surface_m2: number | null;
  rooms_count: number | null;
  floors_count: number | null;
  units_count: number | null;
  metadata: Record<string, any>;
  myhome_project_id: string | null;
  myhome_sync_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Edl {
  id: string;
  site_id: string;
  user_id: string;
  visit_session_id: string | null;
  edl_type: EdlType;
  status: EdlStatus;
  score: number | null;
  anomalies_count: number;
  tasks_count: number;
  photos_count: number;
  company: CompanyType | null;
  assigned_to: string | null;
  signed_at: string | null;
  signed_by: any;
  sync_state: SyncStatus;
  myhome_edl_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  site?: Site;
}

export interface SyncLog {
  id: string;
  edl_id: string | null;
  site_id: string | null;
  sync_type: string;
  status: SyncStatus;
  items_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectAccess {
  id: string;
  site_id: string;
  user_id: string;
  role: string;
  permissions: {
    read: boolean;
    write: boolean;
    sign: boolean;
    export: boolean;
  };
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

export const COMPANY_LABELS: Record<CompanyType, string> = {
  archi_home: 'Archi Home',
  bati_home: 'Bati Home',
  deco_home: 'Déco Home',
  opti_home: 'Opti Home',
};

export const COMPANY_COLORS: Record<CompanyType, string> = {
  archi_home: 'bg-blue-500',
  bati_home: 'bg-orange-500',
  deco_home: 'bg-pink-500',
  opti_home: 'bg-green-500',
};

export const EDL_TYPE_LABELS: Record<EdlType, string> = {
  entree: 'État des lieux d\'entrée',
  sortie: 'État des lieux de sortie',
  technique: 'Visite technique',
  comparatif: 'Comparatif entrée/sortie',
};

export const EDL_STATUS_LABELS: Record<EdlStatus, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  completed: 'Terminé',
  signed: 'Signé',
};

export function useMultiSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [edls, setEdls] = useState<Edl[]>([]);
  const [recentEdls, setRecentEdls] = useState<Edl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null);
  const { toast } = useToast();

  const fetchSites = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSites((data || []) as Site[]);
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les sites',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchEdls = useCallback(async (siteId?: string) => {
    try {
      let query = supabase
        .from('edls')
        .select('*, site:sites(*)')
        .order('updated_at', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEdls((data || []) as Edl[]);
    } catch (error: any) {
      console.error('Error fetching EDLs:', error);
    }
  }, []);

  const fetchRecentEdls = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('edls')
        .select('*, site:sites(*)')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEdls((data || []) as Edl[]);
    } catch (error: any) {
      console.error('Error fetching recent EDLs:', error);
    }
  }, []);

  const createSite = useCallback(async (siteData: Partial<Site>): Promise<Site | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const insertData = {
        name: siteData.name || 'Nouveau site',
        user_id: user.id,
        company: siteData.company || 'bati_home',
        address: siteData.address || null,
        city: siteData.city || null,
        postal_code: siteData.postal_code || null,
        building_type: siteData.building_type || null,
        building_identifier: siteData.building_identifier || null,
        surface_m2: siteData.surface_m2 || null,
        rooms_count: siteData.rooms_count || null,
        floors_count: siteData.floors_count || null,
        units_count: siteData.units_count || null,
        project_id: siteData.project_id || null,
      };

      const { data, error } = await supabase
        .from('sites')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Site créé',
        description: `Le site "${siteData.name}" a été créé avec succès.`,
      });

      await fetchSites();
      return data as Site;
    } catch (error: any) {
      console.error('Error creating site:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le site',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchSites]);

  const createEdl = useCallback(async (edlData: Partial<Edl>): Promise<Edl | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      if (!edlData.site_id) throw new Error('Site ID requis');

      const insertData = {
        site_id: edlData.site_id,
        user_id: user.id,
        edl_type: edlData.edl_type || 'entree',
        status: edlData.status || 'draft',
        company: edlData.company || null,
        visit_session_id: edlData.visit_session_id || null,
      };

      const { data, error } = await supabase
        .from('edls')
        .insert(insertData)
        .select('*, site:sites(*)')
        .single();

      if (error) throw error;

      toast({
        title: 'EDL créé',
        description: 'L\'état des lieux a été créé avec succès.',
      });

      await fetchRecentEdls();
      return data as Edl;
    } catch (error: any) {
      console.error('Error creating EDL:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer l\'EDL',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchRecentEdls]);

  const updateEdl = useCallback(async (edlId: string, updates: Partial<Edl>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('edls')
        .update(updates)
        .eq('id', edlId);

      if (error) throw error;

      await fetchRecentEdls();
      return true;
    } catch (error: any) {
      console.error('Error updating EDL:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'EDL',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchRecentEdls]);

  const grantAccess = useCallback(async (
    siteId: string,
    userId: string,
    role: string,
    permissions: ProjectAccess['permissions']
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('project_access')
        .insert({
          site_id: siteId,
          user_id: userId,
          role,
          permissions,
          granted_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Accès accordé',
        description: 'L\'utilisateur a maintenant accès au site.',
      });

      return true;
    } catch (error: any) {
      console.error('Error granting access:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'accorder l\'accès',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSites(), fetchRecentEdls()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchSites, fetchRecentEdls]);

  return {
    sites,
    edls,
    recentEdls,
    isLoading,
    selectedSite,
    selectedCompany,
    setSelectedSite,
    setSelectedCompany,
    fetchSites,
    fetchEdls,
    fetchRecentEdls,
    createSite,
    createEdl,
    updateEdl,
    grantAccess,
  };
}
