import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  FileText, 
  FileCode,
  Loader2, 
  Printer, 
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  FileEdit,
  ListChecks,
  Home,
  Wrench,
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Sparkles,
  MapPin,
  CircleDot,
  Menu,
  X,
  Layers
} from 'lucide-react';
import { generateEDLPDF } from '@/utils/pdfGenerator';
import { generateEDLHTMLBlob, downloadEDLHTML, type EDLReportContent } from '@/utils/htmlGenerator';
import { generateEDLDOCX, downloadEDLDOCX } from '@/utils/docxGenerator';
import { TemplateManager, type EDLTemplate } from '@/components/edl-report/TemplateManager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ToastAction } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface EDLReportEditorSplitViewProps {
  projectId: string;
  visitSessionId?: string | null;
  onBack: () => void;
}

export const EDLReportEditorSplitView: React.FC<EDLReportEditorSplitViewProps> = ({
  projectId,
  visitSessionId,
  onBack
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('cover');
  const [projectData, setProjectData] = useState<any>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  
  // Report content state following the PDF structure
  const [reportContent, setReportContent] = useState({
    cover: {
      title: '',
      subtitle: '',
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      author: '',
      client: '',
      logo: '',
    },
    buildingDescription: {
      description: '',
      particularities: '',
      history: '',
    },
    regulatory: {
      urbanPlanning: '',
      permits: '',
      constraints: '',
      abf: '',
    },
    locationDescription: {
      general: '',
      access: '',
      floors: '',
    },
    denormandieSynthesis: {
      menuiseries: { state: '', recommendation: '' },
      wallInsulation: { state: '', recommendation: '' },
      roofInsulation: { state: '', recommendation: '' },
      hotWater: { state: '', recommendation: '' },
      heating: { state: '', recommendation: '' },
    },
    familyWorks: [] as Array<{
      code: string;
      name: string;
      state: string;
      recommendation: string;
    }>,
    locations: [] as Array<{
      id: string;
      name: string;
      type: string;
      description: string;
      observations: string;
    }>,
        documentTasks: [] as any[],
        sequenceTasks: [] as any[],
        notes: '',
  });

  // Define sections matching the PDF structure
  const sections = [
    {
      id: 'cover',
      number: '01',
      title: 'Page de garde',
      icon: <FileText className="w-4 h-4" />,
      isComplete: !!reportContent.cover.title && !!reportContent.cover.client,
    },
    {
      id: 'buildingDescription',
      number: '02',
      title: 'Description du bâtiment',
      icon: <Building2 className="w-4 h-4" />,
      isComplete: !!reportContent.buildingDescription.description,
    },
    {
      id: 'regulatory',
      number: '03',
      title: 'Point réglementaire',
      icon: <FileEdit className="w-4 h-4" />,
      isComplete: !!reportContent.regulatory.urbanPlanning || !!reportContent.regulatory.permits,
    },
    {
      id: 'locationDescription',
      number: '04',
      title: 'Description des lieux',
      icon: <MapPin className="w-4 h-4" />,
      isComplete: !!reportContent.locationDescription.general,
    },
    {
      id: 'denormandieSynthesis',
      number: '05',
      title: 'Synthèse Denormandie',
      icon: <ClipboardList className="w-4 h-4" />,
      isComplete: Object.values(reportContent.denormandieSynthesis).some(v => v.state || v.recommendation),
    },
    {
      id: 'familyWorks',
      number: '06',
      title: 'Synthèse par famille de travaux',
      icon: <Wrench className="w-4 h-4" />,
      isComplete: reportContent.familyWorks.length > 0,
    },
    {
      id: 'locations',
      number: '07',
      title: 'Détail par lieu',
      icon: <Home className="w-4 h-4" />,
      isComplete: reportContent.locations.length > 0,
    },
    {
      id: 'documentTasks',
      number: '08',
      title: 'Tâches Documents',
      icon: <FileText className="w-4 h-4" />,
      isComplete: reportContent.documentTasks.length > 0,
    },
    {
      id: 'sequenceTasks',
      number: '09',
      title: 'Tâches Séquences',
      icon: <Eye className="w-4 h-4" />,
      isComplete: reportContent.sequenceTasks.length > 0,
    },
    {
      id: 'notes',
      number: '10',
      title: 'Notes & Observations',
      icon: <FileEdit className="w-4 h-4" />,
      isComplete: !!reportContent.notes,
    },
  ];

  // Fetch project data
  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Load template if project has one
  useEffect(() => {
    if (projectData?.last_used_template_id) {
      setCurrentTemplateId(projectData.last_used_template_id);
      loadTemplate(projectData.last_used_template_id);
    }
  }, [projectData?.last_used_template_id]);

  const loadTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('edl_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      if (data?.template_data) {
        setReportContent(prev => ({
          ...prev,
          ...data.template_data,
        }));
        toast({
          title: '✅ Template chargé',
          description: `Le template "${data.name}" a été appliqué`,
        });
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const handleSaveAsTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Open template manager with current report content
      setTemplatesOpen(true);
    } catch (error) {
      console.error('Error preparing template save:', error);
    }
  };

  const handleSelectTemplate = async (template: EDLTemplate) => {
    setCurrentTemplateId(template.id);
    setReportContent(prev => ({
      ...prev,
      ...template.template_data,
    }));
    
    if (projectId) {
      await supabase
        .from('edl_projects')
        .update({
          last_used_template_id: template.id,
          template_data: template.template_data,
        })
        .eq('id', projectId);
    }

    setTemplatesOpen(false);
    toast({
      title: '✅ Template appliqué',
      description: `Le template "${template.name}" a été appliqué`,
    });
  };

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Fetch current user
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch project with related data (optimisé : sans visit_sequences car non utilisées directement)
      // Les tâches extraites des séquences sont déjà dans extracted_tasks
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          extracted_tasks(
            *,
            ft_familles(ft_code, ft_label),
            ct_categories(ct_code, ct_label),
            sc_sous_categories(sc_code, sc_label)
          ),
          property_locations(*),
          property_composition(*),
          identified_problems(*)
        `)
        .eq('id', projectId)
        .single();

      if (project) {
        setProjectData(project);

        // Get composition data
        const composition = project.property_composition?.[0];
        const nbAppartements = composition?.nb_appartements || 0;
        const nbNiveaux = composition?.nb_niveaux || 0;
        const nbCages = composition?.nb_cages_escalier || 0;
        
        // Build detailed description from composition
        let buildingDesc = '';
        if (project.property_type === 'immeuble') {
          buildingDesc = `L'immeuble est situé au ${project.address}, ${project.postal_code} ${project.city}.`;
          if (nbNiveaux) buildingDesc += ` Il comprend ${nbNiveaux} niveau(x)`;
          if (nbAppartements) buildingDesc += `, ${nbAppartements} appartement(s)`;
          if (nbCages) buildingDesc += ` et ${nbCages} cage(s) d'escalier`;
          buildingDesc += '.';
        } else if (project.property_type === 'maison') {
          buildingDesc = `La maison est située au ${project.address}, ${project.postal_code} ${project.city}.`;
        } else {
          buildingDesc = `Le bien est situé au ${project.address}, ${project.postal_code} ${project.city}.`;
        }
        
        // S'assurer que la description fait au moins 10 caractères
        if (buildingDesc.length < 10) {
          buildingDesc = `Bien immobilier situé au ${project.address || 'adresse non renseignée'}, ${project.postal_code || ''} ${project.city || ''}. Description à compléter.`;
        }

        // Pre-fill report content from project data
        setReportContent(prev => ({
          ...prev,
          cover: {
            ...prev.cover,
            title: `EDL PROJET : ${project.city?.toUpperCase() || ''} – ${project.address || ''}`,
            subtitle: `${project.address || ''}, ${project.postal_code || ''} ${project.city || ''}`,
            date: `Le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            author: user?.email?.split('@')[0] || '',
            client: '',
          },
          buildingDescription: {
            description: buildingDesc,
            particularities: composition?.description || '',
            history: project.additional_info || '',
          },
          locations: (project.property_locations || []).map((loc: any) => ({
            id: loc.id,
            name: loc.name || loc.location_type,
            type: loc.location_type || 'autre',
            description: loc.description || '',
            observations: loc.notes || '',
          })),
          // Split tasks by source: documents vs sequences
          // Note: Les tâches des séquences seront chargées progressivement via pagination
          documentTasks: (project.extracted_tasks || [])
            .filter((task: any) => task.source_type === 'document' || task.source_type === 'pdf')
            .map((task: any) => ({
              ...task,
              photos: task.image_url ? [task.image_url] : [],
            })),
          sequenceTasks: (project.extracted_tasks || [])
            .filter((task: any) => task.source_type === 'sequence' || task.source_type === 'video' || task.source_type === 'audio' || task.source_type === 'photo' || task.source_type === 'text' || !task.source_type)
            .map((task: any) => ({
              ...task,
              photos: task.image_url ? [task.image_url] : [],
            })),
        }));

        // Pre-fill family works from tasks (using DTC tables)
        const familyMap = new Map();
        (project.extracted_tasks || []).forEach((task: any) => {
          // Try DTC tables first (ft_familles), fallback to old structure (task_families)
          const family = task.ft_familles || task.task_families;
          if (family) {
            const code = family.ft_code || family.code;
            const name = family.ft_label || family.name;
            if (code && !familyMap.has(code)) {
              familyMap.set(code, {
                code,
                name,
                state: '',
                recommendation: task.description || '',
                tasksCount: 1,
              });
            } else if (code) {
              const existing = familyMap.get(code);
              if (existing) {
                existing.tasksCount++;
              }
            }
          }
        });
        
        // Load DTC families from database if none from tasks
        if (familyMap.size === 0) {
          try {
            const { data: dtcFamilies, error: dtcError } = await supabase
              .from('ft_familles')
              .select('ft_code, ft_label, commentaire_type_equipe')
              .order('ft_code')
              .limit(50); // Limiter pour éviter trop de familles
            
            if (!dtcError && dtcFamilies && dtcFamilies.length > 0) {
              // Use real DTC families
              dtcFamilies.forEach(ft => {
                familyMap.set(ft.ft_code, {
                  code: ft.ft_code,
                  name: ft.ft_label,
                  state: '',
                  recommendation: '',
                  tasksCount: 0,
                });
              });
            } else {
              // Fallback to default families if DTC not available
              console.warn('[EDLReportEditor] DTC families not available, using defaults');
              const defaultFamilies = [
                { code: 'FT01', name: 'Pilotage & installations de chantier' },
                { code: 'FT02', name: 'Études, relevés, diagnostics' },
                { code: 'FT03', name: 'Curage / Dépose sélective' },
                { code: 'FT04', name: 'Gros Œuvre / Maçonnerie' },
                { code: 'FT05', name: 'Charpente / Couverture' },
                { code: 'FT06', name: 'Menuiseries extérieures' },
                { code: 'FT07', name: 'Isolation / Plâtrerie' },
                { code: 'FT08', name: 'Électricité' },
                { code: 'FT09', name: 'Plomberie / Sanitaires' },
                { code: 'FT10', name: 'Chauffage / Ventilation' },
              ];
              defaultFamilies.forEach(f => familyMap.set(f.code, { ...f, state: '', recommendation: '', tasksCount: 0 }));
            }
          } catch (error) {
            console.error('[EDLReportEditor] Error loading DTC families:', error);
            // Fallback to default families on error
            const defaultFamilies = [
              { code: 'FT01', name: 'Pilotage & installations de chantier' },
              { code: 'FT02', name: 'Études, relevés, diagnostics' },
              { code: 'FT03', name: 'Curage / Dépose sélective' },
              { code: 'FT04', name: 'Gros Œuvre / Maçonnerie' },
              { code: 'FT05', name: 'Charpente / Couverture' },
              { code: 'FT06', name: 'Menuiseries extérieures' },
              { code: 'FT07', name: 'Isolation / Plâtrerie' },
              { code: 'FT08', name: 'Électricité' },
              { code: 'FT09', name: 'Plomberie / Sanitaires' },
              { code: 'FT10', name: 'Chauffage / Ventilation' },
            ];
            defaultFamilies.forEach(f => familyMap.set(f.code, { ...f, state: '', recommendation: '', tasksCount: 0 }));
          }
        }
        
        setReportContent(prev => ({
          ...prev,
          familyWorks: Array.from(familyMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
        }));
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du projet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = useCallback((section: string, field: string, value: any) => {
    setReportContent(prev => {
      const sectionData = (prev as any)[section];
      if (typeof sectionData === 'object' && !Array.isArray(sectionData)) {
        if (field.includes('.')) {
          const [subSection, subField] = field.split('.');
          return {
            ...prev,
            [section]: {
              ...sectionData,
              [subSection]: {
                ...(sectionData[subSection] || {}),
                [subField]: value,
              },
            },
          };
        }
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value,
          },
        };
      }
      return { ...prev, [section]: value };
    });
  }, []);

  const updateArrayItem = useCallback((section: string, index: number, field: string, value: string) => {
    setReportContent(prev => ({
      ...prev,
      [section]: (prev as any)[section].map((item: any, i: number) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }, []);

  const addArrayItem = useCallback((section: string, item: any) => {
    setReportContent(prev => ({
      ...prev,
      [section]: [...(prev as any)[section], item],
    }));
  }, []);

  const removeArrayItem = useCallback((section: string, index: number) => {
    setReportContent(prev => ({
      ...prev,
      [section]: (prev as any)[section].filter((_: any, i: number) => i !== index),
    }));
  }, []);

  // Validation schema for report content
  const reportSchema = z.object({
    cover: z.object({
      title: z.string().min(1, 'Le titre est requis'),
      client: z.string().min(1, 'Le client est requis'),
      date: z.string().min(1, 'La date est requise'),
    }),
    buildingDescription: z.object({
      // La description est optionnelle, mais si elle est remplie, elle doit faire au moins 10 caractères
      description: z.string().refine(
        (val) => !val || val.length >= 10,
        { message: 'La description doit faire au moins 10 caractères si elle est renseignée' }
      ),
    }),
    familyWorks: z.array(z.object({
      code: z.string().regex(/^FT\d{2}$/, 'Code FT invalide (format: FT##)'),
      name: z.string().min(1, 'Le nom de la famille est requis'),
      state: z.string().optional(),
      recommendation: z.string().optional(),
    })),
  });

  const generatePDF = async () => {
    // Validation avant génération
    const validation = reportSchema.safeParse(reportContent);
    
    if (!validation.success) {
      const errors = validation.error.errors.map(e => {
        const field = e.path.join('.');
        return `${field}: ${e.message}`;
      }).join('\n');
      
      // Améliorer le message d'erreur pour guider l'utilisateur
      const errorMessages = validation.error.errors.map(e => {
        const field = e.path.join('.');
        let userFriendlyField = field;
        if (field === 'buildingDescription.description') {
          userFriendlyField = 'Description du bâtiment (section "Description du bâtiment")';
        } else if (field === 'cover.title') {
          userFriendlyField = 'Titre du rapport (section "Couverture")';
        } else if (field === 'cover.client') {
          userFriendlyField = 'Client / Destinataire (section "Couverture")';
        } else if (field === 'cover.date') {
          userFriendlyField = 'Date (section "Couverture")';
        }
        return `${userFriendlyField}: ${e.message}`;
      }).join('\n');
      
      toast({
        title: 'Erreurs de validation',
        description: `Veuillez corriger les erreurs suivantes avant de générer le PDF:\n${errorMessages}`,
        variant: 'destructive',
        duration: 10000,
      });
      
      // Naviguer automatiquement vers la section avec l'erreur si possible
      const firstError = validation.error.errors[0];
      if (firstError.path[0] === 'buildingDescription') {
        setActiveSection('buildingDescription');
      } else if (firstError.path[0] === 'cover') {
        setActiveSection('cover');
      }
      
      return;
    }

    setGenerating(true);
    try {
      const blob = await generateEDLPDF({
        title: reportContent.cover.title,
        project: {
          address: projectData?.address || '',
          postalCode: projectData?.postal_code || '',
          city: projectData?.city || '',
          propertyType: projectData?.property_type || '',
        },
        visitInfo: {
          date: reportContent.cover.date,
          duration: 0,
          blocksCount: reportContent.locations.length,
        },
        blocks: reportContent.locations.map((loc, idx) => ({
          number: idx + 1,
          roomType: loc.name,
          confidence: 100,
          duration: 0,
          photos: [],
          transcription: loc.observations || loc.description,
          tasks: [],
        })),
        notes: reportContent.notes,
      });
      
      setPdfBlob(blob);
      
      // Télécharger automatiquement le PDF après génération
      // Mais aussi afficher un toast avec option de re-télécharger
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDL_${projectData?.city || 'rapport'}_${projectData?.address?.replace(/[^a-z0-9]/gi, '_') || ''}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Rapport généré et téléchargé',
        description: 'Le PDF a été téléchargé automatiquement. Cliquez sur le bouton "Télécharger PDF" en haut pour le télécharger à nouveau.',
        duration: 8000,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de générer le rapport',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EDL_${projectData?.city || 'rapport'}_${projectData?.address?.replace(/[^a-z0-9]/gi, '_') || ''}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 100);
    };
  };

  const renderSectionEditor = () => {
    switch (activeSection) {
      case 'cover':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Titre du rapport</Label>
              <Input
                value={reportContent.cover.title}
                onChange={(e) => updateField('cover', 'title', e.target.value)}
                placeholder="EDL PROJET : VILLE – Adresse"
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Adresse complète</Label>
              <Input
                value={reportContent.cover.subtitle}
                onChange={(e) => updateField('cover', 'subtitle', e.target.value)}
                placeholder="15 rue de la République, 09100 Pamiers"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Input
                  value={reportContent.cover.date}
                  onChange={(e) => updateField('cover', 'date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Auteur / Cabinet</Label>
                <Input
                  value={reportContent.cover.author}
                  onChange={(e) => updateField('cover', 'author', e.target.value)}
                  placeholder="Nom de l'architecte ou cabinet"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client / Destinataire</Label>
              <Input
                value={reportContent.cover.client}
                onChange={(e) => updateField('cover', 'client', e.target.value)}
                placeholder="Pour..."
              />
            </div>
          </div>
        );

      case 'buildingDescription':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description du bâtiment</Label>
              <Textarea
                value={reportContent.buildingDescription.description}
                onChange={(e) => updateField('buildingDescription', 'description', e.target.value)}
                placeholder="L'immeuble est traversant entre la rue... Il est constitué de..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Décrivez la configuration générale, les accès, la structure
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Particularités architecturales</Label>
              <Textarea
                value={reportContent.buildingDescription.particularities}
                onChange={(e) => updateField('buildingDescription', 'particularities', e.target.value)}
                placeholder="Escalier hélicoïdal, verrière, patio..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Historique / Travaux antérieurs</Label>
              <Textarea
                value={reportContent.buildingDescription.history}
                onChange={(e) => updateField('buildingDescription', 'history', e.target.value)}
                placeholder="Travaux réalisés, rénovations passées..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'regulatory':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Point urbanisme / PLU</Label>
              <Textarea
                value={reportContent.regulatory.urbanPlanning}
                onChange={(e) => updateField('regulatory', 'urbanPlanning', e.target.value)}
                placeholder="Zonage, règles applicables, hauteur maximale..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permis nécessaires</Label>
              <Textarea
                value={reportContent.regulatory.permits}
                onChange={(e) => updateField('regulatory', 'permits', e.target.value)}
                placeholder="Permis de construire à faire, changement de destination..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contraintes ABF / Secteur sauvegardé</Label>
              <Textarea
                value={reportContent.regulatory.abf}
                onChange={(e) => updateField('regulatory', 'abf', e.target.value)}
                placeholder="Secteur sauvegardé, préconisations ABF..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Autres contraintes</Label>
              <Textarea
                value={reportContent.regulatory.constraints}
                onChange={(e) => updateField('regulatory', 'constraints', e.target.value)}
                placeholder="Monuments historiques, servitudes..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'locationDescription':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description générale des lieux</Label>
              <Textarea
                value={reportContent.locationDescription.general}
                onChange={(e) => updateField('locationDescription', 'general', e.target.value)}
                placeholder="À chaque étage, l'escalier donne sur des paliers qui desservent..."
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Accès et circulation</Label>
              <Textarea
                value={reportContent.locationDescription.access}
                onChange={(e) => updateField('locationDescription', 'access', e.target.value)}
                placeholder="On entre par le côté droit, grande cage d'escalier..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Organisation par niveaux</Label>
              <Textarea
                value={reportContent.locationDescription.floors}
                onChange={(e) => updateField('locationDescription', 'floors', e.target.value)}
                placeholder="RDC : 2 commerces, R+1 : 2 appartements..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        );

      case 'denormandieSynthesis':
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Synthèse Denormandie :</strong> État des 5 composants principaux pour la conformité au dispositif fiscal
              </p>
            </div>
            
            {[
              { key: 'menuiseries', label: '1. Menuiseries', placeholder: 'Bois simple vitrage' },
              { key: 'wallInsulation', label: '2. Isolation des murs', placeholder: 'Absence d\'isolation' },
              { key: 'roofInsulation', label: '3. Isolation de la toiture', placeholder: 'Absence d\'isolation' },
              { key: 'hotWater', label: '4. Eau chaude', placeholder: 'Installation vétuste' },
              { key: 'heating', label: '5. Chauffage', placeholder: 'Installation vétuste' },
            ].map((item, idx) => (
              <Card key={item.key} className="p-4 bg-card/50">
                <div className="font-medium text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  {item.label}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">État actuel</Label>
                    <Textarea
                      value={(reportContent.denormandieSynthesis as any)[item.key].state}
                      onChange={(e) => updateField('denormandieSynthesis', `${item.key}.state`, e.target.value)}
                      placeholder={item.placeholder}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Travaux préconisés</Label>
                    <Textarea
                      value={(reportContent.denormandieSynthesis as any)[item.key].recommendation}
                      onChange={(e) => updateField('denormandieSynthesis', `${item.key}.recommendation`, e.target.value)}
                      placeholder="À remplacer / À prévoir..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );

      case 'familyWorks':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Synthèse des travaux par code famille (FT)
              </p>
              <Button 
                onClick={() => addArrayItem('familyWorks', { 
                  code: `FT${String(reportContent.familyWorks.length + 1).padStart(2, '0')}`, 
                  name: '', 
                  state: '', 
                  recommendation: '' 
                })} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </Button>
            </div>
            
            <div className="space-y-3">
              {reportContent.familyWorks.map((work, index) => (
                <Card key={index} className="p-4 bg-card/50 group">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-1">
                      {work.code}
                    </Badge>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={work.name}
                        onChange={(e) => updateArrayItem('familyWorks', index, 'name', e.target.value)}
                        placeholder="Nom de la famille de travaux"
                        className="font-medium h-9"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">État</Label>
                          <Textarea
                            value={work.state}
                            onChange={(e) => updateArrayItem('familyWorks', index, 'state', e.target.value)}
                            placeholder="État constaté"
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Travaux préconisés</Label>
                          <Textarea
                            value={work.recommendation}
                            onChange={(e) => updateArrayItem('familyWorks', index, 'recommendation', e.target.value)}
                            placeholder="Préconisations"
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('familyWorks', index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'locations':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Description détaillée de chaque lieu visité
              </p>
              <Button 
                onClick={() => addArrayItem('locations', { 
                  id: crypto.randomUUID(), 
                  name: '', 
                  type: 'pièce',
                  description: '', 
                  observations: '' 
                })} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </Button>
            </div>
            
            <div className="space-y-3">
              {reportContent.locations.map((location, index) => (
                <Card key={location.id} className="p-4 bg-card/50 group">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm flex items-center justify-center font-bold shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={location.name}
                        onChange={(e) => updateArrayItem('locations', index, 'name', e.target.value)}
                        placeholder="Nom du lieu (ex: Appartement 201, Cage escalier A)"
                        className="font-medium h-9"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          value={location.description}
                          onChange={(e) => updateArrayItem('locations', index, 'description', e.target.value)}
                          placeholder="Description du lieu, configuration, surfaces..."
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Observations & Problèmes</Label>
                        <Textarea
                          value={location.observations}
                          onChange={(e) => updateArrayItem('locations', index, 'observations', e.target.value)}
                          placeholder="Problèmes constatés, travaux nécessaires..."
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem('locations', index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {reportContent.locations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Home className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucun lieu défini</p>
                  <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'documentTasks':
        const renderDocTaskCard = (task: any, index: number) => (
          <Card key={task.id || index} className="p-3 bg-card/50">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {task.task_families?.code || '—'}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </div>
                )}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {task.location && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {task.location}
                    </Badge>
                  )}
                  {task.task_categories?.name && (
                    <Badge variant="secondary" className="text-xs">
                      {task.task_categories.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Extraites des documents téléchargés (étape 5 - Informations projet)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {reportContent.documentTasks.length} tâche(s)
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <FileText className="w-3 h-3" />
                Documents
              </Badge>
            </div>
            
            {reportContent.documentTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune tâche extraite des documents</p>
                <p className="text-xs mt-1">Téléchargez des documents dans l'étape 5 du projet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reportContent.documentTasks.map(renderDocTaskCard)}
              </div>
            )}
          </div>
        );

      case 'sequenceTasks':
        const renderSeqTaskCard = (task: any, index: number) => (
          <Card key={task.id || index} className="p-3 bg-card/50">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {task.task_families?.code || '—'}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </div>
                )}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {task.location && (
                    <Badge variant="secondary" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {task.location}
                    </Badge>
                  )}
                  {task.task_categories?.name && (
                    <Badge variant="secondary" className="text-xs">
                      {task.task_categories.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Extraites des séquences de visite (reportage terrain)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {reportContent.sequenceTasks.length} tâche(s)
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Eye className="w-3 h-3" />
                Séquences
              </Badge>
            </div>
            
            {reportContent.sequenceTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune tâche extraite des séquences</p>
                <p className="text-xs mt-1">Créez des séquences dans le reportage terrain</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reportContent.sequenceTasks.map(renderSeqTaskCard)}
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Notes additionnelles et observations générales pour le rapport
            </p>
            <Textarea
              value={reportContent.notes}
              onChange={(e) => setReportContent(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ajoutez vos notes, commentaires ou observations complémentaires qui apparaîtront à la fin du rapport..."
              rows={16}
              className="resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const completedCount = sections.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedCount / sections.length) * 100);
  const currentSection = sections.find(s => s.id === activeSection);
  const currentIndex = sections.findIndex(s => s.id === activeSection);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  const goToNextSection = () => {
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const goToPrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id);
    }
  };

  // Sommaire content (reusable for both desktop and mobile)
  const SommaireContent = () => (
    <>
      {/* Progress */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Sommaire</h3>
          <Badge variant="secondary" className="text-xs font-mono">
            {progressPercent}%
          </Badge>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedCount}/{sections.length} sections complétées
        </p>
      </div>
      
      {/* Sections List */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {sections.map((section, idx) => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.98]",
              activeSection === section.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-muted/80 active:bg-muted"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              section.isComplete
                ? activeSection === section.id
                  ? "bg-primary-foreground/20"
                  : "bg-green-500 text-white"
                : activeSection === section.id
                  ? "bg-primary-foreground/20"
                  : "bg-muted"
            )}>
              {section.isComplete ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            <span className={cn(
              "flex-1 text-sm",
              activeSection === section.id && "font-medium"
            )}>
              {section.title}
            </span>
            <ChevronRight className={cn(
              "w-4 h-4 shrink-0 transition-transform",
              activeSection === section.id ? "opacity-70" : "opacity-40"
            )} />
          </button>
        ))}
      </div>

      {/* PDF Actions */}
      {pdfBlob && (
        <div className="p-3 border-t space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full gap-2"
            onClick={() => {
              const url = URL.createObjectURL(pdfBlob);
              window.open(url, '_blank');
            }}
          >
            <Eye className="w-4 h-4" />
            Aperçu PDF
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={printPDF} className="gap-1">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPDF} className="gap-1">
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header - Fixed */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-card/80 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm sm:text-base truncate">Rapport EDL</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">
              {projectData?.address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bouton de téléchargement visible si PDF généré - Toujours visible */}
          {pdfBlob && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                downloadPDF();
                toast({
                  title: '✅ Téléchargement',
                  description: 'Le PDF est en cours de téléchargement...',
                });
              }}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Télécharger PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          )}
          
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
              <Layers className="w-4 h-4 mr-1.5" />
              Templates
            </Button>
            <Button variant="outline" size="sm" disabled={!pdfBlob} onClick={printPDF}>
              <Printer className="w-4 h-4 mr-1.5" />
              Imprimer
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!pdfBlob}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  try {
                    const htmlBlob = await generateEDLHTMLBlob(reportContent as EDLReportContent);
                    const filename = `EDL_${projectData?.city || 'rapport'}_${projectData?.address?.replace(/[^a-z0-9]/gi, '_') || ''}.html`;
                    downloadEDLHTML(htmlBlob, filename);
                    toast({
                      title: '✅ Export HTML',
                      description: 'Le rapport HTML a été téléchargé',
                    });
                  } catch (error) {
                    console.error('Error generating HTML:', error);
                    toast({
                      title: 'Erreur',
                      description: 'Impossible de générer le fichier HTML',
                      variant: 'destructive',
                    });
                  }
                }}>
                  <FileCode className="w-4 h-4 mr-2" />
                  HTML
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  try {
                    const docxBlob = await generateEDLDOCX(reportContent as EDLReportContent);
                    const filename = `EDL_${projectData?.city || 'rapport'}_${projectData?.address?.replace(/[^a-z0-9]/gi, '_') || ''}.docx`;
                    downloadEDLDOCX(docxBlob, filename);
                    toast({
                      title: '✅ Export DOCX',
                      description: 'Le rapport Word a été téléchargé',
                    });
                  } catch (error) {
                    console.error('Error generating DOCX:', error);
                    toast({
                      title: 'Erreur',
                      description: 'Impossible de générer le fichier DOCX',
                      variant: 'destructive',
                    });
                  }
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Word (DOCX)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button onClick={generatePDF} disabled={generating} size="sm" className="gap-1.5">
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Générer</span>
          </Button>

          {/* Mobile sommaire trigger */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Menu className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {completedCount}
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-[320px] p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Sommaire du rapport</SheetTitle>
                </SheetHeader>
                <SommaireContent />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Templates Manager Sheet */}
      <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gestion des templates</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TemplateManager
              projectId={projectId}
              onSelectTemplate={handleSelectTemplate}
              currentTemplateId={currentTemplateId}
              currentReportContent={reportContent}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Section Header - Sticky */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {currentSection?.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {currentSection?.number}
                  </Badge>
                  <h2 className="font-semibold text-sm sm:text-base truncate">
                    {currentSection?.title}
                  </h2>
                </div>
              </div>
              {/* Navigation arrows on mobile */}
              <div className="flex items-center gap-1 sm:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevSection}
                  disabled={currentIndex === 0}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextSection}
                  disabled={currentIndex === sections.length - 1}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Section Content - Scrollable */}
          <div className="flex-1 overflow-auto scroll-smooth">
            <div className="p-4 sm:p-6 pb-24 sm:pb-6">
              {renderSectionEditor()}
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t safe-area-inset-bottom z-20">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevSection}
                  disabled={currentIndex === 0}
                  className="flex-1 gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                <div className="text-xs text-muted-foreground font-mono px-2">
                  {currentIndex + 1}/{sections.length}
                </div>
                <Button
                  variant={currentIndex === sections.length - 1 ? "default" : "outline"}
                  size="sm"
                  onClick={currentIndex === sections.length - 1 ? generatePDF : goToNextSection}
                  disabled={currentIndex === sections.length - 1 && generating}
                  className="flex-1 gap-1"
                >
                  {currentIndex === sections.length - 1 ? (
                    generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Générer PDF
                      </>
                    )
                  ) : (
                    <>
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar - Sommaire */}
        {!isMobile && (
          <aside className="w-72 lg:w-80 flex flex-col bg-muted/10 border-l shrink-0">
            <SommaireContent />
          </aside>
        )}
      </div>
    </div>
  );
};
