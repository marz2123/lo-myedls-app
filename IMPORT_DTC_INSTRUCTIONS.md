# 📥 Instructions d'Import DTC

## ✅ Le script fonctionne !

Le script a été créé et testé. Il a trouvé et parsé votre fichier `dtc.csv` :
- ✅ 28 familles
- ✅ 168 catégories  
- ✅ 1008 sous-catégories
- ✅ 16 992 tâches

## ⚠️ Problème : RLS (Row Level Security)

L'erreur `new row violates row-level security policy` signifie que les politiques de sécurité Supabase bloquent l'insertion.

## 🔧 Solution : Utiliser la clé SERVICE_ROLE

### Étape 1 : Récupérer la clé SERVICE_ROLE

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet MyHome
3. Allez dans **Settings → API**
4. Copiez la clé **service_role** (⚠️ **SECRÈTE**, ne la partagez jamais !)

### Étape 2 : Ajouter la clé dans .env.local

Ouvrez `.env.local` et ajoutez :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_secrète
```

### Étape 3 : Exécuter l'import

```bash
npm run import:dtc
```

Ou directement :

```bash
node scripts/import-dtc.js
```

### Étape 4 : Spécifier un chemin personnalisé (si le fichier n'est pas dans public/data/dtc.csv)

```bash
node scripts/import-dtc.js "C:\Users\VotreNom\Documents\dtc.csv"
```

## 📊 Résultat attendu

Après l'import, vous devriez voir :

```
🎉 Import terminé avec succès !

📊 Résumé final:
   - 28 familles (FT)
   - 168 catégories (CT)
   - 1008 sous-catégories (SC)
   - 16992 tâches (T)

✅ Vérification:
   - 28 familles en base
   - 168 catégories en base
   - 1008 sous-catégories en base
   - 16992 tâches en base
```

## 🔐 Sécurité

⚠️ **IMPORTANT** : La clé `SERVICE_ROLE_KEY` est **très sensible** :
- Ne la commitez **JAMAIS** dans Git
- Ne la partagez **JAMAIS**
- Utilisez-la **uniquement** pour les scripts d'import/administration
- Le fichier `.env.local` est déjà dans `.gitignore`

## 🐛 Dépannage

### Erreur : "Cannot find module"
→ Exécutez `npm install` pour installer les dépendances

### Erreur : "Fichier dtc.csv introuvable"
→ Spécifiez le chemin complet : `node scripts/import-dtc.js "chemin/vers/dtc.csv"`

### Erreur : "RLS policy violation"
→ Utilisez la clé `SERVICE_ROLE_KEY` au lieu de `VITE_SUPABASE_PUBLISHABLE_KEY`

### Erreur : "JWT expired" ou "Invalid API key"
→ Vérifiez que vos clés Supabase sont correctes dans `.env.local`
