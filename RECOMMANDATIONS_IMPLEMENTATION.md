# Recommandations d'Implémentation - Reportage et Rapport

## 🎯 Plan d'Action Prioritaire

### Phase 1 : Corrections Critiques (1-2 semaines)

#### 1.1 Validation DTC dans Rapport

**Problème** : Les familles par défaut ne correspondent pas au DTC réel.

**Solution** : Charger les familles depuis la base DTC.

```typescript
// Dans EDLReportEditorSplitView.tsx
const fetchDTCFamilies = async () => {
  const { data: families, error } = await supabase
    .from('ft_familles')
    .select('ft_code, ft_label, commentaire_type_equipe')
    .order('ft_code');
  
  if (error) {
    console.error('Error loading DTC families:', error);
    // Fallback aux familles par défaut
    return defaultFamilies;
  }
  
  return families.map(ft => ({
    code: ft.ft_code,
    name: ft.ft_label,
    state: '',
    recommendation: '',
    tasksCount: 0
  }));
};
```

**Fichier à modifier** : `src/components/visit/EDLReportEditorSplitView.tsx`
**Ligne** : ~370-382

---

#### 1.2 Feedback Visuel pour Traitement IA

**Problème** : Pas de feedback si l'extraction de tâches échoue.

**Solution** : Ajouter un composant de statut visible.

```typescript
// Nouveau composant : AITaskExtractionStatus.tsx
interface AITaskExtractionStatusProps {
  sequenceId: string;
  projectId: string;
}

export const AITaskExtractionStatus: React.FC<AITaskExtractionStatusProps> = ({
  sequenceId,
  projectId
}) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [tasksCount, setTasksCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Polling pour vérifier le statut
    const interval = setInterval(async () => {
      const { data: tasks } = await supabase
        .from('extracted_tasks')
        .select('id', { count: 'exact' })
        .eq('source_type', 'sequence')
        .eq('project_id', projectId);
      
      if (tasks && tasks.length > tasksCount) {
        setStatus('complete');
        setTasksCount(tasks.length);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [sequenceId, projectId]);
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
      {status === 'processing' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Extraction des tâches en cours...</span>
        </>
      )}
      {status === 'complete' && (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm">{tasksCount} tâches extraites</span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-500">{error}</span>
          <Button size="sm" onClick={handleRetry}>Réessayer</Button>
        </>
      )}
    </div>
  );
};
```

**Fichier à créer** : `src/components/visit/AITaskExtractionStatus.tsx`
**Intégration** : Dans `VideoReportageDialog.tsx` après la capture

---

#### 1.3 Validation Avant Génération PDF

**Problème** : PDF peut être généré avec des données incomplètes.

**Solution** : Ajouter validation avec Zod.

```typescript
// Dans EDLReportEditorSplitView.tsx
import { z } from 'zod';

const reportSchema = z.object({
  cover: z.object({
    title: z.string().min(1, 'Le titre est requis'),
    client: z.string().min(1, 'Le client est requis'),
    date: z.string().min(1, 'La date est requise'),
  }),
  buildingDescription: z.object({
    description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
  }),
  familyWorks: z.array(z.object({
    code: z.string().regex(/^FT\d{2}$/, 'Code FT invalide'),
    name: z.string().min(1),
    state: z.string().optional(),
    recommendation: z.string().optional(),
  })),
});

const handleGeneratePDF = async () => {
  // Validation
  const validation = reportSchema.safeParse(reportContent);
  
  if (!validation.success) {
    const errors = validation.error.errors.map(e => e.message).join('\n');
    toast.error(`Erreurs de validation:\n${errors}`);
    return;
  }
  
  // Génération PDF
  try {
    setGenerating(true);
    const pdfBlob = await generateEDLPDF(reportContent);
    setPdfBlob(pdfBlob);
    toast.success('PDF généré avec succès');
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error(`Erreur lors de la génération: ${error.message}`);
  } finally {
    setGenerating(false);
  }
};
```

**Fichier à modifier** : `src/components/visit/EDLReportEditorSplitView.tsx`
**Dépendance** : `npm install zod`

---

### Phase 2 : Améliorations Importantes (2-3 semaines)

#### 2.1 Breadcrumbs Navigation

**Problème** : Navigation complexe avec 4 niveaux.

**Solution** : Ajouter breadcrumbs et raccourcis.

```typescript
// Nouveau composant : ReportageBreadcrumbs.tsx
interface ReportageBreadcrumbsProps {
  partie?: { id: string; name: string; type: 'commune' | 'privative' };
  lieu?: { id: string; name: string };
  endroit?: { id: string; name: string; type: string };
  zone?: { id: string; label: string };
  onNavigate: (level: 'partie' | 'lieu' | 'endroit' | 'zone', id?: string) => void;
}

export const ReportageBreadcrumbs: React.FC<ReportageBreadcrumbsProps> = ({
  partie,
  lieu,
  endroit,
  zone,
  onNavigate
}) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate('partie')}
        className="h-auto p-0"
      >
        {partie ? partie.name : 'Sélectionner partie'}
      </Button>
      
      {partie && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('lieu', partie.id)}
            className="h-auto p-0"
          >
            {lieu ? lieu.name : 'Sélectionner lieu'}
          </Button>
        </>
      )}
      
      {lieu && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('endroit', lieu.id)}
            className="h-auto p-0"
          >
            {endroit ? endroit.name : 'Sélectionner endroit'}
          </Button>
        </>
      )}
      
      {endroit && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span>{zone ? zone.label : 'Sélectionner zone'}</span>
        </>
      )}
    </div>
  );
};
```

**Fichier à créer** : `src/components/visit/ReportageBreadcrumbs.tsx`
**Intégration** : Dans `VideoReportageDialog.tsx` en haut de chaque vue

---

#### 2.2 Queue Offline Robuste

**Problème** : Données perdues si déconnexion.

**Solution** : Implémenter queue avec IndexedDB.

```typescript
// Nouveau hook : useOfflineQueue.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineQueueItem {
  id: string;
  type: 'sequence' | 'task' | 'report';
  data: any;
  timestamp: number;
  retries: number;
}

interface MyDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
  };
}

export function useOfflineQueue() {
  const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Initialiser IndexedDB
    openDB<MyDB>('myedls-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
      },
    }).then(setDb);
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    // Sync automatique quand en ligne
    if (isOnline && db) {
      syncQueue(db);
    }
  }, [isOnline, db]);
  
  const addToQueue = async (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>) => {
    if (!db) return;
    
    const queueItem: OfflineQueueItem = {
      id: crypto.randomUUID(),
      ...item,
      timestamp: Date.now(),
      retries: 0,
    };
    
    await db.add('offlineQueue', queueItem);
    
    // Essayer de sync immédiatement si en ligne
    if (isOnline) {
      await syncItem(queueItem);
    }
  };
  
  const syncItem = async (item: OfflineQueueItem) => {
    try {
      switch (item.type) {
        case 'sequence':
          await supabase.from('visit_sequences').insert(item.data);
          break;
        case 'task':
          await supabase.from('extracted_tasks').insert(item.data);
          break;
        case 'report':
          await supabase.from('edl_reports').upsert(item.data);
          break;
      }
      
      // Supprimer de la queue si succès
      if (db) {
        await db.delete('offlineQueue', item.id);
      }
    } catch (error) {
      // Incrémenter retries
      item.retries++;
      if (item.retries < 5) {
        // Réessayer plus tard
        setTimeout(() => syncItem(item), 5000 * item.retries);
      } else {
        // Marquer comme échec permanent
        console.error('Failed to sync item after 5 retries:', item);
      }
    }
  };
  
  const syncQueue = async (database: IDBPDatabase<MyDB>) => {
    const items = await database.getAll('offlineQueue');
    for (const item of items) {
      await syncItem(item);
    }
  };
  
  return { addToQueue, isOnline, queueSize: db ? 0 : 0 }; // TODO: calculer taille
}
```

**Fichier à créer** : `src/hooks/useOfflineQueue.ts`
**Dépendance** : `npm install idb`
**Intégration** : Dans `ReportageEnhanced.tsx` et `EDLReportEditorSplitView.tsx`

---

#### 2.3 Optimisation Chargement Rapport

**Problème** : Beaucoup de requêtes simultanées au chargement.

**Solution** : Pagination et lazy loading.

```typescript
// Dans EDLReportEditorSplitView.tsx
const usePaginatedSequences = (projectId: string, pageSize = 20) => {
  const [page, setPage] = useState(0);
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSequences(prev => [...prev, ...data]);
        setHasMore(data.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading sequences:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, pageSize]);
  
  useEffect(() => {
    loadPage(0);
  }, [loadPage]);
  
  const loadMore = () => {
    if (!loading && hasMore) {
      loadPage(page + 1);
      setPage(prev => prev + 1);
    }
  };
  
  return { sequences, loading, hasMore, loadMore };
};
```

**Fichier à modifier** : `src/components/visit/EDLReportEditorSplitView.tsx`
**Ligne** : ~262-400 (fetchProjectData)

---

### Phase 3 : Améliorations UX (3-4 semaines)

#### 3.1 Templates Avancés

**Solution** : Système de templates avec prévisualisation.

```typescript
// Améliorer TemplateManager.tsx
interface TemplateSection {
  id: string;
  name: string;
  required: boolean;
  fields: TemplateField[];
}

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  required: boolean;
}

const createTemplateFromReport = (reportContent: any): EDLTemplate => {
  return {
    id: crypto.randomUUID(),
    name: 'Template personnalisé',
    sections: [
      {
        id: 'cover',
        name: 'Page de garde',
        required: true,
        fields: [
          { id: 'title', label: 'Titre', type: 'text', required: true },
          { id: 'client', label: 'Client', type: 'text', required: true },
        ]
      },
      // ... autres sections
    ]
  };
};
```

---

#### 3.2 Export Multi-Formats

**Solution** : Ajouter export HTML et DOCX.

```typescript
// Nouveau fichier : exportFormats.ts
import { generateEDLPDF } from '@/utils/pdfGenerator';
import { generateEDLHTML } from '@/utils/htmlGenerator';
import { generateEDLDOCX } from '@/utils/docxGenerator';

export async function exportReport(
  format: 'pdf' | 'html' | 'docx',
  reportContent: any
): Promise<Blob> {
  switch (format) {
    case 'pdf':
      return generateEDLPDF(reportContent);
    case 'html':
      return generateEDLHTML(reportContent);
    case 'docx':
      return generateEDLDOCX(reportContent);
    default:
      throw new Error(`Format non supporté: ${format}`);
  }
}
```

**Fichiers à créer** :
- `src/utils/htmlGenerator.ts`
- `src/utils/docxGenerator.ts`
**Dépendances** : `npm install docx file-saver`

---

## 📊 Métriques et Monitoring

### Implémentation Analytics

```typescript
// Nouveau fichier : analytics.ts
interface AnalyticsEvent {
  category: 'reportage' | 'rapport' | 'task' | 'error';
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export const analytics = {
  track: (event: AnalyticsEvent) => {
    // Envoyer à Supabase Analytics ou service externe
    supabase.from('analytics_events').insert({
      user_id: getCurrentUserId(),
      ...event,
      timestamp: new Date().toISOString()
    });
  },
  
  trackReportage: {
    sequenceStarted: () => analytics.track({
      category: 'reportage',
      action: 'sequence_started'
    }),
    sequenceSaved: (duration: number) => analytics.track({
      category: 'reportage',
      action: 'sequence_saved',
      value: duration
    }),
    taskExtracted: (count: number) => analytics.track({
      category: 'reportage',
      action: 'task_extracted',
      value: count
    })
  },
  
  trackRapport: {
    opened: () => analytics.track({
      category: 'rapport',
      action: 'opened'
    }),
    pdfGenerated: (size: number) => analytics.track({
      category: 'rapport',
      action: 'pdf_generated',
      value: size
    }),
    sectionCompleted: (section: string) => analytics.track({
      category: 'rapport',
      action: 'section_completed',
      label: section
    })
  }
};
```

**Fichier à créer** : `src/lib/analytics.ts`
**Table à créer** : `analytics_events` dans Supabase

---

## 🧪 Tests Recommandés

### Tests Unitaires

```typescript
// tests/reportage/VideoReportageDialog.test.tsx
describe('VideoReportageDialog', () => {
  it('should navigate through all levels correctly', () => {
    // Test navigation Partie → Lieu → Endroit → Zone
  });
  
  it('should save sequence with correct metadata', () => {
    // Test sauvegarde avec métadonnées complètes
  });
  
  it('should handle network errors gracefully', () => {
    // Test gestion erreur réseau
  });
});
```

### Tests d'Intégration

```typescript
// tests/integration/reportage-flow.test.tsx
describe('Reportage Flow Integration', () => {
  it('should complete full reportage flow', async () => {
    // 1. Ouvrir dialog
    // 2. Sélectionner partie
    // 3. Sélectionner lieu
    // 4. Capturer séquence
    // 5. Vérifier sauvegarde
    // 6. Vérifier extraction tâches
  });
});
```

---

## 📝 Checklist d'Implémentation

### Phase 1 (Critique)
- [ ] Validation DTC dans rapport
- [ ] Feedback visuel traitement IA
- [ ] Validation avant génération PDF
- [ ] Tests unitaires de base

### Phase 2 (Important)
- [ ] Breadcrumbs navigation
- [ ] Queue offline robuste
- [ ] Optimisation chargement
- [ ] Tests d'intégration

### Phase 3 (Amélioration)
- [ ] Templates avancés
- [ ] Export multi-formats
- [ ] Analytics et monitoring
- [ ] Documentation utilisateur

---

## 🎯 Résumé

**Priorités Immédiates :**
1. Corriger validation DTC dans rapport
2. Ajouter feedback visuel pour traitement IA
3. Implémenter validation avant PDF

**Améliorations Moyen Terme :**
1. Navigation améliorée (breadcrumbs)
2. Queue offline robuste
3. Optimisation performance

**Améliorations Long Terme :**
1. Templates avancés
2. Export multi-formats
3. Analytics complet
