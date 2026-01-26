/**
 * Générateur DOCX pour export de rapports EDL
 * Génère un fichier DOCX professionnel à partir du contenu du rapport
 * Utilise la bibliothèque 'docx' pour une génération native
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import type { EDLReportContent } from './htmlGenerator';

/**
 * Génère un fichier DOCX à partir du contenu du rapport EDL
 */
export async function generateEDLDOCX(reportContent: EDLReportContent): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Cover Page
  children.push(
    new Paragraph({
      text: reportContent.cover.title || 'Rapport EDL',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  if (reportContent.cover.subtitle) {
    children.push(
      new Paragraph({
        text: reportContent.cover.subtitle,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true }),
        new TextRun({ text: reportContent.cover.date }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Client: ', bold: true }),
        new TextRun({ text: reportContent.cover.client || 'Non spécifié' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Auteur: ', bold: true }),
        new TextRun({ text: reportContent.cover.author || 'Non spécifié' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Page break
  children.push(
    new Paragraph({
      text: '',
      pageBreakBefore: true,
    })
  );

  // Building Description
  if (reportContent.buildingDescription) {
    children.push(
      new Paragraph({
        text: 'Description du bâtiment',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: reportContent.buildingDescription.description || 'Aucune description',
        spacing: { after: 200 },
      })
    );

    if (reportContent.buildingDescription.particularities) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Particularités: ', bold: true }),
            new TextRun({ text: reportContent.buildingDescription.particularities }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    if (reportContent.buildingDescription.history) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Historique: ', bold: true }),
            new TextRun({ text: reportContent.buildingDescription.history }),
          ],
          spacing: { after: 400 },
        })
      );
    }
  }

  // Family Works
  if (reportContent.familyWorks && reportContent.familyWorks.length > 0) {
    children.push(
      new Paragraph({
        text: 'Travaux par famille',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      })
    );

    for (const work of reportContent.familyWorks) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: work.code, bold: true, color: 'FFFFFF' }),
          ],
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: work.name, bold: true }),
          ],
          spacing: { after: 100 },
        })
      );

      if (work.state) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'État constaté: ', bold: true }),
              new TextRun({ text: work.state }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (work.recommendation) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Travaux préconisés: ', bold: true }),
              new TextRun({ text: work.recommendation }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }
  }

  // Locations
  if (reportContent.locations && reportContent.locations.length > 0) {
    children.push(
      new Paragraph({
        text: 'Description des lieux',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      })
    );

    for (const [index, loc] of reportContent.locations.entries()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${String(index + 1).padStart(2, '0')}. `, bold: true }),
            new TextRun({ text: loc.name || 'Lieu sans nom', bold: true }),
            new TextRun({ text: ` (${loc.type || ''})` }),
            new TextRun({ text: ')' }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      if (loc.description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Description: ', bold: true }),
              new TextRun({ text: loc.description }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      if (loc.observations) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Observations: ', bold: true }),
              new TextRun({ text: loc.observations }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }
  }

  // Tasks
  const allTasks = [
    ...(reportContent.documentTasks || []),
    ...(reportContent.sequenceTasks || []),
  ];

  if (allTasks.length > 0) {
    children.push(
      new Paragraph({
        text: 'Tâches extraites',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      })
    );

    for (const task of allTasks) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: task.title || 'Tâche sans titre', bold: true }),
          ],
          spacing: { before: 100, after: 50 },
        })
      );

      if (task.description) {
        children.push(
          new Paragraph({
            text: task.description,
            spacing: { after: 50 },
          })
        );
      }

      if (task.location || task.priority) {
        const details: TextRun[] = [];
        if (task.location) {
          details.push(new TextRun({ text: `Lieu: ${task.location}`, italics: true }));
        }
        if (task.priority) {
          if (details.length > 0) details.push(new TextRun({ text: ' • ' }));
          details.push(new TextRun({ text: `Priorité: ${task.priority}`, italics: true }));
        }
        children.push(
          new Paragraph({
            children: details,
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  // Notes
  if (reportContent.notes) {
    children.push(
      new Paragraph({
        text: 'Notes & Observations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: reportContent.notes,
        spacing: { after: 200 },
      })
    );
  }

  // Footer
  children.push(
    new Paragraph({
      text: '',
      spacing: { before: 600 },
    }),
    new Paragraph({
      text: `Rapport généré le ${new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: 'MyEDLS - Groupe MyHome',
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Génère un HTML compatible avec Microsoft Word
 * Word peut ouvrir et convertir ce HTML en DOCX
 */
function generateWordCompatibleHTML(reportContent: EDLReportContent): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="MyEDLS">
  <meta name="Originator" content="MyEDLS">
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 2.5cm 2cm 2cm 2cm;
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000000;
    }
    
    h1 {
      font-size: 24pt;
      font-weight: bold;
      color: #2E5090;
      margin-top: 20pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    
    h2 {
      font-size: 18pt;
      font-weight: bold;
      color: #2E5090;
      margin-top: 16pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
      border-bottom: 2pt solid #2E5090;
      padding-bottom: 4pt;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: bold;
      color: #4472C4;
      margin-top: 12pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
    }
    
    p {
      margin-bottom: 6pt;
      text-align: justify;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      page-break-inside: avoid;
    }
    
    th {
      background-color: #2E5090;
      color: white;
      font-weight: bold;
      padding: 8pt;
      text-align: left;
      border: 1pt solid #1E3A6F;
    }
    
    td {
      padding: 6pt;
      border: 1pt solid #CCCCCC;
    }
    
    tr:nth-child(even) {
      background-color: #F2F2F2;
    }
    
    .cover {
      text-align: center;
      page-break-after: always;
      padding: 40pt 0;
    }
    
    .cover h1 {
      font-size: 32pt;
      margin-bottom: 20pt;
    }
    
    .cover .subtitle {
      font-size: 16pt;
      color: #666666;
      margin-bottom: 30pt;
    }
    
    .cover .meta {
      margin-top: 40pt;
      font-size: 12pt;
      line-height: 2;
    }
    
    .family-work {
      margin-bottom: 12pt;
      padding: 8pt;
      border-left: 4pt solid #2E5090;
      background-color: #F8F9FA;
    }
    
    .family-code {
      display: inline-block;
      background-color: #2E5090;
      color: white;
      padding: 4pt 8pt;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      margin-right: 8pt;
    }
    
    .location-card {
      margin-bottom: 16pt;
      padding: 10pt;
      border: 1pt solid #CCCCCC;
      background-color: #FFFFFF;
    }
    
    .task-item {
      margin-bottom: 8pt;
      padding-left: 12pt;
      border-left: 2pt solid #4472C4;
    }
    
    .notes-box {
      background-color: #FFF9E6;
      border: 1pt solid #FFC107;
      padding: 12pt;
      margin-top: 20pt;
    }
    
    .footer {
      margin-top: 30pt;
      padding-top: 12pt;
      border-top: 1pt solid #CCCCCC;
      font-size: 9pt;
      color: #666666;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <h1>${escapeHtml(reportContent.cover.title || 'Rapport EDL')}</h1>
    ${reportContent.cover.subtitle ? `<div class="subtitle">${escapeHtml(reportContent.cover.subtitle)}</div>` : ''}
    <div class="meta">
      <p><strong>Date:</strong> ${escapeHtml(reportContent.cover.date)}</p>
      <p><strong>Client:</strong> ${escapeHtml(reportContent.cover.client || 'Non spécifié')}</p>
      <p><strong>Auteur:</strong> ${escapeHtml(reportContent.cover.author || 'Non spécifié')}</p>
    </div>
  </div>
  
  <!-- Building Description -->
  ${reportContent.buildingDescription ? `
  <h1>Description du bâtiment</h1>
  <p>${escapeHtml(reportContent.buildingDescription.description || 'Aucune description')}</p>
  ${reportContent.buildingDescription.particularities ? `
  <p><strong>Particularités:</strong> ${escapeHtml(reportContent.buildingDescription.particularities)}</p>
  ` : ''}
  ${reportContent.buildingDescription.history ? `
  <p><strong>Historique:</strong> ${escapeHtml(reportContent.buildingDescription.history)}</p>
  ` : ''}
  ` : ''}
  
  <!-- Family Works -->
  ${reportContent.familyWorks && reportContent.familyWorks.length > 0 ? `
  <h1>Travaux par famille</h1>
  ${reportContent.familyWorks.map(work => `
    <div class="family-work">
      <span class="family-code">${escapeHtml(work.code)}</span>
      <strong>${escapeHtml(work.name)}</strong>
      ${work.state ? `
      <p><strong>État constaté:</strong> ${escapeHtml(work.state)}</p>
      ` : ''}
      ${work.recommendation ? `
      <p><strong>Travaux préconisés:</strong> ${escapeHtml(work.recommendation)}</p>
      ` : ''}
    </div>
  `).join('')}
  ` : ''}
  
  <!-- Locations -->
  ${reportContent.locations && reportContent.locations.length > 0 ? `
  <h1>Description des lieux</h1>
  ${reportContent.locations.map((loc, idx) => `
    <div class="location-card">
      <h3>${String(idx + 1).padStart(2, '0')}. ${escapeHtml(loc.name || 'Lieu sans nom')}</h3>
      <p><strong>Type:</strong> ${escapeHtml(loc.type || '')}</p>
      ${loc.description ? `
      <p><strong>Description:</strong> ${escapeHtml(loc.description)}</p>
      ` : ''}
      ${loc.observations ? `
      <p><strong>Observations:</strong> ${escapeHtml(loc.observations)}</p>
      ` : ''}
    </div>
  `).join('')}
  ` : ''}
  
  <!-- Tasks -->
  ${((reportContent.documentTasks && reportContent.documentTasks.length > 0) || 
     (reportContent.sequenceTasks && reportContent.sequenceTasks.length > 0)) ? `
  <h1>Tâches extraites</h1>
  ${[
    ...(reportContent.documentTasks || []),
    ...(reportContent.sequenceTasks || [])
  ].map(task => `
    <div class="task-item">
      <p><strong>${escapeHtml(task.title || 'Tâche sans titre')}</strong></p>
      ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
      ${task.location ? `<p><em>Lieu:</em> ${escapeHtml(task.location)}</p>` : ''}
      ${task.priority ? `<p><em>Priorité:</em> ${escapeHtml(task.priority)}</p>` : ''}
    </div>
  `).join('')}
  ` : ''}
  
  <!-- Notes -->
  ${reportContent.notes ? `
  <div class="notes-box">
    <h3>Notes & Observations</h3>
    <p>${escapeHtml(reportContent.notes).replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p>MyEDLS - Groupe MyHome</p>
  </div>
</body>
</html>`;
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Télécharge le fichier DOCX (solution native compatible Vite et Capacitor)
 */
export function downloadEDLDOCX(blob: Blob, filename: string = 'rapport-edl.docx') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
