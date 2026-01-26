import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  FileText, 
  Loader2, 
  Printer, 
  Download,
  Mail,
  Share2,
  FileSpreadsheet,
  FileText as FileWord,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Check,
  AlertTriangle,
  Wrench,
  Building2,
  MapPin,
  ListChecks,
  Image,
  ZoomIn,
  Home,
  X
} from 'lucide-react';
import { EDLSection1GeneralInfo } from './sections/EDLSection1GeneralInfo';
import { EDLSection2GlobalSummary } from './sections/EDLSection2GlobalSummary';
import { EDLSection3RoomZone } from './sections/EDLSection3RoomZone';
import { EDLSection4Tasks } from './sections/EDLSection4Tasks';
import { EDLSection5Annexes } from './sections/EDLSection5Annexes';
import { generateProfessionalEDLPDF } from '@/utils/edlPdfGenerator';
import { exportReportToWord, exportReportToExcel } from '@/utils/reportExporter';
import { cn } from '@/lib/utils';

export interface EDLReportData {
  project: {
    id: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    propertyType: string;
  };
  edlContext: {
    typeEDL: string;
    date: string;
    performedBy: string;
  };
  edlSummary: {
    resumeGlobal: string;
    parPieces: Array<{
      piece: string;
      etatGeneral: string;
      pointsForts: string;
      pointsFaibles: string;
    }>;
  };
  tasks: Array<{
    id: string;
    familyCode: string;
    familyName: string;
    category: string;
    subCategory: string | null;
    taskName: string;
    description: string;
    pieceOrZone: string;
    priority: 'basse' | 'normale' | 'haute' | 'urgente';
    status: string;
    observations?: string;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: 'photo' | 'video_frame';
    piece: string;
    label?: string;
    caption?: string;
  }>;
}

interface EDLReportViewerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenKanban?: () => void;
}

export const EDLReportViewer: React.FC<EDLReportViewerProps> = ({
  projectId,
  open,
  onOpenChange,
  onOpenKanban
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<EDLReportData | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sections = [
    { id: 'general', title: 'Informations générales', icon: Building2 },
    { id: 'summary', title: 'Résumé global', icon: FileText },
    { id: 'rooms', title: 'Par pièce / zone', icon: Home },
    { id: 'tasks', title: 'Tâches associées', icon: ListChecks },
    { id: 'annexes', title: 'Annexes (photos)', icon: Image },
  ];

  useEffect(() => {
    if (projectId && open) {
      fetchReportData();
    }
  }, [projectId, open]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      // Fetch related data separately to avoid type instantiation issues
      const { data: tasks } = await supabase
        .from('extracted_tasks')
        .select('*')
        .eq('project_id', projectId);

      const { data: locations } = await supabase
        .from('property_locations')
        .select('*')
        .eq('project_id', projectId);

      const projectWithRelations = {
        ...project,
        extracted_tasks: tasks || [],
        property_locations: locations || []
      };

      if (!projectWithRelations) {
        throw new Error('Project not found');
      }

      // Build EDL summary from locations and tasks
      const parPieces = (projectWithRelations.property_locations || []).map((loc: any) => ({
        piece: loc.name || loc.location_type || 'Zone',
        etatGeneral: loc.condition || 'À évaluer',
        pointsForts: loc.notes || '',
        pointsFaibles: '',
      }));

      // Add pieces from tasks if not in locations
      const taskPieces = new Set((projectWithRelations.extracted_tasks || []).map((t: any) => t.location).filter(Boolean));
      taskPieces.forEach(piece => {
        if (!parPieces.find((p: any) => p.piece === piece)) {
          parPieces.push({
            piece: piece as string,
            etatGeneral: 'À évaluer',
            pointsForts: '',
            pointsFaibles: '',
          });
        }
      });

      // Format tasks
      const formattedTasks = (projectWithRelations.extracted_tasks || []).map((task: any) => ({
        id: task.id,
        familyCode: task.family_code || 'F-ÀVérifier',
        familyName: task.family_name || 'À vérifier',
        category: task.category_name || '',
        subCategory: task.subcategory_name || null,
        taskName: task.title,
        description: task.description || '',
        pieceOrZone: task.location || 'Non localisé',
        priority: (task.priority as any) || 'normale',
        status: 'à faire',
        observations: '',
      }));

      // Fetch frames separately
      const { data: frames } = await supabase
        .from('extracted_frames')
        .select('*')
        .eq('visit_session_id', projectId)
        .limit(50);

      // Collect media
      const media: EDLReportData['media'] = [];
      (frames || []).forEach((frame: any) => {
        if (frame.frame_url) {
          media.push({
            id: frame.id,
            url: frame.frame_url,
            type: 'video_frame',
            piece: frame.manual_label || 'Capture vidéo',
            label: frame.manual_label,
            caption: frame.manual_label ? `Capture de ${frame.manual_label}` : 'Capture vidéo automatique',
          });
        }
      });

      // Add task images
      (projectWithRelations.extracted_tasks || []).forEach((task: any) => {
        if (task.image_url) {
          media.push({
            id: `task-${task.id}`,
            url: task.image_url,
            type: 'photo',
            piece: task.location || 'Non localisé',
            label: task.title,
            caption: `${task.location || ''} – ${task.title}`,
          });
        }
      });

      // Generate global summary
      const taskCount = formattedTasks.length;
      const urgentCount = formattedTasks.filter((t: any) => t.priority === 'urgente').length;
      const roomCount = parPieces.length;

      let resumeGlobal = `État des lieux réalisé le ${new Date().toLocaleDateString('fr-FR')} pour le bien situé au ${projectWithRelations.address}, ${projectWithRelations.postal_code} ${projectWithRelations.city}. `;
      if (taskCount > 0) {
        resumeGlobal += `${taskCount} tâche(s) identifiée(s) sur ${roomCount} zone(s) inspectée(s). `;
        if (urgentCount > 0) {
          resumeGlobal += `${urgentCount} intervention(s) urgente(s) requise(s). `;
        }
      } else {
        resumeGlobal += `Aucune tâche identifiée pour le moment.`;
      }

      setReportData({
        project: {
          id: projectWithRelations.id,
          name: projectWithRelations.address,
          address: projectWithRelations.address,
          postalCode: projectWithRelations.postal_code || '',
          city: projectWithRelations.city || '',
          propertyType: projectWithRelations.property_type || 'immeuble',
        },
        edlContext: {
          typeEDL: 'Avant travaux',
          date: new Date().toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }),
          performedBy: user?.email?.split('@')[0] || 'MyEDLs',
        },
        edlSummary: {
          resumeGlobal,
          parPieces,
        },
        tasks: formattedTasks,
        media,
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du rapport',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      const blob = await generateProfessionalEDLPDF(reportData);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDL_${reportData.project.city}_${reportData.project.address.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ PDF exporté',
        description: 'Le rapport a été téléchargé',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportWord = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      const blob = await exportReportToWord(reportData);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDL_${reportData.project.city}_${reportData.project.address.replace(/[^a-z0-9]/gi, '_')}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Word exporté',
        description: 'Le rapport a été téléchargé en format Word',
      });
    } catch (error) {
      console.error('Error exporting Word:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter en Word',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      const blob = exportReportToExcel(reportData);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDL_${reportData.project.city}_${reportData.project.address.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: '✅ Excel exporté',
        description: 'Le rapport a été téléchargé en format Excel',
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'exporter en Excel',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      const blob = await generateProfessionalEDLPDF(reportData);
      const url = URL.createObjectURL(blob);
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
    } catch (error) {
      console.error('Error printing:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleShareEmail = () => {
    if (!reportData) return;
    
    const subject = encodeURIComponent(`Rapport EDL - ${reportData.project.address}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le rapport d'état des lieux pour :\n${reportData.project.address}\n${reportData.project.postalCode} ${reportData.project.city}\n\nType EDL: ${reportData.edlContext.typeEDL}\nDate: ${reportData.edlContext.date}\nRéalisé par: ${reportData.edlContext.performedBy}\n\nNombre de tâches: ${reportData.tasks.length}\n\nCordialement,\nGroupe MyHome`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const scrollToSection = (index: number) => {
    setActiveSection(index);
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-5xl p-0 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-50 bg-background border-b">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-semibold text-lg">Rapport EDL</h2>
                  <p className="text-xs text-muted-foreground">
                    {reportData?.project.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareEmail}
                  className="hidden sm:flex"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportWord}
                  disabled={generating}
                  className="hidden sm:flex"
                >
                  <FileWord className="w-4 h-4 mr-2" />
                  Word
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={generating}
                  className="hidden sm:flex"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={generating}
                  className="hidden sm:flex"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
              </div>
            </div>

            {/* Section Navigation */}
            <ScrollArea className="w-full">
              <div className="flex gap-1 px-4 pb-3">
                {sections.map((section, index) => (
                  <Button
                    key={section.id}
                    variant={activeSection === index ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => scrollToSection(index)}
                    className={cn(
                      "shrink-0 text-xs",
                      activeSection === index && "bg-primary text-primary-foreground"
                    )}
                  >
                    <section.icon className="w-3.5 h-3.5 mr-1.5" />
                    {isMobile ? '' : section.title}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Report Content */}
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-6 space-y-8 pb-24">
              {reportData && (
                <>
                  {/* Section 1: General Info */}
                  <div ref={el => sectionRefs.current[0] = el}>
                    <EDLSection1GeneralInfo 
                      project={reportData.project}
                      edlContext={reportData.edlContext}
                    />
                  </div>

                  <Separator />

                  {/* Section 2: Global Summary */}
                  <div ref={el => sectionRefs.current[1] = el}>
                    <EDLSection2GlobalSummary 
                      summary={reportData.edlSummary}
                      taskCount={reportData.tasks.length}
                      urgentCount={reportData.tasks.filter(t => t.priority === 'urgente').length}
                    />
                  </div>

                  <Separator />

                  {/* Section 3: Room/Zone Details */}
                  <div ref={el => sectionRefs.current[2] = el}>
                    <EDLSection3RoomZone 
                      pieces={reportData.edlSummary.parPieces}
                      media={reportData.media}
                      onScrollToTasks={() => scrollToSection(3)}
                      onImageClick={setFullscreenImage}
                    />
                  </div>

                  <Separator />

                  {/* Section 4: Tasks */}
                  <div ref={el => sectionRefs.current[3] = el}>
                    <EDLSection4Tasks 
                      tasks={reportData.tasks}
                    />
                  </div>

                  <Separator />

                  {/* Section 5: Annexes */}
                  <div ref={el => sectionRefs.current[4] = el}>
                    <EDLSection5Annexes 
                      media={reportData.media}
                      onImageClick={setFullscreenImage}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Floating Actions */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            {onOpenKanban && (
              <Button
                onClick={onOpenKanban}
                variant="outline"
                className="shadow-lg bg-background"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Ouvrir Kanban
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleExportWord}
                disabled={generating}
                variant="outline"
                className="shadow-lg bg-background"
                size="sm"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileWord className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={generating}
                variant="outline"
                className="shadow-lg bg-background"
                size="sm"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                PDF
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img 
            src={fullscreenImage} 
            alt="Plein écran"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  );
};
