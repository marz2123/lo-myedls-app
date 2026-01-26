# GitHub Actions CI/CD Pipeline

Ce dossier contient les workflows GitHub Actions pour automatiser les tests et le déploiement des edge functions.

## Workflow: Edge Functions CI/CD

Le workflow `edge-functions-ci.yml` s'exécute automatiquement lors des push et pull requests qui modifient les edge functions.

### Jobs du Pipeline

#### 1. **Test** (Tests unitaires)
- Exécute tous les tests unitaires des edge functions
- Vérifie le linting du code avec Deno
- Effectue une vérification de types TypeScript
- Se déclenche sur chaque push/PR

#### 2. **Integration Test** (Tests d'intégration)
- Exécute les tests d'intégration E2E avec une vraie base Supabase
- Teste l'authentification, les permissions RLS, et les opérations DB
- Nécessite que les tests unitaires passent d'abord
- Utilise des variables d'environnement sécurisées (secrets)

#### 3. **Deploy** (Déploiement)
- Déploie automatiquement les edge functions vers Supabase
- Ne s'exécute que sur la branche `main` après push
- Nécessite que tous les tests (unitaires + intégration) passent
- Déploie toutes les functions en une seule fois

#### 4. **Notify** (Notifications)
- Envoie des notifications sur le statut du déploiement
- Affiche un message de succès ✅ ou d'échec ❌
- Toujours exécuté, même si le déploiement échoue

## Configuration Requise

### Secrets GitHub

Les secrets suivants doivent être configurés dans les paramètres du repository GitHub:

```
SUPABASE_URL              # URL du projet Supabase
SUPABASE_ANON_KEY         # Clé anonyme Supabase
SUPABASE_SERVICE_ROLE_KEY # Clé service role (admin)
SUPABASE_PROJECT_REF      # Référence du projet Supabase
SUPABASE_ACCESS_TOKEN     # Token d'accès pour déploiement
LOVABLE_API_KEY           # Clé API Lovable pour les tests
```

### Comment ajouter les secrets:
1. Aller dans Settings → Secrets and variables → Actions
2. Cliquer sur "New repository secret"
3. Ajouter chaque secret avec son nom et sa valeur

## Utilisation

### Déclenchement automatique

Le pipeline se déclenche automatiquement quand:
- Vous faites un `git push` vers `main` avec des modifications dans `supabase/functions/`
- Vous créez une pull request qui modifie des edge functions

### Exécution manuelle locale

Pour exécuter les tests localement avant de push:

```bash
# Tests unitaires
deno test --allow-net --allow-env supabase/functions/**/*.test.ts

# Tests d'intégration (nécessite variables d'env)
export SUPABASE_URL="votre_url"
export SUPABASE_ANON_KEY="votre_clé"
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service"
export LOVABLE_API_KEY="votre_clé_lovable"
deno test --allow-net --allow-env supabase/functions/**/*.integration.test.ts

# Linting
deno lint supabase/functions/**/*.ts

# Type checking
deno check supabase/functions/**/index.ts
```

## Résultats des Tests

Les résultats des tests sont visibles dans:
- L'onglet "Actions" du repository GitHub
- Les checks de status sur les pull requests
- Les logs détaillés de chaque job

## Stratégie de Déploiement

### Protection de la branche main
Il est recommandé de:
1. Activer la protection de branche pour `main`
2. Exiger que tous les tests passent avant merge
3. Exiger au moins une revue de code

### Rollback en cas d'erreur
Si un déploiement échoue:
1. Le workflow s'arrête et notifie l'échec
2. Les functions précédentes restent déployées (pas de downtime)
3. Corrigez le problème et poussez un nouveau commit

## Structure des Tests

```
supabase/functions/
├── extract-tasks/
│   ├── index.ts                    # Code de la fonction
│   ├── index.test.ts               # Tests unitaires
│   └── index.integration.test.ts   # Tests d'intégration E2E
├── import-taxonomy/
│   ├── index.ts
│   ├── index.test.ts
│   └── index.integration.test.ts
└── README.test.md                  # Documentation des tests
```

## Bonnes Pratiques

1. **Toujours écrire des tests** pour les nouvelles fonctionnalités
2. **Exécuter les tests localement** avant de push
3. **Ne jamais merger** si les tests échouent
4. **Vérifier les logs** en cas d'échec du pipeline
5. **Garder les secrets à jour** dans GitHub

## Métriques et Monitoring

Le pipeline affiche:
- ⏱️ Temps d'exécution de chaque job
- ✅ Nombre de tests passés
- ❌ Détails des tests échoués
- 📊 Couverture de code (si configurée)
