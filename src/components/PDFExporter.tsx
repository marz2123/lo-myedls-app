import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExtractedTask } from "./TaskList";

interface PDFExporterProps {
  tasks: ExtractedTask[];
}

export const PDFExporter = ({ tasks }: PDFExporterProps) => {
  const { t } = useLanguage();

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.text("État Des Lieux (EDL) - Rapport de Tâches", margin, yPosition);
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;

    // Summary
    doc.setFontSize(12);
    doc.text(`Total des tâches: ${tasks.length}`, margin, yPosition);
    yPosition += 15;

    // Group tasks by family
    const grouped = tasks.reduce((acc, task) => {
      const familyKey = task.task_families?.code || 'UNCATEGORIZED';
      if (!acc[familyKey]) {
        acc[familyKey] = {
          info: task.task_families,
          tasks: []
        };
      }
      acc[familyKey].tasks.push(task);
      return acc;
    }, {} as any);

    // Generate task sections
    Object.entries(grouped).forEach(([familyCode, familyData]: [string, any]) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Family header
      doc.setFillColor(52, 152, 219);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`${familyData.info?.code || familyCode}: ${familyData.info?.name || 'Non classifié'}`, margin + 2, yPosition + 2);
      doc.setTextColor(0, 0, 0);
      yPosition += 15;

      // Tasks
      familyData.tasks.forEach((task: ExtractedTask, index: number) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${task.title}`, margin + 5, yPosition);
        yPosition += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        if (task.description) {
          const descLines = doc.splitTextToSize(task.description, pageWidth - 2 * margin - 10);
          doc.text(descLines, margin + 10, yPosition);
          yPosition += descLines.length * 5;
        }

        // Task details
        const details = [
          `Catégorie: ${task.task_categories?.name || 'N/A'}`,
          `Sous-catégorie: ${task.task_subcategories?.name || 'N/A'}`,
          `Priorité: ${task.priority === 'high' ? t('priorityHigh') : task.priority === 'medium' ? t('priorityMedium') : t('priorityLow')}`,
          `Type: ${task.work_type === 'renovation' ? t('renovation') : t('newBuild')}`,
        ];

        if (task.location) {
          details.push(`Localisation: ${task.location}`);
        }

        if (task.area) {
          details.push(`Zone: ${task.area}`);
        }

        details.forEach(detail => {
          doc.text(detail, margin + 10, yPosition);
          yPosition += 5;
        });

        yPosition += 5;
      });

      yPosition += 5;
    });

    // Save PDF
    doc.save(`EDL-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Button onClick={generatePDF} variant="outline" className="gap-2 w-full sm:w-auto text-sm sm:text-base">
      <FileDown className="w-4 h-4" />
      <span className="hidden sm:inline">{t('exportPdf')}</span>
      <span className="sm:hidden">PDF</span>
    </Button>
  );
};