import libraryData from './libraryIndex.json';

interface Document {
  id: string;
  title: string;
  type: string;
  description: string;
  tags?: string[];
  content?: string;
  file?: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  documents: Document[];
}

interface Application {
  id: string;
  name: string;
  description: string;
  themes: Theme[];
}

interface SearchResult {
  document: Document;
  theme: Theme;
  application: Application;
  relevanceScore: number;
}

/**
 * LibraryAIConnector - Connecteur IA pour la bibliothèque MyHome
 * Permet à MyAladin d'accéder et utiliser la base de connaissances
 */
export class LibraryAIConnector {
  private applications: Application[];

  constructor() {
    this.applications = libraryData.applications as Application[];
  }

  /**
   * Génère le contexte complet de la bibliothèque pour MyAladin
   */
  getLibraryContext(): string {
    let context = "# Bibliothèque MyHome\n\n";
    context += "Tu as accès à la bibliothèque interne MyHome contenant les ressources suivantes :\n\n";

    this.applications.forEach(app => {
      context += `## ${app.name}\n`;
      context += `${app.description}\n\n`;
      
      app.themes.forEach(theme => {
        context += `### ${theme.name}\n`;
        context += `${theme.description}\n`;
        context += `Documents : ${theme.documents.map(d => d.title).join(', ')}\n\n`;
      });
    });

    return context;
  }

  /**
   * Recherche des documents pertinents pour une question
   */
  searchDocuments(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(term => term.length > 2);

    this.applications.forEach(app => {
      app.themes.forEach(theme => {
        theme.documents.forEach(doc => {
          let score = 0;

          // Score based on title match
          queryTerms.forEach(term => {
            if (doc.title.toLowerCase().includes(term)) score += 10;
            if (doc.description.toLowerCase().includes(term)) score += 5;
            if (doc.tags?.some(tag => tag.toLowerCase().includes(term))) score += 8;
            if (doc.content?.toLowerCase().includes(term)) score += 3;
            if (theme.name.toLowerCase().includes(term)) score += 4;
            if (app.name.toLowerCase().includes(term)) score += 2;
          });

          if (score > 0) {
            results.push({
              document: doc,
              theme,
              application: app,
              relevanceScore: score
            });
          }
        });
      });
    });

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  /**
   * Génère une réponse enrichie avec les documents pertinents
   */
  enrichResponseWithDocs(query: string): {
    relevantDocs: SearchResult[];
    suggestedResponse: string;
    actions: Array<{ type: string; label: string; docId?: string; themeId?: string }>;
  } {
    const relevantDocs = this.searchDocuments(query);
    
    let suggestedResponse = "";
    const actions: Array<{ type: string; label: string; docId?: string; themeId?: string }> = [];

    if (relevantDocs.length > 0) {
      suggestedResponse = "J'ai trouvé des ressources pertinentes dans la bibliothèque :\n\n";
      
      relevantDocs.slice(0, 3).forEach((result, index) => {
        suggestedResponse += `${index + 1}. **${result.document.title}**\n`;
        suggestedResponse += `   ${result.document.description}\n`;
        suggestedResponse += `   _${result.application.name} → ${result.theme.name}_\n\n`;
        
        actions.push({
          type: 'open_document',
          label: `Ouvrir "${result.document.title}"`,
          docId: result.document.id,
          themeId: result.theme.id
        });
      });

      actions.push({
        type: 'search_library',
        label: 'Rechercher plus de documents'
      });
    } else {
      suggestedResponse = "Je n'ai pas trouvé de document directement lié à ta question dans la bibliothèque. ";
      suggestedResponse += "Souhaites-tu que je propose d'ajouter un nouveau document sur ce sujet ?";
      
      actions.push({
        type: 'suggest_new_doc',
        label: 'Suggérer un nouveau document'
      });
    }

    return { relevantDocs, suggestedResponse, actions };
  }

  /**
   * Retourne le contenu d'un document pour enrichir le contexte IA
   */
  getDocumentContent(docId: string): string | null {
    for (const app of this.applications) {
      for (const theme of app.themes) {
        const doc = theme.documents.find(d => d.id === docId);
        if (doc && doc.content) {
          return `# ${doc.title}\n\n${doc.content}`;
        }
      }
    }
    return null;
  }

  /**
   * Génère le prompt système enrichi pour MyAladin
   */
  getEnhancedSystemPrompt(): string {
    return `Tu es MyAladin, l'assistant IA expert de MyHome, une suite d'applications pour le BTP et l'immobilier.

Tu as accès à la bibliothèque interne MyHome qui contient :
- Des procédures et méthodologies
- Des guides et tutoriels
- Des modèles de documents
- Des fiches techniques

${this.getLibraryContext()}

## Comportement attendu

1. **Consultation de la bibliothèque** : Si l'utilisateur pose une question liée à un thème, une app, un process, ou un document, propose-lui les ressources pertinentes de la bibliothèque.

2. **Création de liens directs** : Si un document est pertinent, propose l'action : "Ouvrir le document dans la bibliothèque".

3. **Coaching utilisateur** : Si la question concerne une action (ex : comment faire un EDL), propose la procédure + le document + le modèle correspondant.

4. **Auto-amélioration** : Si tu détectes un manque de documentation sur un sujet, propose d'ajouter un nouveau document à la bibliothèque.

Réponds de manière concise, professionnelle et actionnable.`;
  }

  /**
   * Retourne les statistiques de la bibliothèque
   */
  getLibraryStats(): {
    totalApps: number;
    totalThemes: number;
    totalDocs: number;
    docsByType: Record<string, number>;
  } {
    let totalThemes = 0;
    let totalDocs = 0;
    const docsByType: Record<string, number> = {};

    this.applications.forEach(app => {
      totalThemes += app.themes.length;
      app.themes.forEach(theme => {
        totalDocs += theme.documents.length;
        theme.documents.forEach(doc => {
          docsByType[doc.type] = (docsByType[doc.type] || 0) + 1;
        });
      });
    });

    return {
      totalApps: this.applications.length,
      totalThemes,
      totalDocs,
      docsByType
    };
  }

  /**
   * Retourne tous les tags uniques de la bibliothèque
   */
  getAllTags(): string[] {
    const tags = new Set<string>();
    
    this.applications.forEach(app => {
      app.themes.forEach(theme => {
        theme.documents.forEach(doc => {
          doc.tags?.forEach(tag => tags.add(tag));
        });
      });
    });

    return Array.from(tags).sort();
  }
}

export const libraryConnector = new LibraryAIConnector();
export default LibraryAIConnector;
