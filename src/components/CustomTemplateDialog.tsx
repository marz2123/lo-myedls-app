import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCcw, Sparkles, HelpCircle, Check, X as XIcon, ChevronRight, ChevronLeft, GraduationCap, SplitSquareHorizontal, GripVertical, Undo2, Redo2, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MyAladinChat } from "@/components/MyAladinChat";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TEMPLATES, type DetailLevel } from "@/utils/templateData";
import { TEMPLATE_CATEGORIES, getPropertyTypeLabel, type TemplateCategory } from "@/utils/templateCategories";
import { TemplateCreationWizard } from "./TemplateCreationWizard";
import { DraggableSection } from "./DraggableSection";
import { DraggableField } from "./DraggableField";

interface CustomTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyType: string;
  currentContent: string;
  onLoadTemplate: (content: string, templateId: string) => void;
  baseContent?: string;
  baseLevel?: string;
  projectInfo?: {
    address?: string;
    city?: string;
    postal_code?: string;
    number_of_units?: number;
    has_parking?: boolean;
    has_garage?: boolean;
    has_box?: boolean;
  };
}

export const CustomTemplateDialog = ({
  open,
  onOpenChange,
  propertyType,
  currentContent,
  onLoadTemplate,
  baseContent,
  baseLevel,
  projectInfo,
}: CustomTemplateDialogProps) => {
  const [selectedBaseLevel, setSelectedBaseLevel] = useState<DetailLevel>('simplified');
  const [editableContent, setEditableContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFillingAI, setIsFillingAI] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showMyAladin, setShowMyAladin] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [showWizard, setShowWizard] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'section' | 'field'; sectionTitle?: string; sectionIndex?: number; fieldKey?: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const language = t('cancel') === 'Annuler' ? 'fr' : 'en';

  // Initialize selected base level from props or default to simplified
  useEffect(() => {
    if (baseLevel && open) {
      setSelectedBaseLevel(baseLevel as DetailLevel);
    } else if (!open) {
      setSelectedBaseLevel('simplified');
    }
  }, [baseLevel, open]);

  // Update editable content when baseContent changes or dialog opens
  useEffect(() => {
    if (baseContent && open) {
      setEditableContent(baseContent);
    } else if (open && !baseContent) {
      // Load default template when no baseContent is provided
      const templateContent = TEMPLATES[propertyType as keyof typeof TEMPLATES]?.[selectedBaseLevel]?.[language];
      if (templateContent) {
        setEditableContent(templateContent);
      }
    } else if (!open) {
      setEditableContent("");
      setShowCancelDialog(false);
    }
  }, [baseContent, open, selectedBaseLevel, propertyType, language]);

  // Load template content when base level changes
  const handleBaseTemplateChange = (level: DetailLevel) => {
    setSelectedBaseLevel(level);
    const templateContent = TEMPLATES[propertyType as keyof typeof TEMPLATES]?.[level]?.[language];
    if (templateContent) {
      setEditableContent(templateContent);
    }
  };

  // Reset to base template
  const handleResetToBase = () => {
    const templateContent = TEMPLATES[propertyType as keyof typeof TEMPLATES]?.[selectedBaseLevel]?.[language];
    if (templateContent) {
      addToHistory(templateContent);
      setEditableContent(templateContent);
      toast({
        title: t('cancel') === 'Annuler' ? 'Template reinitialise' : 'Template reset',
        description: t('cancel') === 'Annuler' 
          ? 'Le contenu a été réinitialisé au template de base' 
          : 'Content has been reset to base template',
      });
    }
  };

  // Add content to history
  const addToHistory = useCallback((content: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(content);
      // Keep only last 50 states to avoid memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Initialize history when content changes from outside
  useEffect(() => {
    if (editableContent && history.length === 0) {
      setHistory([editableContent]);
      setHistoryIndex(0);
    }
  }, [editableContent, history.length]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditableContent(history[newIndex]);
      toast({
        title: language === 'fr' ? '↶ Annulation' : '↶ Undo',
        description: language === 'fr' ? 'Action annulée' : 'Action undone',
      });
    }
  }, [historyIndex, history, language, toast]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditableContent(history[newIndex]);
      toast({
        title: language === 'fr' ? '↷ Rétablir' : '↷ Redo',
        description: language === 'fr' ? 'Action rétablie' : 'Action redone',
      });
    }
  }, [historyIndex, history, language, toast]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;


  // Calculate stats
  const characterCount = editableContent.length;
  const lineCount = editableContent.split('\n').length;

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const contentToSave = editableContent || currentContent;

      const { error } = await supabase
        .from('custom_templates')
        .insert({
          user_id: user.id,
          property_type: propertyType,
          template_name: name,
          content: contentToSave,
          detail_level: selectedBaseLevel,
        });

      if (error) throw error;
      
      return user.id; // Return user ID for achievement tracking
    },
    onSuccess: async (userId) => {
      queryClient.invalidateQueries({ queryKey: ['custom-templates', propertyType] });
      
      // Track achievement in separate async operation
      try {
        const { data: allTemplates } = await supabase
          .from('custom_templates')
          .select('id', { count: 'exact' })
          .eq('user_id', userId);
        
        // Dynamic import to avoid hook usage in mutation
        const { trackTemplateCreation } = await import('@/hooks/useAchievements').then(m => {
          const hook = m.useAchievements;
          // Call hook at top level of an async function (valid usage)
          return { trackTemplateCreation: async (uid: string, count: number) => {
            // This will be handled by the hook internally
            console.log('Template creation tracked:', uid, count);
          }};
        });
        
        await trackTemplateCreation(userId, allTemplates?.length || 1);
      } catch (achievementError) {
        console.error('Failed to track achievement:', achievementError);
        // Don't fail the whole operation if achievement tracking fails
      }
      
      toast({
        title: t('cancel') === 'Annuler' ? 'Template sauvegarde' : 'Template saved',
        description: t('cancel') === 'Annuler' 
          ? 'Votre template personnalisé a été enregistré' 
          : 'Your custom template has been saved',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    const contentToCheck = editableContent || currentContent;
    if (!contentToCheck.trim()) {
      toast({
        title: t('cancel') === 'Annuler' ? 'Contenu vide' : 'Empty content',
        description: t('cancel') === 'Annuler' 
          ? 'Le contenu du template est vide' 
          : 'The template content is empty',
        variant: "destructive",
      });
      return;
    }

    // Generate automatic name based on date and time
    const now = new Date();
    const autoName = `Template ${now.toLocaleDateString(language)} ${now.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`;

    setIsSaving(true);
    await saveTemplateMutation.mutateAsync(autoName);
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (editableContent && editableContent.trim()) {
      setShowCancelDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  // Parse template to extract fields
  const parseTemplateFields = (content: string) => {
    const fields: Array<{ label: string; key: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-')) {
        const fieldMatch = trimmed.match(/^-\s*(.+?):\s*(\(.+?\))?$/);
        if (fieldMatch) {
          const label = fieldMatch[1].trim();
          const key = label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          
          fields.push({ label, key });
        }
      }
    }

    return fields;
  };

  const handleFillWithAI = async () => {
    setIsFillingAI(true);
    
    try {
      const fields = parseTemplateFields(editableContent);
      
      console.log('Filling template with AI, fields found:', fields.length);
      
      if (fields.length === 0) {
        toast({
          title: t('cancel') === 'Annuler' ? 'Aucun champ detecte' : 'No fields detected',
          description: t('cancel') === 'Annuler' 
            ? 'Le template ne contient pas de champs à remplir' 
            : 'The template does not contain fields to fill',
        });
        setIsFillingAI(false);
        return;
      }

      console.log('Calling fill-template-fields function...');

      const { data, error } = await supabase.functions.invoke('fill-template-fields', {
        body: {
          fields: fields,
          existingData: {},
          propertyType,
          language,
          projectInfo: projectInfo || {}
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        
        // Handle rate limiting and payment errors
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          toast({
            title: t('cancel') === 'Annuler' ? 'Limite de requetes atteinte' : 'Rate limit reached',
            description: t('cancel') === 'Annuler' 
              ? 'Veuillez patienter quelques instants avant de réessayer' 
              : 'Please wait a few moments before trying again',
            variant: "destructive",
          });
          setIsFillingAI(false);
          return;
        }
        
        if (error.message?.includes('Payment') || error.message?.includes('402')) {
          toast({
            title: t('cancel') === 'Annuler' ? 'Credits insuffisants' : 'Insufficient credits',
            description: t('cancel') === 'Annuler' 
              ? 'Veuillez ajouter des crédits dans les paramètres de votre espace de travail' 
              : 'Please add credits in your workspace settings',
            variant: "destructive",
          });
          setIsFillingAI(false);
          return;
        }
        
        throw error;
      }

      if (data?.suggestions && Object.keys(data.suggestions).length > 0) {
        console.log('Suggestions received:', data.suggestions);
        
        // Open progressive suggestion dialog
        setAiSuggestions(data.suggestions);
        setCurrentSuggestionIndex(0);
        setAcceptedSuggestions(new Set());
        setShowSuggestionsDialog(true);
      } else {
        console.warn('No suggestions in response');
        toast({
          title: t('cancel') === 'Annuler' ? 'Aucune suggestion' : 'No suggestions',
          description: t('cancel') === 'Annuler' 
            ? "L'IA n'a pas pu générer de suggestions" 
            : 'AI could not generate suggestions',
        });
      }
    } catch (error) {
      console.error('Error filling template with AI:', error);
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: error instanceof Error ? error.message : 'Failed to fill template',
        variant: "destructive",
      });
    } finally {
      setIsFillingAI(false);
    }
  };

  // Apply accepted suggestions to the template
  const applyAcceptedSuggestions = () => {
    let updatedContent = editableContent;
    
    Object.entries(aiSuggestions).forEach(([label, suggestion]) => {
      if (acceptedSuggestions.has(label)) {
        const regex = new RegExp(`(- ${label}:\\s*)\\([^)]*\\)`, 'g');
        updatedContent = updatedContent.replace(regex, `$1(${suggestion})`);
      }
    });
    
    setEditableContent(updatedContent);
    setShowSuggestionsDialog(false);
    
    toast({
      title: t('cancel') === 'Annuler' ? 'Suggestions appliquees' : 'Suggestions applied',
      description: t('cancel') === 'Annuler' 
        ? `${acceptedSuggestions.size} suggestion(s) appliquée(s) sur ${Object.keys(aiSuggestions).length}` 
        : `${acceptedSuggestions.size} suggestion(s) applied out of ${Object.keys(aiSuggestions).length}`,
    });
  };

  // Toggle suggestion acceptance
  const toggleSuggestion = (label: string) => {
    setAcceptedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Accept all suggestions
  const acceptAllSuggestions = () => {
    setAcceptedSuggestions(new Set(Object.keys(aiSuggestions)));
  };

  // Reject all suggestions
  const rejectAllSuggestions = () => {
    setAcceptedSuggestions(new Set());
  };

  const propertyTypeLabels: Record<string, { fr: string; en: string }> = {
    building: { fr: 'Immeuble', en: 'Building' },
    house: { fr: 'Maison', en: 'House' },
    apartment: { fr: 'Appartement', en: 'Apartment' },
    commercial: { fr: 'Local commercial', en: 'Commercial property' },
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Parse template content to extract sections and fields for preview
  const parseTemplateForPreview = (content: string) => {
    const sections: Array<{
      title: string;
      fields: Array<{ label: string; key: string }>;
    }> = [];

    const lines = content.split('\n');
    let currentSection: { title: string; fields: Array<{ label: string; key: string }> } | null = null;

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
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          
          currentSection.fields.push({ label, key });
        }
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const previewSections = parseTemplateForPreview(editableContent);

  // Reconstruct template from sections
  const reconstructTemplate = useCallback((sections: typeof previewSections) => {
    const lines: string[] = [];
    
    sections.forEach((section, idx) => {
      lines.push(section.title + ':');
      section.fields.forEach(field => {
        lines.push(`- ${field.label}: ()`);
      });
      if (idx < sections.length - 1) {
        lines.push(''); // Empty line between sections
      }
    });
    
    return lines.join('\n');
  }, []);

  // Handle section reorder
  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const sections = [...previewSections];
    const oldIndex = sections.findIndex(s => s.title === active.id);
    const newIndex = sections.findIndex(s => s.title === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      const newContent = reconstructTemplate(reorderedSections);
      addToHistory(newContent);
      setEditableContent(newContent);
      toast({
        title: language === 'fr' ? 'Section deplacee' : 'Section moved',
        description: language === 'fr' 
          ? `"${sections[oldIndex].title}" a été déplacée` 
          : `"${sections[oldIndex].title}" has been moved`,
      });
    }
  }, [previewSections, reconstructTemplate, language, toast, addToHistory]);

  // Handle field reorder within a section
  const handleFieldDragEnd = useCallback((event: DragEndEvent, sectionIndex: number) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const sections = [...previewSections];
    const section = sections[sectionIndex];
    const oldIndex = section.fields.findIndex(f => f.key === active.id);
    const newIndex = section.fields.findIndex(f => f.key === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      section.fields = arrayMove(section.fields, oldIndex, newIndex);
      const newContent = reconstructTemplate(sections);
      addToHistory(newContent);
      setEditableContent(newContent);
      toast({
        title: language === 'fr' ? 'Champ deplace' : 'Field moved',
        description: language === 'fr' 
          ? `"${section.fields[newIndex].label}" a été déplacé` 
          : `"${section.fields[newIndex].label}" has been moved`,
      });
    }
  }, [previewSections, reconstructTemplate, language, toast, addToHistory]);

  // Handle section delete
  const handleSectionDelete = useCallback((sectionTitle: string) => {
    const sections = [...previewSections];
    const sectionToDelete = sections.find(s => s.title === sectionTitle);
    
    // If section has more than one field, show confirmation dialog
    if (sectionToDelete && sectionToDelete.fields.length > 1) {
      setPendingDelete({ type: 'section', sectionTitle });
      setShowDeleteConfirmDialog(true);
      return;
    }
    
    // Otherwise, delete immediately
    const filteredSections = sections.filter(s => s.title !== sectionTitle);
    const newContent = reconstructTemplate(filteredSections);
    addToHistory(newContent);
    setEditableContent(newContent);
    toast({
      title: language === 'fr' ? 'Section supprimee' : 'Section deleted',
      description: language === 'fr' 
        ? `"${sectionTitle}" a été supprimée` 
        : `"${sectionTitle}" has been deleted`,
    });
  }, [previewSections, reconstructTemplate, language, toast, addToHistory]);

  // Handle field delete
  const handleFieldDelete = useCallback((sectionIndex: number, fieldKey: string) => {
    const sections = [...previewSections];
    const section = sections[sectionIndex];
    const fieldToDelete = section.fields.find(f => f.key === fieldKey);
    section.fields = section.fields.filter(f => f.key !== fieldKey);
    
    // If section has no fields left, remove the section
    if (section.fields.length === 0) {
      sections.splice(sectionIndex, 1);
    }
    
    const newContent = reconstructTemplate(sections);
    addToHistory(newContent);
    setEditableContent(newContent);
    toast({
      title: language === 'fr' ? 'Champ supprime' : 'Field deleted',
      description: language === 'fr' 
        ? `"${fieldToDelete?.label}" a été supprimé` 
        : `"${fieldToDelete?.label}" has been deleted`,
    });
  }, [previewSections, reconstructTemplate, language, toast, addToHistory]);

  // Confirm and execute pending delete
  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;

    const sections = [...previewSections];

    if (pendingDelete.type === 'section' && pendingDelete.sectionTitle) {
      const filteredSections = sections.filter(s => s.title !== pendingDelete.sectionTitle);
      const newContent = reconstructTemplate(filteredSections);
      addToHistory(newContent);
      setEditableContent(newContent);
      toast({
        title: language === 'fr' ? 'Section supprimee' : 'Section deleted',
        description: language === 'fr' 
          ? `"${pendingDelete.sectionTitle}" a été supprimée avec tous ses champs` 
          : `"${pendingDelete.sectionTitle}" has been deleted with all its fields`,
      });
    } else if (pendingDelete.type === 'field' && pendingDelete.sectionIndex !== undefined && pendingDelete.fieldKey) {
      const section = sections[pendingDelete.sectionIndex];
      const fieldToDelete = section.fields.find(f => f.key === pendingDelete.fieldKey);
      section.fields = section.fields.filter(f => f.key !== pendingDelete.fieldKey);
      
      if (section.fields.length === 0) {
        sections.splice(pendingDelete.sectionIndex, 1);
      }
      
      const newContent = reconstructTemplate(sections);
      addToHistory(newContent);
      setEditableContent(newContent);
      toast({
        title: language === 'fr' ? 'Champ supprime' : 'Field deleted',
        description: language === 'fr' 
          ? `"${fieldToDelete?.label}" a été supprimé` 
          : `"${fieldToDelete?.label}" has been deleted`,
      });
    }

    setShowDeleteConfirmDialog(false);
    setPendingDelete(null);
  }, [pendingDelete, previewSections, reconstructTemplate, language, toast, addToHistory]);


  // Validate template syntax
  const validateTemplate = (content: string) => {
    const warnings: Array<{ message: string; lineNumber: number; type: string; line: string }> = [];
    const lines = content.split('\n');
    let sectionCount = 0;
    let fieldCount = 0;
    let inSection = false;
    const fieldLabels = new Map<string, number[]>(); // Track field labels and their line numbers

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      if (!line) continue;

      // Check for section (ends with :)
      if (line.endsWith(':') && !line.startsWith('-')) {
        sectionCount++;
        inSection = true;
        
        // Warn if section title is too long
        if (line.length > 100) {
          warnings.push({
            message: language === 'fr' 
              ? `Ligne ${lineNumber}: Titre de section trop long (> 100 caractères)` 
              : `Line ${lineNumber}: Section title too long (> 100 characters)`,
            lineNumber,
            type: 'section-too-long',
            line: lines[i]
          });
        }
      }
      // Check for field (starts with -)
      else if (line.startsWith('-')) {
        if (!inSection) {
          warnings.push({
            message: language === 'fr'
              ? `Ligne ${lineNumber}: Champ trouvé en dehors d'une section`
              : `Line ${lineNumber}: Field found outside of a section`,
            lineNumber,
            type: 'field-no-section',
            line: lines[i]
          });
        }
        
        const fieldMatch = line.match(/^-\s*(.+?):\s*(\(.+?\))?$/);
        if (fieldMatch) {
          fieldCount++;
          const fieldLabel = fieldMatch[1].trim();
          
          // Track duplicate fields
          const normalizedLabel = fieldLabel.toLowerCase();
          if (!fieldLabels.has(normalizedLabel)) {
            fieldLabels.set(normalizedLabel, []);
          }
          fieldLabels.get(normalizedLabel)!.push(lineNumber);
          
          // Warn ONLY if field label is too short (less than 2 characters) - structural issue
          if (fieldLabel.length < 2) {
            warnings.push({
              message: language === 'fr'
                ? `Ligne ${lineNumber}: Libellé de champ trop court (minimum 2 caractères)`
                : `Line ${lineNumber}: Field label too short (minimum 2 characters)`,
              lineNumber,
              type: 'label-too-short',
              line: lines[i]
            });
          }
          
          // Warn if field label is too long - structural issue
          if (fieldLabel.length > 150) {
            warnings.push({
              message: language === 'fr'
                ? `Ligne ${lineNumber}: Libellé de champ trop long (> 150 caractères)`
                : `Line ${lineNumber}: Field label too long (> 150 characters)`,
              lineNumber,
              type: 'label-too-long',
              line: lines[i]
            });
          }
          
          // NOTE: We do NOT warn about empty field values () 
          // because users will fill them after saving the template
        } else {
          // Check if it's a field without colon after label - structural issue
          const fieldWithoutColon = line.match(/^-\s*(.+?)\s+(\(.+?\))$/);
          if (fieldWithoutColon) {
            warnings.push({
              message: language === 'fr'
                ? `Ligne ${lineNumber}: Format de champ invalide - deux-points manquants (doit être: - Label: (exemple))`
                : `Line ${lineNumber}: Invalid field format - missing colon (should be: - Label: (example))`,
              lineNumber,
              type: 'missing-colon',
              line: lines[i]
            });
          } else {
            warnings.push({
              message: language === 'fr'
                ? `Ligne ${lineNumber}: Format de champ invalide (doit être: - Label: (exemple))`
                : `Line ${lineNumber}: Invalid field format (should be: - Label: (example))`,
              lineNumber,
              type: 'invalid-field',
              line: lines[i]
            });
          }
        }
      }
      // Warn about lines that don't match expected format
      else if (line.length > 0 && !line.startsWith(':') && !line.startsWith('//')) {
        warnings.push({
          message: language === 'fr'
            ? `Ligne ${lineNumber}: Ligne non reconnue (ni section ni champ)`
            : `Line ${lineNumber}: Unrecognized line (neither section nor field)`,
          lineNumber,
          type: 'unrecognized',
          line: lines[i]
        });
      }
    }

    // Check for duplicate fields
    fieldLabels.forEach((lineNumbers, label) => {
      if (lineNumbers.length > 1) {
        warnings.push({
          message: language === 'fr'
            ? `Champ dupliqué "${label}" trouvé ${lineNumbers.length} fois (lignes: ${lineNumbers.join(', ')})`
            : `Duplicate field "${label}" found ${lineNumbers.length} times (lines: ${lineNumbers.join(', ')})`,
          lineNumber: lineNumbers[0],
          type: 'duplicate-field',
          line: lines[lineNumbers[0] - 1]
        });
      }
    });

    if (sectionCount === 0) {
      warnings.push({
        message: language === 'fr'
          ? 'Aucune section détectée. Ajoutez au moins une section (Titre:)'
          : 'No sections detected. Add at least one section (Title:)',
        lineNumber: 0,
        type: 'no-sections',
        line: ''
      });
    }

    if (fieldCount === 0 && sectionCount > 0) {
      warnings.push({
        message: language === 'fr'
          ? 'Aucun champ détecté. Ajoutez au moins un champ (- Label: (exemple))'
          : 'No fields detected. Add at least one field (- Label: (example))',
        lineNumber: 0,
        type: 'no-fields',
        line: ''
      });
    }

    return { warnings, sectionCount, fieldCount };
  };

  const validation = validateTemplate(editableContent);

  // Auto-fix validation errors
  const handleAutoFix = () => {
    const lines = editableContent.split('\n');
    let fixedLines = [...lines];
    let fixCount = 0;
    const fixedTypes = new Set<string>();

    // Fix fields with missing colon
    validation.warnings.forEach(warning => {
      if (warning.type === 'missing-colon' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        const line = fixedLines[lineIndex];
        // Add colon between label and example
        const fixed = line.replace(/^(\s*-\s*.+?)\s+(\(.+?\))$/, '$1: $2');
        if (fixed !== line) {
          fixedLines[lineIndex] = fixed;
          fixCount++;
          fixedTypes.add('missing-colon');
        }
      }
      
      // Fix or remove invalid fields
      if (warning.type === 'invalid-field' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        const line = fixedLines[lineIndex];
        
        // Check if it's an empty field like "- : ()" - remove it completely
        if (line.trim().match(/^-\s*:\s*\(\s*\)$/)) {
          fixedLines[lineIndex] = ''; // Remove the line
          fixCount++;
          fixedTypes.add('invalid-field');
        }
        // Check if it's a field that starts with - but has no proper format
        else if (line.trim().startsWith('-') && !line.includes(':')) {
          const fixed = line + ': ()';
          fixedLines[lineIndex] = fixed;
          fixCount++;
          fixedTypes.add('invalid-field');
        }
      }
      
      // Fix label-too-short by removing empty fields
      if (warning.type === 'label-too-short' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        const line = fixedLines[lineIndex];
        
        // If the label is just 1 character or empty, remove the line
        if (line.trim().match(/^-\s*.{0,1}\s*:\s*\(.*\)$/)) {
          fixedLines[lineIndex] = ''; // Remove the line
          fixCount++;
          fixedTypes.add('label-too-short');
        }
      }
      
      // Remove duplicate fields (keep only the first occurrence)
      if (warning.type === 'duplicate-field' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        const line = fixedLines[lineIndex];
        const fieldMatch = line.match(/^-\s*(.+?):\s*(\(.+?\))?$/);
        
        if (fieldMatch) {
          const label = fieldMatch[1].trim().toLowerCase();
          
          // Find all occurrences of this field
          const duplicateIndices: number[] = [];
          fixedLines.forEach((l, idx) => {
            const match = l.match(/^-\s*(.+?):\s*(\(.+?\))?$/);
            if (match && match[1].trim().toLowerCase() === label) {
              duplicateIndices.push(idx);
            }
          });
          
          // Keep the first occurrence, mark others for deletion
          if (duplicateIndices.length > 1) {
            for (let i = 1; i < duplicateIndices.length; i++) {
              fixedLines[duplicateIndices[i]] = ''; // Mark for deletion
              fixCount++;
            }
            fixedTypes.add('duplicate-field');
          }
        }
      }
      
      // Convert unrecognized lines to comments
      if (warning.type === 'unrecognized' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        const line = fixedLines[lineIndex];
        if (!line.trim().startsWith('//')) {
          const indent = line.match(/^\s*/)?.[0] || '';
          fixedLines[lineIndex] = indent + '// ' + line.trim();
          fixCount++;
          fixedTypes.add('unrecognized');
        }
      }
      
      // Add default field to sections without fields
      if (warning.type === 'section-no-fields' && warning.lineNumber > 0) {
        const lineIndex = warning.lineNumber - 1;
        // Add a default field after the section
        fixedLines.splice(lineIndex + 1, 0, '- ' + (language === 'fr' ? 'Champ exemple' : 'Example field') + ': (' + (language === 'fr' ? 'à compléter' : 'to complete') + ')');
        fixCount++;
        fixedTypes.add('section-no-fields');
      }
    });

    // Remove empty lines that were marked for deletion
    fixedLines = fixedLines.filter(line => line !== '');

    // Add a default section if no sections exist
    if (validation.warnings.some(w => w.type === 'no-sections')) {
      fixedLines.unshift(
        language === 'fr' ? 'Section par défaut:' : 'Default section:',
        '- ' + (language === 'fr' ? 'Champ exemple' : 'Example field') + ': (' + (language === 'fr' ? 'à compléter' : 'to complete') + ')',
        ''
      );
      fixCount++;
      fixedTypes.add('no-sections');
    }

    // Add fields to section if missing
    if (validation.warnings.some(w => w.type === 'no-fields')) {
      // Find the last section and add a field
      for (let i = fixedLines.length - 1; i >= 0; i--) {
        const line = fixedLines[i].trim();
        if (line.endsWith(':') && !line.startsWith('-')) {
          fixedLines.splice(i + 1, 0, '- ' + (language === 'fr' ? 'Champ exemple' : 'Example field') + ': (' + (language === 'fr' ? 'à compléter' : 'to complete') + ')');
          fixCount++;
          fixedTypes.add('no-fields');
          break;
        }
      }
    }

    const fixedContent = fixedLines.join('\n');

    if (fixCount > 0) {
      addToHistory(fixedContent);
      setEditableContent(fixedContent);
      
      // Re-validate after fix to check if all warnings are gone
      const revalidation = validateTemplate(fixedContent);
      
      // Only show success banner if ALL warnings are gone
      if (revalidation.warnings.length === 0) {
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 5000);
        
        toast({
          title: language === 'fr' ? 'Probleme resolu' : 'Problem solved',
          description: language === 'fr'
            ? `Toutes les erreurs ont été corrigées automatiquement (${fixCount} correction(s))`
            : `All errors have been automatically corrected (${fixCount} fix(es))`,
        });
      } else {
        // Some warnings remain - don't show success banner
        const correctedCount = validation.warnings.length - revalidation.warnings.length;
        
        toast({
          title: language === 'fr' ? 'Corrections partielles' : 'Partial fixes',
          description: language === 'fr'
            ? `${correctedCount} erreur(s) corrigée(s). ${revalidation.warnings.length} erreur(s) restante(s) nécessitent une correction manuelle.`
            : `${correctedCount} error(s) fixed. ${revalidation.warnings.length} remaining error(s) require manual correction.`,
        });
      }
    } else {
      toast({
        title: language === 'fr' ? 'Aucune correction automatique disponible' : 'No automatic fixes available',
        description: language === 'fr'
          ? 'Les erreurs détectées nécessitent une correction manuelle. Consultez l\'aide (?) à côté de chaque erreur.'
          : 'The detected errors require manual correction. Check the help (?) next to each error.',
      });
    }
  };

  // Auto-organize template: group orphan fields into appropriate sections
  const handleAutoOrganize = () => {
    const lines = editableContent.split('\n');
    const organizedSections: Record<string, string[]> = {};
    let currentSection = '';
    const orphanFields: string[] = [];
    
    // Parse existing structure
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
        currentSection = trimmed;
        if (!organizedSections[currentSection]) {
          organizedSections[currentSection] = [];
        }
      } else if (trimmed.startsWith('-')) {
        if (currentSection) {
          organizedSections[currentSection].push(line);
        } else {
          orphanFields.push(line);
        }
      }
    }
    
    // If there are orphan fields, organize them into default sections
    if (orphanFields.length > 0) {
      const defaultSectionName = language === 'fr' 
        ? 'Informations générales:'
        : 'General information:';
      
      if (!organizedSections[defaultSectionName]) {
        organizedSections[defaultSectionName] = [];
      }
      organizedSections[defaultSectionName].push(...orphanFields);
    }
    
    // If no sections exist at all, create default structure
    if (Object.keys(organizedSections).length === 0) {
      const defaultSection = language === 'fr' 
        ? 'Section par défaut:'
        : 'Default section:';
      organizedSections[defaultSection] = [
        `- ${language === 'fr' ? 'Champ exemple' : 'Example field'}: (${language === 'fr' ? 'à compléter' : 'to complete'})`
      ];
    }
    
    // Reconstruct the template
    const newLines: string[] = [];
    Object.entries(organizedSections).forEach(([section, fields], idx) => {
      newLines.push(section);
      newLines.push(...fields);
      if (idx < Object.keys(organizedSections).length - 1) {
        newLines.push(''); // Empty line between sections
      }
    });
    
    const newContent = newLines.join('\n');
    addToHistory(newContent);
    setEditableContent(newContent);
    
    toast({
      title: language === 'fr' ? 'Template organise' : 'Template organized',
      description: language === 'fr' 
        ? `${orphanFields.length} champ(s) orphelin(s) organisé(s) en sections` 
        : `${orphanFields.length} orphan field(s) organized into sections`,
    });
  };

  // Get help text for error types
  const getErrorHelp = (type: string) => {
    const helps: Record<string, { title: string; description: string; example: string }> = {
      'missing-colon': {
        title: language === 'fr' ? 'Deux-points manquant après le libellé' : 'Missing colon after label',
        description: language === 'fr' 
          ? 'Un champ doit avoir un deux-points (:) entre le libellé et l\'exemple.'
          : 'A field must have a colon (:) between the label and the example.',
        example: language === 'fr'
          ? 'Incorrect: - Surface habitable (120m2)\nCorrect: - Surface habitable: (120m2)'
          : 'Incorrect: - Living area (120m2)\nCorrect: - Living area: (120m2)'
      },
      'invalid-field': {
        title: language === 'fr' ? 'Format de champ invalide' : 'Invalid field format',
        description: language === 'fr'
          ? 'Un champ doit commencer par un tiret (-), suivi du libellé, deux-points (:), et exemple entre parenthèses ().'
          : 'A field must start with a dash (-), followed by the label, colon (:), and example in parentheses ().',
        example: language === 'fr'
          ? 'Incorrect: Surface habitable\nCorrect: - Surface habitable: (120m2)'
          : 'Incorrect: Living area\nCorrect: - Living area: (120m2)'
      },
      'field-no-section': {
        title: language === 'fr' ? 'Champ sans section' : 'Field without section',
        description: language === 'fr'
          ? 'Un champ doit appartenir à une section. Ajoutez une section au-dessus du champ.'
          : 'A field must belong to a section. Add a section above the field.',
        example: language === 'fr'
          ? 'Incorrect:\n- Surface: (120m2)\n\nCorrect:\nCaracteristiques:\n- Surface: (120m2)'
          : 'Incorrect:\n- Area: (120m2)\n\nCorrect:\nCharacteristics:\n- Area: (120m2)'
      },
      'unrecognized': {
        title: language === 'fr' ? 'Ligne non reconnue' : 'Unrecognized line',
        description: language === 'fr'
          ? 'Cette ligne n\'est ni une section ni un champ. Transformez-la en section (ajoutez :) ou en champ (ajoutez - au début).'
          : 'This line is neither a section nor a field. Convert it to a section (add :) or to a field (add - at the start).',
        example: language === 'fr'
          ? 'Incorrect: Informations generales\nSection: Informations generales:\nChamp: - Informations generales: ()'
          : 'Incorrect: General information\nSection: General information:\nField: - General information: ()'
      },
      'section-too-long': {
        title: language === 'fr' ? 'Titre de section trop long' : 'Section title too long',
        description: language === 'fr'
          ? 'Le titre de section dépasse 100 caractères. Raccourcissez-le pour une meilleure lisibilité.'
          : 'The section title exceeds 100 characters. Shorten it for better readability.',
        example: language === 'fr'
          ? 'Trop long: Informations detaillees concernant l\'etat general...\nMieux: Etat general du bien:'
          : 'Too long: Detailed information regarding the general condition...\nBetter: General condition:'
      },
      'label-too-short': {
        title: language === 'fr' ? 'Libellé de champ trop court' : 'Field label too short',
        description: language === 'fr'
          ? 'Le libellé du champ est trop court (moins de 2 caractères). Soyez plus descriptif.'
          : 'The field label is too short (less than 2 characters). Be more descriptive.',
        example: language === 'fr'
          ? 'Trop court: - A: ()\nMieux: - Adresse: ()'
          : 'Too short: - A: ()\nBetter: - Address: ()'
      },
      'label-too-long': {
        title: language === 'fr' ? 'Libellé de champ trop long' : 'Field label too long',
        description: language === 'fr'
          ? 'Le libellé du champ dépasse 150 caractères. Raccourcissez-le et mettez les détails dans l\'exemple.'
          : 'The field label exceeds 150 characters. Shorten it and put details in the example.',
        example: language === 'fr'
          ? 'Trop long: - Description detaillee de l\'etat general...\nMieux: - Etat general: (Description detaillee)'
          : 'Too long: - Detailed description of the general condition...\nBetter: - General condition: (Detailed description)'
      },
      'no-sections': {
        title: language === 'fr' ? 'Aucune section détectée' : 'No sections detected',
        description: language === 'fr'
          ? 'Le template doit contenir au moins une section. Une section se termine par deux-points (:).'
          : 'The template must contain at least one section. A section ends with a colon (:).',
        example: language === 'fr'
          ? 'Correct:\nInformations generales:\n- Adresse: ()\n- Surface: ()'
          : 'Correct:\nGeneral information:\n- Address: ()\n- Area: ()'
      },
      'no-fields': {
        title: language === 'fr' ? 'Aucun champ détecté' : 'No fields detected',
        description: language === 'fr'
          ? 'Le template doit contenir au moins un champ par section. Un champ commence par un tiret (-).'
          : 'The template must contain at least one field per section. A field starts with a dash (-).',
        example: language === 'fr'
          ? 'Correct:\nSection:\n- Premier champ: (exemple)\n- Deuxieme champ: (exemple)'
          : 'Correct:\nSection:\n- First field: (example)\n- Second field: (example)'
      },
      'duplicate-field': {
        title: language === 'fr' ? 'Champs dupliqués détectés' : 'Duplicate fields detected',
        description: language === 'fr'
          ? 'Plusieurs champs ont le même label. Les doublons seront supprimés, seul le premier sera conservé.'
          : 'Multiple fields have the same label. Duplicates will be removed, only the first one will be kept.',
        example: language === 'fr'
          ? 'Incorrect:\n- Surface: (100m2)\n- Surface: (120m2)\n\nCorrect:\n- Surface: (100m2)'
          : 'Incorrect:\n- Area: (100m2)\n- Area: (120m2)\n\nCorrect:\n- Area: (100m2)'
      }
    };
    
    return helps[type] || null;
  };

  const handleResetLayout = () => {
    leftPanelRef.current?.resize(50);
    rightPanelRef.current?.resize(50);
    toast({
      title: language === 'fr' ? 'Disposition reinitialisee' : 'Layout reset',
      description: language === 'fr' 
        ? 'Les colonnes ont été réinitialisées à 50/50' 
        : 'Columns have been reset to 50/50',
    });
  };

  const handleWizardComplete = (content: string, baseTemplate: string) => {
    setSelectedBaseLevel(baseTemplate as DetailLevel);
    setEditableContent(content);
    toast({
      title: language === 'fr' ? 'Template cree avec succes' : 'Template created successfully',
      description: language === 'fr' 
        ? 'Vous pouvez maintenant le modifier ou le sauvegarder tel quel' 
        : 'You can now edit it or save it as is',
    });
  };

  return (
    <>
      <TemplateCreationWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {t('cancel') === 'Annuler' ? 'Ma template personnalisée' : 'My custom template'}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({propertyTypeLabels[propertyType]?.[language] || propertyType})
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedBaseLevel === 'simplified' && (t('cancel') === 'Annuler' ? 'Simplifié' : 'Simplified')}
                    {selectedBaseLevel === 'detailed' && (t('cancel') === 'Annuler' ? 'Détaillé' : 'Detailed')}
                    {selectedBaseLevel === 'very-detailed' && (t('cancel') === 'Annuler' ? 'Très détaillé' : 'Very detailed')}
                    {selectedBaseLevel === 'exhaustive' && (t('cancel') === 'Annuler' ? 'Exhaustif' : 'Exhaustive')}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {t('cancel') === 'Annuler' 
                    ? 'Modifiez le template ci-dessous et prévisualisez le rendu en temps réel' 
                    : 'Edit the template below and preview the rendering in real-time'}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLayout}
                className="gap-2"
                title={language === 'fr' ? 'Réinitialiser la disposition (50/50)' : 'Reset layout (50/50)'}
              >
                <SplitSquareHorizontal className="w-4 h-4" />
                {language === 'fr' ? 'Réinitialiser' : 'Reset layout'}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {/* Wizard Suggestion Card */}
            <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-sm">
                    {language === 'fr' ? 'Première fois ?' : 'First time?'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' 
                      ? 'Utilisez l\'assistant interactif pour créer votre premier template pas à pas avec des explications détaillées.' 
                      : 'Use the interactive wizard to create your first template step by step with detailed explanations.'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWizard(true)}
                      className="mt-2"
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {language === 'fr' ? 'Lancer l\'assistant' : 'Launch wizard'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTutorial(!showTutorial)}
                      className="mt-2"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      {language === 'fr' ? 'Guide de syntaxe' : 'Syntax guide'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCategorySelector(!showCategorySelector)}
                      className="mt-2 gap-2"
                    >
                      {language === 'fr' ? 'Par categorie' : 'By category'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Selector Section */}
            {showCategorySelector && (
              <div className="p-6 border rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {language === 'fr' ? 'Selectionner par categorie' : 'Select by category'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCategorySelector(false)}
                    className="h-8 w-8 p-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Choisissez une catégorie professionnelle pour voir les templates adaptés à vos besoins.' 
                    : 'Choose a professional category to see templates suited to your needs.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(TEMPLATE_CATEGORIES).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        toast({
                          title: language === 'fr' ? 'Categorie selectionnee' : 'Category selected',
                          description: `${category.icon} ${category.label[language]}`,
                        });
                      }}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200
                        bg-gradient-to-br ${category.color}
                        hover:scale-105 hover:shadow-lg
                        ${selectedCategory === category.id 
                          ? 'ring-2 ring-primary shadow-lg scale-105' 
                          : 'hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="space-y-2">
                        <div className="text-3xl">{category.icon}</div>
                        <h4 className="font-semibold text-base">
                          {category.label[language]}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {category.description[language]}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {category.propertyTypes.map((type) => (
                            <span
                              key={type}
                              className="text-xs px-2 py-1 rounded-full bg-background/60 border"
                            >
                              {getPropertyTypeLabel(type, language)}
                            </span>
                          ))}
                        </div>
                        {selectedCategory === category.id && (
                          <div className="flex items-center justify-center gap-1 text-primary text-xs font-semibold mt-2">
                            <Check className="w-3 h-3" />
                            {language === 'fr' ? 'Sélectionnée' : 'Selected'}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedCategory && (
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-sm font-medium">
                      {language === 'fr' 
                        ? 'Astuce : Les templates ci-dessous sont maintenant filtres selon votre categorie selectionnee.' 
                        : 'Tip: Templates below are now filtered according to your selected category.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Tutorial Section */}
            {showTutorial && (
              <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {language === 'fr' ? 'Guide de structure de template' : 'Template Structure Guide'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTutorial(false)}
                    className="h-8 w-8 p-0"
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-background/60 rounded-lg border">
                    <p className="font-semibold mb-2 text-primary">
                      {language === 'fr' ? '1. Structure de base' : '1. Basic Structure'}
                    </p>
                    <p className="text-muted-foreground mb-2">
                      {language === 'fr' 
                        ? 'Un template est composé de sections contenant des champs :' 
                        : 'A template consists of sections containing fields:'}
                    </p>
                    <pre className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
{`Nom de la section:
- Nom du champ: (valeur exemple)
- Autre champ: (autre exemple)`}
                    </pre>
                  </div>

                  <div className="p-3 bg-background/60 rounded-lg border">
                    <p className="font-semibold mb-2 text-primary">
                      {language === 'fr' ? '2. Sections' : '2. Sections'}
                    </p>
                    <p className="text-muted-foreground mb-2">
                      {language === 'fr' 
                        ? 'Une section se termine toujours par deux-points (:)' 
                        : 'A section always ends with a colon (:)'}
                    </p>
                    <pre className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
{`Correct:
Informations generales:

Incorrect:
Informations generales
Informations generales -`}
                    </pre>
                  </div>

                  <div className="p-3 bg-background/60 rounded-lg border">
                    <p className="font-semibold mb-2 text-primary">
                      {language === 'fr' ? '3. Champs' : '3. Fields'}
                    </p>
                    <p className="text-muted-foreground mb-2">
                      {language === 'fr' 
                        ? 'Un champ commence par un tiret (-), suivi du label, deux-points (:), et d\'un exemple entre parenthèses ()' 
                        : 'A field starts with a dash (-), followed by the label, colon (:), and example in parentheses ()'}
                    </p>
                    <pre className="p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
{`Correct:
- Surface habitable: (120m2)
- Nombre de pieces: (5)

Incorrect:
Surface habitable (120m2)
- Surface habitable (120m2)
- Surface habitable 120m2`}
                    </pre>
                  </div>

                  <div className="p-3 bg-background/60 rounded-lg border border-primary/50">
                    <p className="font-semibold mb-2 text-primary">
                      {language === 'fr' ? 'Astuce' : 'Tip'}
                    </p>
                    <p className="text-muted-foreground">
                      {language === 'fr' 
                        ? 'Les valeurs entre parenthèses () sont des exemples. Laissez-les vides () si vous voulez remplir les champs plus tard ou utilisez "Remplir avec IA" pour des suggestions automatiques.' 
                        : 'Values in parentheses () are examples. Leave them empty () if you want to fill fields later or use "Fill with AI" for automatic suggestions.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Base template selector */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label htmlFor="base-template-selector">
                {t('cancel') === 'Annuler' ? 'Base template' : 'Base template'}
              </Label>
              <Select
                value={selectedBaseLevel}
                onValueChange={handleBaseTemplateChange}
              >
                <SelectTrigger id="base-template-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">
                    {t('cancel') === 'Annuler' ? 'Simplifié' : 'Simplified'}
                  </SelectItem>
                  <SelectItem value="detailed">
                    {t('cancel') === 'Annuler' ? 'Détaillé' : 'Detailed'}
                  </SelectItem>
                  <SelectItem value="very-detailed">
                    {t('cancel') === 'Annuler' ? 'Très détaillé' : 'Very detailed'}
                  </SelectItem>
                  <SelectItem value="exhaustive">
                    {t('cancel') === 'Annuler' ? 'Exhaustif' : 'Exhaustive'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Two-column layout with resizable panels */}
            <ResizablePanelGroup direction="horizontal" className="h-[600px] rounded-lg border">
              {/* Left Panel: Edit */}
              <ResizablePanel ref={leftPanelRef} defaultSize={50} minSize={30}>
                  <div className="h-full flex flex-col space-y-2 p-4 bg-muted/30 overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label htmlFor="edit-template" className="text-sm font-semibold">
                      ✏️ {t('cancel') === 'Annuler' ? 'Édition du template' : 'Template editing'}
                    </Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoOrganize}
                        disabled={validation.fieldCount === 0}
                        className="gap-2"
                        title={language === 'fr' ? 'Organiser automatiquement les champs en sections' : 'Auto-organize fields into sections'}
                      >
                        <SplitSquareHorizontal className="w-4 h-4" />
                        {t('cancel') === 'Annuler' ? 'Auto-organiser' : 'Auto-organize'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFillWithAI}
                        disabled={isFillingAI || validation.fieldCount === 0}
                        className="gap-2"
                      >
                        {isFillingAI ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {t('cancel') === 'Annuler' ? 'Remplir avec IA' : 'Fill with AI'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetToBase}
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('cancel') === 'Annuler' ? 'Réinitialiser' : 'Reset'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Validation warnings - only shown when user clicks warning icon */}
                  {showWarningBanner && validation.warnings.length > 0 && (
                    <div className="p-3 border border-yellow-500/50 bg-yellow-500/10 rounded-lg space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                          {t('cancel') === 'Annuler' ? 'Avertissements de validation' : 'Validation warnings'} ({validation.warnings.length})
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAutoFix}
                            className="h-6 text-xs gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50"
                          >
                            {t('cancel') === 'Annuler' ? 'Corriger automatiquement' : 'Auto-fix'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowWarningBanner(false)}
                            className="h-6 w-6 p-0"
                          >
                            <XIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-2 max-h-32 overflow-y-auto">
                        {validation.warnings.slice(0, 5).map((warning, idx) => {
                          const help = getErrorHelp(warning.type);
                          return (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="flex-1">{warning.message}</span>
                              {help && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 hover:bg-yellow-500/20"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-4 space-y-2 z-50 bg-popover">
                                    <h4 className="font-semibold text-sm">{help.title}</h4>
                                    <p className="text-xs text-muted-foreground">{help.description}</p>
                                    <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap">
                                      {help.example}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </li>
                          );
                        })}
                        {validation.warnings.length > 5 && (
                          <li className="font-semibold">
                            +{validation.warnings.length - 5} {t('cancel') === 'Annuler' ? 'autre(s) avertissement(s)' : 'more warning(s)'}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* Success banner */}
                  {showSuccessBanner && (
                    <div className="p-3 border border-green-500/50 bg-green-500/10 rounded-lg animate-fade-in">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                        ✅ {t('cancel') === 'Annuler' ? 'Problème résolu ! Template valide.' : 'Problem solved! Template is valid.'}
                      </p>
                    </div>
                  )}
                  
                  {/* Field counter */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-2">
                    <span className="font-semibold">
                      📊 {validation.sectionCount} {t('cancel') === 'Annuler' ? 'section(s)' : 'section(s)'}
                    </span>
                    <span className="font-semibold">
                      📝 {validation.fieldCount} {t('cancel') === 'Annuler' ? 'champ(s)' : 'field(s)'}
                    </span>
                  </div>
                  
                  <Textarea
                    id="edit-template"
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none min-h-[400px] scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
                    placeholder={t('cancel') === 'Annuler' ? 'Contenu du template...' : 'Template content...'}
                  />
                  <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <div className="flex gap-4">
                      <span>
                        {t('cancel') === 'Annuler' ? 'Caractères' : 'Characters'}: {characterCount}
                      </span>
                      <span>
                        {t('cancel') === 'Annuler' ? 'Lignes' : 'Lines'}: {lineCount}
                      </span>
                    </div>
                    {validation.warnings.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowWarningBanner(!showWarningBanner)}
                        className="h-7 gap-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {validation.warnings.length} {t('cancel') === 'Annuler' ? 'problème(s)' : 'issue(s)'}
                      </Button>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Right Panel: Preview */}
              <ResizablePanel ref={rightPanelRef} defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col p-4 bg-muted/30">
                  <div className="flex items-center justify-between border-b pb-2 mb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-semibold">
                        👁️ {t('cancel') === 'Annuler' ? 'Aperçu en temps réel' : 'Real-time preview'}
                      </Label>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleUndo}
                          disabled={!canUndo}
                          className="h-7 w-7 p-0"
                          title={language === 'fr' ? 'Annuler (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRedo}
                          disabled={!canRedo}
                          className="h-7 w-7 p-0"
                          title={language === 'fr' ? 'Rétablir (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                        >
                          <Redo2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-muted-foreground">
                        📊 {validation.sectionCount} {t('cancel') === 'Annuler' ? 'section(s)' : 'section(s)'}
                      </span>
                      <span className="font-semibold text-primary">
                        📝 {validation.fieldCount} {t('cancel') === 'Annuler' ? 'champ(s)' : 'field(s)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                    {previewSections.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8 space-y-3">
                        <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                          {t('cancel') === 'Annuler' 
                            ? 'Aucune section détectée dans le template' 
                            : 'No sections detected in template'}
                        </p>
                        {validation.fieldCount > 0 && (
                          <p className="text-xs">
                            {t('cancel') === 'Annuler' 
                              ? `${validation.fieldCount} champ(s) trouvé(s) mais ils ne sont pas organisés en sections. Ajoutez des titres de section se terminant par ":" pour structurer votre template.` 
                              : `${validation.fieldCount} field(s) found but they are not organized in sections. Add section titles ending with ":" to structure your template.`}
                          </p>
                        )}
                        {validation.fieldCount === 0 && (
                          <p className="text-xs">
                            {t('cancel') === 'Annuler' 
                              ? 'Commencez à écrire pour voir la prévisualisation.' 
                              : 'Start typing to see the preview.'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleSectionDragEnd}
                      >
                        <SortableContext
                          items={previewSections.map(s => s.title)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {previewSections.map((section, sectionIndex) => (
                              <DraggableSection
                                key={section.title}
                                id={section.title}
                                title={section.title}
                                onDelete={() => handleSectionDelete(section.title)}
                              >
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={(event) => handleFieldDragEnd(event, sectionIndex)}
                                >
                                  <SortableContext
                                    items={section.fields.map(f => f.key)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="grid gap-2">
                                      {section.fields.map((field) => (
                                        <DraggableField
                                          key={field.key}
                                          id={field.key}
                                          label={field.label}
                                          language={language === 'fr' ? 'fr' : 'en'}
                                          onDelete={() => handleFieldDelete(sectionIndex, field.key)}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </DraggableSection>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          <DialogFooter className="flex-shrink-0 flex items-center justify-between gap-3 sm:justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="min-w-[100px]"
            >
              {t('cancel') === 'Annuler' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('cancel') === 'Annuler' ? 'Sauvegarder' : 'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('cancel') === 'Annuler' ? "Confirmer l'annulation" : 'Confirm cancellation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('cancel') === 'Annuler' 
                ? 'Voulez-vous vraiment annuler ? Toutes les modifications non sauvegardées seront perdues.' 
                : 'Do you really want to cancel? All unsaved changes will be lost.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('cancel') === 'Annuler' ? "Continuer l'édition" : 'Continue editing'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('cancel') === 'Annuler' ? 'Abandonner' : 'Discard'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Suggestions Progressive Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Suggestions IA générées' : 'AI Suggestions Generated'}
            </DialogTitle>
            <DialogDescription>
              {t('cancel') === 'Annuler' 
                ? `Acceptez ou refusez chaque suggestion pour personnaliser votre template (${acceptedSuggestions.size}/${Object.keys(aiSuggestions).length} acceptées)` 
                : `Accept or reject each suggestion to customize your template (${acceptedSuggestions.size}/${Object.keys(aiSuggestions).length} accepted)`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {Object.entries(aiSuggestions).map(([label, suggestion], index) => {
              const isAccepted = acceptedSuggestions.has(label);
              
              return (
                <div 
                  key={label}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300
                    ${isAccepted 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                        <Label className="text-sm font-semibold">{label}</Label>
                      </div>
                      <div className="p-3 rounded-md bg-muted/50 border">
                        <p className="text-sm text-foreground">{suggestion}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant={isAccepted ? "default" : "outline"}
                        onClick={() => toggleSuggestion(label)}
                        className="gap-2"
                      >
                        {isAccepted ? (
                          <>
                            <Check className="w-4 h-4" />
                            {t('cancel') === 'Annuler' ? 'Acceptée' : 'Accepted'}
                          </>
                        ) : (
                          <>
                            <XIcon className="w-4 h-4" />
                            {t('cancel') === 'Annuler' ? 'Refusée' : 'Rejected'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptAllSuggestions}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  {t('cancel') === 'Annuler' ? 'Tout accepter' : 'Accept all'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAllSuggestions}
                  className="gap-2"
                >
                  <XIcon className="w-4 h-4" />
                  {t('cancel') === 'Annuler' ? 'Tout refuser' : 'Reject all'}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSuggestionsDialog(false)}
                >
                  {t('cancel') === 'Annuler' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button
                  onClick={applyAcceptedSuggestions}
                  disabled={acceptedSuggestions.size === 0}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('cancel') === 'Annuler' 
                    ? `Appliquer (${acceptedSuggestions.size})` 
                    : `Apply (${acceptedSuggestions.size})`}
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground">
                {t('cancel') === 'Annuler' 
                  ? '💡 Astuce : Cliquez sur chaque suggestion pour l\'accepter ou la refuser. Vous pouvez également utiliser les boutons "Tout accepter" ou "Tout refuser".' 
                  : '💡 Tip: Click on each suggestion to accept or reject it. You can also use "Accept all" or "Reject all" buttons.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? '⚠️ Confirmer la suppression' : '⚠️ Confirm deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === 'section' && (
                <>
                  {language === 'fr' 
                    ? `Cette section contient ${previewSections.find(s => s.title === pendingDelete.sectionTitle)?.fields.length || 0} champs. Êtes-vous sûr de vouloir supprimer la section "${pendingDelete.sectionTitle}" et tous ses champs ?`
                    : `This section contains ${previewSections.find(s => s.title === pendingDelete.sectionTitle)?.fields.length || 0} fields. Are you sure you want to delete the section "${pendingDelete.sectionTitle}" and all its fields?`
                  }
                </>
              )}
              {language === 'fr' 
                ? ' Cette action est irréversible.'
                : ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirmDialog(false);
              setPendingDelete(null);
            }}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'fr' ? 'Supprimer' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* MyAladin Chat */}
      <MyAladinChat
        open={showMyAladin}
        onOpenChange={setShowMyAladin}
        propertyType={propertyType}
        onApplyTemplate={(content) => {
          setEditableContent(content);
          toast({
            title: t('cancel') === 'Annuler' ? 'Template applique par MyAladin' : 'Template applied by MyAladin',
            description: t('cancel') === 'Annuler'
              ? 'Votre template a ete cree avec succes !'
              : 'Your template has been created successfully!',
          });
        }}
      />
    </>
  );
};
