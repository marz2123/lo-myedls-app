# 🚀 Guide de Démarrage Rapide - MyEDLS Mobile

## ✅ Configuration Complète Effectuée

Tous les fichiers de configuration ont été créés. Voici ce qui a été fait :

### Fichiers Créés/Modifiés

1. ✅ **`src/lib/mobileStorage.ts`** - Adapter de stockage pour mobile/web
2. ✅ **`src/integrations/supabase/client.ts`** - Client Supabase adapté pour mobile
3. ✅ **`capacitor.config.ts`** - Configuration Capacitor mise à jour
4. ✅ **`package.json`** - Scripts npm ajoutés + dépendance `@capacitor/preferences`
5. ✅ **`ENV_SETUP.md`** - Guide de configuration des variables d'environnement
6. ✅ **`MOBILE_SETUP.md`** - Guide complet de configuration mobile
7. ✅ **`SUPABASE_SHARED.md`** - Guide pour Supabase partagé avec MyHome
8. ✅ **Templates de permissions** - Android et iOS

## 📋 Prochaines Étapes

### 1. Installer les Dépendances

```bash
cd "D:\Programmation\myedls lov philippe"
npm install
```

Cela installera `@capacitor/preferences` qui est nécessaire pour le stockage mobile.

### 2. Configurer Supabase (Partagé avec MyHome)

⚠️ **IMPORTANT** : MyEDLS utilise **exactement la même base de données** que MyHome. Les tables EDL existent déjà !

**Option A : Copier depuis MyHome (Recommandé)**

1. Ouvrez : `D:\Programmation\lo-myhome\.env`
2. Copiez les valeurs de `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Créez `.env.local` dans MyEDLS avec les mêmes valeurs

**Option B : Récupérer depuis le Dashboard**

1. Dashboard Supabase de MyHome > Settings > API
2. Copiez le **Project URL** et la clé **anon/public**
3. Créez `.env.local` avec ces valeurs

```env
VITE_SUPABASE_URL=https://votre-projet-myhome.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public_myhome
```

📚 **Voir** : `SYNC_WITH_MYHOME.md` pour plus de détails sur la synchronisation

### 3. Build le Projet

```bash
npm run build
```

### 4. Ajouter les Plateformes Mobiles

#### Pour Android :

```bash
npm run cap:add:android
```

Puis ouvrir dans Android Studio :
```bash
npm run mobile:android
```

#### Pour iOS (Mac uniquement) :

```bash
npm run cap:add:ios
```

Puis installer les dépendances CocoaPods :
```bash
cd ios/App
pod install
cd ../..
```

Puis ouvrir dans Xcode :
```bash
npm run mobile:ios
```

## 🔄 Workflow de Développement

Après chaque modification du code :

```bash
npm run mobile:build
```

Cette commande fait :
1. Build du projet web (`npm run build`)
2. Synchronisation avec les plateformes natives (`npx cap sync`)

Puis ouvrez Android Studio ou Xcode pour tester.

## 📱 Commandes Utiles

| Commande | Description |
|----------|-------------|
| `npm run mobile:build` | Build + Sync (à faire après chaque modification) |
| `npm run cap:sync` | Synchroniser les fichiers web avec les plateformes |
| `npm run cap:open:android` | Ouvrir Android Studio |
| `npm run cap:open:ios` | Ouvrir Xcode |
| `npm run mobile:android` | Build + Ouvrir Android Studio |
| `npm run mobile:ios` | Build + Ouvrir Xcode |

## 🎯 Points Importants

### Supabase Partagé

✅ **Utilisez le même projet Supabase que MyHome**
- Même URL
- Même clé anon/public
- Les utilisateurs sont partagés
- Les données MyEDLS doivent avoir le préfixe `myedls_` pour éviter les conflits

### Stockage Mobile

✅ **Le stockage est automatiquement adapté**
- Web : utilise `localStorage`
- Mobile : utilise `Capacitor Preferences` avec cache en mémoire
- Aucun changement nécessaire dans votre code

### Permissions

✅ **Les permissions sont configurées automatiquement**
- Capacitor les ajoute lors de la création des plateformes
- Voir les templates dans `android-permissions-template.xml` et `ios-permissions-template.plist`

## 🐛 Dépannage

### Erreur "Cannot find module '@capacitor/preferences'"

```bash
npm install
npm run cap:sync
```

### L'application ne se connecte pas à Supabase

1. Vérifiez que `.env.local` existe et contient les bonnes valeurs
2. Redémarrez le serveur de développement
3. Vérifiez les logs dans la console

### Erreur de build

1. Assurez-vous d'avoir fait `npm run build` avant `npm run cap:sync`
2. Vérifiez que toutes les dépendances sont installées : `npm install`

## 📚 Documentation Complète

- **`MOBILE_SETUP.md`** - Guide détaillé de configuration mobile
- **`ENV_SETUP.md`** - Configuration des variables d'environnement
- **`SUPABASE_SHARED.md`** - Guide Supabase partagé avec MyHome
- **`README_MOBILE.md`** - Architecture mobile détaillée

## ✅ Checklist Finale

Avant de tester sur mobile :

- [ ] `npm install` exécuté
- [ ] Fichier `.env.local` créé avec les clés Supabase MyHome
- [ ] `npm run build` réussi
- [ ] Plateforme Android/iOS ajoutée (`npm run cap:add:android` ou `cap:add:ios`)
- [ ] `npm run cap:sync` exécuté
- [ ] Android Studio ou Xcode ouvert
- [ ] Appareil/émulateur connecté

## 🎉 C'est Prêt !

Votre application est maintenant configurée pour fonctionner sur Android et iOS avec Supabase partagé avec MyHome.

Bon développement ! 🚀

