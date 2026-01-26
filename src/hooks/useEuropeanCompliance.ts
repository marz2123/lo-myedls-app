import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  EUCountryNorm, 
  ComplianceResult, 
  ComplianceIssue, 
  EUCertificate,
  EDLTranslation 
} from '@/types/europeanCompliance';

interface EDLContent {
  generalInfo?: any;
  rooms?: any[];
  equipment?: any[];
  anomalies?: any[];
  tasks?: any[];
  photos?: any[];
  meters?: any[];
  keys?: any[];
  descriptions?: string[];
}

interface TranslationContent {
  title?: string;
  summary?: string;
  descriptions?: string[];
  tasks?: Array<{ title: string; description?: string }>;
  anomalies?: Array<{ type: string; description: string }>;
  rooms?: Array<{ name: string; description?: string }>;
}

export const useEuropeanCompliance = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [countryNorms, setCountryNorms] = useState<EUCountryNorm[]>([]);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [certificate, setCertificate] = useState<EUCertificate | null>(null);
  const [translations, setTranslations] = useState<EDLTranslation[]>([]);
  const { toast } = useToast();

  // Fetch all available country norms
  const fetchCountryNorms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('eu_country_norms')
        .select('*')
        .eq('is_active', true)
        .order('country_name');

      if (error) throw error;
      
      // Type assertion for the fetched data
      const typedData = (data || []).map(norm => ({
        ...norm,
        supported_languages: Array.isArray(norm.supported_languages) 
          ? norm.supported_languages 
          : JSON.parse(norm.supported_languages as string || '[]'),
        legal_references: Array.isArray(norm.legal_references)
          ? norm.legal_references
          : JSON.parse(norm.legal_references as string || '[]'),
        required_sections: Array.isArray(norm.required_sections)
          ? norm.required_sections
          : JSON.parse(norm.required_sections as string || '[]'),
        forbidden_terms: Array.isArray(norm.forbidden_terms)
          ? norm.forbidden_terms
          : JSON.parse(norm.forbidden_terms as string || '[]'),
        required_photos: Array.isArray(norm.required_photos)
          ? norm.required_photos
          : JSON.parse(norm.required_photos as string || '[]'),
      })) as EUCountryNorm[];

      setCountryNorms(typedData);
      return typedData;
    } catch (error) {
      console.error('Error fetching country norms:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les normes européennes',
        variant: 'destructive'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check EDL compliance for a specific country
  const checkCompliance = useCallback(async (
    country: string,
    edlContent: EDLContent,
    options?: {
      edlId?: string;
      projectId?: string;
      sessionId?: string;
      region?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('check-european-compliance', {
        body: {
          country,
          edlContent,
          edlId: options?.edlId,
          projectId: options?.projectId,
          sessionId: options?.sessionId,
          region: options?.region
        }
      });

      if (response.error) throw response.error;

      const result = response.data as ComplianceResult & {
        country_info: { code: string; name: string; flag: string; registration_required: boolean };
        result_id: string;
      };

      setComplianceResult({
        ...result,
        id: result.result_id,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ComplianceResult);

      toast({
        title: result.status === 'compliant' ? '✅ Conforme' : 
               result.status === 'partial' ? '⚠️ Conformité partielle' : '❌ Non conforme',
        description: `Score: ${result.compliance_score}% - ${result.issues?.length || 0} problème(s) détecté(s)`,
        variant: result.status === 'compliant' ? 'default' : 'destructive'
      });

      return result;
    } catch (error) {
      console.error('Error checking compliance:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier la conformité',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Generate European certificate
  const generateCertificate = useCallback(async (
    complianceResultId: string,
    issuerName: string,
    options?: {
      edlId?: string;
      projectId?: string;
      issuerEmail?: string;
      jurisdiction?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('generate-eu-certificate', {
        body: {
          complianceResultId,
          issuerName,
          edlId: options?.edlId,
          projectId: options?.projectId,
          issuerEmail: options?.issuerEmail,
          jurisdiction: options?.jurisdiction
        }
      });

      if (response.error) throw response.error;

      const cert = response.data.certificate as EUCertificate;
      setCertificate(cert);

      toast({
        title: '🏆 Certificat généré',
        description: `Certificat ${cert.certificate_number} créé avec succès`
      });

      return cert;
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer le certificat',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Translate EDL content
  const translateEDL = useCallback(async (
    sourceLanguage: string,
    targetLanguage: string,
    content: TranslationContent,
    translationType: 'full' | 'summary' | 'tasks' | 'anomalies' | 'descriptions' = 'full',
    options?: {
      edlId?: string;
      projectId?: string;
      sessionId?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('translate-edl', {
        body: {
          sourceLanguage,
          targetLanguage,
          translationType,
          content,
          edlId: options?.edlId,
          projectId: options?.projectId,
          sessionId: options?.sessionId
        }
      });

      if (response.error) throw response.error;

      const translation = response.data as {
        translation_id: string;
        translated_content: any;
      };

      toast({
        title: '🌍 Traduction terminée',
        description: `Contenu traduit de ${sourceLanguage.toUpperCase()} vers ${targetLanguage.toUpperCase()}`
      });

      return translation;
    } catch (error) {
      console.error('Error translating EDL:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traduire le contenu',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch existing translations for an EDL
  const fetchTranslations = useCallback(async (edlId?: string, projectId?: string) => {
    try {
      let query = supabase.from('edl_translations').select('*');
      
      if (edlId) {
        query = query.eq('edl_id', edlId);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        return [];
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      setTranslations(data as EDLTranslation[]);
      return data as EDLTranslation[];
    } catch (error) {
      console.error('Error fetching translations:', error);
      return [];
    }
  }, []);

  // Fetch existing certificates for an EDL
  const fetchCertificates = useCallback(async (edlId?: string, projectId?: string) => {
    try {
      let query = supabase.from('edl_certificates_eu').select('*');
      
      if (edlId) {
        query = query.eq('edl_id', edlId);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        return [];
      }

      const { data, error } = await query.eq('is_valid', true).order('created_at', { ascending: false });
      if (error) throw error;

      return data as EUCertificate[];
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return [];
    }
  }, []);

  return {
    isLoading,
    countryNorms,
    complianceResult,
    certificate,
    translations,
    fetchCountryNorms,
    checkCompliance,
    generateCertificate,
    translateEDL,
    fetchTranslations,
    fetchCertificates
  };
};
