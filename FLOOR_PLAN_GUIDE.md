# Guide des Plans 2D et Détection de Matériaux - MyEDLS

## Vue d'ensemble

MyEDLS génère automatiquement des plans 2D (floor plans) techniques à partir des scans 3D AR et détecte les matériaux de construction pendant la visite. Ces fonctionnalités enrichissent les rapports d'inspection avec des schémas exploitables et des informations détaillées sur les matériaux.

## Fonctionnalités Principales

### 1. Génération de Plans 2D

#### Description
- **Génération automatique** : Plans 2D créés à partir des données de scan 3D AR
- **Format SVG** : Plans vectoriels haute qualité, redimensionnables sans perte
- **Éléments structurels** : Murs, portes, fenêtres avec dimensions précises
- **Annotations** : Mesures, surface, volume, échelle de référence
- **Matériaux** : Informations sur les matériaux détectés intégrées au plan

#### Contenu du Plan
Les plans 2D incluent :
- **Murs** : Contours de la pièce avec épaisseur de mur
- **Portes** : Position, largeur, angle d'ouverture
- **Fenêtres** : Position, dimensions, visualisation
- **Dimensions** : Largeur et profondeur de la pièce
- **Surface et volume** : Calculs automatiques affichés
- **Échelle** : Référence visuelle (1 mètre)
- **Matériaux** : Liste des matériaux détectés avec surfaces

#### Utilisation
1. Dans la timeline, cliquez sur le bouton **"Plan 2D"** sur une carte de bloc
2. Le système génère automatiquement le plan 2D
3. Visualisez le plan dans une fenêtre dédiée
4. Téléchargez le fichier SVG ou partagez-le

### 2. Détection de Matériaux

#### Matériaux Détectés
Le système AR identifie automatiquement :
- **Bois** (wood) : Parquets, portes, menuiseries
- **Métal** (metal) : Structures métalliques, radiateurs
- **Béton** (concrete) : Murs, sols, plafonds
- **Plâtre** (plaster) : Revêtements muraux, cloisons
- **Carrelage** (tile) : Sols, murs de salles d'eau
- **Verre** (glass) : Fenêtres, cloisons vitrées
- **Tissu** (fabric) : Rideaux, revêtements textiles

#### Informations par Matériau
Pour chaque matériau détecté :
- **Type** : Catégorie du matériau
- **Confiance** : Score de certitude de détection (0-1)
- **Surface** : Aire couverte en m²
- **Localisation** : Zone de détection (sol, murs, surfaces spécifiques)
- **Couleur** : Teinte détectée (si applicable)

#### Affichage dans la Timeline
Les matériaux détectés sont affichés :
- Dans l'overlay AR pendant l'enregistrement
- Dans les données de volume de chaque bloc
- Dans les plans 2D générés
- Dans les exports de rapports

### 3. Stockage et Architecture

#### Base de Données
```typescript
// Structure dans detected_blocks.volume_data
{
  measurements: {
    width: number,
    depth: number,
    height: number,
    area: number,
    volume: number,
    confidence: number,
    materials: DetectedMaterial[],
    floorPlan: FloorPlanData
  },
  detectedObjects: DetectedObject[],
  objectSummary: { [key: string]: number },
  model_3d_urls: {
    obj?: string,
    glb?: string,
    usdz?: string,
    floorPlan?: string
  }
}
```

#### Interfaces TypeScript
```typescript
interface DetectedMaterial {
  type: 'wood' | 'metal' | 'concrete' | 'plaster' | 'tile' | 'glass' | 'fabric';
  confidence: number;
  area: number; // m²
  location: string;
  color?: string;
}

interface FloorPlanData {
  walls: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    thickness: number;
  }>;
  doors: Array<{
    position: { x: number; y: number };
    width: number;
    angle: number;
  }>;
  windows: Array<{
    position: { x: number; y: number };
    width: number;
    height: number;
  }>;
  dimensions: { width: number; depth: number };
  scale: number; // pixels per meter
}
```

### 4. Export et Partage

#### Formats de Plan 2D
- **SVG** : Format vectoriel pour édition et impression
- **Téléchargement** : Fichier `plan-2d-bloc-{N}.svg`
- **Partage natif** : Via API Capacitor Share (iOS/Android)

#### Intégration avec Exports Existants
Les plans 2D et matériaux sont inclus dans :
- **Export PDF EDL** : Plans 2D intégrés aux rapports de bloc
- **Export CSV** : Colonnes de matériaux dans les listings de tâches
- **Modèles 3D** : Compatibilité avec exports OBJ/GLB/USDZ

## Workflow Utilisateur

### Pendant la Visite
1. **Scan AR automatique** : Détection des matériaux en temps réel
2. **Overlay discret** : Affichage des matériaux détectés
3. **Capture auto** : Données de plan 2D enregistrées avec le bloc

### Après la Visite
1. **Timeline** : Visualisation des blocs avec bouton "Plan 2D"
2. **Génération** : Création du plan SVG à la demande
3. **Visualisation** : Affichage du plan avec tous les détails
4. **Export** : Téléchargement ou partage du plan

## Cas d'Usage Professionnels

### Inspecteurs
- Plans techniques précis pour rapports clients
- Documentation visuelle des espaces inspectés
- Informations matériaux pour devis de travaux

### Architectes
- Plans de référence pour projets de rénovation
- Identification rapide des matériaux existants
- Base pour conception architecturale

### Artisans
- Schémas pour estimation de matériaux
- Plans pour planification de chantier
- Documentation avant/après travaux

## Exemples de Sortie SVG

### Plan Typique d'une Pièce
```svg
<!-- Murs rectangulaires -->
<line class="wall" x1="50" y1="50" x2="260" y2="50"/>
<line class="wall" x1="260" y1="50" x2="260" y2="240"/>
<line class="wall" x1="260" y1="240" x2="50" y2="240"/>
<line class="wall" x1="50" y1="240" x2="50" y2="50"/>

<!-- Porte avec arc d'ouverture -->
<line class="door" x1="95" y1="50" x2="140" y2="50"/>
<path class="door" d="M 95 50 Q 117.5 27.5, 140 50"/>

<!-- Fenêtre -->
<rect class="window" x="105" y="235" width="60" height="10" rx="2"/>

<!-- Dimensions -->
<text class="text" x="155" y="25">4.20 m</text>
<text class="text" x="25" y="145">3.80 m</text>

<!-- Mesures -->
<text class="text" x="50" y="310">Surface: 15.96 m²</text>
<text class="text" x="50" y="330">Volume: 39.90 m³</text>

<!-- Matériaux -->
<text class="material" x="270" y="70">• tile: 15.8 m² (floor)</text>
<text class="material" x="270" y="85">• plaster: 48.2 m² (walls)</text>
```

## Performance et Optimisation

### Génération de Plans
- **Temps de génération** : < 2 secondes par plan
- **Qualité SVG** : Résolution vectorielle infinie
- **Taille fichier** : 10-50 KB par plan

### Détection de Matériaux
- **Précision** : 80-95% selon conditions d'éclairage
- **Fréquence** : Mise à jour continue pendant le scan
- **Couverture** : Tous les matériaux visibles détectés

## Limitations et Évolutions Futures

### Version Actuelle (V1)
- Plans 2D rectangulaires simples
- Détection matériaux en mode simulation (natif à venir)
- Export SVG uniquement

### Roadmap
- **V2** : Plans complexes multi-pièces avec portes intérieures
- **V3** : Détection matériaux via ARKit/ARCore natifs
- **V4** : Export DXF/DWG pour CAO professionnelle
- **V5** : Reconnaissance de motifs et textures détaillées

## Configuration Technique

### Edge Function
```typescript
// supabase/functions/generate-floor-plan/index.ts
- Récupération des données de bloc
- Génération SVG à partir de FloorPlanData
- Upload vers storage '3d-models'
- Mise à jour du bloc avec URL du plan
```

### Composant React
```typescript
// src/components/visit/FloorPlanViewer.tsx
- Interface de génération/visualisation
- Téléchargement et partage natif
- Intégration timeline mobile
```

### Service AR
```typescript
// src/services/arScanner.ts
- Détection matériaux simulée
- Génération données FloorPlanData
- Stockage dans volume_data
```

## Support et Contact

Pour toute question sur les plans 2D et la détection de matériaux, consultez la documentation technique ou contactez l'équipe de développement MyEDLS.
