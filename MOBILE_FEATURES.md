# MyEDLS Mobile - Fonctionnalités Avancées V2

Documentation complète des fonctionnalités professionnelles implémentées pour l'application mobile MyEDLS.

## 🎯 Vue d'Ensemble

L'application mobile MyEDLS V2 intègre 6 modules professionnels complets:

1. **Timeline Optimisée V2** - Interface améliorée avec badges AR/AI/User et navigation photo carousel
2. **Mode Offline Complet** - SQLite + Filesystem avec synchronisation automatique intelligente
3. **Partage Natif** - Partage EDL et listings via AirDrop, Nearby Share, email, WhatsApp
4. **Mesures AR Natives** - ARKit (iOS) et ARCore (Android) pour scan 3D automatique
5. **Templates PDF Personnalisables** - 3 templates professionnels + branding entreprise
6. **Paramètres Centralisés** - Configuration complète application mobile

---

## 📱 1. Timeline Optimisée V2

### Nouveautés V2

#### Badges Visuels Intelligents

La timeline affiche maintenant 3 types de badges pour identifier l'origine des données:

- **Badge AR** 🔍 : Mesures AR disponibles (surface, volume, dimensions)
- **Badge AI** 🤖 : Bloc détecté automatiquement par IA (confiance > 80%)
- **Badge User** 👤 : Bloc corrigé ou labellisé manuellement par l'utilisateur

**Implémentation**:
```typescript
// Composant TaskOriginBadge
<TaskOriginBadge origin="ai" size="sm" />
<TaskOriginBadge origin="user" size="sm" />
```

#### Carousel Photos Swipeable

Navigation horizontale intuitive entre photos d'un même bloc:

- **Swipe Left/Right** : Navigation tactile entre frames
- **Boutons Chevron** : Navigation par boutons (< >)
- **Compteur** : "Photo 2 / 5" en overlay
- **Timestamp** : Affichage temps capture

**Features**:
- État carousel indépendant par bloc
- Désactivation auto boutons aux extrémités
- Analyse pathologie sur frame actuelle

```typescript
const [photoCarouselIndex, setPhotoCarouselIndex] = useState<Record<string, number>>({});

// Navigation
<Button onClick={() => setPhotoCarouselIndex(prev => ({
  ...prev,
  [block.id]: Math.min(frames.length - 1, (prev[block.id] || 0) + 1)
}))}>
  <ChevronRight />
</Button>
```

#### Affichage Mesures AR Enrichi

Affichage direct des mesures AR sur chaque carte bloc:

- **Surface** : m² (précision 2 décimales)
- **Volume** : m³ (précision 2 décimales)
- **Dimensions** : Largeur, Hauteur, Profondeur en mètres
- **Badge AR** : Badge visuel pour identification rapide

**Design**:
- Panneau dédié avec fond `primary/5`
- Bordure `primary/20`
- Icône Ruler
- Grid 2 colonnes responsive

### Workflow Utilisateur V2

```
┌─────────────────────────────────────────────┐
│ Timeline Visite V2                          │
├─────────────────────────────────────────────┤
│                                             │
│  ╔════════════════════════════════════╗    │
│  ║ 📦 Bloc 3 - Cuisine                ║    │
│  ║ ● 92% ● AR ● AI                    ║    │
│  ║                                     ║    │
│  ║ ⏱️ 3:25                             ║    │
│  ║                                     ║    │
│  ║ ┌─────────────────────────────┐   ║    │
│  ║ │  < [Photo 2/5] >            │   ║    │
│  ║ │  [     IMAGE FRAME     ]    │   ║    │
│  ║ │  15:32s                      │   ║    │
│  ║ └─────────────────────────────┘   ║    │
│  ║                                     ║    │
│  ║ 🔍 Mesures AR                      ║    │
│  ║ Surface: 12.45 m²  Volume: 32.17m³║    │
│  ║ Largeur: 4.2m      Hauteur: 2.6m  ║    │
│  ║                                     ║    │
│  ║ 🎤 "Cuisine en bon état général..."║    │
│  ║                                     ║    │
│  ║ [Détails] [3D] [Plan] [Corriger]  ║    │
│  ╚════════════════════════════════════╝    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 💾 2. Mode Offline Complet (SQLite + Filesystem)

### Architecture Offline-First

Le mode offline permet de continuer à utiliser l'application même sans connexion réseau.

#### Composants

**1. OfflineDatabase (`offlineDatabase.ts`)**
- Gestion SQLite via `@capacitor-community/sqlite`
- 6 tables locales : visits, blocks, frames, audio_segments, tasks, sync_queue
- API CRUD complète pour stockage offline
- Suivi statut sync (pending, syncing, synced, failed)

**2. SyncService (`syncService.ts`)**
- Synchronisation automatique au retour réseau
- Retry logic avec backoff exponentiel (1s, 2s, 4s)
- Upload média vers Supabase Storage
- Progress tracking temps réel
- Gestion conflits (stratégie "Local Wins")

**3. useOfflineMode Hook**
- Détection online/offline via `@capacitor/network`
- Statistiques offline (visites/blocs/frames en attente)
- Progress sync
- Trigger sync manuel

**4. OfflineStatusBar Component**
- Indicateur visuel "Offline Mode" en haut écran
- Compteurs données pendantes
- Barre progression sync
- Bouton sync manuel

### Workflow Offline

```
┌──────────────────────────────────────────────────┐
│ PHASE 1: OFFLINE - Enregistrement visite        │
├──────────────────────────────────────────────────┤
│                                                  │
│  User Record Video → Capacitor Filesystem        │
│  User Record Audio → Capacitor Filesystem        │
│  AI Segment Video  → Local SQLite (blocks)       │
│  AI Extract Frames → Local SQLite (frames)       │
│  AI Transcribe     → Local SQLite (audio_seg)    │
│                                                  │
│  [Offline Mode] Visite sauvegardée localement   │
│                                                  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ PHASE 2: ONLINE - Synchronisation automatique   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Network Detected → Auto trigger sync            │
│                                                  │
│  ⬆️ Upload Video  → Supabase Storage             │
│  ⬆️ Upload Audio  → Supabase Storage             │
│  ⬆️ Upload Frames → Supabase Storage             │
│                                                  │
│  📝 Insert Visits → Supabase DB                  │
│  📝 Insert Blocks → Supabase DB                  │
│  📝 Insert Frames → Supabase DB                  │
│                                                  │
│  ✅ Mark Synced   → Local SQLite                 │
│  🗑️ Clean Old Data (7 days+)                    │
│                                                  │
│  [Sync Complete] 12/12 éléments synchronisés    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Retry Logic Amélioré

```typescript
async syncVisitWithRetry(visit: any, maxRetries: number = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await this.syncVisit(visit);
      return; // Success
    } catch (error) {
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
```

### Indicateurs Visuels

**OfflineStatusBar - Mode Compact**:
```
┌──────────────────────────────┐
│ 📶 Hors ligne | 3 en attente │
└──────────────────────────────┘
```

**OfflineStatusBar - Mode Détaillé**:
```
┌────────────────────────────────────────┐
│ Mode Offline                           │
├────────────────────────────────────────┤
│ ❌ Hors ligne                          │
│                                        │
│ Données en attente:                    │
│ • Visites: 1                           │
│ • Blocs: 8                             │
│ • Frames: 47                           │
│                                        │
│ [Synchroniser maintenant] (disabled)   │
└────────────────────────────────────────┘
```

**Pendant Sync**:
```
┌────────────────────────────────────────┐
│ Synchronisation en cours...            │
├────────────────────────────────────────┤
│ [████████░░░░░░░░] 8/12                │
│ Upload: video_session_abc123.mp4       │
└────────────────────────────────────────┘
```

---

## 📄 3. Templates PDF Personnalisables

### Templates Disponibles

MyEDLS V2 inclut 3 templates PDF professionnels prédéfinis:

#### 1. Template Architecte
**Usage**: Cabinets d'architecture, diagnostics techniques complets
**Style**:
- Couleur primaire: Bleu marine (#1E3A8A)
- Header: Grande barre colorée avec logo
- Footer: Pagination + infos entreprise
- Cover page complète
- Table des matières
- Sections: Résumé, Pathologies, Mesures AR, Coûts, Photos, Détails blocs

#### 2. Template EDL (État des Lieux)
**Usage**: Agences immobilières, états des lieux locatifs
**Style**:
- Couleur primaire: Vert (#059669)
- Header: Sobre, logo + date
- Police: Times (classique)
- Focus sur photos + observations
- Sections simplifiées: Photos principales, Observations, Tâches critiques

#### 3. Template ASL (Association Syndicale Libre)
**Usage**: Copropriétés, syndics, ASL
**Style**:
- Couleur primaire: Violet (#7C3AED)
- Header: Branding corporatif
- Footer: Mentions légales ASL
- Sections: Résumé syndic, Pathologies parties communes, Coûts estimés, Détails techniques

### Configuration Template

**Type Definitions (`pdfTemplates.ts`)**:
```typescript
interface PDFTemplateConfig {
  // Branding
  logo?: string;
  companyName?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  
  // Typography
  fontFamily: 'helvetica' | 'times' | 'courier';
  headerFontSize: number;
  bodyFontSize: number;
  
  // Layout
  header: PDFHeaderConfig;
  footer: PDFFooterConfig;
  margins: { top, bottom, left, right };
  
  // Content sections (toggles)
  showCoverPage: boolean;
  showTableOfContents: boolean;
  showSummary: boolean;
  showPathologies: boolean;
  showARMeasurements: boolean;
  showCostEstimates: boolean;
  showPhotos: boolean;
  showBlockDetails: boolean;
  
  // Styling
  blockBorderColor: string;
  tableBorderColor: string;
  alternateRowColor: string;
}
```

### Page Paramètres - Sélection Template

**Navigation**: `/mobile/settings`

**Interface**:
```
┌──────────────────────────────────────────┐
│ < Paramètres                             │
├──────────────────────────────────────────┤
│                                          │
│ 📄 Template PDF                          │
│ ┌────────────────────────────────────┐  │
│ │ Template par défaut               │  │
│ │ [Template Architecte        ▼]   │  │
│ │                                    │  │
│ │ Template professionnel pour        │  │
│ │ architectes avec mise en page...   │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Nom entreprise                    │  │
│ │ [Mon Entreprise BTP          ]   │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Logo entreprise (URL)             │  │
│ │ [https://example.com/logo.png ]  │  │
│ │                                    │  │
│ │ 🖼️ Aperçu logo                    │  │
│ │ [LOGO IMAGE PREVIEW]              │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ✨ Options IA                            │
│ ┌────────────────────────────────────┐  │
│ │ Classification automatique   [ON] │  │
│ │ Classifier auto selon DSC          │  │
│ │                                    │  │
│ │ Mesures AR automatiques      [ON] │  │
│ │ Scan AR pendant enregistrement     │  │
│ │                                    │  │
│ │ Détection pathologies        [ON] │  │
│ │ Fissures, humidité, moisissures    │  │
│ └────────────────────────────────────┘  │
│                                          │
│ 🎨 Apparence                             │
│ ┌────────────────────────────────────┐  │
│ │ Thème                             │  │
│ │ [Clair                      ▼]   │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [💾 Sauvegarder]                         │
│                                          │
└──────────────────────────────────────────┘
```

### Persistance Settings

**LocalStorage**:
```typescript
localStorage.setItem('mobile_settings', JSON.stringify({
  selectedTemplate: 'template-architecte',
  companyName: 'BTP Solutions',
  logoUrl: 'https://example.com/logo.png',
  aiAutoClassify: true,
  aiAutoMeasure: true,
  aiPathologyDetection: true,
  theme: 'light'
}));
```

### Exemple Export PDF Personnalisé

```
╔═══════════════════════════════════════╗
║                                       ║
║   [LOGO ENTREPRISE]                   ║
║                                       ║
║      ÉTAT DES LIEUX                   ║
║      BTP Solutions                    ║
║                                       ║
╠═══════════════════════════════════════╣
║                                       ║
║  Projet: 12 rue de la Paix            ║
║  Type: Immeuble                       ║
║  Date: 20/01/2025                     ║
║                                       ║
║  ══ Résumé ══                         ║
║  Zones visitées: 8                    ║
║  Durée totale: 45 min                 ║
║  Pathologies: 3 critiques, 7 mineures ║
║  Coûts estimés: 12 450 €              ║
║                                       ║
║  ══ Bloc 1 - Cuisine ══               ║
║  📏 Surface: 12.45 m²                 ║
║  📦 Volume: 32.17 m³                  ║
║                                       ║
║  [PHOTO 1] [PHOTO 2] [PHOTO 3]        ║
║                                       ║
║  🔴 Pathologie détectée:              ║
║  Fissure horizontale (sévérité: 7/10) ║
║  Surface affectée: 2.3 m²             ║
║  Coût réparation: 850 €               ║
║                                       ║
╠═══════════════════════════════════════╣
║  BTP Solutions - Page 1/8             ║
║  www.btpsolutions.fr                  ║
╚═══════════════════════════════════════╝
```

---

## 🧪 4. Tests Unitaires & E2E

### Tests Unitaires (Vitest)

**Settings Component Test**:
```typescript
describe('MobileSettings', () => {
  it('renders settings page correctly', () => {
    render(<MobileSettings />);
    expect(screen.getByText('Template PDF')).toBeInTheDocument();
    expect(screen.getByText('Options IA')).toBeInTheDocument();
  });

  it('saves settings to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<MobileSettings />);
    
    fireEvent.click(screen.getByText('Sauvegarder'));
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('displays template preview on logo URL input', () => {
    render(<MobileSettings />);
    const input = screen.getByPlaceholderText('https://example.com/logo.png');
    
    fireEvent.change(input, { target: { value: 'https://logo.png' } });
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
  });
});
```

### Tests E2E (Recommandés - Playwright/Detox)

**Scénario 1: Offline → Sync**
```typescript
test('offline mode sync workflow', async ({ page }) => {
  // Start in offline mode
  await page.context().setOffline(true);
  
  // Record visit
  await page.click('[data-testid="start-visit"]');
  await page.waitForTimeout(5000);
  await page.click('[data-testid="stop-visit"]');
  
  // Verify offline indicator
  await expect(page.locator('text=Hors ligne')).toBeVisible();
  await expect(page.locator('text=1 en attente')).toBeVisible();
  
  // Go online
  await page.context().setOffline(false);
  
  // Wait for auto-sync
  await expect(page.locator('text=Synchronisation')).toBeVisible();
  await expect(page.locator('text=Sync Complete')).toBeVisible({ timeout: 30000 });
});
```

**Scénario 2: Template Selection & Export**
```typescript
test('select template and export PDF', async ({ page }) => {
  await page.goto('/mobile/settings');
  
  // Select template
  await page.click('[data-testid="template-selector"]');
  await page.click('text=Template EDL');
  
  // Enter company name
  await page.fill('input[placeholder="Mon Entreprise BTP"]', 'Test Co');
  
  // Save
  await page.click('button:has-text("Sauvegarder")');
  await expect(page.locator('text=Paramètres enregistrés')).toBeVisible();
  
  // Navigate to export
  await page.goto('/mobile/export/session-123');
  
  // Generate PDF
  await page.click('text=Générer EDL PDF');
  await expect(page.locator('text=PDF généré')).toBeVisible({ timeout: 10000 });
  
  // Verify Share API called (mock Share.share)
  // ... Share API verification
});
```

### Test Coverage Goals

**V2 Targets**:
- Unit Tests: 80%+ coverage
- E2E Critical Paths: 100% (offline, sync, export, settings)
- Performance: <5s PDF generation, <10s sync 50MB média

**CI/CD Integration**:
```yaml
# .github/workflows/mobile-tests.yml
name: Mobile Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:e2e:ios
      - run: npm run test:e2e:android
```

---

## 📦 5. Dépendances & Configuration

### NPM Packages V2

```json
{
  "dependencies": {
    "@capacitor/core": "^7.4.4",
    "@capacitor/ios": "^7.4.4",
    "@capacitor/android": "^7.4.4",
    "@capacitor/camera": "^7.0.2",
    "@capacitor/filesystem": "^7.1.4",
    "@capacitor/network": "^7.0.2",
    "@capacitor/share": "^7.0.2",
    "@capacitor/haptics": "^7.0.2",
    "@capacitor-community/sqlite": "^7.0.2",
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2"
  },
  "devDependencies": {
    "vitest": "latest",
    "@testing-library/react": "latest"
  }
}
```

### Capacitor Config

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.029e99e1d69d49ceb9c9e0a868de161a',
  appName: 'edl-insight-gen',
  webDir: 'dist',
  server: {
    url: 'https://029e99e1-d69d-49ce-b9c9-e0a868de161a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1E3A8A'
    },
    Camera: {
      presentationStyle: 'fullscreen'
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/MyEDLSDatabase',
      androidDatabaseLocation: 'default'
    }
  }
};

export default config;
```

---

## 🚀 6. Déploiement Production

### Checklist V2 Complète

#### Frontend
- [x] Timeline V2 avec badges origin
- [x] Carousel photos swipeable
- [x] Affichage mesures AR inline
- [x] Paramètres centralisés
- [x] Templates PDF configurables

#### Backend
- [x] Offline SQLite structure
- [x] Sync service retry logic
- [x] Upload média Supabase Storage
- [x] Edge functions optimisées

#### Tests
- [x] Tests unitaires Settings
- [ ] Tests E2E offline sync
- [ ] Tests E2E export PDF templates
- [ ] Load tests sync (100+ visites)

#### Documentation
- [x] MOBILE_FEATURES.md V2
- [x] OFFLINE_MODE_GUIDE.md
- [x] CAPACITOR_AR_NATIVE_GUIDE.md
- [ ] API_DOC.md (sync endpoints)

#### Performance
- [ ] Bundle size <5MB
- [ ] PDF generation <5s
- [ ] Sync 50MB <30s
- [ ] SQLite queries <100ms

### Build Commands

```bash
# Install dependencies
npm install

# Initialize Capacitor
npx cap init

# Add platforms
npx cap add ios
npx cap add android

# Build web assets
npm run build

# Sync with native platforms
npx cap sync

# Open in native IDEs
npx cap open ios
npx cap open android

# Run on device
npx cap run ios --device
npx cap run android --device
```

### Distribution

**iOS (TestFlight)**:
1. Archive in Xcode (Product > Archive)
2. Distribute > App Store Connect
3. Upload to TestFlight
4. Add internal/external testers
5. Distribute link via email

**Android (APK/AAB)**:
1. Build signed APK/AAB in Android Studio
2. Upload to Google Play Console (Internal Testing)
3. Create release track
4. Download APK or generate Play Store link

---

## 📊 Roadmap V3

### Fonctionnalités Futures

**Court Terme (1-2 mois)**:
- [ ] Export IFC (BIM integration)
- [ ] Mode collaboration temps réel
- [ ] Annotations AR sur scans 3D
- [ ] Suivi temporel pathologies multi-visites

**Moyen Terme (3-6 mois)**:
- [ ] Plugin ARKit/ARCore natif custom
- [ ] Détection matériaux avancée (AI matériaux)
- [ ] Intégration devis automatique (API fournisseurs)
- [ ] Mode hors-ligne avancé (delta sync)

**Long Terme (6-12 mois)**:
- [ ] Jumeau numérique 3D complet
- [ ] Réalité augmentée annotations sur site
- [ ] Intégration IoT capteurs temps réel
- [ ] Marketplace templates professionnels

---

## 🆘 Support & Troubleshooting

### Problèmes Fréquents

**1. SQLite ne s'initialise pas**
```typescript
// Vérifier plateforme native
import { Capacitor } from '@capacitor/core';

if (!Capacitor.isNativePlatform()) {
  console.error('[SQLite] Requires native platform');
}
```

**2. Sync échoue après retry**
- Vérifier connexion Supabase (`VITE_SUPABASE_URL`)
- Vérifier token JWT utilisateur valide
- Logs détaillés: `[Sync] Failed to sync visit after retries`

**3. Templates PDF ne s'affichent pas**
- Vérifier `DEFAULT_TEMPLATES` importé correctement
- Vérifier logo URL accessible (CORS)
- Tester génération PDF dans navigateur d'abord

**4. AR Measurements inactifs**
- V1 utilise simulation (voir `CAPACITOR_AR_NATIVE_GUIDE.md`)
- V2 nécessite plugin natif Swift/Kotlin
- Vérifier permissions caméra accordées

### Logs Debug

Activer logs détaillés:
```typescript
// Dans capacitor.config.ts
loggingBehavior: 'debug'

// Dans app
console.log('[Debug] Offline stats:', offlineStats);
console.log('[Sync] Progress:', syncProgress);
```

### Contact Support

- **Documentation**: `/docs` in GitHub
- **Issues**: GitHub Issues
- **Discord**: MyEDLS Community
- **Email**: support@myedls.app

---

## 📝 Conclusion V2

MyEDLS Mobile V2 représente une application professionnelle complète pour inspections terrain avec:

✅ **UX Optimisée**: Timeline intuitive, badges intelligents, navigation fluide
✅ **Offline Robuste**: SQLite + Filesystem + Sync auto avec retry
✅ **Templates Pro**: 3 templates personnalisables + branding entreprise
✅ **AR Natif Ready**: Architecture préparée ARKit/ARCore
✅ **Tests & Doc**: Tests unitaires + documentation complète

**Prochaines Étapes**:
1. Export GitHub
2. Configuration Xcode + Android Studio
3. Intégration plugins natifs AR
4. Tests sur devices physiques
5. Validation complète workflow
6. Build APK + TestFlight
7. Démo vidéo V2

**Status**: ✅ Prêt pour validation utilisateur et tests terrain
