# 🔄 Workflow de Synchronisation - MyEDLS Mobile

## ⚠️ Important : Synchronisation Manuelle Requise

Avec Capacitor, **les fichiers ne se synchronisent PAS automatiquement**. Après chaque modification du code web, vous devez synchroniser manuellement.

## 📋 Workflow Standard

### Après chaque modification du code

1. **Build le projet web** :
```bash
npm run build
```

2. **Synchroniser avec les plateformes natives** :
```bash
npm run cap:sync
```

3. **Dans Android Studio** :
   - Cliquez sur **"Run"** (▶️) pour relancer l'application
   - OU appuyez sur `Shift+F10`

### Commande combinée (recommandée)

Au lieu de faire les deux étapes séparément, utilisez :

```bash
npm run mobile:sync
```

Cette commande fait automatiquement :
1. `npm run build` - Build le projet
2. `npm run cap:sync` - Synchronise avec Android/iOS

## 🚀 Workflow Rapide

### Option 1 : Synchronisation manuelle (actuel)

```bash
# 1. Modifier le code dans src/
# 2. Build + Sync
npm run mobile:sync

# 3. Dans Android Studio, cliquer sur "Run" (▶️)
```

### Option 2 : Mode développement web (pour tester rapidement)

Pour tester rapidement sans rebuild Android :

```bash
npm run dev
```

Ouvrez `http://localhost:8080` dans le navigateur. Les changements sont automatiques (hot reload).

**Note** : Cela ne met pas à jour l'app Android, seulement le navigateur web.

## 📱 Dans Android Studio

### Après synchronisation

1. **Recharger l'application** :
   - Cliquez sur **"Run"** (▶️) dans Android Studio
   - OU appuyez sur `Shift+F10`
   - L'application va se recompiler et relancer avec les nouveaux fichiers

2. **Vérifier les changements** :
   - Les fichiers web sont dans `android/app/src/main/assets/public/`
   - Capacitor charge ces fichiers au démarrage de l'app

## 🔍 Vérifier que la synchronisation a fonctionné

### Vérifier les fichiers synchronisés

Les fichiers web sont copiés dans :
- **Android** : `android/app/src/main/assets/public/`
- **iOS** : `ios/App/App/public/`

### Vérifier dans Android Studio

1. Ouvrez le dossier `android/app/src/main/assets/public/`
2. Vérifiez que les fichiers `index.html` et les assets sont à jour
3. Vérifiez la date de modification des fichiers

## ⚡ Astuce : Hot Reload dans l'émulateur

Si vous modifiez uniquement du CSS ou du JavaScript simple, vous pouvez parfois :

1. Ouvrir Chrome DevTools sur l'émulateur
2. Recharger la page web dans l'app (si l'app charge une URL web)

Mais pour les modifications importantes, **toujours faire `mobile:sync` + relancer dans Android Studio**.

## 🐛 Si les changements n'apparaissent pas

1. **Vérifier que le build a réussi** :
   ```bash
   npm run build
   ```
   Vérifiez qu'il n'y a pas d'erreurs

2. **Vérifier que la sync a réussi** :
   ```bash
   npm run cap:sync
   ```
   Vérifiez qu'il n'y a pas d'erreurs

3. **Nettoyer et rebuilder dans Android Studio** :
   - **Build > Clean Project**
   - **Build > Rebuild Project**
   - Relancer l'application

4. **Vérifier le cache** :
   - Dans Android Studio : **File > Invalidate Caches / Restart**
   - Choisir **Invalidate and Restart**

## 📝 Checklist de Synchronisation

Avant de tester dans l'app mobile :

- [ ] Code modifié dans `src/`
- [ ] `npm run mobile:sync` exécuté avec succès
- [ ] Android Studio ouvert
- [ ] Application relancée (Run ▶️)
- [ ] Changements visibles dans l'app

## 🎯 Résumé

**Règle d'or** : Après chaque modification du code web → `npm run mobile:sync` → Relancer dans Android Studio

**Pas de synchronisation automatique** : Capacitor ne surveille pas les changements de fichiers. Vous devez synchroniser manuellement.

