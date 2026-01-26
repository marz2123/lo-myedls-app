# Configuration Supabase Partagé - MyEDLS & MyHome

## 🎯 Concept

MyEDLS et MyHome ERP utilisent le **même projet Supabase**. Cela permet de :
- ✅ Partager l'authentification (même compte utilisateur)
- ✅ Centraliser la gestion des utilisateurs
- ✅ Réutiliser les données communes si nécessaire
- ✅ Simplifier la maintenance

## 📊 Architecture des Tables

### Tables Partagées (MyHome)

Ces tables sont gérées par MyHome et peuvent être lues par MyEDLS :

- `profiles` - Profils utilisateurs
- `organizations` - Organisations/clients
- `projects` - Projets (si partagés)

### Tables Spécifiques MyEDLS

Pour éviter les conflits, préfixez les tables MyEDLS avec `myedls_` :

- `myedls_visit_sessions` - Sessions de visite
- `myedls_detected_blocks` - Blocs/zones détectés
- `myedls_extracted_frames` - Photos capturées
- `myedls_audio_segments` - Segments audio transcrits
- `myedls_extracted_tasks` - Tâches générées
- `myedls_projects` - Projets spécifiques MyEDLS (si séparés)

## 🔐 Politiques de Sécurité (RLS)

### Exemple de Politique pour MyEDLS

Dans le dashboard Supabase, créez des politiques RLS pour les tables MyEDLS :

```sql
-- Exemple : Les utilisateurs ne peuvent voir que leurs propres visites
CREATE POLICY "Users can view their own visits"
ON myedls_visit_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Exemple : Les utilisateurs peuvent créer leurs propres visites
CREATE POLICY "Users can create their own visits"
ON myedls_visit_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### Partage avec MyHome

Si vous voulez que MyHome puisse accéder aux données MyEDLS :

```sql
-- Permettre à MyHome de lire les visites (via service_role ou fonction)
-- Cette politique peut être plus permissive selon vos besoins
```

## 🔑 Configuration des Clés

### Clés à Utiliser

- ✅ **Côté Client (MyEDLS App)** : `anon/public` key
- ✅ **Edge Functions** : `service_role` key (automatique dans Supabase)
- ❌ **Jamais côté client** : `service_role` key

### Variables d'Environnement

Dans `.env.local` :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_clé_anon_public
```

## 🔄 Synchronisation des Utilisateurs

### Scénario 1 : Utilisateur existe déjà dans MyHome

1. L'utilisateur se connecte à MyEDLS avec les mêmes identifiants
2. Supabase reconnaît l'utilisateur (même `auth.users` table)
3. L'utilisateur accède automatiquement à MyEDLS

### Scénario 2 : Nouvel utilisateur via MyEDLS

1. L'utilisateur s'inscrit via MyEDLS
2. Un profil est créé dans `profiles` (si la table existe)
3. L'utilisateur peut ensuite utiliser MyHome avec le même compte

## 📝 Migration des Données Existantes

Si vous avez déjà des données MyEDLS dans un projet Supabase séparé :

1. **Export des données** depuis l'ancien projet
2. **Import dans le projet partagé** avec préfixe `myedls_`
3. **Mise à jour des types TypeScript** :
   ```bash
   npx supabase gen types typescript --project-id votre-projet-id > src/integrations/supabase/types.ts
   ```

## 🧪 Tests de Compatibilité

### Checklist

- [ ] Les utilisateurs MyHome peuvent se connecter à MyEDLS
- [ ] Les utilisateurs MyEDLS peuvent se connecter à MyHome
- [ ] Les données MyEDLS sont isolées (préfixe `myedls_`)
- [ ] Les politiques RLS fonctionnent correctement
- [ ] Les Edge Functions MyEDLS fonctionnent avec le projet partagé
- [ ] Le stockage (Storage) est configuré correctement

### Test de Connexion

1. Créez un compte dans MyHome
2. Connectez-vous à MyEDLS avec les mêmes identifiants
3. Vérifiez que l'authentification fonctionne
4. Testez la création d'une visite dans MyEDLS
5. Vérifiez que les données sont bien sauvegardées

## 🚨 Points d'Attention

### Conflits de Noms

⚠️ **Important** : Vérifiez qu'il n'y a pas de conflits de noms de tables entre MyHome et MyEDLS.

Solution : Utilisez toujours le préfixe `myedls_` pour les tables spécifiques.

### Quotas Supabase

Le projet partagé utilise les mêmes quotas :
- Stockage
- Bandwidth
- Database size
- Edge Functions invocations

Surveillez l'utilisation dans le dashboard Supabase.

### Edge Functions

Les Edge Functions MyEDLS sont dans :
```
supabase/functions/
```

Elles fonctionnent avec le projet partagé automatiquement.

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentation Supabase Multi-tenancy](https://supabase.com/docs/guides/auth/multi-factor-auth)
- [ENV_SETUP.md](./ENV_SETUP.md) - Configuration des variables d'environnement

