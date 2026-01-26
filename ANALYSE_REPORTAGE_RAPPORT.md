# Analyse Détaillée : Reportage et Rapport EDL

## 📋 Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Système de Reportage](#système-de-reportage)
3. [Système de Rapport](#système-de-rapport)
4. [Flux de Données](#flux-de-données)
5. [Problèmes Identifiés](#problèmes-identifiés)
6. [Recommandations d'Amélioration](#recommandations-damélioration)

---

## 🏗️ Architecture Générale

### Vue d'Ensemble

L'application MyEDLS est structurée autour de deux fonctionnalités principales :

1. **Reportage** : Capture et enregistrement des observations pendant la visite
2. **Rapport** : Génération et édition du rapport EDL final

### Tables de Base de Données Clés

```sql
-- Séquences de visite (reportage)
visit_sequences (
  id, project_id, location_id, zone_type, 
  transcription, video_url, audio_url, 
  metadata, created_at
)

-- Tâches extraites
extracted_tasks (
  id, project_id, title, description,
  family_id, category_id, subcategory_id,  -- Classification DTC
  location, area, priority, source_type,
  analysis_metadata
)

-- Rapports EDL
edl_reports (
  id, project_id, session_id,
  report_json, generated_by, updated_at
)

-- Structure du bâtiment
property_parts (id, name, part_type)  -- commune/privative
property_locations (id, name, part_id)  -- lieux
location_zones (id, name, location_id)  -- zones
```

---

## 🎥 Système de Reportage

### 1. Composants Principaux

#### A. `VideoReportageDialog.tsx` (Point d'entrée principal)

**Responsabilités :**
- Navigation hiérarchique : Partie → Lieu → Endroit → Zone
- Gestion des modes : `guided` (guidé) ou `free` (libre)
- Orchestration des sous-composants de capture

**États de Navigation :**
```typescript
type ViewState = 
  | 'select-partie'      // Niveau 1: Commune ou Privative
  | 'select-lieu'        // Niveau 2: Liste des lieux
  | 'select-endroit'     // Niveau 3: Pièces/Endroits dans un lieu
  | 'select-zone'        // Niveau 4: Zones + modes capture
  | 'recording';         // Capture en cours
```

**Modes de Capture :**
- `video` : Enregistrement vidéo avec transcription
- `photo` : Capture photo avec description vocale
- `text` : Saisie texte manuelle

**Problèmes Identifiés :**
- ❌ Les boutons "Commune" et "Privative" étaient non cliquables (corrigé)
- ⚠️ Navigation complexe avec 4 niveaux peut être confuse
- ⚠️ Pas de sauvegarde automatique des sélections intermédiaires

#### B. `ReportageEnhanced.tsx` (Mode guidé avancé)

**Fonctionnalités :**
- ✅ Transcription en temps réel
- ✅ Navigation vocale
- ✅ Boutons larges (60px minimum)
- ✅ Barre de progression visuelle
- ✅ Raccourcis zones rapides
- ✅ Auto-sauvegarde toutes les 3 secondes
- ✅ Compression adaptative + mode hors ligne
- ✅ Traitement IA en arrière-plan

**Hooks Utilisés :**
- `useAutoSave` : Sauvegarde automatique
- `useAdaptiveCompression` : Compression adaptative selon réseau
- `useVoiceNavigation` : Navigation vocale
- `backgroundAIProcessor` : Traitement IA asynchrone

#### C. `VisitSequenceRecorder.tsx`

**Responsabilités :**
- Enregistrement vidéo/audio
- Gestion du MediaRecorder
- Upload vers Supabase Storage
- Création de `visit_sequences`

#### D. `TextVoiceRecorder.tsx`

**Responsabilités :**
- Saisie texte manuelle
- Enregistrement vocal avec transcription
- Utilise Web Speech API

#### E. `ZoneProblemCapture.tsx`

**Responsabilités :**
- Capture de problèmes par zone
- Association problème → zone → tâche
- Interface optimisée mobile

### 2. Flux de Reportage Guidé

```
1. Utilisateur ouvre VideoReportageDialog
   ↓
2. Sélection Partie (Commune/Privative)
   ↓
3. Sélection Lieu (ex: "Hall d'entrée")
   ↓
4. Sélection Endroit (ex: "Sas d'entrée")
   ↓
5. Sélection Zone (ex: "Mur", "Sol", "Plafond")
   ↓
6. Sélection Mode Capture (Video/Photo/Text)
   ↓
7. Capture avec ReportageEnhanced
   ↓
8. Auto-sauvegarde → visit_sequences
   ↓
9. Traitement IA en arrière-plan
   ↓
10. Extraction tâches → extracted_tasks
```

### 3. Flux de Reportage Libre

```
1. Utilisateur ouvre VideoReportageDialog (mode: 'free')
   ↓
2. Accès direct à la capture sans navigation hiérarchique
   ↓
3. Capture libre avec géolocalisation
   ↓
4. Sauvegarde → visit_sequences
   ↓
5. Traitement IA
```

### 4. Hooks et Services

#### `useReportageAI.ts`

**Fonctionnalités :**
- Intégration OpenAI Realtime pour transcription vocale
- Queue de traitement pour éviter les surcharges
- Extraction automatique de tâches
- Analyse IA des captures

**Problèmes Potentiels :**
- ⚠️ Dépendance à OpenAI Realtime (coût)
- ⚠️ Queue peut s'accumuler si réseau lent
- ⚠️ Pas de retry automatique en cas d'échec

#### `useAutoSave.ts`

**Fonctionnalités :**
- Sauvegarde automatique toutes les 3 secondes
- Détection des changements non sauvegardés
- Indicateur visuel de statut

**Problèmes Potentiels :**
- ⚠️ Peut générer beaucoup de requêtes si utilisateur tape vite
- ⚠️ Pas de gestion de conflits si plusieurs onglets ouverts

#### `useAdaptiveCompression.ts`

**Fonctionnalités :**
- Détection qualité réseau
- Compression vidéo adaptative
- Mode hors ligne avec queue

**Problèmes Potentiels :**
- ⚠️ Compression peut prendre du temps
- ⚠️ Qualité vidéo peut être dégradée

### 5. Zones Disponibles

**Zones Intérieures :**
- mur, sol, plafond, fenêtre, porte
- radiateur, vmc, électricité, équipement, sanitaires

**Zones Façade :**
- revetement_facade, menuiseries_ext, balcons
- garde_corps, volets

**Zones Toiture :**
- couverture, charpente, gouttieres, faitage
- cheminee, velux, etancheite, isolation_toiture
- zinguerie, panneaux_solaires

**Total : ~30 zones prédéfinies**

---

## 📄 Système de Rapport

### 1. Composants Principaux

#### A. `EDLReportEditorSplitView.tsx` (Éditeur principal)

**Structure du Rapport :**

```typescript
reportContent = {
  cover: {
    title, subtitle, date, author, client, logo
  },
  buildingDescription: {
    description, particularities, history
  },
  regulatory: {
    urbanPlanning, permits, constraints, abf
  },
  locationDescription: {
    general, access, floors
  },
  denormandieSynthesis: {
    menuiseries: { state, recommendation },
    wallInsulation: { state, recommendation },
    roofInsulation: { state, recommendation },
    hotWater: { state, recommendation },
    heating: { state, recommendation }
  },
  familyWorks: Array<{
    code: string,  // FT## (DTC)
    name: string,
    state: string,
    recommendation: string
  }>,
  locations: Array<{
    id, name, type, description, observations
  }>,
  documentTasks: any[],
  sequenceTasks: any[],
  notes: string
}
```

**Sections du Rapport :**
1. Page de garde
2. Description du bâtiment
3. Point réglementaire
4. Description des lieux
5. Synthèse Denormandie
6. Travaux par famille (DTC)
7. Description par lieu
8. Tâches extraites
9. Notes

**Fonctionnalités :**
- ✅ Édition section par section
- ✅ Génération PDF
- ✅ Templates personnalisables
- ✅ Sauvegarde automatique
- ✅ Prévisualisation

**Problèmes Identifiés :**
- ⚠️ Chargement initial peut être lent (beaucoup de données)
- ⚠️ Pas de validation des champs requis
- ⚠️ Génération PDF peut échouer silencieusement

#### B. `generateEDLPDF.ts` (Générateur PDF)

**Responsabilités :**
- Génération PDF à partir du contenu
- Utilise `jsPDF` ou `pdfkit`
- Mise en page professionnelle
- Export téléchargeable

**Problèmes Potentiels :**
- ⚠️ PDF peut être volumineux si beaucoup d'images
- ⚠️ Mise en page peut être cassée sur mobile
- ⚠️ Pas de gestion d'erreur visible

#### C. `TemplateManager.tsx`

**Fonctionnalités :**
- Gestion de templates
- ✅ Création de templates personnalisés
- ✅ Application de templates
- ✅ Sauvegarde de templates

#### D. Edge Functions pour Rapport

**`generate-edl-summary/index.ts`**

**Fonctionnalités :**
- Génération automatique de résumé EDL
- Analyse IA des séquences et tâches
- Création de `edl_reports`

**`myaladin-orchestrator/index.ts`**

**Fonctionnalités :**
- Orchestration de la génération de rapport
- Appels à l'IA pour synthèse
- Structure JSON standardisée

**Problèmes Potentiels :**
- ⚠️ Dépendance à LOVABLE_API_KEY
- ⚠️ Peut échouer si données insuffisantes
- ⚠️ Pas de fallback si IA indisponible

### 2. Flux de Génération de Rapport

```
1. Utilisateur ouvre EDLReportEditorSplitView
   ↓
2. Chargement données projet
   - property_parts, property_locations
   - visit_sequences
   - extracted_tasks
   ↓
3. Génération automatique (optionnelle)
   - Appel generate-edl-summary
   - Analyse IA des données
   - Remplissage sections
   ↓
4. Édition manuelle
   - Modification section par section
   - Ajout observations
   - Classification tâches
   ↓
5. Sauvegarde
   - Mise à jour edl_reports
   ↓
6. Génération PDF
   - Appel generateEDLPDF
   - Export téléchargeable
```

### 3. Intégration avec DTC

**Classification des Tâches :**

Le rapport utilise la nomenclature DTC complète :
- **FT##** : Famille de travaux
- **CT##** : Catégorie
- **SC##** : Sous-catégorie
- **T##** : Tâche (optionnel)

**Section "Travaux par famille" :**

```typescript
familyWorks: Array<{
  code: 'FT01' | 'FT02' | ... | 'FT10',
  name: string,
  state: string,  // État observé
  recommendation: string  // Recommandation travaux
}>
```

**Familles par défaut :**
- FT01 : Gros œuvre
- FT02 : Second œuvre
- FT03 : Menuiseries
- FT04 : Revêtements
- FT05 : Plomberie
- FT06 : Électricité
- FT07 : Chauffage / Ventilation
- FT08 : Toiture
- FT09 : Façade
- FT10 : Autres

**Problèmes Identifiés :**
- ⚠️ Les familles par défaut ne correspondent pas toujours au DTC réel
- ⚠️ Pas de validation que les codes FT## existent dans DTC
- ⚠️ Pas de mapping automatique des tâches extraites vers les familles

---

## 🔄 Flux de Données

### 1. Capture → Séquences

```
ReportageEnhanced
  ↓ (capture)
VisitSequenceRecorder / TextVoiceRecorder
  ↓ (upload)
Supabase Storage (video_url, audio_url)
  ↓ (insert)
visit_sequences {
  project_id,
  location_id,
  zone_type,
  transcription,
  video_url,
  audio_url,
  metadata: {
    recommendations,  // Recommandations utilisateur
    zone_type,
    location_name
  }
}
```

### 2. Séquences → Tâches

```
visit_sequences
  ↓ (traitement IA)
extract-tasks-from-sequences (Edge Function)
  ↓ (analyse)
extracted_tasks {
  project_id,
  title,
  description,
  family_id,      // ID DTC
  category_id,   // ID DTC
  subcategory_id, // ID DTC
  location,
  area,
  priority,
  source_type: 'sequence',
  analysis_metadata: {
    familyCode: 'FT##',
    categoryCode: 'CT##',
    subcategoryCode: 'SC##',
    taskCode: 'T##',
    ...
  }
}
```

### 3. Tâches → Rapport

```
extracted_tasks
  ↓ (agrégation)
EDLReportEditorSplitView
  ↓ (génération)
edl_reports {
  project_id,
  session_id,
  report_json: {
    cover: {...},
    buildingDescription: {...},
    familyWorks: [...],
    locations: [...],
    documentTasks: [...],
    sequenceTasks: [...]
  }
}
```

### 4. Rapport → PDF

```
edl_reports.report_json
  ↓ (génération)
generateEDLPDF()
  ↓ (export)
Blob PDF
  ↓ (téléchargement)
Fichier PDF local
```

---

## ⚠️ Problèmes Identifiés

### 1. Reportage

#### A. Navigation Complexe
- **Problème** : 4 niveaux de navigation (Partie → Lieu → Endroit → Zone)
- **Impact** : Utilisateur peut se perdre
- **Solution** : Ajouter breadcrumbs, raccourcis, historique

#### B. Sauvegarde Non Atomique
- **Problème** : Auto-sauvegarde peut échouer partiellement
- **Impact** : Données perdues
- **Solution** : Transactions, retry, queue offline

#### C. Traitement IA Asynchrone
- **Problème** : Pas de feedback si traitement échoue
- **Impact** : Tâches non extraites silencieusement
- **Solution** : Notifications, statut visible, retry

#### D. Gestion des Erreurs Réseau
- **Problème** : Pas de queue offline robuste
- **Impact** : Données perdues si déconnexion
- **Solution** : IndexedDB, sync automatique

### 2. Rapport

#### A. Chargement Initial Lent
- **Problème** : Beaucoup de requêtes simultanées
- **Impact** : Expérience utilisateur dégradée
- **Solution** : Pagination, lazy loading, cache

#### B. Validation Manquante
- **Problème** : Pas de validation des champs requis
- **Impact** : PDF incomplet ou erroné
- **Solution** : Validation avant génération PDF

#### C. Génération PDF Fragile
- **Problème** : Peut échouer silencieusement
- **Impact** : Utilisateur ne sait pas pourquoi
- **Solution** : Gestion d'erreur, retry, fallback

#### D. Désynchronisation DTC
- **Problème** : Familles par défaut ne correspondent pas au DTC réel
- **Impact** : Classification incorrecte
- **Solution** : Charger familles depuis DTC, validation

### 3. Intégration DTC

#### A. Mapping Incomplet
- **Problème** : `edl-ai-pipeline` ne mappe pas toujours les codes vers IDs
- **Impact** : Tâches sans classification DTC complète
- **Solution** : ✅ Corrigé dans dernière mise à jour

#### B. Validation Manquante
- **Problème** : Pas de vérification que les codes DTC existent
- **Impact** : Codes invalides dans la base
- **Solution** : Validation avant insertion

---

## 🚀 Recommandations d'Amélioration

### 1. Reportage

#### A. Améliorer la Navigation

```typescript
// Ajouter breadcrumbs
<Breadcrumbs>
  <Breadcrumb>Parties communes</Breadcrumb>
  <Breadcrumb>Hall d'entrée</Breadcrumb>
  <Breadcrumb>Sas d'entrée</Breadcrumb>
  <Breadcrumb>Mur</Breadcrumb>
</Breadcrumbs>

// Ajouter raccourcis
<QuickActions>
  <Button>Dernier lieu</Button>
  <Button>Zones fréquentes</Button>
  <Button>Recherche</Button>
</QuickActions>
```

#### B. Améliorer la Sauvegarde

```typescript
// Queue offline avec IndexedDB
const offlineQueue = new OfflineQueue({
  storage: 'indexeddb',
  syncInterval: 5000,
  retryStrategy: 'exponential'
});

// Transactions atomiques
await supabase.rpc('save_sequence_atomic', {
  sequence_data: {...},
  tasks_data: [...]
});
```

#### C. Améliorer le Feedback IA

```typescript
// Statut visible
<AIProcessingStatus>
  <StatusBadge status={aiStatus}>
    {aiStatus === 'processing' && 'Analyse en cours...'}
    {aiStatus === 'error' && 'Erreur: Cliquez pour réessayer'}
    {aiStatus === 'complete' && `${tasksCount} tâches extraites`}
  </StatusBadge>
</AIProcessingStatus>
```

### 2. Rapport

#### A. Optimiser le Chargement

```typescript
// Pagination
const { data, loading } = usePaginatedQuery(
  'visit_sequences',
  { project_id: projectId },
  { pageSize: 20 }
);

// Cache
const cache = new QueryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  strategy: 'stale-while-revalidate'
});
```

#### B. Ajouter Validation

```typescript
// Schéma de validation
const reportSchema = z.object({
  cover: z.object({
    title: z.string().min(1, 'Titre requis'),
    client: z.string().min(1, 'Client requis')
  }),
  familyWorks: z.array(z.object({
    code: z.string().regex(/^FT\d{2}$/, 'Code FT invalide'),
    state: z.string().optional(),
    recommendation: z.string().optional()
  }))
});

// Validation avant génération PDF
const isValid = reportSchema.safeParse(reportContent);
if (!isValid.success) {
  toast.error('Veuillez compléter les champs requis');
  return;
}
```

#### C. Améliorer Génération PDF

```typescript
// Gestion d'erreur robuste
try {
  const pdf = await generateEDLPDF(reportContent);
  setPdfBlob(pdf);
  toast.success('PDF généré avec succès');
} catch (error) {
  console.error('PDF generation error:', error);
  toast.error(`Erreur: ${error.message}. Réessayez.`);
  
  // Fallback: exporter en HTML
  if (error.code === 'PDF_GENERATION_FAILED') {
    exportAsHTML(reportContent);
  }
}
```

### 3. Intégration DTC

#### A. Charger Familles depuis DTC

```typescript
// Charger familles réelles depuis DTC
const { data: dtcFamilies } = await supabase
  .from('ft_familles')
  .select('ft_code, ft_label')
  .order('ft_code');

// Utiliser dans rapport
const familyWorks = dtcFamilies.map(ft => ({
  code: ft.ft_code,
  name: ft.ft_label,
  state: '',
  recommendation: ''
}));
```

#### B. Validation des Codes

```typescript
// Fonction de validation
async function validateDTCCodes(
  familyCode: string,
  categoryCode: string,
  subcategoryCode: string
): Promise<boolean> {
  const { data } = await supabase
    .from('ft_familles')
    .select('id')
    .eq('ft_code', familyCode)
    .single();
  
  if (!data) return false;
  
  const { data: category } = await supabase
    .from('ct_categories')
    .select('id')
    .eq('ct_code', categoryCode)
    .eq('ft_code', familyCode)
    .single();
  
  if (!category) return false;
  
  const { data: subcategory } = await supabase
    .from('sc_sous_categories')
    .select('id')
    .eq('sc_code', subcategoryCode)
    .eq('ct_code', categoryCode)
    .eq('ft_code', familyCode)
    .single();
  
  return !!subcategory;
}
```

### 4. Monitoring et Analytics

```typescript
// Tracking des événements
eventLogger.log({
  category: 'reportage',
  action: 'sequence_saved',
  metadata: {
    location_id,
    zone_type,
    duration,
    has_video: !!video_url,
    has_audio: !!audio_url
  }
});

// Métriques de performance
performance.mark('reportage_start');
// ... opérations
performance.mark('reportage_end');
performance.measure('reportage_duration', 'reportage_start', 'reportage_end');
```

---

## 📊 Métriques Clés à Surveiller

### Reportage
- Temps moyen de capture par séquence
- Taux de réussite de sauvegarde
- Taux d'extraction de tâches
- Temps de traitement IA
- Taux d'erreur réseau

### Rapport
- Temps de chargement initial
- Taux de génération PDF réussie
- Temps de génération PDF
- Taille moyenne des PDF
- Taux de complétion des sections

---

## 🎯 Priorités d'Action

### Priorité 1 (Critique)
1. ✅ Corriger mapping DTC dans `edl-ai-pipeline` (FAIT)
2. ⚠️ Ajouter validation des codes DTC
3. ⚠️ Améliorer gestion d'erreur réseau
4. ⚠️ Ajouter feedback visuel pour traitement IA

### Priorité 2 (Important)
1. Optimiser chargement initial du rapport
2. Ajouter validation avant génération PDF
3. Améliorer navigation reportage (breadcrumbs)
4. Ajouter queue offline robuste

### Priorité 3 (Amélioration)
1. Analytics et monitoring
2. Templates personnalisés avancés
3. Export multiples formats (HTML, DOCX)
4. Collaboration multi-utilisateurs

---

## 📝 Conclusion

Le système de reportage et rapport est **fonctionnel mais peut être amélioré** sur plusieurs aspects :

**Points Forts :**
- ✅ Architecture modulaire et extensible
- ✅ Intégration DTC complète (après corrections)
- ✅ Interface utilisateur intuitive
- ✅ Auto-sauvegarde et compression adaptative

**Points à Améliorer :**
- ⚠️ Gestion d'erreur et feedback utilisateur
- ⚠️ Performance et optimisation
- ⚠️ Validation et intégrité des données
- ⚠️ Monitoring et analytics

Les corrections récentes sur le mapping DTC sont un bon pas en avant. Les prochaines étapes devraient se concentrer sur la robustesse et l'expérience utilisateur.
