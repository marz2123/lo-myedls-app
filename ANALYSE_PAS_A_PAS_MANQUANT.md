# 🔍 Analyse - Flux "Pas à pas" - Éléments Manquants

**Date:** 8 janvier 2026  
**Comparaison:** MyHome CaptureWizard vs App Mobile PremiumCaptureFlow

---

## 📊 Comparaison des Étapes

### MyHome - CaptureWizard (5 étapes)

| Étape | Nom | Description | Statut App Mobile |
|-------|-----|-------------|-------------------|
| 1 | **StepProjectSelect** | Sélection projet + **Type d'EDL** | ❌ **MANQUANT** |
| 2 | **StepCaptureMode** | Choix mode (vidéo ou photos+voix) | ❌ **MANQUANT** |
| 3 | **StepRecording** | Enregistrement vidéo/audio | ⚠️ **PARTIEL** |
| 4 | **StepAIProcessing** | Traitement IA avec progrès | ❌ **MANQUANT** |
| 5 | **StepReview** | Révision tâches extraites | ❌ **MANQUANT** |

### App Mobile - PremiumCaptureFlow (3 étapes)

| Étape | Nom | Description | Statut |
|-------|-----|-------------|--------|
| 1 | **Location** | Sélection lieu + zone | ✅ Présent |
| 2 | **Capture** | Description + médias | ✅ Présent |
| 3 | **Validate** | Création séquence | ✅ Présent |

---

## ❌ Éléments Manquants Identifiés

### 1. Sélection du Type d'EDL ❌

**Dans MyHome:**
- `StepProjectSelect` permet de choisir :
  - Le projet
  - **Le type d'EDL** : `avant_travaux`, `apres_travaux`, `location_entree`, `location_sortie`
  - Notes optionnelles

**Dans App Mobile:**
- ❌ Pas de sélection du type d'EDL
- ❌ Le champ `edl_type` n'est pas utilisé dans `visit_sequences`

**Impact:** Les séquences ne sont pas catégorisées par type d'EDL.

---

### 2. Choix du Mode de Capture ❌

**Dans MyHome:**
- `StepCaptureMode` permet de choisir :
  - `video_walkthrough` : Parcours vidéo complet
  - `photos_voice` : Photos + notes vocales

**Dans App Mobile:**
- ❌ Pas de choix de mode
- ⚠️ Le mode est fixe (pas à pas = photos + description)

**Impact:** L'utilisateur ne peut pas choisir entre vidéo complète ou photos+voix.

---

### 3. Étape de Traitement IA ❌

**Dans MyHome:**
- `StepAIProcessing` affiche :
  - Progrès du traitement (0-100%)
  - Étapes : Découpage vidéo, Transcription, Analyse visuelle, Extraction tâches
  - Modèles utilisés : Gemini 2.5, Whisper-1, GPT-4 Vision, GPT-4.1
  - Feedback visuel en temps réel

**Dans App Mobile:**
- ❌ Pas d'étape de traitement IA visible
- ⚠️ L'extraction IA est déclenchée en arrière-plan sans feedback

**Impact:** L'utilisateur ne voit pas le progrès du traitement IA.

---

### 4. Étape de Révision ❌

**Dans MyHome:**
- `StepReview` permet :
  - Voir toutes les tâches extraites
  - Éditer les tâches (titre, description, localisation, priorité)
  - Supprimer des tâches
  - Voir le résumé EDL
  - Valider ou sauvegarder en brouillon

**Dans App Mobile:**
- ❌ Pas d'étape de révision
- ⚠️ Les tâches sont créées automatiquement sans validation

**Impact:** L'utilisateur ne peut pas corriger/valider les tâches avant enregistrement.

---

## 🔧 Corrections Nécessaires

### 1. Ajouter Sélection Type d'EDL

**À Ajouter:**
- Étape avant "Location" pour sélectionner le type d'EDL
- Sauvegarder `edl_type` dans `visit_sequences` (si champ existe) ou dans `metadata`

**Fichier:** `src/components/capture/PremiumCaptureFlow.tsx`

---

### 2. Ajouter Choix Mode de Capture

**À Ajouter:**
- Étape après sélection type d'EDL
- Permettre choix entre "Pas à pas" (actuel) et "Vidéo complète"

**Fichier:** `src/components/capture/PremiumCaptureFlow.tsx`

---

### 3. Ajouter Étape Traitement IA

**À Ajouter:**
- Étape après capture
- Afficher progrès du traitement IA
- Utiliser `StepAIProcessing` existant ou créer équivalent

**Fichier:** `src/components/capture/PremiumCaptureFlow.tsx` + `StepAIProcessing.tsx`

---

### 4. Ajouter Étape Révision

**À Ajouter:**
- Étape après traitement IA
- Afficher tâches extraites
- Permettre édition/suppression
- Utiliser `StepReview` existant ou créer équivalent

**Fichier:** `src/components/capture/PremiumCaptureFlow.tsx` + `StepReview.tsx`

---

## 📝 Plan d'Action

1. **Modifier PremiumCaptureFlow**
   - Ajouter étape `edlType` (sélection type EDL)
   - Ajouter étape `captureMode` (choix mode)
   - Ajouter étape `aiProcessing` (traitement IA)
   - Ajouter étape `review` (révision tâches)

2. **Vérifier Structure DB**
   - Vérifier si `visit_sequences` a un champ `edl_type`
   - Sinon, utiliser `metadata` JSONB

3. **Intégrer Composants Existants**
   - Utiliser `StepAIProcessing.tsx` existant
   - Utiliser `StepReview.tsx` existant
   - Adapter pour le flux "Pas à pas"

---

**Statut:** ❌ **Éléments manquants identifiés - Corrections nécessaires**

