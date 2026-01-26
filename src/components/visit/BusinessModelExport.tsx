import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BusinessModelExportProps {
  projectId: string;
}

export const BusinessModelExport = ({ projectId }: BusinessModelExportProps) => {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-model-pdf', {
        body: { projectId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      const content = data.content;
      
      // Generate PDF using jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Helper function to add page if needed
      const checkPageBreak = (height: number) => {
        if (yPos + height > 270) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(content.title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${new Date(content.generatedAt).toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Project Info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Informations du Bien', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const projectInfo = [
        `Type: ${content.project.type}`,
        `Adresse: ${content.project.address}`,
        content.project.postalCode && content.project.city ? 
          `${content.project.postalCode} ${content.project.city}` : '',
      ].filter(Boolean);
      
      projectInfo.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Summary Stats
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Résumé de la Visite', margin, yPos);
      yPos += 8;

      const summaryData = [
        ['Parties', content.summary.totalParts.toString()],
        ['Lieux', content.summary.totalLocations.toString()],
        ['Zones', content.summary.totalZones.toString()],
        ['Séquences', content.summary.totalSequences.toString()],
        ['Problèmes', content.summary.totalProblems.toString()],
        ['Tâches', content.summary.totalTasks.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Élément', 'Nombre']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin },
        tableWidth: 80,
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Hierarchical Content: Partie → Lieu → Zone → Problème → Tâche
      for (const part of content.structure || []) {
        checkPageBreak(30);
        
        // Part Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(part.partType === 'commune' ? 59 : 34, part.partType === 'commune' ? 130 : 197, part.partType === 'commune' ? 246 : 94);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${part.type}: ${part.name}`, margin + 3, yPos + 2);
        doc.setTextColor(0, 0, 0);
        yPos += 12;

        for (const location of part.locations || []) {
          checkPageBreak(25);
          
          // Location Header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`📍 ${location.name}`, margin + 5, yPos);
          yPos += 5;

          if (location.condition || location.surface) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const locInfo = [];
            if (location.condition) locInfo.push(`État: ${location.condition}`);
            if (location.surface) locInfo.push(`Surface: ${location.surface} m²`);
            if (location.floor) locInfo.push(`Étage: ${location.floor}`);
            doc.text(locInfo.join(' • '), margin + 8, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 6;
          }

          // Zones
          if (location.zones && location.zones.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('Zones:', margin + 8, yPos);
            yPos += 4;
            
            location.zones.forEach((zone: any) => {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              const zoneText = `• ${zone.type}${zone.customName ? ` (${zone.customName})` : ''} - ${zone.condition || 'N/A'}`;
              doc.text(zoneText, margin + 12, yPos);
              yPos += 4;
            });
            yPos += 3;
          }

          // Problems and Tasks
          for (const problem of location.problems || []) {
            checkPageBreak(30);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            doc.text(`⚠ ${problem.title}`, margin + 8, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 5;

            if (problem.description) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              const descLines = doc.splitTextToSize(problem.description, pageWidth - margin * 2 - 20);
              doc.text(descLines, margin + 12, yPos);
              yPos += descLines.length * 4 + 2;
            }

            // Tasks Table
            if (problem.tasks && problem.tasks.length > 0) {
              const taskRows = problem.tasks.map((task: any) => [
                task.title || '',
                task.family || '',
                task.category || '',
                task.subcategory || '',
                task.condition || '',
                task.quantity ? `${task.quantity} ${task.unit || ''}` : '',
                task.estimatedCostMin ? `${task.estimatedCostMin}€${task.estimatedCostMax ? `-${task.estimatedCostMax}€` : ''}` : '',
              ]);

              autoTable(doc, {
                startY: yPos,
                head: [['Tâche', 'FT', 'CT', 'ST', 'État', 'Qté', 'Coût']],
                body: taskRows,
                theme: 'striped',
                headStyles: { fillColor: [34, 197, 94], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 40 },
                  1: { cellWidth: 25 },
                  2: { cellWidth: 25 },
                  3: { cellWidth: 25 },
                  4: { cellWidth: 15 },
                  5: { cellWidth: 15 },
                  6: { cellWidth: 20 },
                },
                margin: { left: margin + 10, right: margin },
              });

              yPos = (doc as any).lastAutoTable.finalY + 8;
            }
          }
          yPos += 5;
        }
        yPos += 10;
      }

      // Save PDF
      doc.save(data.filename || 'EDL_Export.pdf');
      toast.success('PDF exporté avec succès');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-model-csv', {
        body: { projectId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'EDL_Export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`CSV exporté: ${data.stats.tasks} tâches, ${data.stats.problems} problèmes`);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export des Données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exportez l'état des lieux complet avec la structure hiérarchique:
          Bien → Partie → Lieu → Zone → Problème → Tâche (FT/CT/ST)
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* PDF Export */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-destructive/5 hover:border-destructive/30"
            onClick={handleExportPDF}
            disabled={exportingPdf}
          >
            <div className="flex items-center gap-2 w-full">
              {exportingPdf ? (
                <Loader2 className="w-5 h-5 animate-spin text-destructive" />
              ) : (
                <FileText className="w-5 h-5 text-destructive" />
              )}
              <span className="font-semibold">Export PDF</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Rapport complet pour syndic / bailleur / ASL
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">Hiérarchique</Badge>
              <Badge variant="secondary" className="text-xs">Photos</Badge>
              <Badge variant="secondary" className="text-xs">Résumé</Badge>
            </div>
          </Button>

          {/* CSV Export */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-success/5 hover:border-success/30"
            onClick={handleExportCSV}
            disabled={exportingCsv}
          >
            <div className="flex items-center gap-2 w-full">
              {exportingCsv ? (
                <Loader2 className="w-5 h-5 animate-spin text-success" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-success" />
              )}
              <span className="font-semibold">Export CSV/Excel</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Données tabulaires pour économiste / conducteur travaux
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">FT/CT/ST</Badge>
              <Badge variant="secondary" className="text-xs">Quantités</Badge>
              <Badge variant="secondary" className="text-xs">Coûts</Badge>
            </div>
          </Button>
        </div>

        {/* Export Preview */}
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs font-medium mb-2">Colonnes exportées:</p>
          <div className="flex flex-wrap gap-1">
            {['Bien', 'Partie', 'Lieu', 'Zone', 'Problème', 'Tâche', 'FT', 'CT', 'ST', 'État', 'Qté', 'Coût', 'Mesures AR', 'Photos'].map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
