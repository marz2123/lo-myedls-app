# Guide de Configuration Mobile - MyEDLS

Ce guide vous explique comment configurer l'application MyEDLS pour Android et iOS en utilisant Capacitor.

## 📋 Prérequis

### Pour Android
- ✅ Android Studio installé
- ✅ JDK 17 ou supérieur
- ✅ Android SDK (via Android Studio)

### Pour iOS (Mac uniquement)
- ✅ Xcode installé (via App Store)
- ✅ CocoaPods installé : `sudo gem install cocoapods`
- ✅ Command Line Tools : `xcode-select --install`

## 🚀 Installation Initiale

### 1. Installer les dépendances

```bash
npm install
```

Cela installera automatiquement `@capacitor/preferences` pour le stockage mobile.

### 2. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet (voir `ENV_SETUP.md`) :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_publique
```

### 3. Build du projet web

```bash
npm run build
```

## 📱 Configuration Android

### 1. Ajouter la plateforme Android

```bash
npm run cap:add:android
```

### 2. Configurer les permissions

Les permissions sont automatiquement configurées dans `capacitor.config.ts`. Si vous devez les modifier manuellement, éditez :

`android/app/src/main/AndroidManifest.xml`

Les permissions suivantes sont nécessaires :
- `CAMERA` - Pour capturer photos et vidéos
- `RECORD_AUDIO` - Pour enregistrer l'audio
- `ACCESS_FINE_LOCATION` - Pour la géolocalisation
- `ACCESS_COARSE_LOCATION` - Pour la géolocalisation approximative
- `INTERNET` - Pour la connexion à Supabase
- `WRITE_EXTERNAL_STORAGE` - Pour sauvegarder les médias (Android < 10)

### 3. Ouvrir dans Android Studio

```bash
npm run mobile:android
```

Ou manuellement :
```bash
npm run cap:open:android
```

### 4. Tester sur un appareil/émulateur

Dans Android Studio :
1. Connectez un appareil Android ou lancez un émulateur
2. Cliquez sur "Run" (▶️) ou appuyez sur `Shift+F10`

## 🍎 Configuration iOS

### 1. Ajouter la plateforme iOS

```bash
npm run cap:add:ios
```

### 2. Installer les dépendances CocoaPods

```bash
cd ios/App
pod install
cd ../..
```

### 3. Configurer les permissions

Les permissions sont configurées dans `Info.plist`. Capacitor les ajoute automatiquement, mais vous pouvez les vérifier dans :

`ios/App/App/Info.plist`

Les permissions suivantes sont nécessaires :
- `NSCameraUsageDescription` - "MyEDLS a besoin de la caméra pour capturer les visites"
- `NSMicrophoneUsageDescription` - "MyEDLS a besoin du micro pour enregistrer vos commentaires"
- `NSPhotoLibraryUsageDescription` - "MyEDLS sauvegarde les photos de visite"
- `NSLocationWhenInUseUsageDescription` - "MyEDLS géolocalise automatiquement vos projets"

### 4. Ouvrir dans Xcode

```bash
npm run mobile:ios
```

Ou manuellement :
```bash
npm run cap:open:ios
```

### 5. Tester sur un simulateur/appareil

Dans Xcode :
1. Sélectionnez un simulateur ou connectez un appareil iOS
2. Cliquez sur "Run" (▶️) ou appuyez sur `Cmd+R`

## 🔄 Workflow de Développement

### Après chaque modification du code web

1. **Build le projet** :
```bash
npm run build
```

2. **Synchroniser avec les plateformes natives** :
```bash
npm run cap:sync
```

Ou en une seule commande :
```bash
npm run mobile:build
```

### Commandes Utiles

- `npm run mobile:build` - Build + Sync (à faire après chaque modification)
- `npm run cap:sync` - Synchroniser les fichiers web avec les plateformes natives
- `npm run cap:open:android` - Ouvrir Android Studio
- `npm run cap:open:ios` - Ouvrir Xcode
- `npm run cap:run:android` - Build et lancer sur Android (nécessite Android Studio)
- `npm run cap:run:ios` - Build et lancer sur iOS (nécessite Xcode)

## 🗄️ Supabase Partagé avec MyHome

L'application utilise le **même projet Supabase** que MyHome ERP. Cela signifie :

✅ **Avantages** :
- Authentification partagée (même compte utilisateur)
- Données centralisées
- Gestion simplifiée

⚠️ **Important** :
- Utilisez des préfixes pour les tables spécifiques à MyEDLS (ex: `myedls_visits`)
- Vérifiez les politiques RLS (Row Level Security) dans Supabase
- Testez que les utilisateurs MyHome peuvent se connecter à MyEDLS

## 🐛 Dépannage

### Erreur "Cannot find module '@capacitor/preferences'"

```bash
npm install @capacitor/preferences
npm run cap:sync
```

### Erreur de build Android

1. Vérifiez que Android Studio est à jour
2. Ouvrez Android Studio et laissez-le télécharger les SDK manquants
3. Vérifiez que `android/local.properties` contient le chemin du SDK

### Erreur de build iOS

1. Vérifiez que Xcode est à jour
2. Exécutez `pod install` dans `ios/App`
3. Vérifiez que vous avez un compte développeur Apple configuré dans Xcode

### L'application ne se connecte pas à Supabase

1. Vérifiez que `.env.local` contient les bonnes clés
2. Redémarrez le serveur de développement
3. Vérifiez les logs dans la console du navigateur/appareil

## 📦 Build de Production

### Android (APK/AAB)

Dans Android Studio :
1. `Build > Generate Signed Bundle / APK`
2. Suivez l'assistant pour créer votre clé de signature
3. Sélectionnez `Android App Bundle` (recommandé pour Play Store)

### iOS (IPA)

Dans Xcode :
1. Sélectionnez "Any iOS Device" comme destination
2. `Product > Archive`
3. Suivez l'assistant pour uploader vers App Store Connect

## 🔐 Sécurité

- ✅ Ne commitez jamais `.env.local`
- ✅ Utilisez uniquement la clé `anon/public` côté client
- ✅ Les Edge Functions Supabase ont accès à la clé `service_role` automatiquement
- ✅ Configurez les politiques RLS dans Supabase pour la sécurité des données

## 📚 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [README_MOBILE.md](./README_MOBILE.md) - Architecture mobile détaillée

