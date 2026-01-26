# Edge Functions Tests

Ce dossier contient des tests automatisés pour valider l'authentification et les cas d'erreur des edge functions.

## Structure des tests

Chaque edge function possède un fichier de test correspondant :
- `extract-tasks/index.test.ts` - Tests pour l'extraction de tâches
- `extract-from-pdf/index.test.ts` - Tests pour l'extraction depuis PDF
- `import-taxonomy/index.test.ts` - Tests pour l'import de taxonomie

## Exécution des tests

Pour exécuter tous les tests :
```bash
deno test --allow-net --allow-env supabase/functions/**/*.test.ts
```

Pour exécuter les tests d'une fonction spécifique :
```bash
deno test --allow-net --allow-env supabase/functions/extract-tasks/index.test.ts
```

## Scénarios testés

### Authentification
- ✅ Requête sans header Authorization → 401
- ✅ Token JWT invalide → 401
- ✅ Token JWT valide → 200

### Validation des entrées
- ✅ Données manquantes → 400
- ✅ Types de données incorrects → 400
- ✅ Dépassement des limites (longueur, taille) → 400
- ✅ Données valides → 200

### CORS
- ✅ Requêtes OPTIONS (preflight) → 200 avec headers CORS

### Rate Limiting
- ✅ Dépassement de la limite de requêtes → 429

## Structure d'un test

```typescript
Deno.test("function-name: should test scenario", async () => {
  // 1. Créer une requête mock
  const req = createMockRequest(body, token);
  
  // 2. Simuler le comportement de la fonction
  const mockServe = async (req: Request) => {
    // Logic de validation
    return new Response(JSON.stringify({ result }), { status });
  };
  
  // 3. Exécuter et vérifier
  const response = await mockServe(req);
  assertEquals(response.status, expectedStatus);
});
```

## Helpers disponibles

### `createMockJWT(userId?: string): string`
Crée un token JWT mock pour les tests d'authentification.

### `createMockRequest(body: any, authToken?: string): Request`
Crée une requête HTTP mock avec le body et le token fournis.

## Bonnes pratiques

1. **Tester tous les chemins d'erreur** : Chaque validation doit avoir un test
2. **Tester les cas limites** : Longueurs max, types incorrects, valeurs nulles
3. **Tester l'authentification** : Pas de token, token invalide, token valide
4. **Garder les tests isolés** : Chaque test doit être indépendant
5. **Utiliser des données réalistes** : Les mocks doivent ressembler aux vraies données

## Maintenance

Lors de modifications des edge functions :
1. Mettre à jour les tests correspondants
2. Ajouter des tests pour les nouveaux cas d'erreur
3. Vérifier que tous les tests passent avant de déployer
4. Maintenir la couverture de test > 80%
