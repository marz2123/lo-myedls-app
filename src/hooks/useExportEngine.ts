import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  dpgf: boolean;
  noticeDescriptive: boolean;
  planning: boolean;
  purchaseList: boolean;
  jsonTechnique: boolean;
  reportEdl: boolean;
}

export interface ExportProgress {
  step: string;
  progress: number;
  total: number;
}

export interface DPGFLine {
  ft_code: string;
  ft_label: string;
  category: string;
  subcategory: string;
  designation: string;
  unit: string;
  quantity: number;
  unit_price: number | null;
  total: number | null;
  room: string;
  severity: string;
}

export interface PlanningTask {
  id: string;
  name: string;
  phase: string;
  duration_days: number;
  start_offset: number;
  dependencies: string[];
  ft_code: string;
  room: string;
}

export interface PurchaseItem {
  product: string;
  quantity: number;
  unit: string;
  ft_code: string;
  ft_label: string;
  brand_recommended: string | null;
  estimated_price: number | null;
  room: string;
}

export interface ExportResult {
  success: boolean;
  data?: {
    project: any;
    exports: {
      dpgf?: { lines: DPGFLine[]; summary: any };
      noticeDescriptive?: any;
      planning?: { tasks: PlanningTask[]; phases: any[]; total_duration: number; gantt_data: any[] };
      purchaseList?: { items: PurchaseItem[]; summary: any };
      jsonTechnique?: any;
    };
  };
  storage_path?: string;
  error?: string;
}

export function useExportEngine() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const { toast } = useToast();

  const exportProject = useCallback(async (
    edlId: string,
    projectId: string,
    options: ExportOptions
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setProgress({ step: 'Initialisation...', progress: 0, total: 5 });

    try {
      // Step 1: Call edge function
      setProgress({ step: 'Génération des données...', progress: 1, total: 5 });
      
      const { data, error } = await supabase.functions.invoke('export-edl-to-project', {
        body: {
          edlId,
          projectId,
          exports: {
            dpgf: options.dpgf,
            noticeDescriptive: options.noticeDescriptive,
            planning: options.planning,
            purchaseList: options.purchaseList,
            jsonTechnique: options.jsonTechnique,
          },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Export failed');

      setResult(data);
      setProgress({ step: 'Export terminé!', progress: 5, total: 5 });

      toast({
        title: 'Export terminé',
        description: 'Tous les documents ont été générés avec succès.',
      });

      return data;
    } catch (error: any) {
      console.error('[useExportEngine] Error:', error);
      toast({
        title: 'Erreur d\'export',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const generateDPGFExcel = useCallback((dpgfData: { lines: DPGFLine[] }) => {
    const ws = XLSX.utils.json_to_sheet(dpgfData.lines.map(line => ({
      'FT': line.ft_code,
      'Famille': line.ft_label,
      'Catégorie': line.category,
      'Sous-catégorie': line.subcategory,
      'Désignation': line.designation,
      'Unité': line.unit,
      'Quantité': line.quantity,
      'Prix unitaire HT': line.unit_price || '',
      'Total HT': line.total || '',
      'Pièce': line.room,
      'Gravité': line.severity,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DPGF');

    // Set column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 40 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 10 },
    ];

    XLSX.writeFile(wb, `DPGF_${Date.now()}.xlsx`);
  }, []);

  const generatePurchaseListExcel = useCallback((purchaseData: { items: PurchaseItem[] }) => {
    const ws = XLSX.utils.json_to_sheet(purchaseData.items.map(item => ({
      'Produit': item.product,
      'Quantité': item.quantity,
      'Unité': item.unit,
      'FT': item.ft_code,
      'Famille': item.ft_label,
      'Marque recommandée': item.brand_recommended || '',
      'Prix estimatif': item.estimated_price || '',
      'Pièce': item.room,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Liste Achats');

    XLSX.writeFile(wb, `Liste_Achats_${Date.now()}.xlsx`);
  }, []);

  const generateNoticePDF = useCallback((noticeData: any, projectName: string) => {
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Notice Descriptive des Travaux', 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projet: ${projectName}`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Sections
    for (const section of noticeData.sections || []) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      // Family header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(41, 98, 255);
      doc.text(`${section.ft_code} — ${section.ft_label}`, 14, yPos);
      yPos += 8;

      doc.setTextColor(0, 0, 0);

      for (const category of section.categories || []) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        // Category header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`→ ${category.category}`, 20, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        for (const task of category.tasks || []) {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }

          doc.text(`• Tâche: ${task.title}`, 26, yPos);
          yPos += 5;

          if (task.description) {
            const descLines = doc.splitTextToSize(task.description, 150);
            doc.setTextColor(100, 100, 100);
            doc.text(descLines, 30, yPos);
            yPos += descLines.length * 4 + 2;
            doc.setTextColor(0, 0, 0);
          }

          if (task.location) {
            doc.text(`Localisation: ${task.location}`, 30, yPos);
            yPos += 4;
          }

          if (task.quantity) {
            doc.text(`Quantité: ${task.quantity} ${task.unit || ''}`, 30, yPos);
            yPos += 4;
          }

          yPos += 3;
        }
      }

      yPos += 8;
    }

    doc.save(`Notice_Descriptive_${Date.now()}.pdf`);
  }, []);

  const generatePlanningPDF = useCallback((planningData: any, projectName: string) => {
    const doc = new jsPDF('landscape');
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Planning Prévisionnel des Travaux', 148.5, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projet: ${projectName} | Durée totale: ${planningData.total_duration} jours`, 148.5, yPos, { align: 'center' });
    yPos += 15;

    // Gantt table
    const tableData = planningData.tasks.map((task: PlanningTask) => [
      task.ft_code,
      task.name.substring(0, 40),
      task.phase,
      task.room || '-',
      `J${task.start_offset + 1}`,
      `${task.duration_days}j`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['FT', 'Tâche', 'Phase', 'Pièce', 'Début', 'Durée']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 255] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
      },
    });

    doc.save(`Planning_${Date.now()}.pdf`);
  }, []);

  const downloadJSON = useCallback((data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportAll = useCallback(async (
    edlId: string,
    projectId: string,
    projectName: string,
    options: ExportOptions
  ) => {
    const exportResult = await exportProject(edlId, projectId, options);

    if (!exportResult.success || !exportResult.data) return;

    const { exports } = exportResult.data;

    // Generate files based on options
    if (options.dpgf && exports.dpgf) {
      setProgress({ step: 'Génération DPGF Excel...', progress: 2, total: 5 });
      generateDPGFExcel(exports.dpgf);
    }

    if (options.noticeDescriptive && exports.noticeDescriptive) {
      setProgress({ step: 'Génération Notice PDF...', progress: 3, total: 5 });
      generateNoticePDF(exports.noticeDescriptive, projectName);
    }

    if (options.planning && exports.planning) {
      setProgress({ step: 'Génération Planning PDF...', progress: 4, total: 5 });
      generatePlanningPDF(exports.planning, projectName);
    }

    if (options.purchaseList && exports.purchaseList) {
      generatePurchaseListExcel(exports.purchaseList);
    }

    if (options.jsonTechnique && exports.jsonTechnique) {
      downloadJSON(exports.jsonTechnique, `Export_MyHome_${Date.now()}.json`);
    }

    return exportResult;
  }, [exportProject, generateDPGFExcel, generateNoticePDF, generatePlanningPDF, generatePurchaseListExcel, downloadJSON]);

  const reset = useCallback(() => {
    setResult(null);
    setProgress(null);
  }, []);

  return {
    isExporting,
    progress,
    result,
    exportProject,
    exportAll,
    generateDPGFExcel,
    generatePurchaseListExcel,
    generateNoticePDF,
    generatePlanningPDF,
    downloadJSON,
    reset,
  };
}
