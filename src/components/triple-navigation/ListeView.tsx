import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Camera, 
  AlertTriangle, 
  CheckCircle2,
  Circle,
  MessageSquare,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EDLRoom, EDLElement } from '@/hooks/useEDLNavigationData';
import { Progress } from '@/components/ui/progress';

interface ListeViewProps {
  rooms: EDLRoom[];
  onRoomSelect: (roomId: string) => void;
  onElementSelect: (roomId: string, elementId: string) => void;
  selectedRoomId?: string | null;
}

export function ListeView({ rooms, onRoomSelect, onElementSelect, selectedRoomId }: ListeViewProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoomStatusColor = (status: string, hasAnomalies: boolean) => {
    if (hasAnomalies) return 'border-destructive/50 bg-destructive/5';
    switch (status) {
      case 'completed': return 'border-primary/50 bg-primary/5';
      case 'in_progress': return 'border-yellow-500/50 bg-yellow-500/5';
      default: return 'border-border bg-card';
    }
  };

  return (
    <div className="space-y-3 p-4">
      {rooms.map((room, index) => {
        const isExpanded = expandedRooms.has(room.id);
        const hasAnomalies = room.anomaliesCount > 0;

        return (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-xl border-2 overflow-hidden transition-all duration-200",
              getRoomStatusColor(room.status, hasAnomalies),
              selectedRoomId === room.id && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {/* Room header */}
            <div
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleRoom(room.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                  
                  <div>
                    <h3 className="font-semibold text-foreground">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.elements.length} éléments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status indicators */}
                  <div className="flex items-center gap-2">
                    {hasAnomalies && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-medium">{room.anomaliesCount}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <Camera className="w-3 h-3" />
                      <span className="text-xs font-medium">{room.photosCount}</span>
                    </div>
                  </div>

                  {/* Completion */}
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress value={room.completionPercentage} className="h-2 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground w-8">
                      {room.completionPercentage}%
                    </span>
                  </div>

                  {/* Status badge */}
                  {room.status === 'completed' && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Elements list */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/50"
                >
                  <div className="p-2 space-y-1">
                    {room.elements.length > 0 ? (
                      room.elements.map((element) => (
                        <ElementRow
                          key={element.id}
                          element={element}
                          roomId={room.id}
                          onSelect={() => onElementSelect(room.id, element.id)}
                        />
                      ))
                    ) : (
                      <div className="py-6 text-center text-muted-foreground">
                        <p className="text-sm">Aucun élément défini</p>
                        <button
                          onClick={() => onRoomSelect(room.id)}
                          className="mt-2 text-primary text-sm font-medium hover:underline"
                        >
                          Commencer l'inspection
                        </button>
                      </div>
                    )}

                    {/* Quick action to open room */}
                    <button
                      onClick={() => onRoomSelect(room.id)}
                      className="w-full p-3 mt-2 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Ouvrir la checklist</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {rooms.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Aucune pièce définie</p>
          <p className="text-sm mt-1">Commencez par définir la structure du bien</p>
        </div>
      )}
    </div>
  );
}

interface ElementRowProps {
  element: EDLElement;
  roomId: string;
  onSelect: () => void;
}

function ElementRow({ element, roomId, onSelect }: ElementRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        element.status === 'anomaly' 
          ? "bg-destructive/5 hover:bg-destructive/10" 
          : element.status === 'done'
            ? "bg-primary/5 hover:bg-primary/10"
            : "bg-muted/30 hover:bg-muted/50"
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {element.status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : element.status === 'anomaly' ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground" />
          )}
          
          <div>
            <p className="font-medium text-foreground capitalize">{element.name}</p>
            {element.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {element.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Photo thumbnails */}
          {element.photos.length > 0 && (
            <div className="flex -space-x-2">
              {element.photos.slice(0, 3).map((photo, i) => (
                <div
                  key={photo.id}
                  className="w-6 h-6 rounded border-2 border-background overflow-hidden"
                  style={{ zIndex: 3 - i }}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {element.photos.length > 3 && (
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border-2 border-background">
                  +{element.photos.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Condition badge */}
          {element.condition && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
              element.condition === 'bon' && "bg-green-100 text-green-700",
              element.condition === 'moyen' && "bg-yellow-100 text-yellow-700",
              element.condition === 'mauvais' && "bg-red-100 text-red-700"
            )}>
              {element.condition}
            </span>
          )}

          {/* Anomalies count */}
          {element.anomalies.length > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs font-medium">{element.anomalies.length}</span>
            </div>
          )}

          {/* Quick actions on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                <button className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
                <button className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                  <MessageSquare className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
