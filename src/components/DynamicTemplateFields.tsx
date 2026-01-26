import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { TEMPLATES, type DetailLevel } from "@/utils/templateData";

interface DynamicTemplateFieldsProps {
  propertyType: string;
  templateLevel: DetailLevel;
  templateData: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
  readOnly?: boolean;
}

export const DynamicTemplateFields = ({
  propertyType,
  templateLevel,
  templateData,
  onChange,
  readOnly = false,
}: DynamicTemplateFieldsProps) => {
  const { t } = useLanguage();
  const language = t('cancel') === 'Annuler' ? 'fr' : 'en';

  // Get template content
  const templateContent = TEMPLATES[propertyType as keyof typeof TEMPLATES]?.[templateLevel]?.[language] || '';

  // Parse template to extract field structure
  const parseTemplate = (content: string) => {
    const sections: Array<{
      title: string;
      fields: Array<{ label: string; key: string; type: 'text' | 'textarea' }>;
    }> = [];

    const lines = content.split('\n');
    let currentSection: { title: string; fields: Array<{ label: string; key: string; type: 'text' | 'textarea' }> } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Section title (ends with :)
      if (line && line.endsWith(':') && !line.startsWith('-')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.slice(0, -1),
          fields: []
        };
      }
      // Field line (starts with -)
      else if (line.startsWith('-') && currentSection) {
        const fieldMatch = line.match(/^-\s*(.+?):\s*(\(.+?\))?$/);
        if (fieldMatch) {
          const label = fieldMatch[1].trim();
          const key = label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          
          currentSection.fields.push({
            label,
            key,
            type: 'text'
          });
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const sections = parseTemplate(templateContent);

  const handleFieldChange = (key: string, value: string) => {
    onChange({
      ...templateData,
      [key]: value
    });
  };

  if (readOnly) {
    // Display mode
    return (
      <div className="space-y-6">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">{section.title}</h3>
            <div className="grid gap-4">
              {section.fields.map((field, fieldIndex) => {
                const value = templateData[field.key];
                if (!value) return null;
                
                return (
                  <div key={fieldIndex} className="space-y-1">
                    <Label className="text-sm text-muted-foreground">{field.label}</Label>
                    <p className="text-sm font-medium whitespace-pre-wrap">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold text-base">{section.title}</h3>
          <div className="grid gap-3">
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-sm">
                  {field.label}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    value={templateData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                ) : (
                  <Input
                    id={field.key}
                    value={templateData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
