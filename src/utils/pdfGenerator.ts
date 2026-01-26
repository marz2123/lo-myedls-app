import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFData {
  title: string;
  project: {
    address: string;
    postalCode?: string;
    city?: string;
    propertyType: string;
  };
  visitInfo: {
    date: string;
    duration: number;
    blocksCount: number;
  };
  blocks: Array<{
    number: number;
    roomType: string;
    confidence: number | null;
    duration: number | null;
    photos: string[];
    transcription: string;
    tasks: Array<{
      title: string;
      description: string;
      family: string;
      category: string;
      subcategory: string;
      confidence: number | null;
    }>;
  }>;
  notes?: string;
}

export const generateEDLPDF = async (data: PDFData): Promise<Blob> => {
  const pdf = new jsPDF();
  
  // Configuration
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Helper pour ajouter du texte avec retour automatique
  const addText = (text: string, x: number, y: number, maxWidth: number, size: number = 10) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (size * 0.4); // Retourne la hauteur occupée
  };

  // En-tête
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("ÉTAT DES LIEUX", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Informations projet
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 40, "F");
  yPos += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Projet", margin + 5, yPos);
  yPos += 7;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`${data.project.address}`, margin + 5, yPos);
  yPos += 5;
  if (data.project.postalCode && data.project.city) {
    pdf.text(`${data.project.postalCode} ${data.project.city}`, margin + 5, yPos);
    yPos += 5;
  }
  pdf.text(`Type: ${data.project.propertyType}`, margin + 5, yPos);
  yPos += 15;

  // Informations visite
  pdf.setFontSize(10);
  pdf.text(`Date de visite: ${data.visitInfo.date}`, margin + 5, yPos);
  yPos += 5;
  pdf.text(`Durée: ${data.visitInfo.duration} min`, margin + 5, yPos);
  yPos += 5;
  pdf.text(`Nombre de zones: ${data.visitInfo.blocksCount}`, margin + 5, yPos);
  yPos += 15;

  // Blocs
  for (const block of data.blocks) {
    // Nouvelle page si nécessaire
    if (yPos > 250) {
      pdf.addPage();
      yPos = margin;
    }

    // Titre du bloc
    pdf.setFillColor(66, 135, 245);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Bloc ${block.number} - ${block.roomType}`, margin + 5, yPos + 5.5);
    pdf.setTextColor(0, 0, 0);
    yPos += 12;

    // Infos bloc
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    if (block.duration) {
      const minutes = Math.floor(block.duration / 60);
      const seconds = block.duration % 60;
      pdf.text(`Durée: ${minutes}:${seconds.toString().padStart(2, '0')}`, margin + 5, yPos);
      yPos += 5;
    }
    if (block.confidence) {
      pdf.text(`Confiance IA: ${block.confidence}%`, margin + 5, yPos);
      yPos += 5;
    }
    yPos += 3;

    // Transcription
    if (block.transcription) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Observations:", margin + 5, yPos);
      yPos += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const transcriptionHeight = addText(
        block.transcription,
        margin + 5,
        yPos,
        pageWidth - 2 * margin - 10,
        9
      );
      yPos += transcriptionHeight + 5;
    }

    // Tâches
    if (block.tasks.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`Tâches détectées (${block.tasks.length}):`, margin + 5, yPos);
      yPos += 7;

      // Table des tâches
      const taskRows = block.tasks.map((task) => [
        task.title,
        task.family,
        task.category,
        task.subcategory,
        task.confidence ? `${task.confidence}%` : '-',
      ]);

      autoTable(pdf, {
        startY: yPos,
        head: [['Tâche', 'Famille', 'Catégorie', 'Sous-catégorie', 'Conf.']],
        body: taskRows,
        margin: { left: margin + 5, right: margin + 5 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 135, 245], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15 },
        },
      });

      yPos = (pdf as any).lastAutoTable.finalY + 10;
    }

    yPos += 5;
  }

  // Notes section
  if (data.notes) {
    if (yPos > 200) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFillColor(255, 250, 230);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Notes & Observations", margin + 5, yPos + 7);
    yPos += 15;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const notesHeight = addText(data.notes, margin + 5, yPos, pageWidth - 2 * margin - 10, 10);
    yPos += notesHeight + 10;
  }

  // Footer
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `MyEDLS - Page ${i}/${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return pdf.output('blob');
};
