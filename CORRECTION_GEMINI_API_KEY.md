# ✅ Correction : GEMINI_API_KEY vs GOOGLE_API_KEY

## 🔍 Problème Identifié

Dans Supabase Secrets, la clé s'appelle **`GEMINI_API_KEY`** mais le code cherchait **`GOOGLE_API_KEY`**.

## ✅ Correction Appliquée

Le code a été modifié pour supporter **les deux noms** :
- ✅ `GEMINI_API_KEY` (priorité - ce qui existe dans votre Supabase)
- ✅ `GOOGLE_API_KEY` (fallback - pour compatibilité)

**Fichier modifié :** `supabase/functions/edl-ai-pipeline/index.ts`

**Changement :**
```typescript
// Avant
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

// Après
const GOOGLE_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
```

---

## ✅ Résultat

Maintenant le code :
1. ✅ Cherche d'abord `GEMINI_API_KEY` (qui existe dans votre Supabase)
2. ✅ Utilise `GOOGLE_API_KEY` en fallback si `GEMINI_API_KEY` n'existe pas
3. ✅ Fonctionne avec votre configuration actuelle

---

## 🧪 Vérification

D'après votre capture d'écran :
- ✅ `GEMINI_API_KEY` est configurée dans Supabase
- ✅ Le code va maintenant la trouver automatiquement
- ✅ L'extraction devrait fonctionner

---

## 📝 Note

Vous pouvez garder le nom `GEMINI_API_KEY` dans Supabase, c'est parfait. Le code supporte maintenant les deux noms pour plus de flexibilité.
