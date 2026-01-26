# 📋 Ce qui reste à faire - Récapitulatif

## ✅ Ce qui est DÉJÀ FAIT

### Phase 2 - Complétée ✅
- ✅ Breadcrumbs navigation (`ReportageBreadcrumbs.tsx`)
- ✅ Queue offline avec IndexedDB (`useOfflineQueue.ts`)
- ✅ Pagination pour séquences (`usePaginatedSequences.ts`)
- ✅ Intégration dans `VideoReportageDialog.tsx`

### Phase 3 - Complétée ✅
- ✅ Prévisualisation templates (`TemplateManager.tsx` amélioré)
- ✅ Export HTML (`htmlGenerator.ts`)
- ✅ Export DOCX (`docxGenerator.ts`)
- ✅ Système analytics (`useAnalytics.ts` + `AnalyticsDashboard.tsx`)
- ✅ Menu export multi-formats dans `EDLReportEditorSplitView.tsx`

---

## ⚠️ CE QUI RESTE À FAIRE

### 1. 🔴 OBLIGATOIRE : Migration SQL Analytics

**Fichier SQL à exécuter :**
📄 [supabase/migrations/20250115000000_create_analytics_events.sql](supabase/migrations/20250115000000_create_analytics_events.sql)

**Pourquoi :** Sans cette migration, le système analytics ne fonctionnera pas (table manquante).

**Comment faire :**
1. Aller dans Supabase Dashboard → SQL Editor
2. Ouvrir le fichier : `supabase/migrations/20250115000000_create_analytics_events.sql`
3. Copier tout le contenu
4. Coller dans SQL Editor
5. Cliquer sur "Run"

**Vérification :**
Après exécution, vérifier que la table existe :
```sql
SELECT * FROM analytics_events LIMIT 1;
```

---

### 2. 🟡 OPTIONNEL : Intégrer Dashboard Analytics dans Settings

**Fichier à modifier :**
📄 [src/pages/Settings.tsx](src/pages/Settings.tsx)

**Ce qu'il faut ajouter :**

#### A. Importer le composant
```typescript
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { BarChart3 } from 'lucide-react';
```

#### B. Ajouter dans `settingsCards` (ligne ~48)
```typescript
{
  id: 'analytics' as SettingSection,
  icon: BarChart3,
  title: t('cancel') === 'Annuler' ? 'Analytics & Métriques' : 'Analytics & Metrics',
  description: t('cancel') === 'Annuler' ? 'Statistiques d\'utilisation' : 'Usage statistics',
  adminOnly: false,
},
```

#### C. Ajouter dans le switch de rendu (ligne ~200)
```typescript
case 'analytics':
  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
      <DialogHeader>
        <DialogTitle>Analytics & Métriques</DialogTitle>
        <DialogDescription>
          Statistiques d'utilisation de votre compte
        </DialogDescription>
      </DialogHeader>
      <AnalyticsDashboard />
    </DialogContent>
  );
```

**Pourquoi :** Pour que les utilisateurs puissent voir leurs métriques depuis les paramètres.

---

### 3. 🟢 OPTIONNEL : Vérifier que les exports trackent bien

**Fichier à vérifier :**
📄 [src/components/visit/EDLReportEditorSplitView.tsx](src/components/visit/EDLReportEditorSplitView.tsx)

**Vérification :**
- Les exports PDF/HTML/DOCX appellent bien `trackExport()` ✅ (déjà fait)
- Le hook `useAnalytics` est importé et utilisé ✅ (déjà fait)

**Si besoin d'ajouter du tracking ailleurs :**
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

const { trackEvent, trackTiming } = useAnalytics();

// Exemple
trackEvent({
  category: 'reportage',
  action: 'sequence_recorded',
  label: 'video',
});
```

---

## 📝 Checklist Finale

### Obligatoire
- [ ] **Exécuter la migration SQL** `20250115000000_create_analytics_events.sql` dans Supabase

### Optionnel mais Recommandé
- [ ] **Intégrer AnalyticsDashboard dans Settings.tsx** (voir instructions ci-dessus)
- [ ] **Tester les exports** (PDF, HTML, DOCX) pour vérifier qu'ils fonctionnent
- [ ] **Tester la prévisualisation des templates** dans TemplatesPage
- [ ] **Tester la queue offline** en mode déconnecté

---

## 🧪 Tests à Effectuer

### 1. Test Analytics
1. Exécuter la migration SQL
2. Aller dans Settings → Analytics (si intégré)
3. Vérifier que les métriques s'affichent
4. Générer un export (PDF/HTML/DOCX)
5. Vérifier que l'export est tracké dans analytics

### 2. Test Exports
1. Ouvrir un projet
2. Aller dans le rapport EDL
3. Générer le PDF
4. Cliquer sur "Exporter" → Tester HTML
5. Cliquer sur "Exporter" → Tester DOCX
6. Vérifier que les fichiers se téléchargent correctement

### 3. Test Prévisualisation Templates
1. Aller dans TemplatesPage
2. Cliquer sur l'icône "œil" d'un template
3. Vérifier que la prévisualisation s'affiche
4. Tester le bouton "Appliquer ce template"

### 4. Test Queue Offline
1. Désactiver le réseau
2. Créer une séquence dans le reportage
3. Vérifier que la séquence est sauvegardée localement
4. Réactiver le réseau
5. Vérifier que la synchronisation se fait automatiquement

---

## 🔗 Liens des Fichiers Importants

### Migrations SQL
- 📄 [Migration Analytics](supabase/migrations/20250115000000_create_analytics_events.sql)

### Composants Créés
- 📄 [AnalyticsDashboard](src/components/analytics/AnalyticsDashboard.tsx)
- 📄 [useAnalytics Hook](src/hooks/useAnalytics.ts)
- 📄 [HTML Generator](src/utils/htmlGenerator.ts)
- 📄 [DOCX Generator](src/utils/docxGenerator.ts)
- 📄 [Offline Queue Hook](src/hooks/useOfflineQueue.ts)
- 📄 [Breadcrumbs Component](src/components/visit/ReportageBreadcrumbs.tsx)

### Composants Modifiés
- 📄 [TemplateManager](src/components/edl-report/TemplateManager.tsx)
- 📄 [EDLReportEditorSplitView](src/components/visit/EDLReportEditorSplitView.tsx)
- 📄 [VideoReportageDialog](src/components/visit/VideoReportageDialog.tsx)

---

## ⏱️ Temps Estimé

- **Migration SQL** : 2 minutes
- **Intégration Analytics dans Settings** : 5-10 minutes (optionnel)
- **Tests** : 15-20 minutes

**Total : ~30 minutes** pour tout finaliser

---

## 🎯 Résumé Ultra-Court

**À faire OBLIGATOIREMENT :**
1. Exécuter la migration SQL : [supabase/migrations/20250115000000_create_analytics_events.sql](supabase/migrations/20250115000000_create_analytics_events.sql)

**À faire OPTIONNELLEMENT :**
2. Intégrer AnalyticsDashboard dans Settings.tsx (voir instructions ci-dessus)

**C'est tout !** 🎉
