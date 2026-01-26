# ✅ Vérification GOOGLE_API_KEY

## 🔍 Comment Vérifier

### Méthode 1 : Via Supabase Dashboard (Recommandé)

1. **Aller dans Supabase Dashboard**
   - URL : https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Aller dans Edge Functions → Secrets**
   - Menu gauche : **Edge Functions** → **Secrets**
   - Ou directement : **Settings** → **Edge Functions** → **Secrets**

3. **Vérifier la présence de `GOOGLE_API_KEY`**
   - Chercher dans la liste des secrets
   - Si elle existe : ✅ **Configurée**
   - Si elle n'existe pas : ❌ **À ajouter**

### Méthode 2 : Via Fonction Edge de Test

**Fichier créé :** `supabase/functions/check-google-api-key/index.ts`

**Pour tester :**
1. Déployer la fonction (ou l'appeler directement)
2. Appeler : `https://votre-projet.supabase.co/functions/v1/check-google-api-key`
3. Vérifier la réponse JSON

**Réponse attendue si configurée :**
```json
{
  "googleApiKey": {
    "configured": true,
    "length": 39,
    "preview": "AIzaSyC..."
  },
  "recommendation": "✅ GOOGLE_API_KEY est configurée..."
}
```

**Réponse si non configurée :**
```json
{
  "googleApiKey": {
    "configured": false,
    "length": 0,
    "preview": "NOT SET"
  },
  "recommendation": "⚠️ GOOGLE_API_KEY n'est pas configurée..."
}
```

### Méthode 3 : Via Logs Supabase

1. **Aller dans Edge Functions → Logs**
2. **Lancer une extraction de tâches**
3. **Chercher dans les logs :**
   - Si vous voyez : `"GOOGLE_API_KEY is not configured"` → ❌ **Non configurée**
   - Si vous voyez : `"[Gemini Direct] Calling gemini-2.5-pro"` → ✅ **Configurée**

---

## 🔧 Comment Ajouter GOOGLE_API_KEY

### Étape 1 : Obtenir la Clé API Google

1. Aller sur : https://ai.google.dev/
2. Cliquer sur **"Get API Key"**
3. Créer un projet ou sélectionner un projet existant
4. Copier la clé API générée

### Étape 2 : Ajouter dans Supabase

1. **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Cliquer sur **"Add new secret"**
3. **Nom :** `GOOGLE_API_KEY`
4. **Valeur :** Coller votre clé API Google
5. Cliquer sur **"Save"**

### Étape 3 : Vérifier

1. Relancer une extraction de tâches
2. Vérifier les logs Supabase
3. L'erreur devrait disparaître

---

## 📋 Checklist

- [ ] `GOOGLE_API_KEY` existe dans Supabase Secrets
- [ ] La clé API Google est valide (testée sur https://ai.google.dev/)
- [ ] Les logs Supabase ne montrent plus `"GOOGLE_API_KEY is not configured"`
- [ ] L'extraction de tâches fonctionne sans erreur

---

## 🔗 Liens Utiles

- **Google AI Studio :** https://ai.google.dev/
- **Supabase Secrets :** https://supabase.com/dashboard/project/_/settings/functions
- **Fonction de test :** `supabase/functions/check-google-api-key/index.ts`

---

## ⚠️ Important

**La clé doit être ajoutée dans Supabase Secrets, PAS dans `.env.local` !**

Les Edge Functions Supabase utilisent leurs propres secrets, pas les variables d'environnement locales.
