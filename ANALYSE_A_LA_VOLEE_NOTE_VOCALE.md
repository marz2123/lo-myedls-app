# 🔍 Analyse - "À la volée" et "Note vocale" - Éléments Manquants

**Date:** 8 janvier 2026  
**Comparaison:** MyHome vs App Mobile

---

## 📊 Résumé Exécutif

**❌ Plusieurs fonctionnalités importantes manquent dans "À la volée" et "Note vocale" par rapport à MyHome.**

---

## 🎥 "À la volée" (EDLVideoCapture) - Éléments Manquants

### ❌ Fonctionnalités Manquantes

| Fonctionnalité | MyHome | App Mobile | Impact |
|----------------|--------|------------|--------|
| **Transcription en temps réel** | ✅ LiveTranscription | ❌ **MANQUANT** | ⚠️ **CRITIQUE** - L'utilisateur ne voit pas ce qui est transcrit |
| **Sélection localisation avant capture** | ✅ Partie/Lieu/Endroit/Zone | ❌ **MANQUANT** | ⚠️ **CRITIQUE** - Pas de contexte de localisation |
| **Pauses/Reprises** | ✅ VideoContinueCapture | ❌ **MANQUANT** | ⚠️ **MOYEN** - Pas de pause pendant l'enregistrement |
| **Segmentation automatique** | ✅ Segmentation IA | ❌ **MANQUANT** | ⚠️ **MOYEN** - Pas de découpage par zone |
| **Analyse IA temps réel** | ✅ Analyse pendant enregistrement | ❌ **MANQUANT** | ⚠️ **MOYEN** - Pas de feedback IA |
| **Couverture (Coverage)** | ✅ CoveragePanel | ❌ **MANQUANT** | ⚠️ **MOYEN** - Pas de suivi des zones visitées |
| **Édition segments** | ✅ Édition après segmentation | ❌ **MANQUANT** | ⚠️ **MOYEN** - Pas de correction possible |

### ✅ Fonctionnalités Présentes

- ✅ Enregistrement vidéo
- ✅ Upload vers Supabase
- ✅ Création de visit_sequence
- ✅ Déclenchement extraction IA (en arrière-plan)

---

## 🎤 "Note vocale" (VoiceNoteDialog) - Éléments Manquants

### ❌ Fonctionnalités Manquantes

| Fonctionnalité | MyHome | App Mobile | Impact |
|----------------|--------|------------|--------|
| **Transcription en temps réel** | ✅ Web Speech API | ❌ **MANQUANT** | ⚠️ **CRITIQUE** - Pas de feedback visuel pendant l'enregistrement |
| **Sélection localisation** | ✅ TextVoiceRecorder avec location | ❌ **MANQUANT** | ⚠️ **CRITIQUE** - Pas de contexte de localisation |
| **Dictée vocale continue** | ✅ Reconnaissance continue | ⚠️ **PARTIEL** | ⚠️ **MOYEN** - Transcription seulement après enregistrement |
| **Génération tâches immédiate** | ✅ Génération pendant transcription | ⚠️ **PARTIEL** | ⚠️ **MOYEN** - Génération seulement après upload |

### ✅ Fonctionnalités Présentes

- ✅ Enregistrement audio
- ✅ Transcription Whisper (après upload)
- ✅ Analyse IA
- ✅ Sauvegarde dans visit_sequences

---

## 🔧 Corrections Nécessaires

### 1. Transcription en Temps Réel pour "À la volée" ❌

**À Ajouter:**
- Composant `LiveTranscription` pendant l'enregistrement vidéo
- Affichage de la transcription en overlay pendant la capture
- Utilisation de Web Speech API pour transcription locale

**Fichier:** `src/components/visit/reportage-hub/EDLVideoCapture.tsx`

---

### 2. Sélection Localisation pour "À la volée" ❌

**À Ajouter:**
- Étape de sélection Partie → Lieu → Endroit → Zone avant l'enregistrement
- Sauvegarde du contexte de localisation dans visit_sequence
- Affichage du contexte pendant l'enregistrement

**Fichier:** `src/components/visit/reportage-hub/EDLVideoCapture.tsx`

---

### 3. Pauses/Reprises pour "À la volée" ❌

**À Ajouter:**
- Bouton "Pause" pendant l'enregistrement
- Possibilité de reprendre l'enregistrement
- Gestion de plusieurs segments dans une même séquence

**Fichier:** `src/components/visit/reportage-hub/EDLVideoCapture.tsx` ou créer `VideoContinueCapture.tsx`

---

### 4. Transcription Temps Réel pour "Note vocale" ❌

**À Ajouter:**
- Composant `LiveTranscription` ou intégration Web Speech API
- Affichage de la transcription pendant l'enregistrement
- Feedback visuel que la parole est capturée

**Fichier:** `src/components/visit/reportage-hub/VoiceNoteDialog.tsx`

---

### 5. Sélection Localisation pour "Note vocale" ❌

**À Ajouter:**
- Sélection Partie → Lieu → Endroit → Zone avant l'enregistrement
- Sauvegarde du contexte dans visit_sequence
- Affichage du contexte pendant l'enregistrement

**Fichier:** `src/components/visit/reportage-hub/VoiceNoteDialog.tsx`

---

## 📝 Plan d'Action

1. **Créer/Intégrer LiveTranscription**
   - Créer composant `LiveTranscription.tsx` dans `reportage-hub`
   - Intégrer dans `EDLVideoCapture.tsx` et `VoiceNoteDialog.tsx`

2. **Ajouter Sélection Localisation**
   - Ajouter étape de sélection avant capture dans `EDLVideoCapture.tsx`
   - Ajouter étape de sélection avant enregistrement dans `VoiceNoteDialog.tsx`

3. **Ajouter Pauses/Reprises**
   - Modifier `EDLVideoCapture.tsx` pour supporter pauses
   - Ou créer `VideoContinueCapture.tsx` séparé

4. **Améliorer Feedback Utilisateur**
   - Ajouter transcription temps réel
   - Ajouter indicateurs visuels de progression
   - Ajouter couverture des zones visitées

---

**Statut:** ❌ **Éléments manquants identifiés - Corrections nécessaires**

