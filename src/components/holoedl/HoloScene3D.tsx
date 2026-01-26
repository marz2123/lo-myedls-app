import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Billboard, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { HoloMarker, HoloPath, Vector3D } from '@/types/holoedl';

interface ARMarker3DProps {
  marker: HoloMarker;
  isSelected: boolean;
  onClick: () => void;
}

function ARMarker3D({ marker, isSelected, onClick }: ARMarker3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  
  const color = useMemo(() => {
    switch (marker.severity) {
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#EAB308';
      case 'low': return '#22C55E';
      default: return marker.color || '#3B82F6';
    }
  }, [marker.severity, marker.color]);
  
  return (
    <group position={[marker.coordinates.x, marker.coordinates.y, marker.coordinates.z]}>
      {/* Marker sphere */}
      <mesh ref={meshRef} onClick={onClick} scale={isSelected ? 1.3 : 1}>
        <sphereGeometry args={[0.1 * marker.scale, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12 * marker.scale, 0.15 * marker.scale, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Label */}
      {marker.label && (
        <Billboard>
          <Text
            position={[0, 0.25, 0]}
            fontSize={0.08}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.01}
            outlineColor="black"
          >
            {marker.label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

interface GuidedPath3DProps {
  path: HoloPath;
  currentWaypointIndex: number;
}

function GuidedPath3D({ path, currentWaypointIndex }: GuidedPath3DProps) {
  const points = useMemo(() => {
    return path.waypoints.map(wp => 
      new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z)
    );
  }, [path.waypoints]);
  
  return (
    <group>
      {/* Path line */}
      <Line
        points={points}
        color="#22C55E"
        lineWidth={3}
        dashed
        dashScale={2}
      />
      
      {/* Waypoint markers */}
      {path.waypoints.map((waypoint, index) => (
        <group 
          key={waypoint.id}
          position={[waypoint.position.x, waypoint.position.y, waypoint.position.z]}
        >
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
            <meshStandardMaterial 
              color={index <= currentWaypointIndex ? '#22C55E' : '#6B7280'}
              emissive={index === currentWaypointIndex ? '#22C55E' : undefined}
              emissiveIntensity={index === currentWaypointIndex ? 0.5 : 0}
            />
          </mesh>
          
          {waypoint.label && (
            <Billboard>
              <Text
                position={[0, 0.2, 0]}
                fontSize={0.06}
                color="white"
              >
                {waypoint.label}
              </Text>
            </Billboard>
          )}
        </group>
      ))}
    </group>
  );
}

interface MeasurementLine3DProps {
  start: Vector3D;
  end: Vector3D;
  value: string;
}

function MeasurementLine3D({ start, end, value }: MeasurementLine3DProps) {
  const midPoint = useMemo(() => ({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
    z: (start.z + end.z) / 2
  }), [start, end]);
  
  return (
    <group>
      <Line
        points={[
          [start.x, start.y, start.z],
          [end.x, end.y, end.z]
        ]}
        color="#F59E0B"
        lineWidth={2}
      />
      
      {/* Start point */}
      <mesh position={[start.x, start.y, start.z]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      
      {/* End point */}
      <mesh position={[end.x, end.y, end.z]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      
      {/* Value label */}
      <Billboard position={[midPoint.x, midPoint.y + 0.1, midPoint.z]}>
        <Text
          fontSize={0.08}
          color="#F59E0B"
          anchorX="center"
          outlineWidth={0.01}
          outlineColor="black"
        >
          {value}
        </Text>
      </Billboard>
    </group>
  );
}

interface HoloScene3DProps {
  markers: HoloMarker[];
  activePath?: HoloPath | null;
  selectedMarkerId?: string;
  onMarkerClick: (marker: HoloMarker) => void;
  measurements?: Array<{ start: Vector3D; end: Vector3D; value: string }>;
  currentWaypointIndex?: number;
}

export function HoloScene3D({
  markers,
  activePath,
  selectedMarkerId,
  onMarkerClick,
  measurements = [],
  currentWaypointIndex = 0
}: HoloScene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 3], fov: 60 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Grid floor */}
      <gridHelper args={[20, 20, '#444', '#333']} />
      
      {/* Markers */}
      {markers.map(marker => (
        <ARMarker3D
          key={marker.id}
          marker={marker}
          isSelected={marker.id === selectedMarkerId}
          onClick={() => onMarkerClick(marker)}
        />
      ))}
      
      {/* Guided path */}
      {activePath && (
        <GuidedPath3D 
          path={activePath} 
          currentWaypointIndex={currentWaypointIndex}
        />
      )}
      
      {/* Measurements */}
      {measurements.map((m, index) => (
        <MeasurementLine3D
          key={index}
          start={m.start}
          end={m.end}
          value={m.value}
        />
      ))}
    </Canvas>
  );
}
