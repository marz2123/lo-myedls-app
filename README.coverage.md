# Code Coverage

![Coverage](./coverage-badge.svg)

> 💡 **Note** : La couverture de code mesure **quelle partie du code est exécutée** par les tests. Pour mesurer **si vos tests détectent réellement les bugs**, consultez [README.mutation.md](./README.mutation.md) sur le **mutation testing**.

## Aperçu de la couverture

Ce projet maintient une couverture de code minimale de **80%** pour garantir la qualité et la fiabilité des edge functions.

### Métriques actuelles

La couverture est automatiquement calculée et affichée dans les pull requests. Les rapports détaillés sont disponibles sur [Codecov](https://codecov.io).

### Objectifs de couverture

| Composant | Seuil minimum | Objectif |
|-----------|---------------|----------|
| Edge Functions | 80% | 90% |
| Validation & Auth | 90% | 95% |
| Business Logic | 85% | 90% |
| Error Handling | 80% | 85% |

## Comment améliorer la couverture

### 1. Identifier les zones non couvertes

Exécutez les tests avec couverture localement:

```bash
# Générer le rapport de couverture
deno test --allow-net --allow-env --coverage=coverage supabase/functions/**/*.test.ts

# Visualiser le rapport HTML
deno coverage coverage --html
open coverage/html/index.html
```

### 2. Zones prioritaires à tester

Focus sur:
- ✅ **Validation des entrées** - Toujours tester les cas limites
- ✅ **Gestion des erreurs** - Chaque catch doit être testé
- ✅ **Authentification** - Cas avec/sans token, token invalide
- ✅ **Rate limiting** - Tests de dépassement de limite
- ✅ **Chemins conditionnels** - Toutes les branches if/else

### 3. Types de tests à écrire

#### Tests unitaires
Testent des fonctions isolées sans dépendances externes.

```typescript
Deno.test("validateInput: should reject empty content", () => {
  const result = validateInput({ content: "" });
  assertEquals(result.valid, false);
});
```

#### Tests d'intégration
Testent les edge functions avec une vraie base de données.

```typescript
Deno.test("Integration: extract-tasks should save to database", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-tasks`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ content: "Test task", contentType: "text" })
  });
  
  assertEquals(response.status, 200);
});
```

### 4. Bonnes pratiques

#### ✅ À faire
- Tester les cas d'erreur en priorité
- Couvrir tous les chemins critiques
- Tester la validation des entrées
- Vérifier les permissions et l'authentification
- Ajouter des tests avant de corriger des bugs

#### ❌ À éviter
- Viser 100% de couverture aveuglément
- Écrire des tests juste pour augmenter la métrique
- Ignorer les tests d'intégration
- Négliger les cas limites
- Tester seulement les chemins heureux

## Rapports de couverture

### CI/CD automatique

Chaque push et pull request génère automatiquement:
1. **Rapport détaillé** - Affiché en commentaire sur la PR
2. **Badge de couverture** - Mis à jour dans le README
3. **Upload Codecov** - Pour le suivi historique

### Accès aux rapports

- **GitHub Actions** - Onglet "Actions" → Workflow → Artifacts
- **Codecov Dashboard** - [codecov.io](https://codecov.io)
- **PR Comments** - Commentaires automatiques sur les pull requests

## Seuils de qualité

Le CI échoue si:
- ❌ Couverture totale < 80%
- ❌ Ajout de code non testé dans une PR
- ❌ Diminution de la couverture > 5%

Le CI passe avec avertissement si:
- ⚠️ Couverture entre 75-80%
- ⚠️ Diminution de couverture 2-5%

## Exclusions

Certains fichiers sont exclus de la couverture:
- `*.test.ts` - Fichiers de tests
- `test_utils/` - Utilitaires de test
- `scripts/` - Scripts CI/CD

## Amélioration continue

### Suivi des tendances

Consultez le dashboard Codecov pour:
- 📈 Évolution de la couverture dans le temps
- 📊 Comparaisons entre branches
- 🎯 Identification des zones à risque
- 🔍 Analyse détaillée par fichier

### Objectifs trimestriels

| Trimestre | Objectif | Actions |
|-----------|----------|---------|
| Q1 2025 | 85% | Ajouter tests E2E, améliorer validation |
| Q2 2025 | 90% | Couvrir tous les edge cases, tests de charge |
| Q3 2025 | 92% | Tests de sécurité, fuzzing |

## Couverture vs Mutation Testing

| Métrique | Couverture de Code | Mutation Testing |
|----------|-------------------|------------------|
| **Mesure** | Lignes exécutées | Bugs détectés |
| **Question** | "Le code est-il testé ?" | "Les tests sont-ils efficaces ?" |
| **Seuil** | 80%+ | 80%+ |
| **Vitesse** | Rapide ⚡ | Lent 🐢 |
| **Scope** | Edge functions | Frontend uniquement |

**Recommandation** : Utilisez **les deux** métriques de manière complémentaire pour une qualité maximale. La couverture vous dit **où** tester, le mutation testing vous dit **comment bien** tester.

## Ressources

- [Documentation Deno Coverage](https://deno.land/manual/tools/coverage)
- [Guide des tests d'intégration](./supabase/functions/README.test.md)
- [Scripts de couverture](./scripts/README.md)
- [Codecov Documentation](https://docs.codecov.com/)
- [**Mutation Testing Guide**](./README.mutation.md) 🧬

---

**Dernière mise à jour:** Automatique via GitHub Actions  
**Contact:** Voir CONTRIBUTING.md pour contribuer
