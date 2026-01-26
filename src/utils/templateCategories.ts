export type TemplateCategory = 'residential' | 'commercial' | 'mixed';

export interface CategoryInfo {
  id: TemplateCategory;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
  icon: string;
  propertyTypes: string[];
  color: string;
}

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, CategoryInfo> = {
  residential: {
    id: 'residential',
    label: {
      fr: 'Résidentiel',
      en: 'Residential'
    },
    description: {
      fr: 'Templates pour logements individuels et collectifs',
      en: 'Templates for individual and collective housing'
    },
    icon: '🏠',
    propertyTypes: ['house', 'apartment', 'building'],
    color: 'from-blue-500/10 to-blue-600/10 border-blue-500/30'
  },
  commercial: {
    id: 'commercial',
    label: {
      fr: 'Commercial',
      en: 'Commercial'
    },
    description: {
      fr: 'Templates pour locaux commerciaux et professionnels',
      en: 'Templates for commercial and professional spaces'
    },
    icon: '🏢',
    propertyTypes: ['commercial'],
    color: 'from-green-500/10 to-green-600/10 border-green-500/30'
  },
  mixed: {
    id: 'mixed',
    label: {
      fr: 'Mixte',
      en: 'Mixed'
    },
    description: {
      fr: 'Templates polyvalents pour tous types de biens',
      en: 'Versatile templates for all property types'
    },
    icon: '🏗️',
    propertyTypes: ['building', 'commercial'],
    color: 'from-purple-500/10 to-purple-600/10 border-purple-500/30'
  }
};

export const getPropertyTypeLabel = (propertyType: string, language: 'fr' | 'en'): string => {
  const labels: Record<string, { fr: string; en: string }> = {
    building: { fr: 'Immeuble', en: 'Building' },
    house: { fr: 'Maison', en: 'House' },
    apartment: { fr: 'Appartement', en: 'Apartment' },
    commercial: { fr: 'Local commercial', en: 'Commercial property' },
  };
  return labels[propertyType]?.[language] || propertyType;
};

export const getCategoryForPropertyType = (propertyType: string): TemplateCategory | null => {
  for (const [categoryId, category] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (category.propertyTypes.includes(propertyType)) {
      return categoryId as TemplateCategory;
    }
  }
  return null;
};
