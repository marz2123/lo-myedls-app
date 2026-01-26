# 📦 Guide d'Export de Modèles 3D

## Vue d'ensemble

MyEDLS permet maintenant d'exporter les pièces scannées en AR sous forme de **modèles 3D** dans trois formats professionnels : OBJ, GLB et USDZ.

---

## 🎯 Formats Disponibles

### 1. **Wavefront OBJ** (.obj)
- **Usage** : Format universel compatible avec tous les logiciels 3D
- **Compatible avec** : 
  - Blender (modélisation 3D)
  - SketchUp (architecture)
  - 3DS Max (visualisation professionnelle)
  - Maya (animation 3D)
  - AutoCAD (CAO)
- **Contient** : Géométrie de la pièce + objets détectés

### 2. **glTF Binary** (.glb)
- **Usage** : Format web moderne pour visualisation 3D interactive
- **Compatible avec** :
  - Viewers 3D en ligne
  - Three.js (développement web)
  - Unity (moteur de jeu)
  - Unreal Engine
  - Babylon.js
- **Avantages** : Léger, optimisé pour le web, inclut métadonnées

### 3. **Apple USDZ** (.usdz) 🌟
- **Usage** : Réalité augmentée native iOS
- **Compatible avec** :
  - AR Quick Look (iOS/iPadOS)
  - iPhone/iPad (visualisation AR immédiate)
  - Reality Composer (création AR Apple)
  - SceneKit (développement iOS)
- **Expérience** : Placez le modèle 3D dans votre espace réel !

---

## 📱 Comment Exporter un Modèle 3D

### Étape 1 : Accéder à la Timeline
1. Terminez une visite avec scan AR activé
2. Accédez à la timeline de la visite
3. Identifiez un bloc avec le badge "AR" (mesures disponibles)

### Étape 2 : Ouvrir le Dialog d'Export
1. Cliquez sur le bouton **📦** (cube) dans les actions du bloc
2. Le dialog d'export s'ouvre avec les dimensions de la pièce

### Étape 3 : Générer les Modèles
1. Cliquez sur **"Générer les modèles 3D"**
2. Attendez quelques secondes (génération automatique)
3. Les 3 formats sont créés simultanément

### Étape 4 : Télécharger ou Partager
- **Télécharger** : Bouton "Télécharger" pour chaque format
- **Partager** : Bouton de partage pour envoyer via :
  - Email
  - AirDrop (iOS)
  - WhatsApp, Telegram
  - Google Drive, Dropbox

---

## 🌟 Visualisation AR sur iOS (USDZ)

### Mode AR Quick Look
1. Sur iPhone/iPad, ouvrez le fichier `.usdz` téléchargé
2. **AR Quick Look** se lance automatiquement
3. **Placez le modèle** dans votre espace réel en pointant la caméra
4. **Déplacez, tournez, agrandissez** le modèle avec vos doigts
5. Prenez des photos/vidéos du modèle en AR

### Cas d'Usage AR
- Présentation client immersive
- Validation des dimensions sur site
- Documentation visuelle augmentée
- Formation des équipes terrain

---

## 🏗️ Structure des Modèles 3D

### Contenu Généré

#### Géométrie de la Pièce
- **Box 3D** représentant le volume de la pièce
- **Dimensions réelles** : largeur × hauteur × profondeur
- **Sol, murs, plafond** modélisés

#### Objets Détectés
Chaque objet détecté par l'IA est inclus :
- 🚪 **Portes** : positionnées avec leurs dimensions
- 🪟 **Fenêtres** : placées sur les murs
- 🔥 **Radiateurs** : localisés au sol ou au mur
- 🔌 **Prises électriques** : positionnées sur les murs
- 💡 **Interrupteurs** : placés à hauteur standard
- 🔧 **Équipements fixes** : sanitaires, luminaires

### Métadonnées Incluses
- Dimensions de la pièce (m)
- Type de pièce détecté
- Nombre et type d'objets
- Score de confiance AR
- Timestamp de capture

---

## 📂 Stockage et Accès

### Stockage Cloud
- Modèles stockés dans le bucket `3d-models` de Supabase
- Organisation : `{userId}/{blockId}/room.{format}`
- Bucket public : accès direct via URL

### Persistance
- URLs sauvegardées dans `detected_blocks.model_3d_urls`
- Modèles accessibles à tout moment
- Re-génération possible (écrase les anciens modèles)

---

## 🔧 Utilisation Avancée

### Import dans Blender
```
1. Ouvrir Blender
2. File → Import → Wavefront (.obj)
3. Sélectionner le fichier room.obj téléchargé
4. Le modèle apparaît avec les mesures exactes
5. Ajouter textures, éclairage, rendu photoréaliste
```

### Import dans SketchUp
```
1. Ouvrir SketchUp
2. File → Import
3. Type : OBJ Files (.obj)
4. Sélectionner room.obj
5. Utiliser pour plans architecturaux
```

### Visualisation Web (Three.js)
```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load('room.glb', (gltf) => {
  scene.add(gltf.scene);
  // Modèle 3D chargé dans votre scène web
});
```

### AR iOS Native
```swift
import ARKit
import RealityKit

// Charger le modèle USDZ
let anchor = try! ModelEntity.loadAnchor(
  contentsOf: roomUsdzURL
)
arView.scene.anchors.append(anchor)
```

---

## 💡 Cas d'Usage Professionnels

### 1. Présentation Client
- Montrer le modèle 3D lors de réunions
- Visualiser les espaces en AR sur site
- Valider les dimensions avant travaux

### 2. Documentation Technique
- Plans 3D précis pour devis
- Mesures exactes pour matériaux
- Visualisation des volumes

### 3. Collaboration Équipes
- Partager les modèles entre corps de métier
- Import dans logiciels métier (Revit, AutoCAD)
- Base pour modélisation BIM

### 4. Marketing & Communication
- Visites virtuelles immersives
- Rendu photoréaliste des espaces
- Vidéos promotionnelles AR

---

## 📊 Performances

### Génération
- **Temps** : 2-5 secondes par modèle
- **Taille fichiers** :
  - OBJ : ~50-200 KB
  - GLB : ~100-300 KB
  - USDZ : ~150-400 KB
- **Qualité** : Mesures précises au cm près

### Compatibilité AR
- **iOS** : iPhone 6S et ultérieur, iOS 12+
- **Android** : Appareils compatibles ARCore (à venir)
- **Navigateurs** : WebXR pour GLB

---

## 🚀 Roadmap

### V2 (Q2 2024)
- Export avec **textures photographiques** des murs
- **Nuage de points** haute densité
- Support **Android ARCore** (format .glb AR)
- **Import/Export IFC** (BIM)

### V3 (Q3 2024)
- **Annotations 3D** sur le modèle
- **Mesures interactives** dans le viewer
- **Comparaison avant/après** travaux
- **Export Revit/AutoCAD** natif

---

## ❓ FAQ

### Q: Les modèles conservent-ils les couleurs ?
R: Actuellement non, ce sont des géométries neutres. Les textures photographiques arrivent en V2.

### Q: Puis-je modifier le modèle après export ?
R: Oui, dans n'importe quel logiciel 3D (Blender, SketchUp, etc.)

### Q: Les objets détectés sont-ils détaillés ?
R: Ce sont des formes simples (cubes) pour l'instant. Le détail s'améliore en V2/V3.

### Q: Compatibilité Android AR ?
R: En développement. GLB fonctionnera avec WebXR dans le navigateur.

### Q: Peut-on exporter plusieurs pièces ensemble ?
R: Actuellement par pièce individuelle. Export multi-pièces en V2.

---

## 📞 Support

Pour toute question :
- 📧 Email: support@myedls.com
- 💬 Chat MyAladin in-app
- 📖 Documentation : docs.myedls.com/3d-export

---

**🎉 Profitez de vos exports 3D professionnels !**
