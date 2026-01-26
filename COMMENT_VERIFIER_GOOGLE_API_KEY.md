# 🔍 Comment Vérifier si GOOGLE_API_KEY est Configurée

## ✅ Méthode la Plus Simple : Supabase Dashboard

### Étapes :

1. **Ouvrir Supabase Dashboard**
   - Aller sur : https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Aller dans Settings → Edge Functions → Secrets**
   - Menu de gauche : **Settings** (icône ⚙️)
   - Section : **Edge Functions**
   - Sous-section : **Secrets**

3. **Chercher `GOOGLE_API_KEY` dans la liste**
   - Si vous la voyez : ✅ **Elle est configurée**
   - Si vous ne la voyez pas : ❌ **Elle n'est pas configurée**

---

## 🔧 Si Elle N'est PAS Configurée

### Comment l'Ajouter :

1. **Obtenir une clé API Google :**
   - Aller sur : https://ai.google.dev/
   - Cliquer sur **"Get API Key"**
   - Créer/sélectionner un projet
   - Copier la clé générée

2. **Ajouter dans Supabase :**
   - Dans **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
   - Cliquer sur **"Add new secret"** ou **"New secret"**
   - **Nom :** `GOOGLE_API_KEY`
   - **Valeur :** Coller votre clé API Google
   - Cliquer sur **"Save"** ou **"Add"**

3. **Vérifier :**
   - La clé devrait apparaître dans la liste
   - ⚠️ **Important :** Les secrets sont masqués (vous verrez seulement `GOOGLE_API_KEY` avec des `*`)

---

## 🧪 Méthode Alternative : Tester avec une Fonction Edge

J'ai créé une fonction de test : `supabase/functions/check-google-api-key/index.ts`

**Pour l'utiliser :**

1. **Déployer la fonction** (si pas déjà déployée) :
   ```bash
   supabase functions deploy check-google-api-key
   ```

2. **Appeler la fonction** :
   - Via le dashboard Supabase : **Edge Functions** → **check-google-api-key** → **Invoke**
   - Ou directement : `https://votre-projet.supabase.co/functions/v1/check-google-api-key`

3. **Vérifier la réponse** :
   - Si `"configured": true` → ✅ **Configurée**
   - Si `"configured": false` → ❌ **Non configurée**

---

## 📋 Résumé

**Pour vérifier rapidement :**
👉 **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets** → Chercher `GOOGLE_API_KEY`

**Si elle n'existe pas :**
👉 L'ajouter avec votre clé API Google depuis https://ai.google.dev/

---

## ⚠️ Important

- La clé doit être dans **Supabase Secrets**, PAS dans `.env.local`
- Les Edge Functions utilisent leurs propres secrets
- Après ajout, redéployer les fonctions si nécessaire (ou attendre quelques secondes)
