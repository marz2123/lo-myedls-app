# 🔄 Synchronisation MyEDLS avec MyHome

## ✅ Configuration Complète

MyEDLS utilise maintenant **exactement la même base de données Supabase** que MyHome. Toutes les tables EDL existent déjà et sont partagées automatiquement.

## 📊 Tables Partagées

Les tables suivantes sont **déjà créées** dans MyHome et utilisées par MyEDLS :

### Tables Principales EDL
- ✅ `edl_projects` - Projets EDL
- ✅ `property_parts` - Parties du bien (communes/privatives)
- ✅ `property_locations` - Lieux (appartements, etc.)
- ✅ `visit_sequences` - Séquences de visite
- ✅ `extracted_tasks` - Tâches extraites

### Tables Partagées MyHome
- ✅ `profiles` - Profils utilisateurs
- ✅ `projects` - Projets généraux (si utilisés)
- ✅ Toutes les autres tables MyHome

## 🔑 Configuration des Variables d'Environnement

### 1. Récupérer les Clés depuis MyHome

Le projet MyHome se trouve dans : `D:\Programmation\lo-myhome`

**Option A : Copier depuis le fichier .env de MyHome**

1. Ouvrez : `D:\Programmation\lo-myhome\.env`
2. Copiez les valeurs de :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

**Option B : Récupérer depuis le Dashboard Supabase**

1. Allez sur : https://supabase.com/dashboard
2. Sélectionnez votre projet MyHome
3. Allez dans : **Settings → API**
4. Copiez :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 2. Créer le Fichier .env.local dans MyEDLS

Créez un fichier `.env.local` à la racine de `D:\Programmation\myedl app lo` :

```env
VITE_SUPABASE_URL=https://votre-projet-myhome.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public_myhome
```

⚠️ **Important** : Utilisez **exactement les mêmes valeurs** que MyHome pour que les deux applications partagent la même base de données.

## 🔄 Synchronisation Automatique

### Données Partagées

✅ **Authentification** : Les utilisateurs MyHome peuvent se connecter à MyEDLS avec les mêmes identifiants

✅ **Projets EDL** : Tous les projets EDL créés dans MyHome sont visibles dans MyEDLS et vice versa

✅ **Tâches** : Les tâches extraites sont partagées entre les deux applications

✅ **Documents** : Les documents uploadés sont dans le même storage Supabase

### Pas de Duplication

❌ **Pas besoin de créer de nouvelles tables** : Tout existe déjà dans MyHome

❌ **Pas besoin de migrations supplémentaires** : Les migrations EDL sont déjà appliquées dans MyHome

✅ **Synchronisation automatique** : Les deux applications utilisent la même base de données

## 📱 Configuration Mobile

Le client Supabase de MyEDLS est configuré pour fonctionner sur :
- ✅ **Web** : Utilise `localStorage` (comme MyHome)
- ✅ **Mobile** : Utilise `Capacitor Preferences` (via `mobileStorage.ts`)

Cela permet à MyEDLS de fonctionner sur mobile tout en partageant les données avec MyHome.

## 🧪 Test de Synchronisation

### 1. Test de Connexion

1. Connectez-vous à MyHome avec un compte utilisateur
2. Créez un projet EDL dans MyHome
3. Ouvrez MyEDLS (web ou mobile)
4. Connectez-vous avec le même compte
5. Vérifiez que le projet EDL créé dans MyHome apparaît dans MyEDLS

### 2. Test de Création

1. Dans MyEDLS, créez un nouveau projet EDL
2. Retournez dans MyHome
3. Vérifiez que le projet apparaît dans MyHome

### 3. Test de Modification

1. Modifiez un projet EDL dans MyHome
2. Vérifiez que les modifications apparaissent dans MyEDLS
3. Modifiez le même projet dans MyEDLS
4. Vérifiez que les modifications apparaissent dans MyHome

## 🔐 Sécurité (RLS)

Les politiques RLS (Row Level Security) sont déjà configurées dans MyHome :

- ✅ Les utilisateurs ne peuvent voir que leurs propres projets EDL
- ✅ Les utilisateurs ne peuvent modifier que leurs propres données
- ✅ Les politiques s'appliquent automatiquement dans MyEDLS

## 📚 Types TypeScript

Les types Supabase ont été copiés depuis MyHome vers MyEDLS :

- ✅ `src/integrations/supabase/types.ts` - Types complets de la base de données
- ✅ Toutes les tables EDL sont typées
- ✅ Auto-complétion complète dans le code

## 🚀 Déploiement

### Variables d'Environnement en Production

Assurez-vous que les mêmes variables d'environnement sont configurées pour :
- MyHome (production)
- MyEDLS (production)

Cela garantit que les deux applications partagent la même base de données en production.

## ⚠️ Points d'Attention

### Conflits de Noms

Les tables EDL utilisent le préfixe `edl_` pour éviter les conflits avec les autres tables MyHome :
- ✅ `edl_projects` (pas `projects`)
- ✅ `property_parts`, `property_locations` (spécifiques EDL)

### Edge Functions

Les Edge Functions EDL sont dans :
- MyHome : `supabase/functions/`
- MyEDLS : `supabase/functions/` (peuvent être partagées)

### Storage Buckets

Les buckets Supabase Storage sont partagés :
- ✅ `project-documents` - Documents des projets EDL
- ✅ `visit-videos` - Vidéos de visite (si utilisé)
- ✅ `visit-frames` - Photos de visite (si utilisé)

## ✅ Checklist de Vérification

- [ ] Fichier `.env.local` créé avec les mêmes clés que MyHome
- [ ] Types Supabase copiés depuis MyHome
- [ ] Client Supabase configuré avec `mobileStorage`
- [ ] Test de connexion réussi
- [ ] Test de création de projet réussi
- [ ] Test de synchronisation bidirectionnelle réussi

## 🎉 Résultat

Une fois configuré, MyEDLS et MyHome partagent **automatiquement** :
- ✅ La même base de données
- ✅ Les mêmes utilisateurs
- ✅ Les mêmes projets EDL
- ✅ Les mêmes données

**Aucune synchronisation manuelle n'est nécessaire !** 🚀

