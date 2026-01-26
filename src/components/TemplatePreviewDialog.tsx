import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Plus, Trash2, RotateCcw, Undo2, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type DetailLevel = 'simplified' | 'detailed' | 'very-detailed' | 'exhaustive';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyType: string;
  currentLevel: DetailLevel;
  onLevelChange: (level: DetailLevel) => void;
  onSelectTemplate: (level: DetailLevel) => void;
  onCreateCustomTemplate: (level: DetailLevel) => void;
  templates: {
    simplified: { fr: string; en: string };
    detailed: { fr: string; en: string };
    'very-detailed': { fr: string; en: string };
    exhaustive: { fr: string; en: string };
  };
}

interface TemplateField {
  id: string;
  label: string;
  placeholder: string;
}

interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

export const TemplatePreviewDialog = ({
  open,
  onOpenChange,
  propertyType,
  currentLevel,
  onLevelChange,
  onSelectTemplate,
  onCreateCustomTemplate,
  templates,
}: TemplatePreviewDialogProps) => {
  const { t } = useLanguage();
  const language = t('cancel') === 'Annuler' ? 'fr' : 'en';
  
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [originalSections, setOriginalSections] = useState<TemplateSection[]>([]);
  const [history, setHistory] = useState<TemplateSection[][]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<{ sectionId: string; fieldId: string; label: string } | null>(null);

  const levels: { value: DetailLevel; label: { fr: string; en: string } }[] = [
    { value: 'simplified', label: { fr: 'Basic', en: 'Basic' } },
    { value: 'detailed', label: { fr: 'Détaillé', en: 'Detailed' } },
    { value: 'very-detailed', label: { fr: 'Très détaillé', en: 'Very Detailed' } },
    { value: 'exhaustive', label: { fr: 'Exhaustif', en: 'Exhaustive' } },
  ];

  const propertyTypeLabels: Record<string, { fr: string; en: string }> = {
    building: { fr: 'Immeuble', en: 'Building' },
    house: { fr: 'Maison', en: 'House' },
    apartment: { fr: 'Appartement', en: 'Apartment' },
    commercial: { fr: 'Local commercial', en: 'Commercial property' },
  };

  useEffect(() => {
    const content = templates[currentLevel][language];
    const parsedSections = parseTemplateToSections(content);
    setSections(parsedSections);
    setOriginalSections(JSON.parse(JSON.stringify(parsedSections)));
    setHistory([]);
  }, [currentLevel, language, templates]);

  const parseTemplateToSections = (content: string): TemplateSection[] => {
    const lines = content.split('\n');
    const result: TemplateSection[] = [];
    let currentSection: TemplateSection | null = null;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      if (trimmedLine.startsWith('## ')) {
        if (currentSection && currentSection.fields.length > 0) {
          result.push(currentSection);
        }
        currentSection = {
          id: crypto.randomUUID(),
          title: trimmedLine.replace('## ', ''),
          fields: []
        };
      }
      else if (!trimmedLine.startsWith('-') && trimmedLine.endsWith(':')) {
        if (currentSection && currentSection.fields.length > 0) {
          result.push(currentSection);
        }
        currentSection = {
          id: crypto.randomUUID(),
          title: trimmedLine.slice(0, -1).trim(),
          fields: []
        };
      }
      else if (trimmedLine.startsWith('- ') && currentSection) {
        const fieldMatch = trimmedLine.match(/^-\s+([^:]+):\s*(?:\(([^)]*)\))?(.*)$/);
        if (fieldMatch) {
          const label = fieldMatch[1].trim();
          const placeholder = fieldMatch[2] || fieldMatch[3]?.trim() || '';
          currentSection.fields.push({
            id: crypto.randomUUID(),
            label,
            placeholder
          });
        }
      }
    });

    if (currentSection && currentSection.fields.length > 0) {
      result.push(currentSection);
    }

    return result;
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(sections))]);
  };

  const addField = (sectionId: string) => {
    saveToHistory();
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: [...section.fields, {
            id: crypto.randomUUID(),
            label: language === 'fr' ? 'Nouveau champ' : 'New field',
            placeholder: ''
          }]
        };
      }
      return section;
    }));
  };

  const confirmRemoveField = () => {
    if (!fieldToDelete) return;
    
    saveToHistory();
    setSections(prev => prev.map(section => {
      if (section.id === fieldToDelete.sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldToDelete.fieldId)
        };
      }
      return section;
    }));
    
    toast.success(language === 'fr' ? 'Champ supprimé' : 'Field deleted');
    setFieldToDelete(null);
  };

  const moveFieldUp = (sectionId: string, fieldId: string) => {
    saveToHistory();
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        const fields = [...section.fields];
        const index = fields.findIndex(f => f.id === fieldId);
        if (index > 0) {
          [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
        }
        return { ...section, fields };
      }
      return section;
    }));
  };

  const moveFieldDown = (sectionId: string, fieldId: string) => {
    saveToHistory();
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        const fields = [...section.fields];
        const index = fields.findIndex(f => f.id === fieldId);
        if (index < fields.length - 1) {
          [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
        }
        return { ...section, fields };
      }
      return section;
    }));
  };

  const undo = () => {
    if (history.length === 0) return;
    
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setSections(previousState);
    toast.success(language === 'fr' ? 'Action annulée' : 'Action undone');
  };

  const resetToOriginal = () => {
    saveToHistory();
    setSections(JSON.parse(JSON.stringify(originalSections)));
    toast.success(language === 'fr' ? 'Template réinitialisé' : 'Template reset');
  };

  const totalFields = sections.reduce((acc, section) => acc + section.fields.length, 0);
  const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                {language === 'fr' ? 'Template' : 'Template'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={undo}
                    title={language === 'fr' ? 'Annuler' : 'Undo'}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                )}
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={resetToOriginal}
                    title={language === 'fr' ? 'Réinitialiser' : 'Reset'}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {/* Two buttons side by side: Property Type + Template Format */}
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 gap-3">
                {/* Property Type Button */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{language === 'fr' ? 'Type de bien' : 'Property'}</span>
                  <div className="bg-muted/40 rounded-lg px-3 py-2 border border-border/20 text-sm">
                    {propertyTypeLabels[propertyType]?.[language] || propertyType}
                  </div>
                </div>
                
                {/* Template Format Select */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{language === 'fr' ? 'Format' : 'Format'}</span>
                  <Select value={currentLevel} onValueChange={(value) => onLevelChange(value as DetailLevel)}>
                    <SelectTrigger className="w-full h-auto py-2">
                      <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sections & Fields Count */}
            <div className="px-4 py-2 bg-muted/30 border-b">
              <div className="flex items-center justify-end gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {sections.length} {language === 'fr' 
                    ? (sections.length > 1 ? 'Titres' : 'Titre') 
                    : (sections.length > 1 ? 'Titles' : 'Title')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalFields} {language === 'fr' 
                    ? (totalFields > 1 ? 'champs' : 'champ') 
                    : (totalFields > 1 ? 'fields' : 'field')}
                </Badge>
              </div>
            </div>

            {/* Interactive Fields - Sections with Titles and Fields */}
            <ScrollArea className="flex-1 min-h-0 h-[300px]">
              <div className="p-4 space-y-5">
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <div key={section.id} className="space-y-3">
                      {/* Section Title - Simple blue bar + bold text */}
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 rounded-full bg-primary shrink-0" />
                        <span className="font-semibold text-sm text-foreground">{section.title}</span>
                      </div>
                      
                      {/* Section Fields - Gray rounded cards */}
                      <div className="space-y-2 pl-3">
                        {section.fields.map((field, fieldIndex) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-1"
                          >
                            {/* Up/Down buttons */}
                            <div className="flex flex-col shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                onClick={() => moveFieldUp(section.id, field.id)}
                                disabled={fieldIndex === 0}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                onClick={() => moveFieldDown(section.id, field.id)}
                                disabled={fieldIndex === section.fields.length - 1}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex-1 bg-muted/40 rounded-lg px-4 py-2.5 border border-border/20">
                              <span className="text-sm text-foreground">{field.label}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => setFieldToDelete({ sectionId: section.id, fieldId: field.id, label: field.label })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Add Field Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground w-full justify-start gap-2"
                          onClick={() => addField(section.id)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {language === 'fr' ? 'Ajouter un champ' : 'Add field'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Aucun champ détecté' : 'No fields detected'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="p-4 border-t">
            <div className="flex items-center justify-between w-full gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                onClick={() => {
                  onSelectTemplate(currentLevel);
                  onOpenChange(false);
                }}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                {language === 'fr' ? 'Utiliser' : 'Use'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Field Deletion */}
      <AlertDialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Supprimer ce champ ?' : 'Delete this field?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? `Voulez-vous vraiment supprimer le champ "${fieldToDelete?.label}" ?`
                : `Are you sure you want to delete the field "${fieldToDelete?.label}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveField} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'fr' ? 'Supprimer' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
