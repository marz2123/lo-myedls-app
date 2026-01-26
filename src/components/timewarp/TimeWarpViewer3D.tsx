import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { TimeWarpSnapshot, TimeWarpAnomaly, ConditionLevel } from '@/types/timewarp';
import { CONDITION_COLORS } from '@/types/timewarp';

interface TimeWarpViewer3DProps {
  snapshot: TimeWarpSnapshot | null;
  compareSnapshot?: TimeWarpSnapshot | null;
  showAnomalies: boolean;
  showFurniture: boolean;
  isCompareMode: boolean;
  comparePosition?: number; // 0-1 for split view position
}

// Room mesh component
function RoomMesh({ 
  roomId, 
  state, 
  position = [0, 0, 0],
  showLabel = true,
}: { 
  roomId: string; 
  state: any; 
  position?: [number, number, number];
  showLabel?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    const condition = state?.condition as ConditionLevel;
    return condition ? CONDITION_COLORS[condition] : '#888888';
  }, [state?.condition]);

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[4, 2.5, 4]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Floor */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial 
          color={state?.surfaces?.floor?.color || '#8B7355'} 
          roughness={0.8}
        />
      </mesh>

      {/* Room label */}
      {showLabel && (
        <Html position={[0, 2, 0]} center>
          <div className="px-2 py-1 bg-background/90 rounded-md text-xs font-medium whitespace-nowrap shadow-lg">
            {state?.name || roomId}
          </div>
        </Html>
      )}
    </group>
  );
}

// Anomaly marker component
function AnomalyMarker({ anomaly }: { anomaly: TimeWarpAnomaly }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });

  const color = useMemo(() => {
    switch (anomaly.severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#888888';
    }
  }, [anomaly.severity]);

  return (
    <Float speed={2} floatIntensity={0.5}>
      <group position={[anomaly.location.x, anomaly.location.y, anomaly.location.z]}>
        <mesh ref={meshRef}>
          <octahedronGeometry args={[0.2]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
        
        <Html distanceFactor={10}>
          <div className="px-2 py-1 bg-background/90 rounded-md text-xs whitespace-nowrap shadow-lg border" 
               style={{ borderColor: color }}>
            <span className="font-medium">{anomaly.type}</span>
            <span className="text-muted-foreground ml-1">({anomaly.severity})</span>
          </div>
        </Html>
      </group>
    </Float>
  );
}

// Compare plane for split view
function ComparePlane({ position }: { position: number }) {
  return (
    <mesh position={[position * 10 - 5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[20, 10]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Year label component
function YearLabel({ year, position, isPrimary }: { year: number; position: [number, number, number]; isPrimary: boolean }) {
  return (
    <Html position={position}>
      <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
        isPrimary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
      }`}>
        {year}
      </div>
    </Html>
  );
}

// Main scene component
function TimeWarpScene({ 
  snapshot, 
  compareSnapshot, 
  showAnomalies, 
  showFurniture,
  isCompareMode,
  comparePosition = 0.5,
}: TimeWarpViewer3DProps) {
  const roomsState = snapshot?.rooms_state || {};
  const roomIds = Object.keys(roomsState);
  
  const compareRoomsState = compareSnapshot?.rooms_state || {};

  // Calculate room positions in a grid
  const getRoomPosition = (index: number, offset: number = 0): [number, number, number] => {
    const cols = Math.ceil(Math.sqrt(roomIds.length));
    const x = (index % cols) * 5 - (cols * 2.5) + offset;
    const z = Math.floor(index / cols) * 5 - 2.5;
    return [x, 0, z];
  };

  return (
    <>
      {/* Camera and controls */}
      <PerspectiveCamera makeDefault position={[10, 10, 10]} />
      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={50}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      <Environment preset="city" />

      {/* Grid helper */}
      <gridHelper args={[50, 50, '#666666', '#444444']} position={[0, -1.25, 0]} />

      {/* Year labels */}
      {snapshot && (
        <YearLabel 
          year={snapshot.snapshot_year} 
          position={isCompareMode ? [-8, 4, 0] : [0, 4, 0]} 
          isPrimary 
        />
      )}
      {compareSnapshot && isCompareMode && (
        <YearLabel 
          year={compareSnapshot.snapshot_year} 
          position={[8, 4, 0]} 
          isPrimary={false} 
        />
      )}

      {/* Primary snapshot rooms */}
      {roomIds.map((roomId, index) => (
        <RoomMesh
          key={`primary-${roomId}`}
          roomId={roomId}
          state={roomsState[roomId]}
          position={getRoomPosition(index, isCompareMode ? -7 : 0)}
        />
      ))}

      {/* Compare snapshot rooms */}
      {isCompareMode && compareSnapshot && Object.keys(compareRoomsState).map((roomId, index) => (
        <RoomMesh
          key={`compare-${roomId}`}
          roomId={roomId}
          state={compareRoomsState[roomId]}
          position={getRoomPosition(index, 7)}
          showLabel={false}
        />
      ))}

      {/* Compare divider */}
      {isCompareMode && <ComparePlane position={comparePosition} />}

      {/* Anomaly markers */}
      {showAnomalies && snapshot?.anomalies_json?.map((anomaly, index) => (
        <AnomalyMarker key={`anomaly-${index}`} anomaly={anomaly} />
      ))}
    </>
  );
}

export function TimeWarpViewer3D(props: TimeWarpViewer3DProps) {
  return (
    <div className="relative h-full w-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <Canvas shadows>
        <TimeWarpScene {...props} />
      </Canvas>
      
      {/* Empty state */}
      {!props.snapshot && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Aucun snapshot disponible</p>
            <p className="text-sm">Créez un EDL pour voir l'évolution temporelle</p>
          </div>
        </div>
      )}
    </div>
  );
}
