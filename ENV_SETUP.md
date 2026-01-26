# Configuration des Variables d'Environnement - MyEDLS

## 🎯 Utilisation du Supabase de MyHome

MyEDLS utilise **exactement le même projet Supabase** que MyHome. Cela signifie que vous devez utiliser les **mêmes clés** que MyHome.

## 📋 Étapes de Configuration

### Option 1 : Copier depuis MyHome (Recommandé)

1. **Ouvrez le fichier .env de MyHome** :
   - Chemin : `D:\Programmation\lo-myhome\.env`

2. **Copiez les valeurs** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

3. **Créez le fichier `.env.local` dans MyEDLS** :
   - Chemin : `D:\Programmation\myedl app lo\.env.local`
   - Collez les mêmes valeurs

### Option 2 : Récupérer depuis le Dashboard Supabase

1. **Connectez-vous au Dashboard Supabase** :
   - https://supabase.com/dashboard

2. **Sélectionnez votre projet MyHome**

3. **Allez dans Settings → API**

4. **Copiez les valeurs** :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

5. **Créez le fichier `.env.local`** :
   ```env
   VITE_SUPABASE_URL=https://votre-projet-myhome.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public_myhome
   ```

## ⚠️ Important

- ✅ **Utilisez les MÊMES clés que MyHome** pour partager la base de données
- ✅ **Ne créez pas un nouveau projet Supabase** pour MyEDLS
- ❌ **Ne commitez JAMAIS** le fichier `.env.local` (déjà dans `.gitignore`)
- ❌ **Ne partagez JAMAIS** vos clés publiquement

## 🔄 Après Configuration

1. **Redémarrez le serveur de développement** :
   ```bash
   npm run dev
   ```

2. **Vérifiez la connexion** :
   - L'application devrait se charger sans erreur
   - Vous pouvez vous connecter avec les mêmes identifiants que MyHome

## 📚 Voir Aussi

- `SYNC_WITH_MYHOME.md` - Guide complet de synchronisation
- `QUICK_START.md` - Guide de démarrage rapide
