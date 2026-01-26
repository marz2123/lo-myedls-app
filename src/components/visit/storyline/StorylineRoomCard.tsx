import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Circle, AlertTriangle, Camera,
  DoorOpen, Bath, UtensilsCrossed, Sofa, Bed,
  Building2, Home, ChevronRight, Zap, Flame, Wind, Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { StorylineRoom, RoomElement } from '@/hooks/useEDLProgress';

interface StorylineRoomCardProps {
  room: StorylineRoom;
  index: number;
  onTapRoom: (room: StorylineRoom) => void;
  onTapElement: (room: StorylineRoom, element: RoomElement) => void;
}

const getRoomIcon = (name: string, locationType?: string) => {
  const lower = (name + (locationType || '')).toLowerCase();
  if (lower.includes('sdb') || lower.includes('salle de bain') || lower.includes('bathroom')) {
    return Bath;
  }
  if (lower.includes('cuisine') || lower.includes('kitchen')) {
    return UtensilsCrossed;
  }
  if (lower.includes('salon') || lower.includes('séjour') || lower.includes('living')) {
    return Sofa;
  }
  if (lower.includes('chambre') || lower.includes('bedroom')) {
    return Bed;
  }
  return DoorOpen;
};

const getElementIcon = (type: string) => {
  switch (type) {
    case 'electricite': return Zap;
    case 'chauffage': return Flame;
    case 'ventilation': return Wind;
    case 'sanitaire': return Droplets;
    default: return Circle;
  }
};

export const StorylineRoomCard: React.FC<StorylineRoomCardProps> = ({
  room,
  index,
  onTapRoom,
  onTapElement
}) => {
  const RoomIcon = getRoomIcon(room.name, room.locationType);
  
  const statusConfig = {
    not_started: {
      border: 'border-muted',
      bg: 'bg-card',
      badge: 'bg-muted text-muted-foreground',
      label: 'À faire'
    },
    in_progress: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/5',
      badge: 'bg-amber-500/20 text-amber-600',
      label: 'En cours'
    },
    completed: {
      border: 'border-green-500/50',
      bg: 'bg-green-500/5',
      badge: 'bg-green-500/20 text-green-600',
      label: 'Terminé'
    }
  };

  const config = room.hasAnomaly 
    ? { ...statusConfig[room.status], border: 'border-red-500/50', bg: 'bg-red-500/5' }
    : statusConfig[room.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="relative"
    >
      {/* Timeline connector */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-border" />
      )}

      <div 
        className={cn(
          "rounded-2xl border-2 overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover:scale-[1.01] cursor-pointer",
          config.border,
          config.bg
        )}
        onClick={() => onTapRoom(room)}
      >
        {/* Room header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            room.status === 'completed' 
              ? "bg-green-500/20" 
              : room.hasAnomaly 
                ? "bg-red-500/20"
                : "bg-primary/10"
          )}>
            <RoomIcon className={cn(
              "h-6 w-6",
              room.status === 'completed' 
                ? "text-green-500" 
                : room.hasAnomaly 
                  ? "text-red-500"
                  : "text-primary"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
              {room.hasAnomaly && (
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {room.partType === 'commune' ? (
                <Building2 className="h-3 w-3" />
              ) : (
                <Home className="h-3 w-3" />
              )}
              <span className="truncate">{room.partName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("text-xs", config.badge)}>
              {config.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Elements grid */}
        <div className="p-3 grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {room.elements.map((element) => {
            const ElementIcon = getElementIcon(element.type);
            
            return (
              <Button
                key={element.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-auto py-2 px-1 flex flex-col items-center gap-1 rounded-lg",
                  "transition-all hover:scale-105",
                  element.status === 'done' && "bg-green-500/10 hover:bg-green-500/20",
                  element.status === 'anomaly' && "bg-red-500/10 hover:bg-red-500/20",
                  element.status === 'pending' && "bg-muted/50 hover:bg-muted"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTapElement(room, element);
                }}
              >
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center",
                  element.status === 'done' && "bg-green-500/20",
                  element.status === 'anomaly' && "bg-red-500/20",
                  element.status === 'pending' && "bg-muted"
                )}>
                  {element.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : element.status === 'anomaly' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <ElementIcon className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium truncate max-w-full",
                  element.status === 'done' && "text-green-600",
                  element.status === 'anomaly' && "text-red-600",
                  element.status === 'pending' && "text-muted-foreground"
                )}>
                  {element.name.substring(0, 6)}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Room footer stats */}
        <div className="px-4 py-2 bg-muted/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {room.completedElements}/{room.totalElements} éléments
          </span>
          <div className="flex items-center gap-3">
            {room.photoCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Camera className="h-3 w-3" />
                {room.photoCount}
              </span>
            )}
            {room.anomalyCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {room.anomalyCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
