# 🔧 Solution : Erreur "operator does not exist: bigint = uuid"

## 🐛 Problème Identifié

L'erreur vient d'un **trigger de synchronisation automatique** dans MyHome qui essaie de synchroniser `edl_projects` vers `projects`.

Le problème :
- `edl_projects.id` est de type **UUID**
- `projects.id` dans MyHome est probablement de type **bigint**
- La fonction de synchronisation compare directement les deux → **Erreur de type**

## ✅ Solutions

### Solution 1 : Désactiver le Trigger (Rapide)

Exécutez cette commande SQL dans le **Supabase Dashboard > SQL Editor** :

```sql
DROP TRIGGER IF EXISTS sync_edl_projects_to_projects_trigger ON public.edl_projects;
```

**Avantages** :
- ✅ Solution immédiate
- ✅ Pas de synchronisation automatique (mais ce n'est peut-être pas nécessaire)

**Inconvénients** :
- ❌ Pas de synchronisation automatique entre les deux tables

### Solution 2 : Corriger la Fonction (Recommandé)

Exécutez le script SQL dans `FIX_SYNC_TRIGGER.sql` dans le **Supabase Dashboard > SQL Editor**.

Cette solution :
- ✅ Détecte automatiquement le type de `projects.id`
- ✅ Skip la synchronisation si les types sont incompatibles
- ✅ Continue à fonctionner si les types sont compatibles

### Solution 3 : Vérifier le Type de `projects.id`

Dans Supabase Dashboard > SQL Editor, exécutez :

```sql
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'projects' 
  AND column_name = 'id';
```

Si le résultat est `bigint`, alors utilisez la **Solution 1** ou **Solution 2**.

## 📋 Étapes pour Appliquer la Solution

### Option A : Désactiver le Trigger (5 minutes)

1. **Ouvrir Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionner votre projet MyHome**
3. **Aller dans SQL Editor**
4. **Exécuter** :
   ```sql
   DROP TRIGGER IF EXISTS sync_edl_projects_to_projects_trigger ON public.edl_projects;
   ```
5. **Tester** : Créer un nouveau projet EDL dans l'app

### Option B : Corriger la Fonction (10 minutes)

1. **Ouvrir Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionner votre projet MyHome**
3. **Aller dans SQL Editor**
4. **Ouvrir le fichier** `FIX_SYNC_TRIGGER.sql`
5. **Copier tout le contenu**
6. **Coller dans SQL Editor**
7. **Exécuter**
8. **Tester** : Créer un nouveau projet EDL dans l'app

## 🧪 Test Après Correction

1. **Synchroniser le code** :
   ```bash
   npm run mobile:sync
   ```

2. **Relancer l'app dans Android Studio**

3. **Créer un nouveau projet EDL** :
   - Remplir le formulaire
   - Cliquer sur "Enregistrer"
   - Vérifier que ça fonctionne

4. **Vérifier dans Supabase** :
   - Dashboard > Table Editor > `edl_projects`
   - Vérifier que le projet apparaît

## 📝 Note

Si vous n'avez pas besoin de synchronisation automatique entre `projects` et `edl_projects`, la **Solution 1** (désactiver le trigger) est la plus simple et la plus rapide.

## 🔍 Vérification

Après avoir appliqué la solution, les logs dans Logcat devraient montrer :
- ✅ Plus d'erreur `bigint = uuid`
- ✅ Le projet est créé avec succès
- ✅ Message "Projet créé avec succès" dans l'app

