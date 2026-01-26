# 🔄 Migration Lovable → Gemini Direct

## ⚠️ Problème Identifié

Toutes les Edge Functions utilisent encore `ai.gateway.lovable.dev` avec `LOVABLE_API_KEY` au lieu d'utiliser Gemini directement via l'API Google.

## ✅ Solution : Utiliser Gemini Directement

### 1. Client Gemini Créé

**Fichier :** `supabase/functions/_shared/gemini-client.ts`

Ce client permet d'appeler Gemini directement via :
- Endpoint : `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Clé API : `GOOGLE_API_KEY` (au lieu de `LOVABLE_API_KEY`)

### 2. Fonctions à Migrer

**Fonction principale migrée :**
- ✅ `edl-ai-pipeline/index.ts` - **PARTIELLEMENT MIGRÉE** (extraction de tâches)

**Fonctions encore à migrer :**
- ❌ `extract-tasks-from-sequences/index.ts`
- ❌ `extract-tasks/index.ts`
- ❌ `extract-from-pdf/index.ts`
- ❌ `generate-tasks/index.ts`
- ❌ `analyze-visit-sequence/index.ts`
- ❌ `ai-unified-analysis/index.ts`
- ❌ `analyze-project-documents/index.ts`
- ❌ Et ~50 autres fonctions...

---

## 🔧 Configuration Requise

### 1. Ajouter GOOGLE_API_KEY dans Supabase

1. Aller dans Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Ajouter : `GOOGLE_API_KEY` = votre clé API Google
3. Obtenir la clé : https://ai.google.dev/ → Get API Key

### 2. Utiliser le Client Gemini

```typescript
import { callGeminiDirect, convertGeminiToLovableFormat } from '../_shared/gemini-client.ts';

// Au lieu de :
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: 'google/gemini-2.5-pro', messages: [...] })
});

// Utiliser :
const geminiResponse = await callGeminiDirect(
  'gemini-2.5-pro',
  [{ role: 'user', content: '...' }],
  'System prompt...',
  GOOGLE_API_KEY
);

const data = convertGeminiToLovableFormat(geminiResponse);
```

---

## 📝 Exemple de Migration Complète

### Avant (Lovable)
```typescript
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-pro',
    messages: [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' }
    ],
  }),
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
const content = data.choices?.[0]?.message?.content;
```

### Après (Gemini Direct)
```typescript
import { callGeminiDirect, convertGeminiToLovableFormat } from '../_shared/gemini-client.ts';

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not configured');
}

const geminiResponse = await callGeminiDirect(
  'gemini-2.5-pro',
  [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'User message' }
  ],
  'System prompt',
  GOOGLE_API_KEY
);

const data = convertGeminiToLovableFormat(geminiResponse);
const content = data.choices?.[0]?.message?.content;
```

---

## 🎯 Avantages

1. ✅ **Pas de dépendance Lovable** : Utilisation directe de Gemini
2. ✅ **Meilleure performance** : Moins de latence (pas de proxy)
3. ✅ **Coûts réduits** : Pas de frais intermédiaires Lovable
4. ✅ **Plus de contrôle** : Accès direct à l'API Google

---

## ⚠️ Important

**Avant de migrer toutes les fonctions :**
1. ✅ Tester que `GOOGLE_API_KEY` fonctionne
2. ✅ Vérifier que `gemini-client.ts` fonctionne correctement
3. ✅ Migrer une fonction à la fois et tester
4. ✅ Garder `LOVABLE_API_KEY` en fallback temporaire si besoin

---

## 📄 Fichiers Modifiés

- ✅ `supabase/functions/_shared/gemini-client.ts` - **NOUVEAU**
- ✅ `supabase/functions/edl-ai-pipeline/index.ts` - **PARTIELLEMENT MIGRÉ**

---

## 🔄 Prochaines Étapes

1. **Tester** la fonction `edl-ai-pipeline` avec Gemini direct
2. **Migrer** les autres fonctions critiques une par une
3. **Supprimer** `LOVABLE_API_KEY` une fois tout migré
