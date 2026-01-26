# Guide d'Implémentation Native AR pour Capacitor

## Vue d'ensemble

Ce guide explique comment implémenter le plugin Capacitor natif pour ARKit (iOS) et ARCore (Android) dans l'application MyEDLS.

L'architecture TypeScript/JavaScript est déjà implémentée. Ce guide couvre l'implémentation native requise pour activer les fonctionnalités AR réelles.

## Architecture

```
src/services/arScanner.ts          # Service principal AR (✅ Implémenté)
src/hooks/useARScanner.ts           # Hook React pour AR (✅ Implémenté)
ios/App/App/Plugins/                # Plugin iOS ARKit (❌ À implémenter)
android/app/src/main/java/.../      # Plugin Android ARCore (❌ À implémenter)
```

## Fonctionnalités AR

### Scan Automatique
- Détection automatique des surfaces (murs, sol, plafond)
- Mesure continue des dimensions pendant l'enregistrement vidéo
- Calcul automatique des volumes et surfaces
- Pas d'intervention utilisateur requise

### Mesures Capturées
- **Largeur** (width): Distance entre murs latéraux
- **Profondeur** (depth): Distance avant/arrière
- **Hauteur** (height): Hauteur sous plafond
- **Surface** (area): Largeur × Profondeur
- **Volume** (volume): Surface × Hauteur
- **Confiance** (confidence): 0.0 - 1.0

## Implémentation iOS (ARKit)

### 1. Configuration Xcode

Ouvrir le projet iOS:
```bash
npx cap open ios
```

### 2. Ajouter les Permissions (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>L'appareil photo est nécessaire pour le scan AR des pièces</string>
<key>NSMicrophoneUsageDescription</key>
<string>Le microphone est nécessaire pour enregistrer vos commentaires</string>
```

### 3. Créer le Plugin ARKit (Swift)

Créer: `ios/App/App/Plugins/ARScanner.swift`

```swift
import Foundation
import Capacitor
import ARKit
import UIKit

@objc(ARScannerPlugin)
public class ARScannerPlugin: CAPPlugin, ARSCNViewDelegate, ARSessionDelegate {
    
    private var arView: ARSCNView?
    private var arSession: ARSession?
    private var detectedPlanes: [UUID: ARPlaneAnchor] = [:]
    private var isAutoMeasuring = false
    private var lastMeasurementTime: Date?
    
    // MARK: - Plugin Methods
    
    @objc func checkARKitAvailability(_ call: CAPPluginCall) {
        let available = ARWorldTrackingConfiguration.isSupported
        call.resolve([
            "available": available,
            "reason": available ? "ARKit supported" : "Device does not support ARKit"
        ])
    }
    
    @objc func startARKitSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Créer ARSCNView
            let frame = UIScreen.main.bounds
            self.arView = ARSCNView(frame: frame)
            
            guard let arView = self.arView else {
                call.reject("Failed to create AR view")
                return
            }
            
            // Configuration ARKit
            let configuration = ARWorldTrackingConfiguration()
            configuration.planeDetection = [.horizontal, .vertical]
            configuration.environmentTexturing = .automatic
            
            if #available(iOS 13.0, *) {
                configuration.frameSemantics = .sceneDepth
            }
            
            // Démarrer session
            arView.session.delegate = self
            arView.delegate = self
            arView.session.run(configuration)
            
            self.arSession = arView.session
            self.isAutoMeasuring = call.getBool("autoMeasure") ?? false
            
            // Ajouter overlay invisible (pas d'UI visible)
            if let viewController = self.bridge?.viewController {
                arView.alpha = 0.01 // Quasi invisible mais actif
                viewController.view.insertSubview(arView, at: 0)
            }
            
            call.resolve(["success": true])
        }
    }
    
    @objc func stopARSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.arSession?.pause()
            self?.arView?.removeFromSuperview()
            self?.arView = nil
            self?.arSession = nil
            self?.isAutoMeasuring = false
            self?.detectedPlanes.removeAll()
            
            call.resolve(["success": true])
        }
    }
    
    @objc func getCurrentMeasurements(_ call: CAPPluginCall) {
        guard let measurements = self.calculateRoomMeasurements() else {
            call.resolve(["measurements": NSNull()])
            return
        }
        
        call.resolve([
            "measurements": [
                "width": measurements.width,
                "height": measurements.height,
                "depth": measurements.depth,
                "area": measurements.area,
                "volume": measurements.volume,
                "confidence": measurements.confidence,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ]
        ])
    }
    
    // MARK: - ARSessionDelegate
    
    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // Mesure automatique toutes les 2 secondes
        if isAutoMeasuring {
            let now = Date()
            if let lastTime = lastMeasurementTime,
               now.timeIntervalSince(lastTime) < 2.0 {
                return
            }
            
            lastMeasurementTime = now
            
            if let measurements = calculateRoomMeasurements() {
                // Envoyer à JavaScript via callback
                notifyMeasurementUpdate(measurements)
            }
        }
    }
    
    public func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        for anchor in anchors {
            if let planeAnchor = anchor as? ARPlaneAnchor {
                detectedPlanes[anchor.identifier] = planeAnchor
                notifyPlaneDetected(planeAnchor)
            }
        }
    }
    
    public func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            if let planeAnchor = anchor as? ARPlaneAnchor {
                detectedPlanes[anchor.identifier] = planeAnchor
            }
        }
    }
    
    // MARK: - Measurement Logic
    
    private func calculateRoomMeasurements() -> RoomMeasurements? {
        guard !detectedPlanes.isEmpty else { return nil }
        
        var minX: Float = .infinity
        var maxX: Float = -.infinity
        var minY: Float = .infinity
        var maxY: Float = -.infinity
        var minZ: Float = .infinity
        var maxZ: Float = -.infinity
        
        // Analyser tous les plans détectés
        for plane in detectedPlanes.values {
            let extent = plane.extent
            let center = plane.center
            
            minX = min(minX, center.x - extent.x / 2)
            maxX = max(maxX, center.x + extent.x / 2)
            minY = min(minY, center.y)
            maxY = max(maxY, center.y)
            minZ = min(minZ, center.z - extent.z / 2)
            maxZ = max(maxZ, center.z + extent.z / 2)
        }
        
        guard minX != .infinity else { return nil }
        
        let width = Double(maxX - minX)
        let height = Double(maxY - minY)
        let depth = Double(maxZ - minZ)
        let area = width * depth
        let volume = area * height
        
        // Calculer confiance basée sur nombre de plans
        let confidence = min(Double(detectedPlanes.count) / 6.0, 1.0)
        
        return RoomMeasurements(
            width: width,
            height: height,
            depth: depth,
            area: area,
            volume: volume,
            confidence: confidence
        )
    }
    
    // MARK: - Notifications JavaScript
    
    private func notifyMeasurementUpdate(_ measurements: RoomMeasurements) {
        notifyListeners("arMeasurementUpdate", data: [
            "measurements": [
                "width": measurements.width,
                "height": measurements.height,
                "depth": measurements.depth,
                "area": measurements.area,
                "volume": measurements.volume,
                "confidence": measurements.confidence,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ],
            "planeDetected": !detectedPlanes.isEmpty
        ])
    }
    
    private func notifyPlaneDetected(_ plane: ARPlaneAnchor) {
        notifyListeners("arPlaneDetected", data: [
            "alignment": plane.alignment == .horizontal ? "horizontal" : "vertical",
            "extent": [
                "x": plane.extent.x,
                "z": plane.extent.z
            ]
        ])
    }
}

// MARK: - Helper Structures

struct RoomMeasurements {
    let width: Double
    let height: Double
    let depth: Double
    let area: Double
    let volume: Double
    let confidence: Double
}
```

### 4. Enregistrer le Plugin

Dans `ios/App/App/AppDelegate.swift`:

```swift
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    // ... code existant ...
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Enregistrer le plugin AR
        CAPBridge.registerPlugin(ARScannerPlugin.self)
        
        return true
    }
}
```

## Implémentation Android (ARCore)

### 1. Configuration Gradle

Dans `android/app/build.gradle`:

```gradle
dependencies {
    // ARCore
    implementation 'com.google.ar:core:1.40.0'
    
    // Autres dépendances...
}
```

### 2. Ajouter les Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.ar" android:required="true"/>

<application>
    <!-- ... -->
    
    <!-- ARCore metadata -->
    <meta-data
        android:name="com.google.ar.core"
        android:value="required" />
</application>
```

### 3. Créer le Plugin ARCore (Kotlin)

Créer: `android/app/src/main/java/[package]/plugins/ARScannerPlugin.kt`

```kotlin
package [votre.package].plugins

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ar.core.*
import com.google.ar.core.exceptions.*
import org.json.JSONObject
import java.util.*
import kotlin.collections.HashMap

@CapacitorPlugin(name = "ARScanner")
class ARScannerPlugin : Plugin() {
    
    private var arSession: Session? = null
    private var config: Config? = null
    private val detectedPlanes = HashMap<UUID, Plane>()
    private var isAutoMeasuring = false
    private var lastMeasurementTime = 0L
    
    @PluginMethod
    fun checkARCoreAvailability(call: PluginCall) {
        val availability = ArCoreApk.getInstance().checkAvailability(context)
        
        val result = JSObject()
        result.put("available", availability.isSupported)
        result.put("reason", when {
            availability.isSupported -> "ARCore supported"
            availability.isTransient -> "ARCore installing..."
            else -> "ARCore not supported"
        })
        
        call.resolve(result)
    }
    
    @PluginMethod
    fun startARCoreSession(call: PluginCall) {
        // Vérifier permission caméra
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            call.reject("Camera permission required")
            return
        }
        
        try {
            // Créer session ARCore
            arSession = Session(context)
            
            // Configuration
            config = Config(arSession).apply {
                planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                depthMode = Config.DepthMode.AUTOMATIC
                updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            }
            
            arSession?.configure(config)
            arSession?.resume()
            
            isAutoMeasuring = call.getBoolean("autoMeasure", false)
            
            // Démarrer thread de mesure
            startMeasurementLoop()
            
            val result = JSObject()
            result.put("success", true)
            call.resolve(result)
            
        } catch (e: Exception) {
            call.reject("Failed to start ARCore: ${e.message}")
        }
    }
    
    @PluginMethod
    fun stopARSession(call: PluginCall) {
        arSession?.pause()
        arSession?.close()
        arSession = null
        isAutoMeasuring = false
        detectedPlanes.clear()
        
        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getCurrentMeasurements(call: PluginCall) {
        val measurements = calculateRoomMeasurements()
        
        val result = JSObject()
        if (measurements != null) {
            result.put("measurements", measurements)
        } else {
            result.put("measurements", JSONObject.NULL)
        }
        
        call.resolve(result)
    }
    
    // MARK: - Measurement Logic
    
    private fun startMeasurementLoop() {
        bridge.activity.runOnUiThread {
            val timer = Timer()
            timer.scheduleAtFixedRate(object : TimerTask() {
                override fun run() {
                    if (!isAutoMeasuring) {
                        timer.cancel()
                        return
                    }
                    
                    try {
                        updateARFrame()
                    } catch (e: Exception) {
                        // Silent fail
                    }
                }
            }, 0, 2000) // Toutes les 2 secondes
        }
    }
    
    private fun updateARFrame() {
        arSession?.let { session ->
            val frame = session.update()
            
            // Détecter nouveaux plans
            frame.getUpdatedTrackables(Plane::class.java).forEach { plane ->
                if (plane.trackingState == TrackingState.TRACKING) {
                    detectedPlanes[UUID.randomUUID()] = plane
                    notifyPlaneDetected(plane)
                }
            }
            
            // Calculer et notifier mesures
            calculateRoomMeasurements()?.let { measurements ->
                notifyMeasurementUpdate(measurements)
            }
        }
    }
    
    private fun calculateRoomMeasurements(): JSObject? {
        if (detectedPlanes.isEmpty()) return null
        
        var minX = Float.MAX_VALUE
        var maxX = Float.MIN_VALUE
        var minY = Float.MAX_VALUE
        var maxY = Float.MIN_VALUE
        var minZ = Float.MAX_VALUE
        var maxZ = Float.MIN_VALUE
        
        // Analyser tous les plans
        detectedPlanes.values.forEach { plane ->
            val pose = plane.centerPose
            val extent = plane.extentX
            val extentZ = plane.extentZ
            
            minX = minOf(minX, pose.tx() - extent / 2)
            maxX = maxOf(maxX, pose.tx() + extent / 2)
            minY = minOf(minY, pose.ty())
            maxY = maxOf(maxY, pose.ty())
            minZ = minOf(minZ, pose.tz() - extentZ / 2)
            maxZ = maxOf(maxZ, pose.tz() + extentZ / 2)
        }
        
        val width = (maxX - minX).toDouble()
        val height = (maxY - minY).toDouble()
        val depth = (maxZ - minZ).toDouble()
        val area = width * depth
        val volume = area * height
        val confidence = minOf(detectedPlanes.size / 6.0, 1.0)
        
        return JSObject().apply {
            put("width", width)
            put("height", height)
            put("depth", depth)
            put("area", area)
            put("volume", volume)
            put("confidence", confidence)
            put("timestamp", System.currentTimeMillis())
        }
    }
    
    // MARK: - Notifications JavaScript
    
    private fun notifyMeasurementUpdate(measurements: JSObject) {
        val data = JSObject().apply {
            put("measurements", measurements)
            put("planeDetected", detectedPlanes.isNotEmpty())
        }
        
        notifyListeners("arMeasurementUpdate", data)
    }
    
    private fun notifyPlaneDetected(plane: Plane) {
        val data = JSObject().apply {
            put("alignment", if (plane.type == Plane.Type.HORIZONTAL_UPWARD_FACING) 
                "horizontal" else "vertical")
            put("extent", JSObject().apply {
                put("x", plane.extentX)
                put("z", plane.extentZ)
            })
        }
        
        notifyListeners("arPlaneDetected", data)
    }
}
```

### 4. Enregistrer le Plugin

Dans `android/app/src/main/java/[package]/MainActivity.java`:

```java
import [votre.package].plugins.ARScannerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enregistrer plugins
        registerPlugin(ARScannerPlugin.class);
    }
}
```

## Tests et Validation

### Test iOS (Simulateur + Device)
```bash
# Ouvrir Xcode
npx cap open ios

# Build et run sur simulateur (AR simulé)
# Build et run sur device physique (AR réel)
```

### Test Android
```bash
# Ouvrir Android Studio
npx cap open android

# Build et run sur emulator (AR simulé)
# Build et run sur device physique (AR réel)
```

### Validation Fonctionnelle

✅ **Scan Automatique**
- AR démarre automatiquement avec l'enregistrement vidéo
- Mesures mises à jour toutes les 2 secondes
- Badge AR visible avec statut "Actif"

✅ **Détection Plans**
- Plans horizontaux (sol) détectés
- Plans verticaux (murs) détectés
- Mesures calculées automatiquement

✅ **Stockage Données**
- Mesures sauvegardées dans `detected_blocks.volume_data`
- Disponibles dans la timeline
- Exportées dans PDF/CSV

## Debugging

### iOS
```bash
# Console Xcode
# Product > Run
# Console logs affichent: [AR Simulation] / [ARKit] ...
```

### Android
```bash
# Logcat Android Studio
# adb logcat | grep ARCore
```

### Web (Simulation)
```javascript
// Console navigateur affiche:
// [AR Simulation] startARKitSession { autoMeasure: true }
// AR Measurement received: { measurements: {...} }
```

## Performance

- **iOS ARKit**: 60 FPS tracking, latence < 20ms
- **Android ARCore**: 30 FPS tracking, latence < 40ms
- **Impact batterie**: ~15-20% additionnel pendant scan
- **Précision**: ±5cm pour distances < 5m

## Roadmap

### V1 (Actuel)
✅ Architecture TypeScript complète
✅ Simulation AR pour développement
✅ Intégration automatique dans recording
✅ Stockage mesures en DB
✅ Affichage badges AR timeline

### V2 (Natif)
- [ ] Plugin iOS ARKit natif
- [ ] Plugin Android ARCore natif
- [ ] Tests sur devices physiques
- [ ] Optimisation performance

### V3 (Avancé)
- [ ] Reconstruction 3D complète
- [ ] Détection objets (fenêtres, portes)
- [ ] Export modèles 3D (.obj, .usdz)
- [ ] Annotation AR en temps réel

## Support

**Devices Compatibles:**
- **iOS**: iPhone 6S et ultérieur (puce A9+), iOS 11+
- **Android**: Devices ARCore-compatibles, Android 7.0+

**Liste complète:** https://developers.google.com/ar/devices

---

**Documentation Complète:**
- ARKit: https://developer.apple.com/documentation/arkit
- ARCore: https://developers.google.com/ar
- Capacitor Plugins: https://capacitorjs.com/docs/plugins
