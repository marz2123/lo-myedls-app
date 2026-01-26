import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { EDLReportData } from "@/components/edl-report/EDLReportViewer";

// A4 dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Colors (in RGB)
const PRIMARY_COLOR: [number, number, number] = [59, 130, 246]; // Blue
const SECONDARY_COLOR: [number, number, number] = [100, 116, 139]; // Slate
const SUCCESS_COLOR: [number, number, number] = [34, 197, 94]; // Green
const WARNING_COLOR: [number, number, number] = [245, 158, 11]; // Amber
const DANGER_COLOR: [number, number, number] = [239, 68, 68]; // Red

export const generateProfessionalEDLPDF = async (data: EDLReportData): Promise<Blob> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let yPos = MARGIN_TOP;
  let pageNumber = 1;

  // Helper functions
  const addNewPage = () => {
    pdf.addPage();
    pageNumber++;
    yPos = MARGIN_TOP;
    addHeader();
  };

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM - 15) {
      addNewPage();
    }
  };

  const addHeader = () => {
    // Logo placeholder
    pdf.setFillColor(59, 130, 246);
    pdf.rect(PAGE_WIDTH - MARGIN_RIGHT - 15, 8, 12, 8, 'F');
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255);
    pdf.text('MH', PAGE_WIDTH - MARGIN_RIGHT - 11, 13);
    
    // Title
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`État des Lieux – ${data.project.name}`, MARGIN_LEFT, 12);
  };

  const addFooter = (currentPage: number, totalPages: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${currentPage}/${totalPages}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
    pdf.text(
      'Groupe MyHome – MyEDLs',
      PAGE_WIDTH - MARGIN_RIGHT,
      PAGE_HEIGHT - 10,
      { align: 'right' }
    );
  };

  const addSectionTitle = (title: string, icon?: string) => {
    checkPageBreak(20);
    
    pdf.setFillColor(240, 245, 255);
    pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 10, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138);
    pdf.text(`${icon || '•'} ${title}`, MARGIN_LEFT + 3, yPos + 7);
    
    yPos += 15;
  };

  // ========== PAGE 1: COVER PAGE ==========
  // Large title block
  pdf.setFillColor(30, 58, 138);
  pdf.rect(0, 0, PAGE_WIDTH, 80, 'F');
  
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('ÉTAT DES LIEUX', PAGE_WIDTH / 2, 35, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.project.name, PAGE_WIDTH / 2, 50, { align: 'center' });
  
  pdf.setFontSize(11);
  pdf.text(data.edlContext.typeEDL, PAGE_WIDTH / 2, 62, { align: 'center' });

  // Project details box
  yPos = 95;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 50, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 50, 'S');
  
  yPos += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  
  pdf.text('Adresse', MARGIN_LEFT + 5, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.project.address, MARGIN_LEFT + 45, yPos);
  
  yPos += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ville', MARGIN_LEFT + 5, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${data.project.postalCode} ${data.project.city}`, MARGIN_LEFT + 45, yPos);
  
  yPos += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Type de projet', MARGIN_LEFT + 5, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.project.propertyType, MARGIN_LEFT + 45, yPos);
  
  yPos += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Réalisé le', MARGIN_LEFT + 5, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.edlContext.date, MARGIN_LEFT + 45, yPos);
  
  yPos += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Réalisé par', MARGIN_LEFT + 5, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.edlContext.performedBy, MARGIN_LEFT + 45, yPos);

  // Stats summary
  yPos = 160;
  const statsWidth = CONTENT_WIDTH / 4;
  
  const stats = [
    { label: 'Zones', value: data.edlSummary.parPieces.length.toString(), color: PRIMARY_COLOR },
    { label: 'Tâches', value: data.tasks.length.toString(), color: SECONDARY_COLOR },
    { label: 'Urgentes', value: data.tasks.filter(t => t.priority === 'urgente').length.toString(), color: DANGER_COLOR },
    { label: 'Photos', value: data.media.length.toString(), color: SUCCESS_COLOR },
  ];

  stats.forEach((stat, i) => {
    const x = MARGIN_LEFT + (i * statsWidth);
    pdf.setFillColor(...stat.color);
    pdf.rect(x + 2, yPos, statsWidth - 4, 25, 'F');
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(stat.value, x + (statsWidth / 2), yPos + 12, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(stat.label, x + (statsWidth / 2), yPos + 20, { align: 'center' });
  });

  // Branding footer on cover
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Groupe MyHome', PAGE_WIDTH / 2, PAGE_HEIGHT - 30, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text('Archi Home • Bâti Home • Opti Home • Déco Home', PAGE_WIDTH / 2, PAGE_HEIGHT - 24, { align: 'center' });

  // ========== PAGE 2: GLOBAL SUMMARY ==========
  addNewPage();
  addSectionTitle('Résumé global', '📋');

  // Summary text
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  
  const summaryLines = pdf.splitTextToSize(data.edlSummary.resumeGlobal, CONTENT_WIDTH - 10);
  checkPageBreak(summaryLines.length * 5 + 10);
  
  pdf.setFillColor(248, 250, 252);
  pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, summaryLines.length * 5 + 6, 'F');
  pdf.text(summaryLines, MARGIN_LEFT + 5, yPos + 6);
  yPos += summaryLines.length * 5 + 15;

  // ========== PAGE 3+: ROOM/ZONE DETAILS ==========
  addSectionTitle('Détail par pièce / zone', '🏠');

  data.edlSummary.parPieces.forEach((piece, index) => {
    checkPageBreak(35);
    
    // Piece header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 8, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text(`${index + 1}. ${piece.piece}`, MARGIN_LEFT + 3, yPos + 5.5);
    
    // State badge
    const stateText = piece.etatGeneral || 'À évaluer';
    let stateColor: [number, number, number] = SECONDARY_COLOR;
    if (stateText.toLowerCase().includes('bon')) stateColor = SUCCESS_COLOR;
    if (stateText.toLowerCase().includes('mauvais') || stateText.toLowerCase().includes('refaire')) stateColor = DANGER_COLOR;
    if (stateText.toLowerCase().includes('moyen')) stateColor = WARNING_COLOR;
    
    pdf.setFillColor(...stateColor);
    pdf.roundedRect(CONTENT_WIDTH - 20, yPos + 1, 30, 6, 1, 1, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(stateText.substring(0, 12), CONTENT_WIDTH - 5, yPos + 5, { align: 'center' });
    
    yPos += 12;
    
    // Points forts
    if (piece.pointsForts) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...SUCCESS_COLOR);
      pdf.text('✓ Points forts:', MARGIN_LEFT + 3, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const fortLines = pdf.splitTextToSize(piece.pointsForts, CONTENT_WIDTH - 15);
      pdf.text(fortLines, MARGIN_LEFT + 8, yPos);
      yPos += fortLines.length * 4 + 3;
    }
    
    // Points faibles
    if (piece.pointsFaibles) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...WARNING_COLOR);
      pdf.text('⚠ Points faibles:', MARGIN_LEFT + 3, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const faibleLines = pdf.splitTextToSize(piece.pointsFaibles, CONTENT_WIDTH - 15);
      pdf.text(faibleLines, MARGIN_LEFT + 8, yPos);
      yPos += faibleLines.length * 4 + 3;
    }
    
    yPos += 5;
  });

  // ========== TASKS SECTION ==========
  if (data.tasks.length > 0) {
    addSectionTitle('Tâches associées', '📝');
    
    // Group tasks by piece
    const tasksByPiece: Record<string, typeof data.tasks> = {};
    data.tasks.forEach(task => {
      const piece = task.pieceOrZone || 'Non localisé';
      if (!tasksByPiece[piece]) tasksByPiece[piece] = [];
      tasksByPiece[piece].push(task);
    });

    Object.entries(tasksByPiece).forEach(([pieceName, pieceTasks]) => {
      checkPageBreak(25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text(`📍 ${pieceName}`, MARGIN_LEFT, yPos);
      yPos += 6;

      // Tasks table
      const tableData = pieceTasks.map(task => {
        let prioritySymbol = '○';
        if (task.priority === 'urgente') prioritySymbol = '🔴';
        if (task.priority === 'haute') prioritySymbol = '🟠';
        if (task.priority === 'normale') prioritySymbol = '🔵';
        
        return [
          prioritySymbol,
          task.taskName,
          task.familyName || task.familyCode,
          task.category || '-',
          task.status
        ];
      });

      autoTable(pdf, {
        startY: yPos,
        head: [['Pri.', 'Tâche', 'Famille', 'Catégorie', 'Statut']],
        body: tableData,
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
        styles: { 
          fontSize: 8, 
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: PRIMARY_COLOR,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25, halign: 'center' },
        },
      });

      yPos = (pdf as any).lastAutoTable.finalY + 10;
    });
  }

  // ========== ANNEXES (PHOTOS) ==========
  if (data.media.length > 0) {
    addNewPage();
    addSectionTitle('Annexes - Photographies', '📷');
    
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${data.media.length} média(s) joint(s) au rapport`, MARGIN_LEFT, yPos);
    yPos += 10;

    // Photo grid (simplified - just list captions since we can't easily embed images)
    const photosPerRow = 3;
    const photoWidth = (CONTENT_WIDTH - 10) / photosPerRow;
    
    data.media.forEach((media, index) => {
      const col = index % photosPerRow;
      const row = Math.floor(index / photosPerRow);
      
      if (col === 0 && row > 0) {
        yPos += 25;
        checkPageBreak(30);
      }
      
      if (col === 0) {
        yPos += 5;
      }
      
      const x = MARGIN_LEFT + (col * photoWidth) + 2;
      
      // Photo placeholder
      pdf.setFillColor(241, 245, 249);
      pdf.rect(x, yPos, photoWidth - 4, 20, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(x, yPos, photoWidth - 4, 20, 'S');
      
      // Icon
      pdf.setFontSize(14);
      pdf.setTextColor(148, 163, 184);
      pdf.text(media.type === 'video_frame' ? '🎬' : '📷', x + (photoWidth - 4) / 2, yPos + 10, { align: 'center' });
      
      // Caption
      pdf.setFontSize(6);
      pdf.setTextColor(71, 85, 105);
      const caption = `${media.piece}${media.label ? ' - ' + media.label : ''}`.substring(0, 25);
      pdf.text(caption, x + (photoWidth - 4) / 2, yPos + 18, { align: 'center' });
    });
  }

  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i > 1) {
      addHeader();
    }
    addFooter(i, totalPages);
  }

  return pdf.output('blob');
};
