# 📱 Configuration iOS - MyEDLS

## ⚠️ Prérequis

iOS nécessite un **Mac avec Xcode** installé. Si vous êtes sur Windows, vous devrez :
- Utiliser un Mac pour développer/test iOS
- Ou utiliser un service cloud comme MacStadium, MacInCloud, etc.

## ✅ Plateforme iOS Ajoutée

La plateforme iOS a été ajoutée avec succès. Les fichiers sont dans :
```
ios/
```

## 📋 Étapes sur Mac

### 1. Installer CocoaPods (si pas déjà fait)

```bash
sudo gem install cocoapods
```

### 2. Installer les Dépendances iOS

```bash
cd ios/App
pod install
cd ../..
```

### 3. Ouvrir dans Xcode

```bash
npm run cap:open:ios
```

Ou manuellement :
```bash
npx cap open ios
```

### 4. Configurer le Projet dans Xcode

1. **Sélectionner le projet** dans le navigateur de gauche
2. **Sélectionner "App"** dans la liste des targets
3. **Onglet "Signing & Capabilities"** :
   - Cocher "Automatically manage signing"
   - Sélectionner votre **Team** (compte développeur Apple)
   - Le **Bundle Identifier** sera généré automatiquement

### 5. Configurer les Permissions

Les permissions sont déjà configurées dans `capacitor.config.ts`, mais vous pouvez les vérifier dans Xcode :

**Info.plist** (`ios/App/App/Info.plist`) devrait contenir :
- `NSCameraUsageDescription` - "MyEDLS a besoin de la caméra pour capturer les visites"
- `NSMicrophoneUsageDescription` - "MyEDLS a besoin du micro pour enregistrer vos commentaires"
- `NSPhotoLibraryUsageDescription` - "MyEDLS sauvegarde les photos de visite"
- `NSLocationWhenInUseUsageDescription` - "MyEDLS géolocalise automatiquement vos projets"

### 6. Tester sur Simulateur

1. **Sélectionner un simulateur** dans la barre d'outils Xcode (ex: iPhone 15 Pro)
2. **Cliquer sur "Run"** (▶️) ou appuyer sur `Cmd+R`
3. L'application devrait se lancer dans le simulateur

### 7. Tester sur Appareil Physique

1. **Connecter votre iPhone** via USB
2. **Faire confiance à l'ordinateur** sur l'iPhone si demandé
3. **Sélectionner votre appareil** dans Xcode
4. **Cliquer sur "Run"** (▶️)
5. Sur l'iPhone : **Settings > General > VPN & Device Management** > Faire confiance au développeur

## 🔐 Configuration du Certificat de Développement

Pour tester sur un appareil physique, vous avez besoin d'un compte développeur Apple :

1. **Créer un compte** : https://developer.apple.com
2. **Dans Xcode** : Preferences > Accounts > Ajouter votre compte
3. **Dans le projet** : Signing & Capabilities > Sélectionner votre Team

## 📦 Build pour App Store

### 1. Archive

1. **Sélectionner "Any iOS Device"** comme destination
2. **Product > Archive**
3. Attendre que l'archive soit créée

### 2. Upload vers App Store Connect

1. **Window > Organizer** (ou `Cmd+Shift+2`)
2. **Sélectionner l'archive**
3. **Distribute App**
4. **App Store Connect**
5. Suivre l'assistant

## 🐛 Dépannage

### Erreur "CocoaPods not installed"

```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### Erreur "No signing certificate"

1. Vérifiez que vous avez un compte développeur Apple
2. Dans Xcode : Preferences > Accounts > Ajouter votre compte
3. Dans le projet : Signing & Capabilities > Sélectionner votre Team

### Erreur "Unable to find xcodebuild"

1. Installez Xcode depuis l'App Store
2. Ouvrez Xcode une fois pour accepter la licence
3. Exécutez : `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

### L'application ne se connecte pas à Supabase

1. Vérifiez que `.env.local` contient les bonnes clés
2. Redémarrez Xcode
3. Vérifiez les logs dans la console Xcode

## 📚 Ressources

- [Documentation Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Guide Apple Developer](https://developer.apple.com/documentation/)
- [MOBILE_SETUP.md](./MOBILE_SETUP.md) - Guide mobile complet

## ✅ Checklist

- [ ] Mac avec Xcode installé
- [ ] CocoaPods installé (`sudo gem install cocoapods`)
- [ ] Dépendances installées (`cd ios/App && pod install`)
- [ ] Projet ouvert dans Xcode
- [ ] Signing configuré avec votre Team
- [ ] Permissions vérifiées dans Info.plist
- [ ] Test sur simulateur réussi
- [ ] Test sur appareil physique réussi (si nécessaire)

## 🎉 Résultat

Une fois configuré, vous pouvez :
- ✅ Tester l'application sur simulateur iOS
- ✅ Tester sur appareil physique
- ✅ Build pour App Store
- ✅ Partager les données avec MyHome (même Supabase)


