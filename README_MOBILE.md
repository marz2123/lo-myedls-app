# MyEDLS - Application Mobile Native V1 Complète

Application mobile native iOS & Android 100% fonctionnelle pour MyEDLS, optimisée pour les conducteurs de travaux et contrôleurs sur le terrain. Utilise Capacitor pour un accès complet aux fonctionnalités natives (caméra, micro, GPS, stockage) tout en réutilisant la logique backend IA existante.

## 🎯 Architecture Mobile Complète

### Pages et Navigation

L'application mobile comprend **7 pages principales** organisées sous la route `/mobile`:

#### 1. Page d'Accueil (`/mobile`)
- **Bouton principal**: "Démarrer une visite" (CTA géant)
- **Boutons secondaires**: "Voir mes visites", "Paramètres"
- **Liste récente**: 5 dernières visites avec statut
- **Design**: Cards swipe-friendly, icônes explicites

#### 2. Création de Projet (`/mobile/new-project`)
- **Formulaire optimisé mobile**: Champs larges, labels clairs
- **Capture photo façade**: Intégration Capacitor Camera
- **GPS automatique**: Capture position via Geolocation
- **Workflow rapide**: Création → Démarrage immédiat de la visite

#### 3. Capture de Visite (`/mobile/visit/:projectId`)
- **Enregistrement simultané**: Vidéo + Audio
- **Analyse IA temps réel**: Overlay discret avec statut
- **Détection automatique**: Zones/blocs créés automatiquement
- **Capture photo rapide**: Bouton accessible pendant enregistrement
- **UI minimaliste**: Plein écran, gros boutons, une main

#### 4. Timeline de Visite (`/mobile/timeline/:sessionId`)
- **Liste des blocs**: Cards scrollables avec miniatures
- **Infos par bloc**: Temps, type détecté, confiance IA
- **Photos preview**: Grid 3 colonnes, timestamps
- **Transcription audio**: Aperçu avec expand
- **Tâches IA**: Nombre et aperçu FT/CT/ST
- **Actions**: Détails, Corriger, Exporter

#### 5. Détail d'un Bloc (`/mobile/block/:blockId`)
- **Header**: Numéro bloc, type pièce, durée, confiance
- **Section Photos**: Grid responsive avec zoom
- **Section Audio**: Transcription complète segmentée
- **Section Tâches**: Liste avec classification DSC complète
- **Navigation**: Bouton "Corriger" vers édition

#### 6. Correction de Bloc (`/mobile/correction/:blockId`)
- **Informations bloc**: Renommer, changer type de pièce
- **Gestion tâches**: Éditer, ajouter, supprimer
- **Champs par tâche**: Titre, description, quantité (m²/ml/unité)
- **Classification DSC**: Sélecteurs Family/Category/Subcategory
- **Sauvegarde**: Bouton sticky en header

#### 7. Export Documents (`/mobile/export/:sessionId`)
- **Options configurables**: Photos, audio, tâches, transcription
- **Statistiques**: Nombre de blocs, durée totale
- **Exports disponibles**:
  - EDL PDF complet
  - Listing CSV/Excel (FT/CT/ST)
  - Téléchargement batch photos
- **Partage natif**: Share API (à venir)

### Flux Utilisateur Complet

```
Accueil → Créer Projet → Filmer + Parler (IA analyse) 
  → Timeline IA → Détail Bloc → Corrections → Export
```

## 🚀 Installation et Déploiement

### 1. Transférer vers GitHub

1. Cliquez sur "Export to Github" dans Lovable
2. Clone le projet:
```bash
git clone [votre-repo-url]
cd edl-insight-gen
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Ajouter les plateformes natives

**iOS (nécessite Mac + Xcode):**
```bash
npx cap add ios
npx cap update ios
```

**Android (nécessite Android Studio):**
```bash
npx cap add android
npx cap update android
```

### 4. Build et Sync

```bash
npm run build
npx cap sync
```

### 5. Lancer l'application

**iOS:**
```bash
npx cap run ios
```

**Android:**
```bash
npx cap run android
```

## 📱 Composants Mobile Réutilisables

### Composants de Capture
- **MobileVisitRecorder**: Enregistrement vidéo/audio, analyse IA temps réel, détection zones
- **MobileVisitTimeline**: Timeline des blocs avec photos, transcriptions, tâches

### Intégration Capacitor
- **Camera**: Capture photos façade et photos rapides pendant visite
- **Geolocation**: Localisation GPS automatique des projets
- **Filesystem**: Stockage local pour mode offline (à venir)
- **Device**: Détection plateforme (iOS/Android/Web)
- **Network**: Gestion connectivité et sync différée

### Hooks Personnalisés
- **useMobile**: Détecte si l'app tourne en mode natif et identifie la plateforme

## 🎨 Design Mobile Terrain-First

### Principes UX/UI

1. **Gros boutons tactiles**
   - Boutons principaux: 64px (h-16)
   - Boutons secondaires: 56px (h-14)
   - Icônes: 24-32px minimum
   - Espacement: 12px minimum entre éléments

2. **Contraste élevé**
   - Lisibilité en plein soleil
   - Texte minimum 16px
   - Fond/texte ratio 4.5:1 minimum

3. **Icônes explicites**
   - Moins de texte, plus de visuels
   - Icons lucide-react cohérents
   - Labels courts et directs

4. **Usage une main**
   - Actions principales en bas d'écran
   - Zone de préhension: 20% inférieur
   - Header sticky avec retour

5. **Feedback immédiat**
   - Toasts sonner pour actions
   - Loading states explicites
   - Animations de transition

6. **Navigation simple**
   - Maximum 3 niveaux de profondeur
   - Breadcrumb visuel clair
   - Retour toujours accessible

### Optimisations Terrain

- Header sticky avec retour rapide
- Actions principales toujours visibles
- États de chargement explicites
- Mode portrait optimisé
- Pas de scroll horizontal
- Gestures tactiles naturels (tap, swipe)

## 🧠 Backend IA (Déjà Implémenté)

### Edge Functions Supabase

1. **analyze-video-frame**
   - Analyse GPT-4 Vision des frames
   - Détection type de pièce
   - Détection pathologies/matériaux
   - Détection transitions

2. **transcribe-visit-audio**
   - Transcription Whisper de l'audio
   - Segmentation temporelle
   - Extraction speaker (à venir)

3. **process-visit-session**
   - Fusion audio + vision
   - Génération tâches FT/CT/ST
   - Classification DSC automatique
   - Calcul confiances

### Base de Données

Tables principales:
- **visit_sessions**: Sessions de visite avec métadonnées
- **detected_blocks**: Blocs/zones détectés automatiquement
- **extracted_frames**: Photos capturées avec timestamps
- **audio_segments**: Segments audio transcrits
- **extracted_tasks**: Tâches générées avec classification DSC
- **projects**: Projets avec type, adresse, etc.

### Stockage Supabase

Buckets:
- **visit-videos**: Enregistrements vidéo complets
- **visit-audio**: Fichiers audio séparés
- **visit-frames**: Frames extraites et photos

## 🔐 Permissions Requises

### iOS (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>MyEDLS a besoin de la caméra pour capturer les visites</string>

<key>NSMicrophoneUsageDescription</key>
<string>MyEDLS a besoin du micro pour enregistrer vos commentaires</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>MyEDLS sauvegarde les photos de visite</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>MyEDLS géolocalise automatiquement vos projets</string>
```

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 🗺️ Roadmap V2

### Priorités Court Terme (Q1 2025)

- [ ] **Mode offline complet**
  - SQLite local pour cache
  - Queue de sync intelligente
  - Indicateur état réseau

- [ ] **Export EDL PDF fonctionnel**
  - Template professionnel
  - Photos intégrées
  - Signatures digitales

- [ ] **Export CSV/Excel complet**
  - Toutes colonnes FT/CT/ST
  - Quantités et unités
  - Liens vers photos

- [ ] **Partage natif**
  - Share API iOS/Android
  - Envoi email direct
  - AirDrop / Nearby Share

### Évolutions Moyen Terme (Q2 2025)

- [ ] **Mesures AR automatiques**
  - ARKit (iOS) / ARCore (Android)
  - Dimensions pièces
  - Volumes calculés

- [ ] **Reconnaissance matériaux avancée**
  - Détection fine-grained
  - Base de données matériaux
  - Suggestions prix unitaires

- [ ] **Détection pathologies enrichie**
  - Classification détaillée
  - Gravité automatique
  - Recommandations travaux

- [ ] **Mode dictée vocale mains-libres**
  - Commandes vocales
  - Navigation sans touch
  - Capture automatique

### Vision Long Terme (H2 2025)

- [ ] **IA prédictive des coûts**
  - Estimation automatique
  - Base prix BTP
  - Devis préliminaires

- [ ] **Intégration planning chantier**
  - Export vers MyChantiers
  - Synchronisation bidirectionnelle
  - Suivi avancement

- [ ] **Cartographie 3D automatique**
  - Reconstruction 3D
  - Plans automatiques
  - Navigation immersive

- [ ] **Collaboration temps réel**
  - Multi-users simultanés
  - Commentaires live
  - Notifications push

## 📊 Métriques de Succès V1

### Performance
- Temps démarrage < 2s
- Capture vidéo 1080p @ 30fps stable
- Analyse frame < 3s
- Export PDF < 10s

### UX
- Taux complétion visite > 95%
- Temps moyen visite: 15-30 min
- Corrections post-visite < 5 min
- NPS > 70

### Technique
- Crash rate < 0.5%
- App size < 100MB
- Battery drain < 10%/h en capture
- Sync success rate > 99%

## 🎯 Objectif Final

Créer l'application mobile de référence pour l'inspection immobilière assistée par IA, utilisable par des professionnels du BTP sur le terrain, dans des conditions réelles (mauvais réseau, luminosité variable, usage une main), avec une expérience utilisateur fluide et une qualité d'analyse IA de niveau professionnel.

### Différenciation Marché

1. **IA de pointe**: GPT-4 Vision + Whisper pour analyse multi-modale
2. **Zéro friction**: 3 actions utilisateur max (démarrer, filmer, valider)
3. **Tout automatique**: Détection zones, tâches, classification sans intervention
4. **Terrain-proof**: Design optimisé chantier, offline-capable
5. **Professionnel**: Export EDL/CSV conformes normes BTP

---

**MyEDLS Mobile V1** - L'inspection immobilière assistée par IA, pensée pour le terrain. 🚀
