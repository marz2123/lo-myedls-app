import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  Clock,
  FileText,
  Trash2,
  Move,
  Star,
  Check,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EDLPhoto, EDLRoom } from '@/hooks/useEDLNavigationData';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GaleriePhotoViewProps {
  photos: EDLPhoto[];
  rooms: EDLRoom[];
  onPhotoSelect?: (photoId: string) => void;
}

type SortOption = 'room' | 'element' | 'timestamp';
type FilterOption = 'all' | 'anomaly' | 'pending' | 'completed';

export function GaleriePhotoView({ photos, rooms, onPhotoSelect }: GaleriePhotoViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<EDLPhoto | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('room');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort photos
  const processedPhotos = useMemo(() => {
    let filtered = [...photos];

    // Apply filter
    switch (filterBy) {
      case 'anomaly':
        filtered = filtered.filter(p => p.hasAnomaly);
        break;
      case 'pending':
        filtered = filtered.filter(p => p.hasPendingDescription);
        break;
      case 'completed':
        filtered = filtered.filter(p => !p.hasPendingDescription);
        break;
    }

    // Apply sort
    switch (sortBy) {
      case 'room':
        filtered.sort((a, b) => (a.roomName || '').localeCompare(b.roomName || ''));
        break;
      case 'element':
        filtered.sort((a, b) => (a.elementType || '').localeCompare(b.elementType || ''));
        break;
      case 'timestamp':
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
    }

    return filtered;
  }, [photos, sortBy, filterBy]);

  // Group photos by room for display
  const groupedPhotos = useMemo(() => {
    if (sortBy !== 'room') return { 'Toutes les photos': processedPhotos };
    
    const groups: Record<string, EDLPhoto[]> = {};
    processedPhotos.forEach(photo => {
      const key = photo.roomName || 'Non classé';
      if (!groups[key]) groups[key] = [];
      groups[key].push(photo);
    });
    return groups;
  }, [processedPhotos, sortBy]);

  const handlePhotoClick = (photo: EDLPhoto) => {
    if (isMultiSelectMode) {
      setSelectedPhotos(prev => {
        const next = new Set(prev);
        if (next.has(photo.id)) {
          next.delete(photo.id);
        } else {
          next.add(photo.id);
        }
        return next;
      });
    } else {
      setSelectedPhoto(photo);
    }
  };

  const handleLongPress = (photo: EDLPhoto) => {
    setIsMultiSelectMode(true);
    setSelectedPhotos(new Set([photo.id]));
  };

  const currentIndex = selectedPhoto ? processedPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(processedPhotos.length - 1, currentIndex + 1);
    setSelectedPhoto(processedPhotos[newIndex]);
  };

  return (
    <div className="relative">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                showFilters ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
            
            {/* Quick filter pills */}
            <div className="flex gap-1">
              {(['all', 'anomaly', 'pending'] as FilterOption[]).map(option => (
                <button
                  key={option}
                  onClick={() => setFilterBy(option)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    filterBy === option 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option === 'all' && 'Toutes'}
                  {option === 'anomaly' && '⚠️ Anomalies'}
                  {option === 'pending' && '📝 En attente'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {processedPhotos.length} photo{processedPhotos.length !== 1 && 's'}
          </div>
        </div>

        {/* Extended filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-border/50"
            >
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Trier par</label>
                  <div className="flex gap-1">
                    {(['room', 'element', 'timestamp'] as SortOption[]).map(option => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          sortBy === option 
                            ? "bg-primary/10 text-primary" 
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {option === 'room' && 'Pièce'}
                        {option === 'element' && 'Élément'}
                        {option === 'timestamp' && 'Date'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-select toolbar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-primary p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedPhotos(new Set());
                }}
                className="p-2 rounded-full hover:bg-primary-foreground/10"
              >
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
              <span className="text-primary-foreground font-medium">
                {selectedPhotos.size} sélectionné{selectedPhotos.size !== 1 && 's'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-primary-foreground/10 text-primary-foreground">
                <Trash2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-primary-foreground/10 text-primary-foreground">
                <Move className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-primary-foreground/10 text-primary-foreground">
                <Star className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo grid */}
      <div className="p-4 space-y-6">
        {Object.entries(groupedPhotos).map(([groupName, groupPhotos]) => (
          <div key={groupName}>
            {sortBy === 'room' && (
              <h3 className="text-sm font-semibold text-foreground mb-3">{groupName}</h3>
            )}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {groupPhotos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  isSelected={selectedPhotos.has(photo.id)}
                  isMultiSelectMode={isMultiSelectMode}
                  onClick={() => handlePhotoClick(photo)}
                  onLongPress={() => handleLongPress(photo)}
                />
              ))}
            </div>
          </div>
        ))}

        {processedPhotos.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Aucune photo</p>
            <p className="text-sm mt-1">Les photos apparaîtront ici une fois capturées</p>
          </div>
        )}
      </div>

      {/* Photo viewer dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {selectedPhoto && (
            <div className="relative">
              {/* Close button */}
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Navigation */}
              {currentIndex > 0 && (
                <button
                  onClick={() => navigatePhoto('prev')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentIndex < processedPhotos.length - 1 && (
                <button
                  onClick={() => navigatePhoto('next')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Image */}
              <div className="aspect-video flex items-center justify-center">
                <img
                  src={selectedPhoto.url}
                  alt=""
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* Photo details */}
              <div className="p-6 bg-background rounded-b-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedPhoto.elementName || 'Photo'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedPhoto.roomName}
                    </p>
                  </div>
                  {selectedPhoto.hasAnomaly && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-medium">Anomalie</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Condition */}
                  {selectedPhoto.condition && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">État:</span>
                      <span className={cn(
                        "text-sm px-2 py-0.5 rounded-full font-medium capitalize",
                        selectedPhoto.condition === 'bon' && "bg-green-100 text-green-700",
                        selectedPhoto.condition === 'moyen' && "bg-yellow-100 text-yellow-700",
                        selectedPhoto.condition === 'mauvais' && "bg-red-100 text-red-700"
                      )}>
                        {selectedPhoto.condition}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedPhoto.description ? (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-foreground">{selectedPhoto.description}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">Description en attente</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {format(new Date(selectedPhoto.timestamp), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PhotoCardProps {
  photo: EDLPhoto;
  index: number;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onClick: () => void;
  onLongPress: () => void;
}

function PhotoCard({ photo, index, isSelected, isMultiSelectMode, onClick, onLongPress }: PhotoCardProps) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      onLongPress();
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <img
        src={photo.url}
        alt=""
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Selection checkbox */}
      {isMultiSelectMode && (
        <div className={cn(
          "absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected 
            ? "bg-primary border-primary" 
            : "bg-white/50 border-white"
        )}>
          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {photo.hasAnomaly && (
          <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-destructive-foreground" />
          </div>
        )}
        {photo.hasPendingDescription && (
          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Element label */}
      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-white bg-black/50 px-1.5 py-0.5 rounded capitalize">
            {photo.elementType || 'Photo'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
