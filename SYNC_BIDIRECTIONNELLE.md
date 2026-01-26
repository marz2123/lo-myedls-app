# 🔄 Synchronisation Bidirectionnelle MyEDLS ↔ MyHome

## ✅ Situation Actuelle

Après les modifications récentes, **MyEDLS utilise maintenant exclusivement la table `edl_projects`** pour tous les projets EDL. La synchronisation avec MyHome fonctionne via un **trigger SQL automatique**.

## 📊 Architecture de Synchronisation

### Tables Utilisées

1. **`edl_projects`** (MyEDLS)
   - Table principale pour tous les projets EDL
   - Type ID : `UUID`
   - Utilisée par : **MyEDLS uniquement**

2. **`projects`** (MyHome)
   - Table générale MyHome pour tous types de projets
   - Type ID : `bigint` ou `UUID` (selon version)
   - Utilisée par : **MyHome**

### Trigger de Synchronisation

Un trigger SQL automatique (`sync_edl_projects_to_projects`) synchronise **uniquement dans un sens** :

```
edl_projects (MyEDLS) → projects (MyHome)
```

**Fichier** : `FIX_SYNC_TRIGGER.sql`

## 🔄 Comment Ça Fonctionne

### 1. Création d'un EDL dans MyEDLS

1. L'utilisateur crée un projet EDL dans MyEDLS
2. Le projet est inséré dans `edl_projects`
3. **Le trigger SQL se déclenche automatiquement**
4. Le projet est synchronisé vers `projects` (si compatible)
5. **MyHome voit le projet dans `projects`** ✅

### 2. Création d'un EDL dans MyHome

1. L'utilisateur crée un projet EDL dans MyHome
2. Le projet est inséré dans `projects`
3. **Pour que MyEDLS le voie, il faut :**
   - Soit que MyHome insère aussi dans `edl_projects`
   - Soit créer un trigger inverse (`projects` → `edl_projects`)

### 3. Modification d'un EDL

- **Modification dans MyEDLS** : 
  - Modifie `edl_projects`
  - Le trigger met à jour `projects`
  - MyHome voit les modifications ✅

- **Modification dans MyHome** :
  - Modifie `projects`
  - **MyEDLS ne voit pas les modifications** ❌
  - (Sauf si trigger inverse créé)

## ⚠️ Limitations Actuelles

### Synchronisation Unidirectionnelle

Le trigger actuel synchronise **uniquement** :
- ✅ `edl_projects` → `projects` (MyEDLS → MyHome)

**Il n'y a PAS de synchronisation inverse** :
- ❌ `projects` → `edl_projects` (MyHome → MyEDLS)

### Conséquences

1. **EDLs créés dans MyEDLS** → ✅ Visibles dans MyHome (via trigger)
2. **EDLs créés dans MyHome** → ❌ **NON visibles dans MyEDLS** (pas de trigger inverse)
3. **Modifications dans MyEDLS** → ✅ Visibles dans MyHome
4. **Modifications dans MyHome** → ❌ **NON visibles dans MyEDLS**

## 🔧 Solutions Possibles

### Option 1 : Trigger Bidirectionnel (Recommandé)

Créer un trigger inverse pour synchroniser `projects` → `edl_projects` :

```sql
-- Trigger inverse : projects → edl_projects
CREATE OR REPLACE FUNCTION sync_projects_to_edl_projects()
RETURNS TRIGGER AS $$
BEGIN
  -- Éviter les boucles
  IF NEW.sync_from_edl_projects = true THEN
    RETURN NEW;
  END IF;

  -- Vérifier si c'est un projet EDL (peut utiliser un champ spécifique)
  -- Par exemple : NEW.project_type = 'edl' ou NEW.is_edl = true
  
  -- Insérer ou mettre à jour dans edl_projects
  INSERT INTO public.edl_projects (
    id, user_id, name, property_type, address, ...
  )
  VALUES (
    NEW.id, NEW.user_id, NEW.name, NEW.property_type, NEW.address, ...
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = NEW.user_id,
    name = NEW.name,
    ...
    sync_from_projects = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_projects_to_edl_projects_trigger
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_projects_to_edl_projects();
```

### Option 2 : MyHome Lit Directement `edl_projects`

Modifier MyHome pour qu'il lise directement depuis `edl_projects` au lieu de `projects` :

- ✅ Pas besoin de synchronisation
- ✅ Données toujours à jour
- ⚠️ Nécessite des modifications dans MyHome

### Option 3 : Double Insertion

Modifier MyHome pour qu'il insère dans **les deux tables** lors de la création d'un EDL :

```typescript
// Dans MyHome, lors de la création d'un EDL
await supabase.from('edl_projects').insert(edlData);
await supabase.from('projects').insert(projectData);
```

## 🎯 Recommandation

**Pour une synchronisation bidirectionnelle complète**, je recommande :

1. **Créer le trigger inverse** (`projects` → `edl_projects`)
2. **Ajouter un champ** dans `projects` pour identifier les projets EDL (ex: `is_edl BOOLEAN`)
3. **Tester la synchronisation** dans les deux sens

## 📝 Checklist de Vérification

### Synchronisation MyEDLS → MyHome

- [x] MyEDLS utilise `edl_projects`
- [x] Trigger `sync_edl_projects_to_projects` actif
- [x] EDLs créés dans MyEDLS apparaissent dans MyHome
- [x] Modifications dans MyEDLS apparaissent dans MyHome

### Synchronisation MyHome → MyEDLS

- [ ] Trigger inverse créé (`projects` → `edl_projects`)
- [ ] EDLs créés dans MyHome apparaissent dans MyEDLS
- [ ] Modifications dans MyHome apparaissent dans MyEDLS
- [ ] Test de synchronisation bidirectionnelle réussi

## 🧪 Tests à Effectuer

### Test 1 : Création MyEDLS → MyHome

1. Créer un EDL dans MyEDLS
2. Vérifier qu'il apparaît dans MyHome
3. ✅ **Devrait fonctionner** (trigger actif)

### Test 2 : Création MyHome → MyEDLS

1. Créer un EDL dans MyHome
2. Vérifier qu'il apparaît dans MyEDLS
3. ❌ **Ne fonctionne PAS actuellement** (pas de trigger inverse)

### Test 3 : Modification Bidirectionnelle

1. Modifier un EDL dans MyEDLS → Vérifier dans MyHome ✅
2. Modifier un EDL dans MyHome → Vérifier dans MyEDLS ❌

## 📚 Fichiers Importants

- `FIX_SYNC_TRIGGER.sql` - Trigger `edl_projects` → `projects`
- `SYNC_WITH_MYHOME.md` - Documentation générale
- `src/integrations/supabase/client.ts` - Client Supabase partagé

## 🚀 Prochaines Étapes

1. **Vérifier** que le trigger actuel fonctionne (MyEDLS → MyHome)
2. **Créer le trigger inverse** si nécessaire (MyHome → MyEDLS)
3. **Tester** la synchronisation dans les deux sens
4. **Documenter** les résultats

---

**Note** : Les deux applications partagent la **même base de données Supabase**, donc les données sont accessibles directement. La synchronisation via triggers est principalement pour maintenir la cohérence entre les deux tables (`edl_projects` et `projects`).

