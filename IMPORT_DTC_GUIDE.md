# 📥 Guide d'Import du DTC dans Supabase

## 🎯 Objectif
Importer les **16 992 tâches** du fichier `dtc.csv` dans les tables Supabase.

## ✅ Prérequis
- Les tables DTC sont créées (voir `create_dtc_tables.sql`)
- Le fichier `public/data/dtc.csv` existe
- Vous avez accès à Supabase avec les bonnes permissions

---

## 🚀 Méthode 1 : Via l'Interface Admin (Recommandé)

### Étape 1 : Accéder à l'interface d'import

1. **Ouvrir l'application MyEDLS**
2. **Aller dans la page Admin** : `/admin`
3. **Chercher la section "Structure DSC"** ou "DSC Admin"
4. **Utiliser le composant DSCImporter**

### Étape 2 : Importer le fichier

1. **Cliquer sur "Autre fichier"** ou "Upload custom file"
2. **Sélectionner le fichier** `public/data/dtc.csv`
3. **Attendre la fin de l'import** (~2-5 minutes pour 16 992 tâches)
4. **Vérifier les statistiques** affichées

### Résultat attendu :
- ✅ ~28 familles (FT)
- ✅ ~168 catégories (CT)
- ✅ ~1008 sous-catégories (SC)
- ✅ ~16 992 tâches (T)

---

## 🔧 Méthode 2 : Via la Fonction Edge `import-dsc`

### Étape 1 : Préparer le fichier CSV

Le fichier `public/data/dtc.csv` doit être accessible.

### Étape 2 : Appeler la fonction Edge

**Option A : Via le code JavaScript/TypeScript**

```typescript
import { supabase } from '@/integrations/supabase/client';

// Lire le fichier CSV
const response = await fetch('/data/dtc.csv');
const csvContent = await response.text();

// Appeler la fonction Edge
const { data, error } = await supabase.functions.invoke('import-dsc', {
  body: { 
    csvContent, 
    clearExisting: true  // Remplace les données existantes
  }
});

if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Import réussi:', data.stats);
  // data.stats contient: { familles, categories, sousCategories, taches }
}
```

**Option B : Via la console du navigateur**

1. Ouvrir la console du navigateur (F12)
2. Exécuter :

```javascript
// Lire le fichier CSV
const response = await fetch('/data/dtc.csv');
const csvContent = await response.text();

// Appeler la fonction Edge
const { data, error } = await supabase.functions.invoke('import-dsc', {
  body: { csvContent, clearExisting: true }
});

console.log('Résultat:', data, error);
```

---

## 🛠️ Méthode 3 : Via un Script Node.js (Avancé)

### Étape 1 : Installer les dépendances

```bash
npm install @supabase/supabase-js
```

### Étape 2 : Créer un script d'import

Voir le fichier `import_dtc.js` (à adapter selon votre configuration)

### Étape 3 : Exécuter le script

```bash
node import_dtc.js
```

---

## ✅ Vérification après Import

### Dans Supabase SQL Editor :

```sql
-- Vérifier les compteurs
SELECT 
  'Familles (FT)' as niveau, COUNT(*) as total FROM ft_familles
UNION ALL
SELECT 'Catégories (CT)', COUNT(*) FROM ct_categories
UNION ALL
SELECT 'Sous-catégories (SC)', COUNT(*) FROM sc_sous_categories
UNION ALL
SELECT 'Tâches (T)', COUNT(*) FROM t_taches;
```

### Résultats attendus :
- `ft_familles`: ~28
- `ct_categories`: ~168
- `sc_sous_categories`: ~1008
- `t_taches`: ~16 992

---

## ⚠️ Notes Importantes

1. **Temps d'import** : L'import de 16 992 tâches peut prendre **2-5 minutes**
2. **clearExisting** : Si `true`, toutes les données existantes seront supprimées avant l'import
3. **Permissions** : Vous devez avoir les droits d'écriture sur les tables DTC
4. **Format CSV** : Le fichier doit utiliser le séparateur `;` (point-virgule)

---

## 🐛 Dépannage

### Erreur : "relation does not exist"
→ Les tables n'existent pas. Exécutez d'abord `create_dtc_tables.sql`

### Erreur : "permission denied"
→ Vérifiez vos permissions Supabase (RLS policies)

### Erreur : "timeout"
→ L'import est trop long. Essayez d'augmenter le timeout ou d'importer par batch plus petits

### Erreur : "invalid CSV format"
→ Vérifiez que le fichier utilise bien le séparateur `;` et l'encodage UTF-8

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs de la fonction Edge dans Supabase Dashboard
2. La console du navigateur pour les erreurs JavaScript
3. Les permissions RLS sur les tables DTC
