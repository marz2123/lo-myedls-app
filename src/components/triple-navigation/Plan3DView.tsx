import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Camera, Wrench, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EDLRoom } from '@/hooks/useEDLNavigationData';

interface Plan3DViewProps {
  rooms: EDLRoom[];
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string | null;
}

interface RoomBlock {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'not_started' | 'in_progress' | 'completed';
  anomaliesCount: number;
  photosCount: number;
  tasksCount: number;
  completionPercentage: number;
}

export function Plan3DView({ rooms, onRoomSelect, selectedRoomId }: Plan3DViewProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Generate room blocks layout
  const roomBlocks = useMemo((): RoomBlock[] => {
    const cols = Math.ceil(Math.sqrt(rooms.length));
    const baseSize = 120;
    const gap = 20;

    return rooms.map((room, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      // Vary sizes slightly based on room type
      const sizeMultiplier = room.name.toLowerCase().includes('séjour') || room.name.toLowerCase().includes('salon') 
        ? 1.4 
        : room.name.toLowerCase().includes('chambre') 
          ? 1.2 
          : 1;

      return {
        id: room.id,
        name: room.name,
        x: col * (baseSize + gap) + 40,
        y: row * (baseSize + gap) + 40,
        width: baseSize * sizeMultiplier,
        height: baseSize * (sizeMultiplier * 0.8),
        status: room.status,
        anomaliesCount: room.anomaliesCount,
        photosCount: room.photosCount,
        tasksCount: room.tasksCount,
        completionPercentage: room.completionPercentage
      };
    });
  }, [rooms]);

  const getStatusColor = (status: string, hasAnomalies: boolean) => {
    if (hasAnomalies) return 'hsl(var(--destructive))';
    switch (status) {
      case 'completed': return 'hsl(var(--primary))';
      case 'in_progress': return 'hsl(45 93% 47%)';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getStatusBg = (status: string, hasAnomalies: boolean) => {
    if (hasAnomalies) return 'hsl(var(--destructive) / 0.1)';
    switch (status) {
      case 'completed': return 'hsl(var(--primary) / 0.1)';
      case 'in_progress': return 'hsl(45 93% 47% / 0.1)';
      default: return 'hsl(var(--muted) / 0.5)';
    }
  };

  const viewBoxWidth = Math.max(...roomBlocks.map(r => r.x + r.width)) + 80;
  const viewBoxHeight = Math.max(...roomBlocks.map(r => r.y + r.height)) + 80;

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-background to-muted/30 rounded-2xl overflow-hidden">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setScale(s => Math.min(s + 0.2, 2))}
          className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-sm font-medium hover:bg-background transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
          className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-sm font-medium hover:bg-background transition-colors"
        >
          −
        </button>
      </div>

      {/* 3D Plan SVG */}
      <motion.svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-full"
        style={{ transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Room blocks */}
        {roomBlocks.map((room, index) => {
          const isHovered = hoveredRoom === room.id;
          const isSelected = selectedRoomId === room.id;
          const hasAnomalies = room.anomaliesCount > 0;
          const strokeColor = getStatusColor(room.status, hasAnomalies);
          const fillColor = getStatusBg(room.status, hasAnomalies);

          return (
            <g key={room.id}>
              {/* 3D effect - side panels */}
              <motion.path
                d={`M ${room.x + room.width} ${room.y} L ${room.x + room.width + 8} ${room.y - 8} L ${room.x + room.width + 8} ${room.y + room.height - 8} L ${room.x + room.width} ${room.y + room.height} Z`}
                fill={strokeColor}
                opacity={0.3}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 0.5 : 0.3 }}
              />
              <motion.path
                d={`M ${room.x} ${room.y} L ${room.x + 8} ${room.y - 8} L ${room.x + room.width + 8} ${room.y - 8} L ${room.x + room.width} ${room.y} Z`}
                fill={strokeColor}
                opacity={0.2}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 0.4 : 0.2 }}
              />

              {/* Main room block */}
              <motion.rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx={8}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isSelected ? 3 : 2}
                className="cursor-pointer"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: isHovered || isSelected ? 1.02 : 1, 
                  opacity: 1,
                  y: isHovered ? -4 : 0
                }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                onClick={() => onRoomSelect(room.id)}
              />

              {/* Pulse animation for in-progress rooms */}
              {room.status === 'in_progress' && (
                <motion.rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx={8}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  pointerEvents="none"
                />
              )}

              {/* Room name */}
              <text
                x={room.x + room.width / 2}
                y={room.y + room.height / 2 - 8}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground pointer-events-none"
              >
                {room.name.length > 12 ? room.name.substring(0, 12) + '...' : room.name}
              </text>

              {/* Completion percentage */}
              <text
                x={room.x + room.width / 2}
                y={room.y + room.height / 2 + 8}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground pointer-events-none"
              >
                {room.completionPercentage}%
              </text>

              {/* Status icons */}
              <g transform={`translate(${room.x + 8}, ${room.y + room.height - 20})`}>
                {hasAnomalies && (
                  <g className="text-destructive">
                    <circle cx="6" cy="6" r="8" fill="hsl(var(--destructive) / 0.2)" />
                    <text x="6" y="10" textAnchor="middle" className="text-[8px] fill-destructive font-bold">
                      ⚠️
                    </text>
                  </g>
                )}
                {room.photosCount === 0 && (
                  <g transform="translate(20, 0)">
                    <circle cx="6" cy="6" r="8" fill="hsl(var(--warning) / 0.2)" />
                    <text x="6" y="10" textAnchor="middle" className="text-[8px] fill-warning font-bold">
                      📸
                    </text>
                  </g>
                )}
                {room.tasksCount > 0 && (
                  <g transform={`translate(${room.photosCount === 0 ? 40 : 20}, 0)`}>
                    <circle cx="6" cy="6" r="8" fill="hsl(var(--primary) / 0.2)" />
                    <text x="6" y="10" textAnchor="middle" className="text-[8px] fill-primary font-bold">
                      🔧
                    </text>
                  </g>
                )}
              </g>

              {/* Completed checkmark */}
              {room.status === 'completed' && (
                <g transform={`translate(${room.x + room.width - 20}, ${room.y + 8})`}>
                  <circle cx="8" cy="8" r="10" fill="hsl(var(--primary))" />
                  <text x="8" y="12" textAnchor="middle" className="text-[10px] fill-primary-foreground font-bold">
                    ✓
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </motion.svg>

      {/* Room tooltip on hover */}
      <AnimatePresence>
        {hoveredRoom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-xl rounded-xl p-4 border border-border/50 shadow-lg"
          >
            {(() => {
              const room = rooms.find(r => r.id === hoveredRoom);
              if (!room) return null;
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{room.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {room.completionPercentage}% complété • {room.elements.length} éléments
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {room.anomaliesCount > 0 && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{room.anomaliesCount}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">{room.photosCount}</span>
                    </div>
                    {room.tasksCount > 0 && (
                      <div className="flex items-center gap-1 text-primary">
                        <Wrench className="w-4 h-4" />
                        <span className="text-sm">{room.tasksCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
