# Scripts de Couverture de Code

Ce dossier contient les scripts utilisés par le pipeline CI/CD pour analyser et suivre la couverture de code des edge functions.

## Scripts disponibles

### 1. `coverage-summary.ts`

Génère un rapport détaillé de couverture de code à partir d'un fichier LCOV.

**Usage:**
```bash
deno run --allow-read --allow-write scripts/coverage-summary.ts coverage.lcov
```

**Fonctionnalités:**
- Parse le fichier LCOV généré par Deno
- Calcule les métriques globales (lignes, fonctions, branches)
- Génère un rapport Markdown formaté
- Crée un fichier `coverage-summary.md` pour les commentaires de PR
- Affiche des indicateurs visuels (🟢🟡🔴) selon les seuils

**Métriques calculées:**
- **Lignes:** Pourcentage de lignes de code couvertes par les tests
- **Fonctions:** Pourcentage de fonctions testées
- **Branches:** Pourcentage de branches conditionnelles testées

**Seuils de couleur:**
- 🟢 Excellent: ≥ 80%
- 🟡 Bon: 60-79%
- 🔴 Besoin d'amélioration: < 60%

### 2. `check-coverage-threshold.ts`

Vérifie que la couverture de code respecte un seuil minimum et échoue le CI si ce n'est pas le cas.

**Usage:**
```bash
deno run --allow-read scripts/check-coverage-threshold.ts coverage.lcov 80
```

**Arguments:**
- `coverage.lcov` : Fichier de couverture à analyser
- `80` : Seuil minimum requis (en pourcentage)

**Fonctionnalités:**
- Valide que la couverture atteint le seuil configuré
- Affiche le déficit si le seuil n'est pas atteint
- Calcule combien de lignes supplémentaires doivent être couvertes
- Sort avec code 1 si le seuil n'est pas atteint (échec du CI)

**Exemple de sortie:**
```
📊 Coverage Threshold Check
──────────────────────────────────────────────────
Current Coverage: 75.50%
Required Threshold: 80%
Lines Covered: 151/200
──────────────────────────────────────────────────
❌ Coverage threshold not met! (75.50% < 80%)
   Need 4.50% more coverage to pass
   Cover 9 more line(s) to reach threshold
```

### 3. `generate-coverage-badge.ts`

Génère un badge SVG affichant le pourcentage de couverture de code.

**Usage:**
```bash
deno run --allow-read --allow-write scripts/generate-coverage-badge.ts coverage.lcov
```

**Fonctionnalités:**
- Crée un badge SVG personnalisé
- Adapte la couleur selon le pourcentage
- Génère le markdown pour l'intégration dans README
- Sauvegarde le badge dans `coverage-badge.svg`

**Couleurs:**
- Vert (brightgreen): ≥ 80%
- Jaune (yellow): 60-79%
- Orange (orange): 40-59%
- Rouge (red): < 40%

## Intégration dans le CI/CD

Ces scripts sont automatiquement exécutés par le workflow GitHub Actions `.github/workflows/edge-functions-ci.yml`:

1. **Tests avec couverture:** `deno test --coverage=coverage`
2. **Génération du rapport LCOV:** `deno coverage coverage --lcov`
3. **Analyse et résumé:** `coverage-summary.ts`
4. **Vérification du seuil:** `check-coverage-threshold.ts`
5. **Upload vers Codecov:** Automatique via GitHub Actions

## Utilisation locale

Pour analyser la couverture localement:

```bash
# 1. Exécuter les tests avec couverture
deno test --allow-net --allow-env --coverage=coverage supabase/functions/**/*.test.ts

# 2. Générer le rapport LCOV
deno coverage coverage --lcov --output=coverage.lcov

# 3. Afficher le résumé
deno run --allow-read --allow-write scripts/coverage-summary.ts coverage.lcov

# 4. Vérifier le seuil
deno run --allow-read scripts/check-coverage-threshold.ts coverage.lcov 80

# 5. Générer le badge
deno run --allow-read --allow-write scripts/generate-coverage-badge.ts coverage.lcov
```

## Configuration des seuils

Le seuil de couverture par défaut est de **80%**. Pour le modifier:

1. Éditer `.github/workflows/edge-functions-ci.yml`
2. Changer la valeur du paramètre dans la step "Check coverage threshold"
3. Recommandations:
   - Minimum acceptable: 60%
   - Bon objectif: 80%
   - Excellence: 90%+

## Fichiers générés

Les scripts créent les fichiers suivants:

- `coverage.lcov` : Rapport de couverture au format LCOV
- `coverage-summary.md` : Résumé formaté en Markdown
- `coverage-badge.svg` : Badge SVG de couverture

Ces fichiers sont utilisés par:
- GitHub Actions pour les commentaires de PR
- Codecov pour le suivi historique
- README pour l'affichage du badge

## Métriques suivies

### Couverture des lignes
Pourcentage de lignes de code exécutées par les tests. C'est la métrique principale.

### Couverture des fonctions
Pourcentage de fonctions appelées au moins une fois par les tests.

### Couverture des branches
Pourcentage de branches conditionnelles (if/else, switch, etc.) testées dans tous les cas possibles.

## Bonnes pratiques

1. **Maintenir au moins 80% de couverture** sur les edge functions critiques
2. **Tester tous les chemins d'erreur** (validation, authentification, rate limiting)
3. **Ne pas viser 100%** - focus sur les tests utiles, pas la métrique
4. **Ajouter des tests avant de corriger des bugs** pour éviter les régressions
5. **Examiner les fichiers avec faible couverture** lors des revues de code

## Exclusions

Pour exclure des fichiers de la couverture, modifier le workflow CI/CD:

```yaml
- name: Generate coverage report
  run: |
    deno coverage coverage --lcov --exclude="test_utils" --output=coverage.lcov
```

## Debugging

Si les scripts échouent:

1. Vérifier que le fichier LCOV existe et est valide
2. S'assurer que Deno a les permissions nécessaires
3. Consulter les logs du workflow GitHub Actions
4. Exécuter localement avec `--log-level debug`
