# 🧬 Mutation Testing avec Stryker

## Qu'est-ce que le Mutation Testing ?

Le **mutation testing** (test de mutation) est une technique avancée d'évaluation de la qualité des tests qui va au-delà de la simple couverture de code. Il fonctionne en introduisant de petites modifications (mutations) dans votre code source et en vérifiant si vos tests détectent ces changements.

### Différence avec la couverture de code

- **Couverture de code** : Mesure quelles lignes sont exécutées par les tests
- **Mutation testing** : Mesure si les tests détectent réellement les bugs

**Exemple :**
```typescript
// Code original
function add(a: number, b: number): number {
  return a + b;
}

// Mutation : + devient -
function add(a: number, b: number): number {
  return a - b;  // 🧬 Mutation introduite
}
```

Si vos tests passent toujours avec cette mutation, cela signifie que vos tests ne vérifient pas correctement le comportement de la fonction !

## Métriques de Mutation Testing

### Mutation Score

Le **mutation score** est le pourcentage de mutations détectées par vos tests :

```
Mutation Score = (Mutations Killed / Total Mutations) × 100
```

### Statuts des Mutations

| Statut | Signification | Impact |
|--------|---------------|--------|
| **Killed** ✅ | Test a échoué avec la mutation | ✅ Bon - vos tests détectent le bug |
| **Survived** ❌ | Test a réussi malgré la mutation | ❌ Mauvais - bug non détecté |
| **Timeout** ⏱️ | Test a dépassé le temps limite | ⚠️ Code trop lent ou boucle infinie |
| **No Coverage** 🔍 | Code non couvert par les tests | ❌ Ajoutez des tests |
| **Ignored** ⚪ | Mutation ignorée par configuration | ℹ️ Intentionnel |

## Seuils de Qualité

| Score | Évaluation | Action |
|-------|------------|--------|
| **80%+** | 🎉 Excellent | Tests de très haute qualité |
| **60-79%** | ✅ Bon | Qualité acceptable |
| **50-59%** | ⚠️ Acceptable | Amélioration recommandée |
| **< 50%** | ❌ Insuffisant | Tests à renforcer **URGENT** |

## Configuration

La configuration Stryker se trouve dans `stryker.config.json` :

```json
{
  "mutate": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

## Utilisation

### Exécuter les tests de mutation localement

```bash
# Installer les dépendances
npm install

# Lancer Stryker
npx stryker run

# Rapport HTML généré dans reports/mutation/html
```

### Visualiser le rapport

Le rapport HTML détaillé est disponible dans :
```
reports/mutation/html/index.html
```

Ouvrez ce fichier dans un navigateur pour voir :
- Liste de toutes les mutations
- Code source avec mutations surlignées
- Statut de chaque mutation
- Tests qui ont tué chaque mutation

## Pipeline CI/CD

Les tests de mutation s'exécutent automatiquement :

### Déclencheurs

- **Push** sur `main` (fichiers `src/**`)
- **Pull Request** vers `main` (fichiers `src/**`)
- **Hebdomadaire** : Dimanche à 00:00 UTC
- **Manuel** : Via GitHub Actions UI

### Workflow GitHub Actions

Voir `.github/workflows/mutation-testing.yml`

Le workflow :
1. ✅ Exécute Stryker sur le code frontend
2. 📊 Génère un rapport de mutation
3. 📤 Upload le rapport comme artifact
4. 💬 Commente la PR avec le mutation score
5. ❌ Échoue si le score < 50%

## Types de Mutations

Stryker introduit plusieurs types de mutations :

### 1. Mutations Arithmétiques
```typescript
a + b  →  a - b
a * b  →  a / b
a++    →  a--
```

### 2. Mutations Logiques
```typescript
a && b  →  a || b
a > b   →  a < b
a === b →  a !== b
```

### 3. Mutations de Conditions
```typescript
if (condition)  →  if (true)
if (condition)  →  if (false)
while (x < 10)  →  while (false)
```

### 4. Mutations de Retour
```typescript
return value  →  return null
return true   →  return false
```

### 5. Mutations de String
```typescript
"hello"  →  ""
"test"   →  "Stryker was here!"
```

## Améliorer le Mutation Score

### 1. Ajouter des assertions précises

❌ **Mauvais** :
```typescript
test('should add numbers', () => {
  const result = add(2, 3);
  expect(result).toBeDefined();  // Trop vague
});
```

✅ **Bon** :
```typescript
test('should add numbers', () => {
  const result = add(2, 3);
  expect(result).toBe(5);  // Assertion précise
});
```

### 2. Tester les cas limites

```typescript
test('should handle edge cases', () => {
  expect(add(0, 0)).toBe(0);
  expect(add(-1, 1)).toBe(0);
  expect(add(Number.MAX_VALUE, 1)).toBe(Number.MAX_VALUE + 1);
});
```

### 3. Tester les conditions

```typescript
test('should validate all conditions', () => {
  expect(isValid(true, true)).toBe(true);
  expect(isValid(true, false)).toBe(false);
  expect(isValid(false, true)).toBe(false);
  expect(isValid(false, false)).toBe(false);
});
```

### 4. Tester les erreurs

```typescript
test('should throw error for invalid input', () => {
  expect(() => divide(10, 0)).toThrow('Division by zero');
});
```

## Limitations

### Edge Functions (Deno)

⚠️ **Note importante** : Stryker ne supporte pas nativement Deno. Les edge functions Supabase ne sont donc **pas testées** par Stryker.

**Pourquoi ?**
- Stryker est conçu pour Node.js/npm
- Edge functions utilisent Deno avec son propre runtime
- Incompatibilité entre les deux écosystèmes

**Solution de contournement** :
- Les tests de mutation couvrent uniquement le code frontend (`src/**`)
- Pour les edge functions : se concentrer sur les tests unitaires et d'intégration
- Utiliser une couverture de code élevée (>80%) comme proxy de qualité

## Bonnes Pratiques

### 1. Exécuter régulièrement

- **Localement** : Avant chaque commit important
- **CI/CD** : Automatiquement sur chaque PR
- **Hebdomadaire** : Pour détecter les régressions

### 2. Priorités

1. Corriger les mutations **Survived** dans le code critique
2. Ajouter des tests pour le code **No Coverage**
3. Investiguer les **Timeout** (boucles infinies possibles)
4. Viser un score >80% pour le code critique

### 3. Performance

- Utiliser `concurrency` pour paralléliser
- Exclure les fichiers de configuration
- Utiliser `ignoreStatic` pour ignorer les constantes

### 4. Interpréter les résultats

- **Score élevé** ne garantit pas un code parfait
- **Score bas** indique des tests insuffisants
- Se concentrer sur le code métier critique
- Accepter un score plus bas pour le code d'infrastructure

## Ressources

- [Documentation Stryker](https://stryker-mutator.io/)
- [Mutation Testing Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)
- [Best Practices](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/)

## FAQ

### Q: Pourquoi les tests de mutation sont-ils lents ?
**R:** Stryker doit exécuter vos tests pour chaque mutation. Si vous avez 1000 mutations et 100 tests, cela peut prendre du temps. Utilisez `concurrency` et `timeoutMS` pour optimiser.

### Q: Dois-je viser 100% de mutation score ?
**R:** Non, 80%+ est excellent. 100% est rarement nécessaire et peut être coûteux en temps.

### Q: Quand ignorer une mutation survived ?
**R:** Pour le code d'infrastructure non critique, les getters/setters simples, ou quand ajouter un test serait artificiel.

### Q: Comment réduire le temps d'exécution ?
**R:**
- Augmenter `concurrency`
- Réduire `timeoutMS`
- Exclure les fichiers non critiques
- Utiliser `coverageAnalysis: "perTest"`

---

**Prochaine étape** : Exécutez `npx stryker run` et améliorez votre mutation score ! 🎯
