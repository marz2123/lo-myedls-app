import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';

interface EDLExportDialogProps {
  visitSessionId: string | null;
  projectAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EDLExportDialog: React.FC<EDLExportDialogProps> = ({
  visitSessionId,
  projectAddress,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);

  useEffect(() => {
    if (visitSessionId && open) {
      fetchData();
    }
  }, [visitSessionId, open]);

  const fetchData = async () => {
    if (!visitSessionId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('detected_blocks')
        .select(`
          *,
          extracted_frames(*),
          audio_segments(*),
          extracted_tasks(
            *,
            task_families(name),
            task_categories(name),
            task_subcategories(name)
          )
        `)
        .eq('visit_session_id', visitSessionId)
        .order('block_number', { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    const labels: Record<string, string> = {
      'kitchen': 'Cuisine',
      'bathroom': 'Salle de bain',
      'bedroom': 'Chambre',
      'living_room': 'Séjour',
      'hallway': 'Couloir',
      'entrance': 'Entrée',
      'staircase': 'Escalier',
      'basement': 'Sous-sol',
      'attic': 'Combles',
      'facade': 'Façade',
      'open_space': 'Plateau brut',
      'unknown': 'Zone inconnue'
    };
    return labels[roomType] || roomType;
  };

  const generatePDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // En-tête
      doc.setFontSize(20);
      doc.text('État des Lieux (EDL)', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.text(`Adresse: ${projectAddress}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPosition);
      yPosition += 7;
      doc.text(`Nombre de zones: ${blocks.length}`, 20, yPosition);
      yPosition += 15;

      // Parcourir chaque bloc
      for (const block of blocks) {
        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Titre du bloc
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const blockLabel = block.manual_label || getRoomTypeLabel(block.detected_room_type);
        doc.text(`Bloc ${block.block_number}: ${blockLabel}`, 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Métadonnées
        if (block.confidence_score) {
          doc.text(`Confiance IA: ${Math.round(block.confidence_score * 100)}%`, 30, yPosition);
          yPosition += 6;
        }

        // Transcriptions audio
        if (includeAudio && block.audio_segments && block.audio_segments.length > 0) {
          doc.setFont('helvetica', 'italic');
          doc.text('Commentaires:', 30, yPosition);
          yPosition += 6;
          
          for (const segment of block.audio_segments) {
            const lines = doc.splitTextToSize(segment.transcription, 160);
            doc.text(lines, 35, yPosition);
            yPosition += lines.length * 5 + 4;
            
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }
          }
          doc.setFont('helvetica', 'normal');
        }

        // Tâches
        if (includeTasks && block.extracted_tasks && block.extracted_tasks.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`Tâches détectées (${block.extracted_tasks.length}):`, 30, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');

          for (const task of block.extracted_tasks) {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }

            doc.text(`• ${task.title}`, 35, yPosition);
            yPosition += 5;
            
            if (task.description) {
              const descLines = doc.splitTextToSize(task.description, 155);
              doc.setFontSize(9);
              doc.text(descLines, 40, yPosition);
              yPosition += descLines.length * 4 + 3;
              doc.setFontSize(10);
            }

            // DSC Classification
            if (task.task_families?.name) {
              const dscText = `FT: ${task.task_families.name}${
                task.task_categories?.name ? ` / CT: ${task.task_categories.name}` : ''
              }${
                task.task_subcategories?.name ? ` / ST: ${task.task_subcategories.name}` : ''
              }`;
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(dscText, 40, yPosition);
              yPosition += 5;
              doc.setFontSize(10);
              doc.setTextColor(0);
            }
          }
        }

        yPosition += 10;
      }

      // Sauvegarder le PDF
      const fileName = `EDL_${projectAddress.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);

      toast({
        title: '✅ Export réussi',
        description: 'Le rapport EDL a été téléchargé',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: "Impossible de générer le PDF",
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = async () => {
    setExporting(true);
    try {
      let csv = 'Bloc,Zone,Famille,Catégorie,Sous-catégorie,Tâche,Description,Localisation,Confiance\n';

      for (const block of blocks) {
        const blockLabel = block.manual_label || getRoomTypeLabel(block.detected_room_type);
        
        if (block.extracted_tasks && block.extracted_tasks.length > 0) {
          for (const task of block.extracted_tasks) {
            const row = [
              block.block_number,
              `"${blockLabel}"`,
              `"${task.task_families?.name || ''}"`,
              `"${task.task_categories?.name || ''}"`,
              `"${task.task_subcategories?.name || ''}"`,
              `"${task.title.replace(/"/g, '""')}"`,
              `"${(task.description || '').replace(/"/g, '""')}"`,
              `"${task.location || ''}"`,
              task.detection_confidence ? Math.round(task.detection_confidence * 100) + '%' : ''
            ].join(',');
            csv += row + '\n';
          }
        }
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `EDL_Tasks_${projectAddress.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '✅ Export réussi',
        description: 'Le listing des tâches a été téléchargé',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le CSV',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const totalTasks = blocks.reduce((acc, block) => acc + (block.extracted_tasks?.length || 0), 0);
  const totalFrames = blocks.reduce((acc, block) => acc + (block.extracted_frames?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exporter le rapport EDL</DialogTitle>
          <DialogDescription>
            Générez un rapport complet de votre visite avec photos, transcriptions et tâches
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Résumé */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Résumé de la visite</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Zones détectées</div>
                  <div className="text-2xl font-bold">{blocks.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tâches extraites</div>
                  <div className="text-2xl font-bold">{totalTasks}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Photos capturées</div>
                  <div className="text-2xl font-bold">{totalFrames}</div>
                </div>
              </div>
            </Card>

            {/* Options d'export */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Options d'export</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="photos"
                    checked={includePhotos}
                    onCheckedChange={(checked) => setIncludePhotos(checked as boolean)}
                  />
                  <Label htmlFor="photos" className="cursor-pointer">
                    Inclure les photos ({totalFrames})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="audio"
                    checked={includeAudio}
                    onCheckedChange={(checked) => setIncludeAudio(checked as boolean)}
                  />
                  <Label htmlFor="audio" className="cursor-pointer">
                    Inclure les transcriptions audio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tasks"
                    checked={includeTasks}
                    onCheckedChange={(checked) => setIncludeTasks(checked as boolean)}
                  />
                  <Label htmlFor="tasks" className="cursor-pointer">
                    Inclure les tâches détectées ({totalTasks})
                  </Label>
                </div>
              </div>
            </Card>

            {/* Actions d'export */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={generatePDF}
                disabled={exporting}
                size="lg"
                className="h-20"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    <div className="flex flex-col items-start">
                      <span>Rapport PDF complet</span>
                      <span className="text-xs opacity-70">EDL avec photos et détails</span>
                    </div>
                  </>
                )}
              </Button>

              <Button
                onClick={generateCSV}
                disabled={exporting}
                variant="outline"
                size="lg"
                className="h-20"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    <div className="flex flex-col items-start">
                      <span>Listing CSV des tâches</span>
                      <span className="text-xs opacity-70">FT/CT/ST structuré</span>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
