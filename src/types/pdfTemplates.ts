export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  category: 'architecte' | 'edl' | 'asl' | 'custom';
  config: PDFTemplateConfig;
  preview?: string;
}

export interface PDFTemplateConfig {
  // Branding
  logo?: string;
  companyName?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Typography
  fontFamily: 'helvetica' | 'times' | 'courier';
  headerFontSize: number;
  bodyFontSize: number;
  
  // Layout
  header: PDFHeaderConfig;
  footer: PDFFooterConfig;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  
  // Content sections
  showCoverPage: boolean;
  showTableOfContents: boolean;
  showSummary: boolean;
  showPathologies: boolean;
  showARMeasurements: boolean;
  showCostEstimates: boolean;
  showPhotos: boolean;
  showBlockDetails: boolean;
  
  // Styling
  blockBorderColor: string;
  tableBorderColor: string;
  alternateRowColor: string;
}

export interface PDFHeaderConfig {
  show: boolean;
  height: number;
  backgroundColor: string;
  textColor: string;
  includeDate: boolean;
  includeLogo: boolean;
  includeProjectName: boolean;
  customText?: string;
}

export interface PDFFooterConfig {
  show: boolean;
  height: number;
  backgroundColor: string;
  textColor: string;
  includePageNumbers: boolean;
  includeCompanyInfo: boolean;
  customText?: string;
}

export const DEFAULT_TEMPLATES: PDFTemplate[] = [
  {
    id: 'template-architecte',
    name: 'Template Architecte',
    description: 'Template professionnel pour architectes avec mise en page moderne',
    category: 'architecte',
    config: {
      primaryColor: '#1E3A8A',
      secondaryColor: '#3B82F6',
      accentColor: '#DBEAFE',
      fontFamily: 'helvetica',
      headerFontSize: 18,
      bodyFontSize: 11,
      header: {
        show: true,
        height: 80,
        backgroundColor: '#1E3A8A',
        textColor: '#FFFFFF',
        includeDate: true,
        includeLogo: true,
        includeProjectName: true
      },
      footer: {
        show: true,
        height: 50,
        backgroundColor: '#F3F4F6',
        textColor: '#374151',
        includePageNumbers: true,
        includeCompanyInfo: true
      },
      margins: { top: 100, bottom: 70, left: 40, right: 40 },
      showCoverPage: true,
      showTableOfContents: true,
      showSummary: true,
      showPathologies: true,
      showARMeasurements: true,
      showCostEstimates: true,
      showPhotos: true,
      showBlockDetails: true,
      blockBorderColor: '#3B82F6',
      tableBorderColor: '#E5E7EB',
      alternateRowColor: '#F9FAFB'
    }
  },
  {
    id: 'template-edl',
    name: 'Template EDL',
    description: 'Template État des Lieux conforme aux normes professionnelles',
    category: 'edl',
    config: {
      primaryColor: '#059669',
      secondaryColor: '#10B981',
      accentColor: '#D1FAE5',
      fontFamily: 'times',
      headerFontSize: 16,
      bodyFontSize: 10,
      header: {
        show: true,
        height: 70,
        backgroundColor: '#FFFFFF',
        textColor: '#059669',
        includeDate: true,
        includeLogo: true,
        includeProjectName: true
      },
      footer: {
        show: true,
        height: 40,
        backgroundColor: '#FFFFFF',
        textColor: '#6B7280',
        includePageNumbers: true,
        includeCompanyInfo: false,
        customText: 'État des Lieux conforme'
      },
      margins: { top: 90, bottom: 60, left: 35, right: 35 },
      showCoverPage: true,
      showTableOfContents: false,
      showSummary: true,
      showPathologies: true,
      showARMeasurements: false,
      showCostEstimates: false,
      showPhotos: true,
      showBlockDetails: true,
      blockBorderColor: '#10B981',
      tableBorderColor: '#D1D5DB',
      alternateRowColor: '#F3F4F6'
    }
  },
  {
    id: 'template-asl',
    name: 'Template ASL',
    description: 'Template Association Syndicale Libre avec branding corporatif',
    category: 'asl',
    config: {
      primaryColor: '#7C3AED',
      secondaryColor: '#A78BFA',
      accentColor: '#EDE9FE',
      fontFamily: 'helvetica',
      headerFontSize: 17,
      bodyFontSize: 10,
      header: {
        show: true,
        height: 75,
        backgroundColor: '#7C3AED',
        textColor: '#FFFFFF',
        includeDate: true,
        includeLogo: true,
        includeProjectName: true
      },
      footer: {
        show: true,
        height: 45,
        backgroundColor: '#EDE9FE',
        textColor: '#5B21B6',
        includePageNumbers: true,
        includeCompanyInfo: true
      },
      margins: { top: 95, bottom: 65, left: 40, right: 40 },
      showCoverPage: true,
      showTableOfContents: true,
      showSummary: true,
      showPathologies: true,
      showARMeasurements: true,
      showCostEstimates: true,
      showPhotos: true,
      showBlockDetails: true,
      blockBorderColor: '#A78BFA',
      tableBorderColor: '#E5E7EB',
      alternateRowColor: '#FAF5FF'
    }
  }
];
