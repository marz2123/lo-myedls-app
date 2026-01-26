# 🐛 Debug Android - Trouver les Erreurs

## 📍 Où trouver les logs d'erreur dans Android Studio

### Méthode 1 : Logcat (Recommandé)

1. **Ouvrir Logcat** :
   - En bas de l'écran Android Studio, cliquez sur l'onglet **"Logcat"**
   - Si vous ne le voyez pas : **View > Tool Windows > Logcat**

2. **Filtrer les logs** :
   - Dans la barre de recherche de Logcat, tapez : `myedls` ou `MyEDLS`
   - Ou filtrez par niveau : sélectionnez **"Error"** dans le menu déroulant

3. **Chercher les erreurs** :
   - Les erreurs apparaissent en **rouge**
   - Cherchez les lignes qui contiennent :
     - `Error`
     - `Exception`
     - `Failed`
     - `ProjectCreationWizard`
     - `Erreur lors de la création`

### Méthode 2 : Console Run

1. **Onglet "Run"** (en bas de l'écran)
2. Regardez les messages d'erreur qui apparaissent lors du lancement
3. Faites défiler pour voir toutes les erreurs

### Méthode 3 : Chrome DevTools (pour le webview)

1. Dans l'émulateur, ouvrez l'application
2. Dans Android Studio : **View > Tool Windows > Logcat**
3. Cherchez : `chromium` ou `WebView`
4. Les erreurs JavaScript apparaîtront ici

## 🔍 Exemples de ce que vous devriez voir

### Erreur typique dans Logcat :

```
E/MyEDLS: [ProjectCreationWizard] Project creation error: {
  code: '42P01',
  details: 'relation "projects" does not exist',
  hint: null,
  message: 'relation "projects" does not exist'
}
```

### Ou :

```
E/MyEDLS: [ProjectCreationWizard] Error creating project: Error: ...
```

## 📋 Étapes pour Debug

### 1. Ouvrir Logcat

```
View > Tool Windows > Logcat
```

### 2. Filtrer par package

Dans la barre de recherche Logcat :
```
package:com.myhome.myedls
```

### 3. Filtrer par niveau d'erreur

Sélectionnez **"Error"** dans le menu déroulant des niveaux

### 4. Reproduire l'erreur

1. Dans l'émulateur, remplissez le formulaire de création de projet
2. Cliquez sur "Enregistrer"
3. Regardez Logcat en temps réel
4. L'erreur devrait apparaître immédiatement

## 🔧 Corriger les erreurs courantes

### Erreur : "relation 'projects' does not exist"

**Cause** : Le code utilise encore `projects` au lieu de `edl_projects`

**Solution** : Vérifier que les corrections ont été appliquées dans :
- `src/components/project/ProjectCreationWizard.tsx`
- `src/pages/ProjectNewPage.tsx`
- `src/components/ProjectDialog.tsx`

### Erreur : "column 'name' does not exist"

**Cause** : Le champ `name` n'est pas fourni lors de l'insertion

**Solution** : Vérifier que le code génère un `name` avant l'insertion

### Erreur : "permission denied" ou "RLS policy violation"

**Cause** : Problème de permissions Supabase

**Solution** : Vérifier les politiques RLS dans Supabase Dashboard

## 📝 Copier les logs

1. **Sélectionner les lignes d'erreur** dans Logcat
2. **Clic droit > Copy**
3. **Coller** dans un fichier texte ou ici pour analyse

## 🎯 Checklist Debug

- [ ] Logcat ouvert dans Android Studio
- [ ] Filtre appliqué (package ou niveau Error)
- [ ] Erreur reproduite dans l'app
- [ ] Logs d'erreur copiés
- [ ] Erreur analysée et corrigée

## 💡 Astuce

Pour voir **tous** les logs de l'application en temps réel :

1. Dans Logcat, sélectionnez **"Show only selected application"**
2. Sélectionnez votre app dans la liste
3. Tous les logs de l'app apparaîtront en temps réel

