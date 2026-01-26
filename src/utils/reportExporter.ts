import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import type { EDLReportData } from '@/components/edl-report/EDLReportViewer';

/**
 * Export EDL Report to Word (.docx)
 */
export async function exportReportToWord(reportData: EDLReportData): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: 'ÉTAT DES LIEUX',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Project Information
  children.push(
    new Paragraph({
      text: 'INFORMATIONS GÉNÉRALES',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Projet: ', bold: true }),
        new TextRun({ text: reportData.project.name || reportData.project.address }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Adresse: ', bold: true }),
        new TextRun({ text: `${reportData.project.address}, ${reportData.project.postalCode} ${reportData.project.city}` }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Type de bien: ', bold: true }),
        new TextRun({ text: reportData.project.propertyType }),
      ],
      spacing: { after: 200 },
    })
  );

  // EDL Context
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Type EDL: ', bold: true }),
        new TextRun({ text: reportData.edlContext.typeEDL }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun({ text: reportData.edlContext.date }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Réalisé par: ', bold: true }),
        new TextRun({ text: reportData.edlContext.performedBy }),
      ],
      spacing: { after: 400 },
    })
  );

  // Global Summary
  if (reportData.edlSummary.resumeGlobal) {
    children.push(
      new Paragraph({
        text: 'RÉSUMÉ GLOBAL',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: reportData.edlSummary.resumeGlobal,
        spacing: { after: 400 },
      })
    );
  }

  // Summary by Pieces
  if (reportData.edlSummary.parPieces && reportData.edlSummary.parPieces.length > 0) {
    children.push(
      new Paragraph({
        text: 'RÉSUMÉ PAR PIÈCE / ZONE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    reportData.edlSummary.parPieces.forEach((piece) => {
      children.push(
        new Paragraph({
          text: piece.piece,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 150, after: 100 },
        })
      );

      if (piece.etatGeneral) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'État général: ', bold: true }),
              new TextRun({ text: piece.etatGeneral }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (piece.pointsForts) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Points forts: ', bold: true }),
              new TextRun({ text: piece.pointsForts }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (piece.pointsFaibles) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Points faibles: ', bold: true }),
              new TextRun({ text: piece.pointsFaibles }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    });
  }

  // Tasks
  if (reportData.tasks && reportData.tasks.length > 0) {
    children.push(
      new Paragraph({
        text: 'TÂCHES ASSOCIÉES',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
      })
    );

    // Create tasks table
    const taskRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Code', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Famille', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Tâche', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Localisation', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Priorité', bold: true })] }),
        ],
      }),
    ];

    reportData.tasks.forEach((task) => {
      taskRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: task.familyCode || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: task.familyName || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: task.taskName })] }),
            new TableCell({ children: [new Paragraph({ text: task.pieceOrZone || '-' })] }),
            new TableCell({ children: [new Paragraph({ text: task.priority || '-' })] }),
          ],
        })
      );
    });

    children.push(
      new Table({
        rows: taskRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Export EDL Report to Excel (.xlsx)
 */
export function exportReportToExcel(reportData: EDLReportData): Blob {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: General Info
  const generalInfo = [
    ['ÉTAT DES LIEUX'],
    [],
    ['INFORMATIONS GÉNÉRALES'],
    ['Projet', reportData.project.name || reportData.project.address],
    ['Adresse', reportData.project.address],
    ['Code postal', reportData.project.postalCode],
    ['Ville', reportData.project.city],
    ['Type de bien', reportData.project.propertyType],
    [],
    ['CONTEXTE EDL'],
    ['Type EDL', reportData.edlContext.typeEDL],
    ['Date', reportData.edlContext.date],
    ['Réalisé par', reportData.edlContext.performedBy],
  ];

  const wsGeneral = XLSX.utils.aoa_to_sheet(generalInfo);
  XLSX.utils.book_append_sheet(workbook, wsGeneral, 'Informations');

  // Sheet 2: Global Summary
  if (reportData.edlSummary.resumeGlobal) {
    const summary = [
      ['RÉSUMÉ GLOBAL'],
      [],
      [reportData.edlSummary.resumeGlobal],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Résumé');
  }

  // Sheet 3: Summary by Pieces
  if (reportData.edlSummary.parPieces && reportData.edlSummary.parPieces.length > 0) {
    const piecesData = [
      ['Pièce / Zone', 'État général', 'Points forts', 'Points faibles'],
      ...reportData.edlSummary.parPieces.map((piece) => [
        piece.piece,
        piece.etatGeneral || '',
        piece.pointsForts || '',
        piece.pointsFaibles || '',
      ]),
    ];

    const wsPieces = XLSX.utils.aoa_to_sheet(piecesData);
    XLSX.utils.book_append_sheet(workbook, wsPieces, 'Par pièce');
  }

  // Sheet 4: Tasks
  if (reportData.tasks && reportData.tasks.length > 0) {
    const tasksData = [
      ['Code', 'Famille', 'Catégorie', 'Sous-catégorie', 'Tâche', 'Description', 'Localisation', 'Priorité', 'Statut'],
      ...reportData.tasks.map((task) => [
        task.familyCode || '',
        task.familyName || '',
        task.category || '',
        task.subCategory || '',
        task.taskName,
        task.description || '',
        task.pieceOrZone || '',
        task.priority || '',
        task.status || '',
      ]),
    ];

    const wsTasks = XLSX.utils.aoa_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, wsTasks, 'Tâches');
  }

  // Generate blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

