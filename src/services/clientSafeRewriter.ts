// Client-Safe Content Rewriter
// Transforms technical content into pedagogical, client-friendly language

import { supabase } from '@/integrations/supabase/client';

interface RewriteOptions {
  removeWorkerNames?: boolean;
  removeFTCodes?: boolean;
  removeInternalPriorities?: boolean;
  removeRiskFlags?: boolean;
  smoothTone?: boolean;
  simplifyTerms?: boolean;
}

const DEFAULT_OPTIONS: RewriteOptions = {
  removeWorkerNames: true,
  removeFTCodes: true,
  removeInternalPriorities: true,
  removeRiskFlags: true,
  smoothTone: true,
  simplifyTerms: true,
};

// Technical to simple term mappings
const TERM_MAPPINGS: Record<string, string> = {
  'gros œuvre': 'structure du bâtiment',
  'second œuvre': 'aménagements intérieurs',
  'lot technique': 'installations techniques',
  'VRD': 'réseaux extérieurs',
  'DTU': 'normes de construction',
  'CCTP': 'cahier des charges',
  'DPGF': 'devis détaillé',
  'maître d\'ouvrage': 'propriétaire',
  'maître d\'œuvre': 'architecte responsable',
  'OPC': 'coordination des travaux',
  'DET': 'direction des travaux',
  'AOR': 'assistance à la réception',
  'PRO': 'études de projet',
  'DCE': 'dossier de consultation',
  'ravalement': 'rénovation de façade',
  'ragréage': 'remise à niveau du sol',
  'étanchéité': 'protection contre l\'eau',
  'ITE': 'isolation par l\'extérieur',
  'ITI': 'isolation par l\'intérieur',
  'ECS': 'eau chaude',
  'VMC': 'ventilation',
  'CVC': 'chauffage et climatisation',
  'CFO': 'électricité',
  'CFA': 'courants faibles',
  'EP': 'évacuation des eaux de pluie',
  'EU': 'évacuation des eaux usées',
  'EV': 'évacuation des eaux vannes',
};

// FT code to simple label mappings
const FT_SIMPLE_LABELS: Record<string, string> = {
  'F01': 'Travaux préparatoires',
  'F02': 'Menuiseries',
  'F03': 'Structure',
  'F04': 'Façades',
  'F05': 'Toiture',
  'F06': 'Étanchéité',
  'F07': 'Isolation',
  'F08': 'Cloisons',
  'F09': 'Plâtrerie',
  'F10': 'Sols',
  'F11': 'Peinture',
  'F12': 'Revêtements muraux',
  'F13': 'Plomberie',
  'F14': 'Chauffage',
  'F15': 'Électricité',
  'F16': 'Ventilation',
  'F17': 'Sanitaires',
  'F18': 'Cuisine',
  'F19': 'Serrurerie',
  'F20': 'Vitrerie',
  'F21': 'Espaces verts',
  'F22': 'Voirie',
  'F23': 'Réseaux',
  'F24': 'Ascenseurs',
  'F25': 'Sécurité incendie',
  'F26': 'Contrôle d\'accès',
  'F27': 'Nettoyage',
  'F28': 'Divers',
};

class ClientSafeRewriter {
  // Rewrite a single text
  rewriteText(text: string, options: RewriteOptions = DEFAULT_OPTIONS): string {
    let result = text;

    // Remove FT codes (F01, F02, etc.)
    if (options.removeFTCodes) {
      result = result.replace(/\bF\d{2}\b\s*[-–:]\s*/g, '');
      result = result.replace(/\(F\d{2}\)/g, '');
    }

    // Remove worker names (assuming format "Nom Prénom" or "M./Mme")
    if (options.removeWorkerNames) {
      result = result.replace(/\b(M\.|Mme|Mr\.?)\s+[A-Z][a-zé]+(\s+[A-Z][a-zé]+)?\b/g, 'l\'équipe');
      result = result.replace(/assigné à\s+[A-Za-zéèêëàâîïôûùç\s]+/gi, 'pris en charge');
    }

    // Remove internal priorities
    if (options.removeInternalPriorities) {
      result = result.replace(/\bpriorité\s*(haute|basse|moyenne|critique|urgente)\b/gi, '');
      result = result.replace(/\bP[1-5]\b/g, '');
    }

    // Remove risk flags
    if (options.removeRiskFlags) {
      result = result.replace(/\[RISQUE\]/gi, '');
      result = result.replace(/\[CRITIQUE\]/gi, '');
      result = result.replace(/\[BUDGET\]/gi, '');
      result = result.replace(/risque\s*:\s*\d+%/gi, '');
    }

    // Simplify technical terms
    if (options.simplifyTerms) {
      for (const [technical, simple] of Object.entries(TERM_MAPPINGS)) {
        const regex = new RegExp(`\\b${technical}\\b`, 'gi');
        result = result.replace(regex, simple);
      }
    }

    // Clean up extra spaces
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }

  // Convert FT code to simple label
  getFTSimpleLabel(ftCode: string): string {
    return FT_SIMPLE_LABELS[ftCode.toUpperCase()] || 'Travaux';
  }

  // Rewrite a task for client display
  rewriteTask(task: any): any {
    return {
      ...task,
      title: this.rewriteText(task.title || ''),
      description: this.rewriteText(task.description || ''),
      ft_label: task.ft_code ? this.getFTSimpleLabel(task.ft_code) : undefined,
      // Remove sensitive fields
      ft_code: undefined,
      ct_code: undefined,
      st_code: undefined,
      assigned_to: undefined,
      internal_priority: undefined,
      internal_notes: undefined,
      budget_critical: undefined,
      risk_level: undefined,
      worker_id: undefined,
    };
  }

  // Rewrite EDL summary for client
  rewriteEDLSummary(summary: any): any {
    return {
      ...summary,
      resumeGlobal: this.rewriteText(summary.resumeGlobal || ''),
      pointsImportants: (summary.pointsImportants || []).map((p: string) => this.rewriteText(p)),
      recommandations: (summary.recommandations || []).map((r: string) => this.rewriteText(r)),
      // Remove internal fields
      risquesInternes: undefined,
      budgetAlerts: undefined,
      workerNotes: undefined,
    };
  }

  // Use AI to fully rewrite technical content into pedagogical language
  async rewriteWithAI(content: string, context?: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Réécris ce texte technique en version client, pédagogique et rassurante. 
Règles:
- Pas de jargon technique (FT, DSC, CCTP, etc.)
- Pas de noms de travailleurs
- Pas de détails de budget
- Pas de niveaux de risque internes
- Ton professionnel mais accessible
- Phrases courtes et claires

${context ? `Contexte: ${context}\n` : ''}
Texte à réécrire:
${content}

Retourne UNIQUEMENT le texte réécrit, sans explication.`
          }],
          mode: 'rewrite'
        }
      });

      if (error) throw error;
      return data?.response || this.rewriteText(content);
    } catch {
      // Fallback to rule-based rewriting
      return this.rewriteText(content);
    }
  }

  // Rewrite alerts for client display
  rewriteAlerts(alerts: any[]): any[] {
    return alerts
      .filter(alert => !alert.internalOnly && !alert.budgetCritical)
      .map(alert => ({
        ...alert,
        title: this.rewriteText(alert.title || ''),
        description: this.rewriteText(alert.description || ''),
        severity: this.mapSeverityForClient(alert.severity),
        // Remove internal fields
        internalNotes: undefined,
        assignedTo: undefined,
        budgetImpact: undefined,
      }));
  }

  private mapSeverityForClient(severity: string): string {
    const mapping: Record<string, string> = {
      'critique': 'important',
      'haute': 'à noter',
      'moyenne': 'information',
      'basse': 'information',
    };
    return mapping[severity?.toLowerCase()] || 'information';
  }

  // Generate client-safe progress description
  generateProgressDescription(progress: number): string {
    if (progress >= 90) return 'Les travaux sont en phase de finalisation.';
    if (progress >= 70) return 'Les travaux avancent bien et sont dans les dernières phases.';
    if (progress >= 50) return 'Les travaux sont en bonne progression.';
    if (progress >= 30) return 'Les travaux sont en cours de réalisation.';
    if (progress >= 10) return 'Les travaux ont démarré.';
    return 'Les travaux sont en phase de préparation.';
  }
}

export const clientSafeRewriter = new ClientSafeRewriter();
export default clientSafeRewriter;
