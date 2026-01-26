/**
 * Générateur HTML pour export de rapports EDL
 * Génère un fichier HTML professionnel à partir du contenu du rapport
 */

export interface EDLReportContent {
  cover: {
    title: string;
    subtitle?: string;
    date: string;
    author: string;
    client: string;
    logo?: string;
  };
  buildingDescription: {
    description: string;
    particularities?: string;
    history?: string;
  };
  regulatory?: {
    urbanPlanning?: string;
    permits?: string;
    constraints?: string;
    abf?: string;
  };
  locationDescription?: {
    general?: string;
    access?: string;
    floors?: string;
  };
  denormandieSynthesis?: {
    menuiseries?: { state: string; recommendation: string };
    wallInsulation?: { state: string; recommendation: string };
    roofInsulation?: { state: string; recommendation: string };
    hotWater?: { state: string; recommendation: string };
    heating?: { state: string; recommendation: string };
  };
  familyWorks?: Array<{
    code: string;
    name: string;
    state: string;
    recommendation: string;
  }>;
  locations?: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    observations: string;
  }>;
  documentTasks?: any[];
  sequenceTasks?: any[];
  notes?: string;
}

/**
 * Génère un fichier HTML à partir du contenu du rapport EDL
 */
export function generateEDLHTML(reportContent: EDLReportContent): string {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportContent.cover.title || 'Rapport EDL'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 1.2em;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .header .meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
      font-size: 0.9em;
      opacity: 0.85;
    }
    
    .content {
      padding: 40px;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 1.8em;
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    
    .section-content {
      line-height: 1.8;
      color: #555;
    }
    
    .section-content p {
      margin-bottom: 15px;
    }
    
    .family-works {
      display: grid;
      gap: 20px;
      margin-top: 20px;
    }
    
    .family-work-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: #fafafa;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .family-work-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .family-work-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .family-code {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-family: monospace;
      font-size: 0.9em;
    }
    
    .family-name {
      font-size: 1.2em;
      font-weight: 600;
      color: #333;
    }
    
    .family-state, .family-recommendation {
      margin-top: 10px;
      padding: 12px;
      background: white;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    
    .family-state strong, .family-recommendation strong {
      color: #667eea;
      display: block;
      margin-bottom: 5px;
    }
    
    .locations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .location-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
    }
    
    .location-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .location-number {
      background: #667eea;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9em;
    }
    
    .location-name {
      font-size: 1.1em;
      font-weight: 600;
      color: #333;
    }
    
    .location-type {
      color: #666;
      font-size: 0.9em;
      margin-left: auto;
    }
    
    .tasks-section {
      margin-top: 30px;
    }
    
    .task-list {
      display: grid;
      gap: 15px;
      margin-top: 20px;
    }
    
    .task-card {
      border-left: 4px solid #667eea;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    
    .task-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    
    .task-description {
      color: #666;
      font-size: 0.9em;
      margin-top: 5px;
    }
    
    .notes-section {
      background: #fff9e6;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 6px;
      margin-top: 30px;
    }
    
    .notes-section h3 {
      color: #f57c00;
      margin-bottom: 10px;
    }
    
    .footer {
      background: #333;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 0.9em;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }
      
      .locations-grid {
        grid-template-columns: 1fr;
      }
      
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header / Cover -->
    <div class="header">
      <h1>${escapeHtml(reportContent.cover.title || 'Rapport EDL')}</h1>
      ${reportContent.cover.subtitle ? `<div class="subtitle">${escapeHtml(reportContent.cover.subtitle)}</div>` : ''}
      <div class="meta">
        <div><strong>Date:</strong> ${escapeHtml(reportContent.cover.date)}</div>
        <div><strong>Client:</strong> ${escapeHtml(reportContent.cover.client || 'Non spécifié')}</div>
        <div><strong>Auteur:</strong> ${escapeHtml(reportContent.cover.author || 'Non spécifié')}</div>
      </div>
    </div>
    
    <div class="content">
      <!-- Building Description -->
      ${reportContent.buildingDescription ? `
      <div class="section">
        <h2 class="section-title">Description du bâtiment</h2>
        <div class="section-content">
          <p>${escapeHtml(reportContent.buildingDescription.description || 'Aucune description')}</p>
          ${reportContent.buildingDescription.particularities ? `
          <p><strong>Particularités:</strong> ${escapeHtml(reportContent.buildingDescription.particularities)}</p>
          ` : ''}
          ${reportContent.buildingDescription.history ? `
          <p><strong>Historique:</strong> ${escapeHtml(reportContent.buildingDescription.history)}</p>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      <!-- Family Works -->
      ${reportContent.familyWorks && reportContent.familyWorks.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Travaux par famille</h2>
        <div class="family-works">
          ${reportContent.familyWorks.map(work => `
            <div class="family-work-card">
              <div class="family-work-header">
                <span class="family-code">${escapeHtml(work.code)}</span>
                <span class="family-name">${escapeHtml(work.name)}</span>
              </div>
              ${work.state ? `
              <div class="family-state">
                <strong>État constaté:</strong>
                <div>${escapeHtml(work.state)}</div>
              </div>
              ` : ''}
              ${work.recommendation ? `
              <div class="family-recommendation">
                <strong>Travaux préconisés:</strong>
                <div>${escapeHtml(work.recommendation)}</div>
              </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Locations -->
      ${reportContent.locations && reportContent.locations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Description des lieux</h2>
        <div class="locations-grid">
          ${reportContent.locations.map((loc, idx) => `
            <div class="location-card">
              <div class="location-header">
                <div class="location-number">${String(idx + 1).padStart(2, '0')}</div>
                <div class="location-name">${escapeHtml(loc.name || 'Lieu sans nom')}</div>
                <div class="location-type">${escapeHtml(loc.type || '')}</div>
              </div>
              ${loc.description ? `
              <p><strong>Description:</strong> ${escapeHtml(loc.description)}</p>
              ` : ''}
              ${loc.observations ? `
              <p><strong>Observations:</strong> ${escapeHtml(loc.observations)}</p>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Tasks -->
      ${((reportContent.documentTasks && reportContent.documentTasks.length > 0) || 
         (reportContent.sequenceTasks && reportContent.sequenceTasks.length > 0)) ? `
      <div class="section tasks-section">
        <h2 class="section-title">Tâches extraites</h2>
        <div class="task-list">
          ${[
            ...(reportContent.documentTasks || []),
            ...(reportContent.sequenceTasks || [])
          ].map(task => `
            <div class="task-card">
              <div class="task-title">${escapeHtml(task.title || 'Tâche sans titre')}</div>
              ${task.description ? `
              <div class="task-description">${escapeHtml(task.description)}</div>
              ` : ''}
              ${task.location ? `
              <div class="task-description"><strong>Lieu:</strong> ${escapeHtml(task.location)}</div>
              ` : ''}
              ${task.priority ? `
              <div class="task-description"><strong>Priorité:</strong> ${escapeHtml(task.priority)}</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Notes -->
      ${reportContent.notes ? `
      <div class="notes-section">
        <h3>Notes & Observations</h3>
        <p>${escapeHtml(reportContent.notes).replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}
    </div>
    
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
  </div>
</body>
</html>`;

  return html;
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Génère un Blob HTML téléchargeable
 */
export async function generateEDLHTMLBlob(reportContent: EDLReportContent): Promise<Blob> {
  const html = generateEDLHTML(reportContent);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

/**
 * Télécharge le fichier HTML
 */
export function downloadEDLHTML(blob: Blob, filename: string = 'rapport-edl.html') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
