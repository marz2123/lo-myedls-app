# 🔧 Fix : Erreur "Extraction: Edge Function returned a non-2xx status code"

## 📋 Problème Identifié

L'erreur se produit lors de l'extraction de tâches dans `StepAIProcessing.tsx` :
```
Processing error: Error: Extraction: Edge Function returned a non-2xx status code
```

**Causes possibles :**
1. ❌ Erreur de connexion réseau à Supabase (mobile Android)
2. ❌ Nomenclature DTC non chargée ou table vide
3. ❌ Timeout de l'API Lovable/OpenAI
4. ❌ Erreur DNS sur mobile

---

## ✅ Corrections Apportées

### 1. Amélioration de la gestion d'erreur côté client

**Fichier :** `src/components/capture/steps/StepAIProcessing.tsx`

**Changements :**
- ✅ Détection des erreurs réseau (Failed to fetch, DNS, Network)
- ✅ Détection des erreurs DTC (nomenclature vide ou non chargée)
- ✅ Vérification du champ `error` dans la réponse (même si status 200)
- ✅ Messages d'erreur plus clairs et actionnables

### 2. Amélioration de la gestion d'erreur côté Edge Function

**Fichier :** `supabase/functions/edl-ai-pipeline/index.ts`

**Changements :**
- ✅ Détection des erreurs réseau Supabase
- ✅ Status code 503 (Service Unavailable) pour erreurs réseau
- ✅ Status code 500 pour erreurs de données DTC
- ✅ Messages d'erreur plus détaillés dans la réponse

---

## 🧪 Tests à Effectuer

### Test 1 : Erreur réseau
1. Désactiver le réseau
2. Lancer une extraction de tâches
3. Vérifier que le message d'erreur est clair : "Erreur de connexion réseau..."

### Test 2 : DTC non chargé
1. Vider la table `ft_familles` (ou simuler)
2. Lancer une extraction
3. Vérifier que le message indique : "Impossible de charger la nomenclature DTC..."

### Test 3 : Extraction normale
1. Avec réseau et DTC chargé
2. Lancer une extraction
3. Vérifier que ça fonctionne normalement

---

## 📝 Messages d'Erreur Améliorés

### Avant
```
Extraction: Edge Function returned a non-2xx status code
```

### Après
- **Erreur réseau :** "Erreur de connexion réseau. Vérifiez votre connexion Internet et réessayez."
- **DTC manquant :** "Impossible de charger la nomenclature DTC. Vérifiez que les données sont bien importées dans Supabase."
- **Rate limit :** "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants."
- **Payment :** "Crédits insuffisants. Veuillez recharger votre compte Lovable."

---

## 🔍 Vérifications Supplémentaires

Si l'erreur persiste, vérifier :

1. **Tables DTC existent et contiennent des données :**
   ```sql
   SELECT COUNT(*) FROM ft_familles;
   SELECT COUNT(*) FROM ct_categories;
   SELECT COUNT(*) FROM sc_sous_categories;
   ```

2. **Connexion Supabase fonctionne :**
   - Vérifier les logs Supabase Edge Functions
   - Vérifier la connexion réseau sur mobile

3. **Variables d'environnement :**
   - `LOVABLE_API_KEY` est définie
   - `OPENAI_API_KEY` est définie (si utilisée)
   - `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont correctes

---

## 📄 Fichiers Modifiés

- ✅ `src/components/capture/steps/StepAIProcessing.tsx`
- ✅ `supabase/functions/edl-ai-pipeline/index.ts`

---

## 🎯 Résultat Attendu

Après ces corrections, les erreurs d'extraction devraient :
- ✅ Afficher des messages plus clairs
- ✅ Identifier la cause exacte (réseau, DTC, API, etc.)
- ✅ Guider l'utilisateur vers la solution
