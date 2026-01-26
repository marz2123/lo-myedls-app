import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Html } from '@react-three/drei';
import { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { 
  DigitalTwinModel, 
  DigitalTwinIoT, 
  TwinViewerState,
  STATUS_COLORS,
  CONDITION_COLORS,
  IOT_COLORS 
} from '@/types/digital-twin';
import { BIMSurface, BIMObject } from '@/types/bim';

interface DigitalTwinViewerProps {
  twin: DigitalTwinModel;
  surfaces: BIMSurface[];
  objects: BIMObject[];
  iotSensors: DigitalTwinIoT[];
  viewerState: TwinViewerState;
  onElementSelect: (elementId: string) => void;
}

function TwinElement({ 
  element, 
  viewMode, 
  isSelected, 
  iotSensors,
  onClick 
}: { 
  element: BIMObject;
  viewMode: TwinViewerState['mode'];
  isSelected: boolean;
  iotSensors: DigitalTwinIoT[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const color = useMemo(() => {
    switch (viewMode) {
      case 'anomalies':
        if (element.anomalies && element.anomalies.length > 0) {
          const severity = element.anomalies[0]?.severity || 'low';
          if (severity === 'critical') return STATUS_COLORS.critical;
          if (severity === 'high') return STATUS_COLORS.warning;
          return '#f59e0b';
        }
        return '#6b7280';
      case 'tasks':
        if (element.linked_task_ids && (element.linked_task_ids as string[]).length > 0) {
          return '#8b5cf6';
        }
        return '#6b7280';
      case 'materials':
        const matColors: Record<string, string> = {
          peinture: '#f472b6',
          carrelage: '#60a5fa',
          parquet: '#a3a3a3',
          beton: '#78716c',
          placo: '#e5e5e5',
        };
        return matColors[element.material_type?.toLowerCase() || ''] || '#9ca3af';
      case 'iot':
        const sensor = iotSensors.find(s => s.object_id === element.id);
        if (sensor) {
          if (sensor.alert_status === 'critical') return STATUS_COLORS.critical;
          if (sensor.alert_status === 'warning') return STATUS_COLORS.warning;
          return IOT_COLORS[sensor.sensor_type as keyof typeof IOT_COLORS] || '#22c55e';
        }
        return '#6b7280';
      case 'maintenance':
        return element.condition_state === 'mauvais' 
          ? CONDITION_COLORS.poor 
          : element.condition_state === 'moyen' 
            ? CONDITION_COLORS.fair 
            : CONDITION_COLORS.good;
      default:
        return element.color || '#94a3b8';
    }
  }, [viewMode, element, iotSensors]);

  const geometry = (element.geometry || {}) as { position?: { x: number; y: number; z: number } };
  const position = geometry.position || { x: 0, y: 0, z: 0 };
  const dimensions = {
    width: element.width || 1,
    height: element.height || 2,
    depth: element.depth || 0.2,
  };

  return (
    <group position={[position.x || 0, position.y || 0, position.z || 0]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial
          color={color}
          opacity={isSelected ? 1 : hovered ? 0.9 : 0.75}
          transparent
          emissive={isSelected ? color : hovered ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>
      
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0, dimensions.height / 2 + 0.5, 0]}>
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg min-w-[120px]">
            <p className="text-xs font-medium text-foreground">{element.object_name || element.object_type}</p>
            <p className="text-xs text-muted-foreground">{element.material_type}</p>
            {element.anomalies && element.anomalies.length > 0 && (
              <p className="text-xs text-destructive">⚠️ {element.anomalies.length} anomalie(s)</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function TwinRoom({ 
  surface, 
  index,
  viewMode,
  isSelected,
  iotSensors,
  onClick 
}: { 
  surface: BIMSurface;
  index: number;
  viewMode: TwinViewerState['mode'];
  isSelected: boolean;
  iotSensors: DigitalTwinIoT[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const length = Math.sqrt(surface.surface_m2 || 20);
  const width = length;
  const height = surface.hauteur_sous_plafond || 2.5;
  
  const xOffset = (index % 3) * (length + 2);
  const zOffset = Math.floor(index / 3) * (width + 2);

  const floorColor = useMemo(() => {
    switch (viewMode) {
      case 'materials':
        const matColors: Record<string, string> = {
          parquet: '#a3a3a3',
          carrelage: '#60a5fa',
          moquette: '#84cc16',
          beton: '#78716c',
        };
        return matColors[surface.sol_material?.toLowerCase() || ''] || '#e5e5e5';
      case 'maintenance':
        if (surface.global_condition === 'mauvais') return CONDITION_COLORS.poor;
        if (surface.global_condition === 'moyen') return CONDITION_COLORS.fair;
        return CONDITION_COLORS.good;
      case 'iot':
        const hasSensor = iotSensors.some(s => s.object_id === surface.room_id);
        return hasSensor ? '#22c55e' : '#6b7280';
      default:
        return '#f5f5f4';
    }
  }, [viewMode, surface, iotSensors]);

  return (
    <group position={[xOffset, 0, zOffset]}>
      {/* Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[length / 2, 0.01, width / 2]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        receiveShadow
      >
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial 
          color={floorColor} 
          opacity={isSelected ? 1 : 0.9}
          transparent
        />
      </mesh>

      {/* Walls - wireframe for visibility */}
      <lineSegments position={[length / 2, height / 2, width / 2]}>
        <edgesGeometry args={[new THREE.BoxGeometry(length, height, width)]} />
        <lineBasicMaterial color={isSelected ? '#3b82f6' : hovered ? '#60a5fa' : '#94a3b8'} />
      </lineSegments>

      {/* Room label */}
      <Html position={[length / 2, 0.5, width / 2]} center>
        <div 
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
            isSelected 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background/80 text-foreground'
          }`}
        >
          {surface.room_name}
        </div>
      </Html>
    </group>
  );
}

function IoTIndicator({ sensor, position }: { sensor: DigitalTwinIoT; position: [number, number, number] }) {
  const color = sensor.alert_status === 'critical' 
    ? STATUS_COLORS.critical 
    : sensor.alert_status === 'warning' 
      ? STATUS_COLORS.warning 
      : IOT_COLORS[sensor.sensor_type as keyof typeof IOT_COLORS] || '#22c55e';

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={sensor.alert_status !== 'normal' ? 0.5 : 0.2}
        />
      </mesh>
      <Html distanceFactor={8}>
        <div className="bg-background/90 border border-border rounded px-2 py-1 text-xs whitespace-nowrap">
          <span className="font-medium">{sensor.sensor_name || sensor.sensor_type}</span>
          {sensor.last_value !== null && (
            <span className="ml-1 text-muted-foreground">
              {sensor.last_value}{sensor.unit}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

function Scene({ 
  twin, 
  surfaces, 
  objects, 
  iotSensors,
  viewerState, 
  onElementSelect 
}: DigitalTwinViewerProps) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      <PerspectiveCamera makeDefault position={[15, 15, 15]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />

      <Grid
        args={[50, 50]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#94a3b8"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#64748b"
        fadeDistance={50}
        infiniteGrid
      />

      {/* Rooms */}
      {surfaces.map((surface, index) => (
        <TwinRoom
          key={surface.id}
          surface={surface}
          index={index}
          viewMode={viewerState.mode}
          isSelected={viewerState.selectedElement === surface.id}
          iotSensors={iotSensors}
          onClick={() => onElementSelect(surface.id)}
        />
      ))}

      {/* Objects */}
      {objects.map((object) => (
        <TwinElement
          key={object.id}
          element={object}
          viewMode={viewerState.mode}
          isSelected={viewerState.selectedElement === object.id}
          iotSensors={iotSensors}
          onClick={() => onElementSelect(object.id)}
        />
      ))}

      {/* IoT Sensors overlay */}
      {viewerState.mode === 'iot' && iotSensors.map((sensor, index) => (
        <IoTIndicator
          key={sensor.id}
          sensor={sensor}
          position={[(index % 5) * 3, 2, Math.floor(index / 5) * 3]}
        />
      ))}

      <Environment preset="city" />
    </>
  );
}

export function DigitalTwinViewer(props: DigitalTwinViewerProps) {
  return (
    <div className="w-full h-full min-h-[600px] rounded-xl overflow-hidden border border-border bg-gradient-to-br from-slate-900 to-slate-800">
      <Canvas shadows>
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
