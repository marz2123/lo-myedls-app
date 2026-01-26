# 🔄 Migration Lovable → Gemini Direct - Guide Complet

## ⚠️ Problème

Toutes les Edge Functions utilisent encore `ai.gateway.lovable.dev` avec `LOVABLE_API_KEY` au lieu d'utiliser Gemini directement via l'API Google.

## ✅ Solution Implémentée

### 1. Fonction Helper Créée

**Dans :** `supabase/functions/edl-ai-pipeline/index.ts` (lignes 6-120)

La fonction `callGeminiDirect()` :
- ✅ Appelle Gemini directement via `generativelanguage.googleapis.com`
- ✅ Utilise `GOOGLE_API_KEY` au lieu de `LOVABLE_API_KEY`
- ✅ Convertit automatiquement le format OpenAI → Gemini
- ✅ Retourne un format compatible avec l'ancien code

### 2. Fonction Principale Migrée

**Fichier :** `supabase/functions/edl-ai-pipeline/index.ts`

**Appels migrés :**
- ✅ **Segmentation** (ligne ~240) - Utilise Gemini direct
- ✅ **Transcription** (ligne ~335) - Utilise Gemini direct  
- ✅ **Vision Analysis** (ligne ~400) - Utilise Gemini direct
- ✅ **Task Extraction** (ligne ~600) - Utilise Gemini direct

---

## 🔧 Configuration Requise

### 1. Ajouter GOOGLE_API_KEY dans Supabase

**Étapes :**
1. Aller dans **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Cliquer sur **"Add new secret"**
3. Nom : `GOOGLE_API_KEY`
4. Valeur : Votre clé API Google (obtenir sur https://ai.google.dev/)

**Important :** Cette clé doit être ajoutée dans les secrets Supabase, pas dans `.env.local`

---

## 📝 Format de l'API Gemini

### Endpoint
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
```

### Modèles disponibles
- `gemini-2.5-pro` (pour analyses complexes)
- `gemini-2.5-flash` (pour analyses rapides)

### Format de requête
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "Votre prompt ici" }
      ]
    }
  ],
  "systemInstruction": {
    "parts": [{ "text": "System prompt" }]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 8192
  }
}
```

---

## 🔄 Autres Fonctions à Migrer

**Fonctions critiques encore à migrer :**
- ❌ `extract-tasks/index.ts`
- ❌ `extract-tasks-from-sequences/index.ts`
- ❌ `extract-from-pdf/index.ts`
- ❌ `generate-tasks/index.ts`
- ❌ `analyze-visit-sequence/index.ts`
- ❌ `ai-unified-analysis/index.ts`
- ❌ `analyze-project-documents/index.ts`

**Total : ~50+ fonctions** utilisent encore Lovable

---

## 🎯 Avantages de la Migration

1. ✅ **Pas de dépendance Lovable** : Utilisation directe de Gemini
2. ✅ **Meilleure performance** : Moins de latence (pas de proxy)
3. ✅ **Coûts réduits** : Pas de frais intermédiaires Lovable
4. ✅ **Plus de contrôle** : Accès direct à l'API Google
5. ✅ **Meilleure fiabilité** : Moins de points de défaillance

---

## ⚠️ Important

**Avant de tester :**
1. ✅ Ajouter `GOOGLE_API_KEY` dans Supabase Secrets
2. ✅ Vérifier que la clé fonctionne (tester avec une requête simple)
3. ✅ Tester `edl-ai-pipeline` avec Gemini direct
4. ✅ Migrer les autres fonctions progressivement

**Note :** Vous pouvez garder `LOVABLE_API_KEY` temporairement en fallback si besoin, mais l'objectif est de tout migrer vers Gemini direct.

---

## 📄 Fichiers Modifiés

- ✅ `supabase/functions/edl-ai-pipeline/index.ts` - **MIGRÉ COMPLÈTEMENT**

---

## 🧪 Test

Pour tester que ça fonctionne :

1. **Vérifier la clé API :**
   ```bash
   # Dans Supabase Dashboard → Edge Functions → Secrets
   # Vérifier que GOOGLE_API_KEY existe
   ```

2. **Tester l'extraction :**
   - Lancer une capture dans l'app
   - Vérifier que l'extraction fonctionne
   - Vérifier les logs Supabase pour confirmer l'utilisation de Gemini

3. **Vérifier les logs :**
   - Dans Supabase Dashboard → Edge Functions → Logs
   - Chercher `[Gemini Direct]` dans les logs
   - Vérifier qu'il n'y a plus d'appels à `ai.gateway.lovable.dev`

---

## 🔄 Prochaines Étapes

1. **Tester** `edl-ai-pipeline` avec Gemini direct ✅
2. **Migrer** les autres fonctions critiques une par une
3. **Supprimer** `LOVABLE_API_KEY` une fois tout migré
