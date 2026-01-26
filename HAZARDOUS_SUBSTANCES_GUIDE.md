# Guide Détection de Substances Dangereuses et Chiffrage Automatique

## Vue d'ensemble

Ce guide documente trois fonctionnalités avancées du système de détection de pathologies :

1. **Détection de substances dangereuses** (amiante, plomb, termites)
2. **Quantification précise avec AR 3D** 
3. **Chiffrage automatique des réparations**

## 1. Détection de Substances Dangereuses

### Types de substances détectées

Le système détecte trois substances dangereuses réglementées :

- **Amiante (☣️)** : Matériau cancérigène interdit depuis 1997
- **Plomb (⚠️)** : Substance toxique dangereuse pour la santé
- **Termites (🐛)** : Insectes xylophages destructeurs de structures en bois

### Analyse spécialisée

Pour chaque substance dangereuse détectée, le système fournit :

```typescript
{
  type: 'amiante' | 'plomb' | 'termites',
  severity: 'faible' | 'modere' | 'grave' | 'critique',
  isHazardous: true,
  hazardousType: 'amiante',
  regulatoryCompliance: {
    crepCompliant: true,           // Conforme aux normes CREP
    requiresSpecialist: true,      // Nécessite un spécialiste certifié
    legalDeadline: "Intervention immédiate requise"
  }
}
```

### Conformité CREP

Le système génère des analyses conformes aux normes **CREP** (Constat de Risque d'Exposition au Plomb) :

- ✓ Identification des substances dangereuses
- ✓ Classification de sévérité
- ✓ Recommandations d'intervention
- ✓ Délais légaux d'action
- ✓ Obligation de recours à un spécialiste certifié

### Interface utilisateur

Les substances dangereuses sont affichées avec :

- **Badge rouge "☣️ Dangereux"** sur la pathologie
- **Alerte destructive** détaillant la substance et les obligations légales
- **Icônes spécifiques** : ☣️ pour amiante, ⚠️ pour plomb, 🐛 pour termites
- **Section réglementaire** : conformité CREP, spécialiste requis, délais légaux

## 2. Quantification Précise avec AR 3D

### Mesures AR disponibles

Le système utilise les données AR (ARKit/ARCore) pour calculer les surfaces et volumes exacts :

```typescript
arMeasurements: {
  width: 2.5,        // largeur en m
  height: 1.8,       // hauteur en m
  depth: 0.1,        // profondeur en m
  surfaceArea: 4.5,  // surface totale en m²
  volume: 0.45       // volume total en m³
}
```

### Calcul des surfaces affectées

Pour chaque pathologie, le système calcule :

- **affectedSurface** : Surface réellement affectée en m² (basée sur les mesures AR et le pourcentage visible)
- **affectedVolume** : Volume réellement affecté en m³ (si applicable)

Exemple :
```typescript
{
  type: 'humidite',
  affectedSurface: 2.3,  // 2.3 m² d'humidité détectée
  affectedVolume: 0.15,  // 0.15 m³ de matériau affecté
  arMeasurements: {
    width: 2.5,
    height: 1.8,
    depth: 0.1,
    surfaceArea: 4.5,
    volume: 0.45
  }
}
```

### Avantages de la quantification AR

- **Précision** : Mesures exactes au lieu d'estimations visuelles
- **Traçabilité** : Données 3D complètes pour audit
- **Chiffrage fiable** : Calculs de coûts basés sur mesures réelles
- **Documentation** : Preuves matérielles pour assurances et litiges

## 3. Chiffrage Automatique des Réparations

### Barèmes professionnels

Le système utilise des barèmes de prix professionnels (€) :

| Type | Prix/m² | Prix/ml | Durée (h/unité) |
|------|---------|---------|-----------------|
| Fissure | - | 45€ | 2h |
| Humidité | 80€ | - | 4h |
| Moisissure | 95€ | - | 3h |
| Infiltration | 120€ | - | 5h |
| Décollement | 65€ | - | 3h |
| Dégradation | 55€ | - | 2.5h |
| **Amiante** | **350€** | - | **8h** |
| **Plomb** | **280€** | - | **6h** |
| **Termites** | **45€** | - | **4h** |

### Multiplicateurs de sévérité

Les coûts sont ajustés selon la sévérité :

- **Faible** : ×0.8 (réduction de 20%)
- **Modéré** : ×1.0 (prix de base)
- **Grave** : ×1.3 (+30%)
- **Critique** : ×1.6 (+60%)

### Structure de l'estimation

Chaque estimation comprend :

```typescript
repairCost: {
  laborCost: 220.00,        // Coût main d'œuvre (€)
  materialCost: 88.00,      // Coût matériaux (€)
  totalCost: 308.00,        // Coût total (€)
  estimatedDuration: 4.0,   // Durée estimée (heures)
  pricePerUnit: 80.00,      // Prix unitaire (€/m²)
  unit: 'm²',               // Unité (m², ml, unité)
  quantity: 2.3             // Quantité affectée
}
```

### Calcul des coûts

Le système calcule automatiquement :

1. **Quantité affectée** : Utilise `affectedSurface` (AR 3D) ou `estimatedArea` (estimation)
2. **Prix unitaire ajusté** : `pricePerUnit × severityMultiplier`
3. **Coût matériaux** : `quantity × pricePerUnit × 0.4` (40% du total)
4. **Durée travaux** : `quantity × laborHoursPerUnit × severityMultiplier`
5. **Coût main d'œuvre** : `duration × 55€/h` (taux horaire)
6. **Coût total** : `materialCost + laborCost`

### Exemple de chiffrage complet

Pathologie : Humidité grave avec mesures AR

```typescript
Input:
- type: 'humidite'
- severity: 'grave'
- affectedSurface: 2.3 m² (mesure AR)

Calcul:
- pricePerUnit: 80€/m² × 1.3 (grave) = 104€/m²
- materialCost: 2.3 × 104 × 0.4 = 95.68€
- duration: 2.3 × 4h × 1.3 = 11.96h
- laborCost: 11.96 × 55€ = 657.80€
- totalCost: 95.68 + 657.80 = 753.48€

Output:
{
  laborCost: 657.80€,
  materialCost: 95.68€,
  totalCost: 753.48€,
  estimatedDuration: 12.0h,
  pricePerUnit: 104.00€/m²
}
```

## Architecture Technique

### Edge Function : analyze-pathologies

Modifiée pour :

1. Recevoir les mesures AR 3D en input
2. Inclure les mesures AR dans le prompt GPT-4 Vision
3. Demander à l'IA de calculer surfaces/volumes affectés
4. Détecter les substances dangereuses (amiante, plomb, termites)
5. Appeler `calculate-repair-costs` pour chaque pathologie
6. Retourner les pathologies enrichies avec coûts

### Edge Function : calculate-repair-costs

Nouvelle fonction pour :

1. Recevoir type de pathologie, sévérité, surfaces/volumes AR
2. Consulter les barèmes de prix professionnels
3. Appliquer les multiplicateurs de sévérité
4. Calculer matériaux, main d'œuvre, durée, total
5. Retourner l'estimation détaillée

### Types TypeScript

```typescript
// Types pathologies étendus
export type PathologyType = 
  | 'fissure' | 'humidite' | 'moisissure' 
  | 'infiltration' | 'decollement' | 'degradation'
  | 'amiante' | 'plomb' | 'termites';

export type HazardousSubstance = 'amiante' | 'plomb' | 'termites';

export interface ARMeasurements {
  width: number;
  height: number;
  depth: number;
  surfaceArea: number;
  volume: number;
}

export interface RepairCostEstimate {
  laborCost: number;
  materialCost: number;
  totalCost: number;
  estimatedDuration: number;
  pricePerUnit: number;
  unit: 'm²' | 'ml' | 'unité';
}

export interface DetectedPathology {
  // ... propriétés existantes
  
  // Substances dangereuses
  isHazardous?: boolean;
  hazardousType?: HazardousSubstance;
  regulatoryCompliance?: {
    crepCompliant: boolean;
    requiresSpecialist: boolean;
    legalDeadline?: string;
  };
  
  // Quantification AR 3D
  arMeasurements?: ARMeasurements;
  affectedSurface?: number;
  affectedVolume?: number;
  
  // Estimation coût
  repairCost?: RepairCostEstimate;
}
```

## Workflow Complet

1. **Capture vidéo** : L'utilisateur filme avec AR activé
2. **Extraction frames** : Frames clés extraites avec mesures AR
3. **Analyse pathologies** : GPT-4 Vision détecte pathologies + substances dangereuses
4. **Quantification AR** : Calcul surfaces/volumes affectés avec mesures AR
5. **Chiffrage automatique** : Calcul coûts de réparation par pathologie
6. **Affichage enrichi** : Interface montre tout : pathologies, dangers, mesures, coûts

## Interface Utilisateur

### PathologyDetectionPanel

Affiche pour chaque pathologie :

```tsx
// Badge "Dangereux" si substance dangereuse
{pathology.isHazardous && (
  <Badge variant="destructive">☣️ Dangereux</Badge>
)}

// Alerte réglementaire
{pathology.isHazardous && (
  <Alert variant="destructive">
    <AlertDescription>
      <div>⚠️ Substance dangereuse détectée</div>
      <div>{hazardousSubstanceLabels[pathology.hazardousType]}</div>
      <div>• Conforme CREP: {pathology.regulatoryCompliance.crepCompliant ? '✓' : '✗'}</div>
      <div>• Spécialiste requis: {pathology.regulatoryCompliance.requiresSpecialist ? '✓' : '✗'}</div>
      <div>• Délai légal: {pathology.regulatoryCompliance.legalDeadline}</div>
    </AlertDescription>
  </Alert>
)}

// Quantification AR 3D
{pathology.arMeasurements && (
  <div className="bg-muted/50">
    <Ruler className="h-4 w-4" />
    Quantification AR 3D
    <div>• Surface affectée: {pathology.affectedSurface} m²</div>
    <div>• Volume affecté: {pathology.affectedVolume} m³</div>
    <div>• Largeur: {pathology.arMeasurements.width}m</div>
    <div>• Hauteur: {pathology.arMeasurements.height}m</div>
  </div>
)}

// Estimation de coût
{pathology.repairCost && (
  <div className="bg-primary/5 border border-primary/20">
    <Euro className="h-4 w-4" />
    Estimation de réparation
    <div>Main d'œuvre: {pathology.repairCost.laborCost} €</div>
    <div>Matériaux: {pathology.repairCost.materialCost} €</div>
    <div>Total estimé: {pathology.repairCost.totalCost} €</div>
    <div>Durée estimée: {pathology.repairCost.estimatedDuration}h</div>
  </div>
)}
```

## Exports et Rapports

### Export PDF EDL

Les rapports PDF incluent automatiquement :

- Liste complète des pathologies avec substances dangereuses
- Alertes visuelles pour amiante, plomb, termites
- Mesures AR 3D précises (surfaces/volumes affectés)
- Estimations de coûts détaillées par pathologie
- Total général des coûts de réparation
- Conformité CREP et obligations légales

### Export CSV

Colonnes supplémentaires dans l'export CSV :

```csv
Pathologie,Sévérité,Substance Dangereuse,CREP Conforme,Surface Affectée (m²),Volume Affecté (m³),Coût Main d'œuvre (€),Coût Matériaux (€),Coût Total (€),Durée (h)
Humidité,Grave,Non,N/A,2.3,0.15,657.80,95.68,753.48,12.0
Amiante,Critique,Oui,Oui,1.8,0.10,2288.00,403.20,2691.20,16.0
```

## Avantages Métier

### Pour les inspecteurs

- **Gain de temps** : Chiffrage automatique instantané
- **Crédibilité** : Mesures AR précises et traçables
- **Sécurité** : Détection substances dangereuses avec obligations légales
- **Professionnalisme** : Rapports complets conformes CREP

### Pour les clients

- **Transparence** : Coûts détaillés main d'œuvre + matériaux
- **Confiance** : Mesures AR 3D objectives
- **Sécurité** : Alertes substances dangereuses
- **Planification** : Durées estimées pour chaque réparation

### Pour les assurances

- **Conformité** : Rapports CREP conformes aux normes
- **Traçabilité** : Données AR 3D pour expertises
- **Évaluation** : Chiffrages professionnels pour indemnisations

## Limitations et Avertissements

⚠️ **Important** :

- Les estimations de coûts sont **indicatives** et basées sur des barèmes moyens
- Les prix peuvent varier selon région, urgence, accessibilité
- La détection de substances dangereuses par IA **nécessite confirmation par laboratoire certifié**
- Les rapports ne remplacent **pas** les diagnostics obligatoires (CREP, amiante)
- Pour amiante/plomb : **intervention obligatoire par entreprise certifiée uniquement**

## Maintenance et Mise à Jour

### Barèmes de prix

Les barèmes sont définis dans `supabase/functions/calculate-repair-costs/index.ts` :

```typescript
const repairPriceList: Record<string, { pricePerM2?: number; ... }> = {
  fissure: { pricePerMl: 45, laborHoursPerUnit: 2 },
  amiante: { pricePerM2: 350, laborHoursPerUnit: 8 },
  // ... autres pathologies
};

const laborHourlyRate = 55; // taux horaire €
```

Pour mettre à jour les prix, modifier ces valeurs et redéployer l'Edge Function.

## Conclusion

Ce système de détection avancée combine :

1. **IA Vision** (GPT-4) pour détection pathologies + substances dangereuses
2. **AR 3D** (ARKit/ARCore) pour quantification précise
3. **Chiffrage automatique** avec barèmes professionnels

Résultat : **Rapports d'inspection complets, précis, conformes CREP, avec estimations de coûts fiables** 🚀
