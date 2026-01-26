export interface EUCountryNorm {
  id: string;
  country_code: string;
  country_name: string;
  country_name_local: string;
  flag_emoji: string;
  default_language: string;
  supported_languages: string[];
  legal_references: Array<{ code: string; name: string }>;
  required_sections: Array<{ id: string; required: boolean }>;
  forbidden_terms: Array<{ term: string; severity: 'high' | 'medium' | 'low' }>;
  required_photos: Array<{ type: string; required: boolean }>;
  document_format: Record<string, any>;
  regional_variations: any[];
  signature_requirements: Record<string, any>;
  registration_required: boolean;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceIssue {
  id: string;
  type: 'missing_section' | 'forbidden_term' | 'missing_photo' | 'format_error' | 'incomplete_data';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion?: string;
  location?: string;
  norm_reference?: string;
}

export interface ComplianceCorrection {
  issue_id: string;
  original: string;
  corrected: string;
  applied: boolean;
}

export interface ComplianceResult {
  id: string;
  edl_id?: string;
  project_id?: string;
  session_id?: string;
  country: string;
  region?: string;
  compliance_score: number;
  status: 'pending' | 'compliant' | 'partial' | 'non_compliant';
  issues: ComplianceIssue[];
  corrections: ComplianceCorrection[];
  applied_norms: Array<{ code: string; name: string }>;
  forbidden_terms_detected: ComplianceIssue[];
  missing_requirements: ComplianceIssue[];
  audit_metadata: Record<string, any>;
  audited_at?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EUCertificate {
  id: string;
  edl_id?: string;
  project_id?: string;
  compliance_result_id: string;
  country: string;
  region?: string;
  certificate_number: string;
  pdf_url?: string;
  hash: string;
  issuer_name: string;
  issuer_email?: string;
  jurisdiction?: string;
  norms_applied: Array<{ code: string; name: string }>;
  compliance_score: number;
  requirements_met: any[];
  requirements_corrected: any[];
  signature_data?: any;
  is_valid: boolean;
  issued_at: string;
  expires_at?: string;
  metadata: Record<string, any>;
  user_id: string;
  created_at: string;
}

export interface EDLTranslation {
  id: string;
  edl_id?: string;
  project_id?: string;
  session_id?: string;
  source_language: string;
  target_language: string;
  translation_type: 'full' | 'summary' | 'tasks' | 'anomalies' | 'descriptions';
  original_content: any;
  translated_content: any;
  pdf_url?: string;
  quality_score?: number;
  is_certified: boolean;
  translated_at: string;
  translator_model?: string;
  metadata: Record<string, any>;
  user_id: string;
  created_at: string;
}

export const SUPPORTED_COUNTRIES = [
  { code: 'FR', name: 'France', flag: '🇫🇷', languages: ['fr', 'en'] },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', languages: ['fr', 'nl', 'en', 'de'] },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', languages: ['fr', 'de', 'en', 'lb'] },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', languages: ['fr', 'de', 'it', 'en'] },
  { code: 'ES', name: 'España', flag: '🇪🇸', languages: ['es', 'ca', 'en'] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', languages: ['pt', 'en'] },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', languages: ['it', 'en'] },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', languages: ['de', 'en'] },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱', languages: ['nl', 'en'] },
] as const;

export const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  nl: 'Nederlands',
  it: 'Italiano',
  es: 'Español',
  pt: 'Português',
  lb: 'Lëtzebuergesch',
  ca: 'Català'
};
