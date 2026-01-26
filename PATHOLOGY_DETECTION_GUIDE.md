# Guide de Détection Automatique des Pathologies - MyEDLS

## Vue d'ensemble

MyEDLS intègre un système de détection automatique de pathologies utilisant GPT-4 Vision pour analyser les photos capturées pendant les visites et identifier les défauts de construction avec classification de sévérité.

## Fonctionnalités Principales

### 1. Types de Pathologies Détectées

Le système IA identifie automatiquement 6 catégories de pathologies :

#### 🔍 Fissures
- **Description** : Fentes, craquelures, lézardes dans les murs, plafonds, sols
- **Détection** : Orientation, largeur, profondeur, traversantes ou superficielles
- **Gravité** : Faible (< 0.2mm) → Critique (> 2mm ou structurelles)

#### 💧 Humidité
- **Description** : Traces d'humidité, auréoles, taches sombres
- **Détection** : Zone affectée, infiltration ascendante ou descendante
- **Gravité** : Faible (localisée) → Critique (généralisée avec dégradation)

#### 🦠 Moisissures
- **Description** : Taches de moisissures, champignons, développement fongique
- **Détection** : Surface colonisée, type de moisissure, couleur
- **Gravité** : Faible (superficiel) → Critique (risque sanitaire élevé)

#### 🌊 Infiltrations
- **Description** : Infiltrations d'eau actives, coulures, dégâts des eaux
- **Détection** : Source d'infiltration, zone touchée, écoulement actif
- **Gravité** : Faible (ancienne trace) → Critique (infiltration active importante)

#### 📌 Décollements
- **Description** : Décollements de revêtements, enduits, peintures, carrelages
- **Détection** : Surface décollée, profondeur, risque de chute
- **Gravité** : Faible (local) → Critique (vaste zone avec risque de chute)

#### ⚠️ Dégradations
- **Description** : Dégradations diverses, détériorations, vétusté
- **Détection** : Nature de la dégradation, étendue, impact fonctionnel
- **Gravité** : Faible (esthétique) → Critique (structurelle ou sécurité)

### 2. Classification de Sévérité

Chaque pathologie détectée reçoit une classification de sévérité :

#### 🟢 Faible
- Impact esthétique mineur
- Pas de risque structurel
- Intervention non urgente
- **Exemples** : Micro-fissures superficielles, petites taches d'humidité

#### 🟡 Modéré
- Impact esthétique notable
- Risque structurel faible à moyen
- Intervention recommandée court-moyen terme
- **Exemples** : Fissures 0.5-1mm, humidité localisée persistante

#### 🟠 Grave
- Impact fonctionnel significatif
- Risque structurel moyen-élevé
- Intervention nécessaire court terme
- **Exemples** : Fissures 1-2mm évolutives, moisissures étendues

#### 🔴 Critique
- Risque structurel élevé ou sanitaire
- Intervention immédiate requise
- Danger potentiel pour occupants
- **Exemples** : Fissures > 2mm traversantes, infiltrations actives majeures

### 3. Urgence d'Intervention

Chaque pathologie reçoit également une classification d'urgence :

- ⏰ **Immédiat** : Action dans les 24-48h (risque sanitaire ou structurel critique)
- 📅 **Court terme** : Intervention sous 1-3 mois (risque d'aggravation rapide)
- 📆 **Moyen terme** : Intervention sous 3-12 mois (suivi nécessaire)
- 📋 **Long terme** : Intervention > 12 mois (surveillance suffisante)

## Workflow Utilisateur

### Pendant la Visite
1. **Capture automatique** : Photos prises automatiquement pendant l'enregistrement vidéo
2. **Frames extraites** : Moments clés capturés (transitions, détections AI)
3. **Stockage** : Frames sauvegardées dans `extracted_frames` avec URLs

### Après la Visite
1. **Timeline** : Visualisation des blocs avec photos capturées
2. **Bouton Analyse** : Clic sur "Analyser" pour détecter les pathologies
3. **Analyse IA** : GPT-4 Vision analyse la photo (15-30 secondes)
4. **Résultats** : Affichage des pathologies détectées avec détails complets

### Détails des Pathologies
Pour chaque pathologie détectée :
- **Type** : Catégorie de pathologie (icône + label)
- **Sévérité** : Niveau de gravité (badge coloré)
- **Confiance IA** : Score de certitude de détection (0-100%)
- **Description** : Description précise de la pathologie
- **Recommandations** : Actions correctives suggérées
- **Surface estimée** : Aire affectée en m² ou ml
- **Urgence** : Délai d'intervention recommandé
- **Position** : Localisation dans l'image (coordonnées %)

### Niveau de Risque Global
- **Risque Faible** : Aucune pathologie grave détectée
- **Risque Moyen** : Pathologies modérées nécessitant suivi
- **Risque Élevé** : Pathologies graves nécessitant intervention
- **Risque Critique** : Pathologies critiques nécessitant action immédiate

## Intégration Technique

### Architecture de Détection

```typescript
// Types de pathologies
export type PathologyType = 
  | 'fissure' 
  | 'humidite' 
  | 'moisissure' 
  | 'infiltration' 
  | 'decollement' 
  | 'degradation';

export type PathologySeverity = 
  | 'faible' 
  | 'modere' 
  | 'grave' 
  | 'critique';

// Résultat d'analyse
interface PathologyAnalysisResult {
  frameId: string;
  imageUrl: string;
  pathologies: DetectedPathology[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  analysisTimestamp: number;
  aiConfidence: number;
}
```

### Edge Function `analyze-pathologies`

**Endpoint** : `supabase/functions/analyze-pathologies`

**Input** :
```json
{
  "frameId": "uuid-frame-id",
  "imageUrl": "https://storage-url/image.jpg"
}
```

**Traitement** :
1. Réception de l'image à analyser
2. Appel API OpenAI GPT-4 Vision
3. Prompt système expert en diagnostic bâtiment
4. Extraction des pathologies au format JSON structuré
5. Sauvegarde des résultats dans `extracted_frames.detected_pathologies`

**Output** :
```json
{
  "success": true,
  "frameId": "uuid",
  "pathologies": [
    {
      "type": "fissure",
      "severity": "grave",
      "confidence": 0.85,
      "location": { "x": 30, "y": 40, "width": 20, "height": 15 },
      "description": "Fissure verticale traversante de 2mm",
      "recommendations": "Suivi structurel, injection résine",
      "estimatedArea": 1.5,
      "urgency": "short_term"
    }
  ],
  "overallRiskLevel": "high",
  "aiConfidence": 0.8,
  "analysisTimestamp": 1234567890
}
```

### Stockage Base de Données

**Table** : `extracted_frames`
**Colonne** : `detected_pathologies` (JSONB)

```sql
-- Structure stockée
{
  "pathologies": [...],
  "overallRiskLevel": "high",
  "aiConfidence": 0.8
}
```

### Composants React

#### `PathologyAnalysisButton`
- Bouton déclencheur d'analyse sur timeline
- Affichage nombre de pathologies si déjà analysé
- Badge coloré selon niveau de risque
- Dialog modale pour résultats détaillés

#### `PathologyDetectionPanel`
- Panel principal de résultats d'analyse
- Accordéon pour chaque pathologie détectée
- Affichage niveau de risque global
- Détails complets par pathologie (description, recommandations, urgence)

## Prompt Système GPT-4 Vision

Le système utilise un prompt expert optimisé :

```
Tu es un expert en diagnostic de bâtiments. Analyse cette photo et détecte 
toutes les pathologies visibles.

Pour chaque pathologie détectée, fournis :
- type: fissure, humidite, moisissure, infiltration, decollement, ou degradation
- severity: faible, modere, grave, ou critique
- confidence: 0-1 (confiance de détection)
- location: position {x, y, width, height} en pourcentages (0-100)
- description: description précise en français
- recommendations: recommandations d'intervention
- estimatedArea: surface estimée en m² ou ml
- urgency: immediate, short_term, medium_term, ou long_term

Réponds UNIQUEMENT avec un JSON valide.
```

## Cas d'Usage Professionnels

### Inspecteurs Immobiliers
- **Détection objective** : Identification systématique des pathologies
- **Documentation complète** : Photos + descriptions + sévérités
- **Rapports enrichis** : EDL avec pathologies classifiées

### Experts Bâtiment
- **Diagnostic précis** : Catégorisation automatique des défauts
- **Priorisation** : Tri par urgence et sévérité
- **Recommandations** : Actions correctives suggérées

### Gestionnaires de Patrimoine
- **Suivi patrimonial** : Historique des pathologies détectées
- **Planification travaux** : Identification zones prioritaires
- **Budget maintenance** : Estimation besoins réparations

### Artisans et Entreprises
- **Devis précis** : Surface et nature des pathologies pour chiffrage
- **Planification chantier** : Priorisation interventions par urgence
- **Documentation avant/après** : Preuve de conformité réparations

## Performance et Précision

### Métriques de Détection
- **Temps d'analyse** : 15-30 secondes par photo
- **Précision globale** : 80-90% selon conditions photo
- **Faux positifs** : < 10% (pathologies sur-détectées)
- **Faux négatifs** : < 15% (pathologies manquées)

### Facteurs d'Influence
- **Qualité photo** : Résolution, netteté, éclairage
- **Angle de prise** : Vue frontale vs oblique
- **Contraste** : Visibilité des défauts sur support
- **Échelle** : Taille apparente des pathologies

### Limitations Connues
- **Photos floues** : Détection difficile sur images de mauvaise qualité
- **Éclairage faible** : Visibilité réduite des défauts
- **Pathologies cachées** : Non détectables (derrière revêtements)
- **Micro-fissures** : Détection limitée si < 0.1mm

## Évolutions Futures

### Roadmap V2
- **Quantification automatique** : Mesure précise surfaces/longueurs pathologies
- **Détection 3D** : Localisation spatiale pathologies dans modèle 3D
- **Suivi temporel** : Évolution pathologies entre visites successives
- **ML personnalisé** : Modèle affiné sur corpus pathologies bâtiment

### Roadmap V3
- **Détection spécialisée** : Amiante, plomb, termites, salpêtre
- **Score dégradation** : Calcul automatique classe énergie/structure
- **Coût estimatif** : Chiffrage réparations selon barèmes métier
- **Export normatif** : Rapports conformes normes CREP, amiante, etc.

## Configuration et Déploiement

### Prérequis
- **OpenAI API Key** : Accès GPT-4 Vision (gpt-4o model)
- **Supabase** : Storage pour images, Database pour résultats
- **Capacitor** : Caméra native pour capture photos haute qualité

### Variables d'Environnement
```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Coûts d'Utilisation
- **GPT-4 Vision** : ~$0.01-0.03 par analyse d'image
- **Storage Supabase** : ~$0.021/GB/mois pour stockage images
- **Bandwidth** : ~$0.09/GB pour transferts images

## Avertissements et Limites

### Responsabilité Légale
⚠️ **Important** : La détection automatique de pathologies par IA est un outil d'aide au diagnostic, **non un diagnostic officiel**.

- Les résultats doivent être **vérifiés par un expert qualifié**
- L'IA peut produire des **faux positifs ou négatifs**
- Certaines pathologies **nécessitent investigations approfondies**
- **Aucune garantie** sur exhaustivité ou exactitude détections

### Recommandations d'Usage
- ✅ **Utiliser comme outil de pré-diagnostic** et d'aide à la décision
- ✅ **Compléter avec expertise humaine** pour diagnostic officiel
- ✅ **Documenter limitations** dans rapports clients
- ❌ **Ne pas remplacer expertise professionnelle** par IA seule
- ❌ **Ne pas fonder décisions juridiques** uniquement sur résultats IA

## Support et Contact

Pour toute question sur la détection de pathologies, consultez la documentation technique ou contactez l'équipe de développement MyEDLS.

---

**MyEDLS** - Détection Intelligente de Pathologies par IA  
Powered by GPT-4 Vision
