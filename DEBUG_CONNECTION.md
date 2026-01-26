# 🔧 Debug - Problème de Connexion Supabase

## Erreur : "TypeError: Failed to fetch"

Cette erreur indique que l'application ne peut pas se connecter à Supabase.

---

## ✅ Solutions à essayer (dans l'ordre)

### 1. Vérifier le fichier `.env.local`

Assurez-vous que le fichier `.env.local` existe à la racine du projet et contient :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_cle_publique
```

**⚠️ IMPORTANT :** Utilisez les mêmes valeurs que dans MyHome !

### 2. Rebuild l'application

Les variables d'environnement sont intégrées au moment du build. Si vous avez modifié `.env.local`, il faut rebuilder :

```bash
# 1. Build l'application
npm run build

# 2. Sync avec Capacitor
npm run mobile:sync

# 3. Relancer dans Android Studio
```

### 3. Vérifier que le serveur de dev n'est pas en cours

Si vous avez un serveur de développement qui tourne (`npm run dev`), arrêtez-le avant de tester l'app mobile.

### 4. Vérifier la connexion réseau

- L'app mobile a-t-elle accès à Internet ?
- L'URL Supabase est-elle accessible depuis votre réseau ?

### 5. Vérifier les logs Android Studio

Dans Android Studio, ouvrez Logcat et filtrez par "Supabase" ou "Failed to fetch" pour voir les détails de l'erreur.

### 6. Vérifier la configuration Capacitor

Le fichier `capacitor.config.ts` ne doit PAS avoir de `server.url` activé en production :

```typescript
// ❌ NE PAS DÉCOMMENTER en production
// server: {
//   url: 'http://localhost:8080',
//   cleartext: true
// },
```

---

## 🔍 Diagnostic

### Test 1 : Vérifier les variables d'environnement

Ajoutez temporairement ce code dans `src/integrations/supabase/client.ts` pour voir les valeurs :

```typescript
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_KEY:', SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
```

### Test 2 : Vérifier la connexion depuis le navigateur

1. Lancez `npm run dev`
2. Ouvrez l'application dans le navigateur
3. Ouvrez la console (F12)
4. Vérifiez si les erreurs "Failed to fetch" apparaissent aussi

Si ça fonctionne dans le navigateur mais pas dans l'app mobile, c'est un problème de build/sync.

---

## 🚨 Solution Rapide

1. **Vérifiez `.env.local`** - Assurez-vous qu'il contient les bonnes valeurs
2. **Rebuild complet :**
   ```bash
   npm run build
   npm run mobile:sync
   ```
3. **Dans Android Studio :**
   - Clean Project (Build → Clean Project)
   - Rebuild Project (Build → Rebuild Project)
   - Relancer l'app

---

## 📝 Notes

- Les variables d'environnement sont remplacées au moment du build
- Si vous modifiez `.env.local`, vous DEVEZ rebuilder
- L'app mobile utilise le build dans `dist/`, pas le serveur de dev
- Vérifiez que vous utilisez les mêmes credentials Supabase que MyHome

