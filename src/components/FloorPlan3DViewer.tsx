import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';

interface AnnotatedZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloorPlan3DViewerProps {
  floorPlanUrl: string;
  zones: AnnotatedZone[];
}

function FloorPlanMesh({ imageUrl, zones }: { imageUrl: string; zones: AnnotatedZone[] }) {
  const texture = useTexture(imageUrl);
  
  // Calculate aspect ratio based on texture
  const image = texture.image as HTMLImageElement;
  const aspectRatio = image.width / image.height;
  const floorWidth = 10;
  const floorDepth = floorWidth / aspectRatio;
  
  return (
    <group>
      {/* Floor with floor plan texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial map={texture} />
      </mesh>
      
      {/* Walls based on zones */}
      {zones.map((zone) => {
        // Convert zone coordinates to 3D space
        const wallX = (zone.x / 100) * floorWidth - floorWidth / 2 + (zone.width / 100) * floorWidth / 2;
        const wallZ = (zone.y / 100) * floorDepth - floorDepth / 2 + (zone.height / 100) * floorDepth / 2;
        const wallWidth = (zone.width / 100) * floorWidth;
        const wallDepth = (zone.height / 100) * floorDepth;
        const wallHeight = 2.5;
        
        return (
          <group key={zone.id}>
            {/* Front wall */}
            <mesh
              position={[wallX, wallHeight / 2, wallZ - wallDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wallWidth, wallHeight, 0.1]} />
              <meshStandardMaterial color="#e0e0e0" opacity={0.7} transparent />
            </mesh>
            
            {/* Back wall */}
            <mesh
              position={[wallX, wallHeight / 2, wallZ + wallDepth / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wallWidth, wallHeight, 0.1]} />
              <meshStandardMaterial color="#e0e0e0" opacity={0.7} transparent />
            </mesh>
            
            {/* Left wall */}
            <mesh
              position={[wallX - wallWidth / 2, wallHeight / 2, wallZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.1, wallHeight, wallDepth]} />
              <meshStandardMaterial color="#e0e0e0" opacity={0.7} transparent />
            </mesh>
            
            {/* Right wall */}
            <mesh
              position={[wallX + wallWidth / 2, wallHeight / 2, wallZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.1, wallHeight, wallDepth]} />
              <meshStandardMaterial color="#e0e0e0" opacity={0.7} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function FloorPlan3DViewer({ floorPlanUrl, zones }: FloorPlan3DViewerProps) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border bg-background">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 8, 8]} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -5]} intensity={0.5} />
        
        <Suspense fallback={null}>
          <FloorPlanMesh imageUrl={floorPlanUrl} zones={zones} />
        </Suspense>
        
        {/* Grid helper for reference */}
        <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -0.01, 0]} />
      </Canvas>
    </div>
  );
}
