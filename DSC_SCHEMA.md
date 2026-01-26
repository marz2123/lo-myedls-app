# DSC (Data Source Chantier) - Schéma de la Base de Données

## Vue d'ensemble

La DSC est la base de données référentielle des tâches chantier pour MyEDLS. Elle suit une structure hiérarchique **FT → CT → SC → T** permettant une classification précise des travaux.

## Architecture de la DSC

```
┌─────────────────────────────────────────────────────────────────┐
│                       HIÉRARCHIE DSC                             │
├─────────────────────────────────────────────────────────────────┤
│  FT (Famille)           │  28 familles de travaux               │
│    └── CT (Catégorie)   │  168 catégories                       │
│          └── SC (Sous-  │  1008 sous-catégories                 │
│               catégorie)│  + métadonnées MyEDLS                 │
│                └── T    │  ~17 000 tâches détaillées            │
│                  (Tâche)│                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Tables de la DSC

### 1. `ft_familles` - Familles de tâches (FT)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | UUID | Clé primaire | auto |
| `ft_code` | TEXT | Code unique FT | `FT01` |
| `ft_label` | TEXT | Nom de la famille | `Pilotage & installations de chantier` |
| `ft_description` | TEXT | Description optionnelle | - |
| `commentaire_type_equipe` | TEXT | Type d'équipe/commentaire | `Base vie, clôtures, sécurisation` |

**Index**: `ft_code` (unique + index)

---

### 2. `ct_categories` - Catégories (CT)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | UUID | Clé primaire | auto |
| `ct_code` | TEXT | Code unique CT | `FT01/CT01` |
| `ft_code` | TEXT | FK vers ft_familles | `FT01` |
| `ct_label` | TEXT | Nom de la catégorie | `Installation de chantier` |

**Index**: `ct_code` (unique), `ft_code`

---

### 3. `sc_sous_categories` - Sous-catégories (SC) + Métadonnées MyEDLS

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | UUID | Clé primaire | auto |
| `sc_code` | TEXT | Code unique SC | `FT01/CT01/SC01` |
| `ct_code` | TEXT | FK vers ct_categories | `FT01/CT01` |
| `ft_code` | TEXT | FK vers ft_familles | `FT01` |
| `sc_label` | TEXT | Nom de la sous-catégorie | `Base vie / sanitaires` |
| **`zone_type`** | TEXT | Type de zone concernée | `plomberie` |
| **`contexte`** | JSONB | Contexte d'application | `["interieur", "parties_communes"]` |
| **`corps_metier`** | TEXT | Corps de métier principal | `plomberie_cvc` |
| **`phase_chantier`** | TEXT | Phase du chantier | `preparation_chantier` |
| **`pieces_typiques`** | JSONB | Pièces où ça s'applique | `["sdb", "wc", "local_technique"]` |
| **`keywords_ia`** | TEXT | Mots-clés terrain pour l'IA | `sanitaire chantier, wc provisoire, base vie` |

**Index**: `sc_code` (unique), `ct_code`, `ft_code`, `zone_type`, `corps_metier`, `phase_chantier`
**Index full-text**: `keywords_ia` (GIN)

---

### 4. `t_taches` - Tâches détaillées (T)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | UUID | Clé primaire | auto |
| `t_code` | TEXT | Code unique tâche | `FT01/CT01/SC01/T01` |
| `sc_code` | TEXT | FK vers sc_sous_categories | `FT01/CT01/SC01` |
| `ct_code` | TEXT | FK vers ct_categories | `FT01/CT01` |
| `ft_code` | TEXT | FK vers ft_familles | `FT01` |
| `t_label` | TEXT | Nom de la tâche | `Études & préparation – Base vie` |
| `description_detaillee` | TEXT | Description complète | `Analyser plans et CCTP...` |
| `unite` | TEXT | Unité normalisée | `lot`, `m2`, `ml`, `u`, `forfait` |
| `rendement_h_par_unite` | NUMERIC | Rendement en h/unité | `1.9` |
| `commentaire_type_equipe` | TEXT | Type d'équipe | `Base vie, clôtures...` |
| `controle_qualite` | TEXT | Contrôles qualité | `Auto-contrôle + PV + photos` |
| `normes_references` | TEXT | Normes applicables | `DTU/RE2020, CCTP` |

**Index**: `t_code` (unique), `sc_code`, `ct_code`, `ft_code`
**Index full-text**: `t_label`, `description_detaillee` (GIN)

---

## Champs métiers MyEDLS enrichis

### `zone_type` - Type de zone

Indique à quel type d'élément architectural la sous-catégorie s'applique.

| Valeur | Description |
|--------|-------------|
| `mur` | Murs intérieurs |
| `sol` | Sols et revêtements de sol |
| `plafond` | Plafonds |
| `cloison` | Cloisons sèches |
| `facade` | Façades extérieures |
| `toiture` | Structure de toiture |
| `couverture` | Couverture et étanchéité |
| `menuiserie_ext` | Menuiseries extérieures |
| `menuiserie_int` | Menuiseries intérieures |
| `plomberie` | Réseaux plomberie |
| `electricite` | Réseaux électriques |
| `chauffage_clim` | Chauffage et climatisation |
| `vmc_ventilation` | Ventilation |
| `structure` | Éléments structurels |
| `vrd_exterieurs` | VRD et aménagements extérieurs |
| `divers` | Autres |

---

### `contexte` - Contexte d'application

Tableau JSON indiquant où la tâche s'applique.

| Valeur | Description |
|--------|-------------|
| `interieur` | Travaux intérieurs |
| `exterieur` | Travaux extérieurs |
| `parties_communes` | Parties communes (copropriété) |
| `parties_privatives` | Parties privatives |

---

### `corps_metier` - Corps de métier

| Valeur | Description |
|--------|-------------|
| `gros_oeuvre` | Gros œuvre général |
| `maconnerie` | Maçonnerie |
| `demolition_curetage` | Démolition et curetage |
| `terrassement_vrd` | Terrassement et VRD |
| `charpente_couverture` | Charpente et couverture |
| `etancheite` | Étanchéité |
| `facade_enduits_ite` | Façade, enduits et ITE |
| `bardage` | Bardage |
| `menuiserie_ext` | Menuiseries extérieures |
| `menuiserie_int` | Menuiseries intérieures |
| `serrurerie_metallerie` | Serrurerie et métallerie |
| `isolation_doublages` | Isolation et doublages |
| `cloisons_plaques` | Cloisons et plaques |
| `plafonds_suspendus` | Plafonds suspendus |
| `plomberie_cvc` | Plomberie et CVC |
| `electricite_cf_cfa` | Électricité CF/CFA |
| `chauffage_clim` | Chauffage et climatisation |
| `peinture_finitions` | Peinture et finitions |
| `sols` | Revêtements de sol |
| `amenagements_exterieurs` | Aménagements extérieurs |
| `pilotage_coordination` | Pilotage et coordination |

---

### `phase_chantier` - Phase du chantier

| Valeur | Description |
|--------|-------------|
| `etudes` | Phase études |
| `preparation_chantier` | Préparation du chantier |
| `curetage_demolition` | Curetage et démolition |
| `gros_oeuvre` | Phase gros œuvre |
| `second_oeuvre` | Phase second œuvre |
| `finitions` | Phase finitions |
| `reception_levée_reserves` | Réception et levée de réserves |
| `sav_garantie` | SAV et garantie |

---

### `pieces_typiques` - Pièces typiques

Tableau JSON des pièces où cette sous-catégorie est fréquente.

| Valeur | Description |
|--------|-------------|
| `sejour` | Séjour/salon |
| `cuisine` | Cuisine |
| `chambre` | Chambre |
| `sdb` | Salle de bain |
| `wc` | WC |
| `couloir` | Couloir |
| `cellier` | Cellier |
| `balcon_terrasse` | Balcon/terrasse |
| `garage` | Garage |
| `cage_escalier` | Cage d'escalier |
| `hall` | Hall d'entrée |
| `local_technique` | Local technique |
| `combles` | Combles |
| `toiture_terrasse` | Toiture terrasse |
| `parties_communes_generales` | Parties communes générales |
| `facade` | Façade |
| `exterieur` | Extérieur général |

---

### `keywords_ia` - Mots-clés IA

Chaîne de texte contenant des mots et expressions du langage terrain pour améliorer la recherche sémantique.

**Exemples**:
- `"fissure mur, mur fissuré, lézarde, reprise fissures, mur porteur abîmé"`
- `"sol pas droit, sol gondolé, ragréage, sol qui bouge, rattrapage niveau"`
- `"peinture écaillée, peinture qui cloque, refaire peinture, lessivage mur"`

---

## Intégration MyEDLS

### Workflow de matching IA

```
┌─────────────────────────────────────────────────────────────────┐
│                 WORKFLOW MATCHING DSC                            │
├─────────────────────────────────────────────────────────────────┤
│  1. ENTRÉE: Partie → Lieu → Pièce → Zone → Problème             │
│                                                                  │
│  2. FILTRAGE DSC:                                                │
│     - Filtrer par zone_type (ex: "mur")                         │
│     - Filtrer par contexte (ex: "parties_privatives")           │
│     - Filtrer par pieces_typiques (ex: ["sdb"])                 │
│                                                                  │
│  3. MATCHING SÉMANTIQUE:                                         │
│     - Recherche full-text sur t_label + description             │
│     - Recherche sur keywords_ia                                  │
│     - Score de pertinence                                        │
│                                                                  │
│  4. SORTIE: Top 3-5 FT/CT/SC/T proposées avec scores            │
└─────────────────────────────────────────────────────────────────┘
```

### Exemple de requête SQL

```sql
-- Trouver les tâches pour un problème "fissure mur" dans une SDB
SELECT 
  t.t_code,
  t.t_label,
  sc.sc_label,
  sc.corps_metier,
  ts_rank(to_tsvector('french', t.t_label || ' ' || COALESCE(t.description_detaillee, '')), 
          plainto_tsquery('french', 'fissure mur')) AS score
FROM t_taches t
JOIN sc_sous_categories sc ON t.sc_code = sc.sc_code
WHERE 
  sc.zone_type = 'mur'
  AND sc.pieces_typiques @> '["sdb"]'::jsonb
  AND (
    to_tsvector('french', t.t_label || ' ' || COALESCE(t.description_detaillee, '')) 
    @@ plainto_tsquery('french', 'fissure mur')
    OR sc.keywords_ia ILIKE '%fissure%'
  )
ORDER BY score DESC
LIMIT 5;
```

---

## Statistiques attendues

| Table | Nombre d'enregistrements |
|-------|--------------------------|
| ft_familles | ~28 |
| ct_categories | ~168 |
| sc_sous_categories | ~1008 |
| t_taches | ~17 000 |

---

## Edge Functions

| Fonction | Description |
|----------|-------------|
| `import-dsc` | Import CSV vers les 4 tables |
| `enrich-dsc-ai` | Enrichissement IA des métadonnées SC |

---

## Changelog

- **v1.0** - Création initiale avec structure FT/CT/SC/T
- **v1.1** - Ajout des champs métiers MyEDLS (zone_type, contexte, corps_metier, phase_chantier, pieces_typiques, keywords_ia)
- **v1.2** - Index full-text pour recherche sémantique
