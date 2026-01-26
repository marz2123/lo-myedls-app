import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { BIMObject, BIMSurface, BIMViewerState } from '@/types/bim';

interface BIMViewer3DProps {
  objects: BIMObject[];
  surfaces: BIMSurface[];
  viewerState: BIMViewerState;
  onObjectSelect?: (objectId: string) => void;
  selectedObjectId?: string;
}

// Material colors based on type
const materialColors: Record<string, string> = {
  wall: '#e8e8e8',
  door: '#8B4513',
  window: '#87CEEB',
  floor: '#D2B48C',
  ceiling: '#FFFFFF',
  radiator: '#C0C0C0',
  socket: '#333333',
  switch: '#555555',
  luminaire: '#FFD700',
  sanitaire: '#FFFFFF',
};

// Condition colors
const conditionColors: Record<string, string> = {
  neuf: '#22c55e',
  bon: '#3b82f6',
  moyen: '#f59e0b',
  mauvais: '#f97316',
  a_refaire: '#ef4444',
};

// Room component
const Room: React.FC<{
  surface: BIMSurface;
  colorBy: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ surface, colorBy, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate room dimensions
  const width = Math.sqrt(surface.surface_m2);
  const depth = surface.surface_m2 / width;
  const height = surface.hauteur_sous_plafond;

  // Determine color
  let color = '#e0e0e0';
  if (colorBy === 'condition' && surface.global_condition) {
    color = conditionColors[surface.global_condition] || color;
  }

  return (
    <group position={[0, height / 2, 0]}>
      {/* Floor */}
      <mesh 
        ref={meshRef}
        position={[0, -height / 2 + 0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onClick}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color={color} 
          side={THREE.DoubleSide}
          transparent
          opacity={isSelected ? 1 : 0.8}
        />
      </mesh>

      {/* Walls - wireframe for visibility */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={isSelected ? '#3b82f6' : '#cccccc'} 
          wireframe 
          transparent 
          opacity={0.3} 
        />
      </mesh>

      {/* Room label */}
      <Html position={[0, height / 2 + 0.5, 0]} center>
        <div className="bg-background/90 px-2 py-1 rounded text-xs font-medium shadow-sm whitespace-nowrap">
          {surface.room_name}
          <span className="text-muted-foreground ml-1">
            ({surface.surface_m2.toFixed(1)} m²)
          </span>
        </div>
      </Html>
    </group>
  );
};

// Object component
const BIMObjectMesh: React.FC<{
  object: BIMObject;
  colorBy: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ object, colorBy, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine color
  let color = materialColors[object.object_type] || '#888888';
  if (colorBy === 'material' && object.color) {
    color = object.color;
  } else if (colorBy === 'condition' && object.condition_state) {
    color = conditionColors[object.condition_state] || color;
  } else if (colorBy === 'anomaly' && object.anomalies?.length > 0) {
    color = '#ef4444';
  } else if (colorBy === 'task' && object.linked_task_ids?.length > 0) {
    color = '#f59e0b';
  }

  // Get dimensions
  const width = object.width || 1;
  const height = object.height || 2;
  const depth = object.depth || 0.1;

  // Get position from geometry
  const position = object.geometry?.position || { x: 0, y: 0, z: 0 };

  // Animate selected
  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.02);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y + height / 2, position.z]}
      onClick={onClick}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial 
        color={color}
        transparent
        opacity={isSelected ? 1 : 0.9}
        emissive={isSelected ? new THREE.Color(color) : undefined}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
};

// Scene component
const Scene: React.FC<BIMViewer3DProps> = ({
  objects,
  surfaces,
  viewerState,
  onObjectSelect,
  selectedObjectId
}) => {
  const { camera } = useThree();

  // Position rooms in a grid
  const roomPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    let x = 0;
    let z = 0;
    const maxWidth = 20;

    surfaces.forEach((surface, i) => {
      const width = Math.sqrt(surface.surface_m2);
      positions[surface.id] = [x + width / 2, 0, z];
      
      x += width + 2;
      if (x > maxWidth) {
        x = 0;
        z += 10;
      }
    });

    return positions;
  }, [surfaces]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Grid */}
      <Grid 
        args={[50, 50]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#888888" 
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#444444"
        fadeDistance={50}
        infiniteGrid
      />

      {/* Rooms */}
      {surfaces.map(surface => (
        <group key={surface.id} position={roomPositions[surface.id] || [0, 0, 0]}>
          <Room
            surface={surface}
            colorBy={viewerState.colorBy}
            isSelected={selectedObjectId === surface.id}
            onClick={() => onObjectSelect?.(surface.id)}
          />
        </group>
      ))}

      {/* Objects */}
      {objects.map(object => (
        <BIMObjectMesh
          key={object.id}
          object={object}
          colorBy={viewerState.colorBy}
          isSelected={selectedObjectId === object.id}
          onClick={() => onObjectSelect?.(object.id)}
        />
      ))}

      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
      <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={50} />
      <Environment preset="city" />
    </>
  );
};

// Main viewer component
export const BIMViewer3D: React.FC<BIMViewer3DProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[500px] bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg overflow-hidden">
      <Canvas shadows>
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};
