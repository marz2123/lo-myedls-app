import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Share2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MediaItem {
  url: string;
  type: 'photo' | 'video';
  title?: string;
  description?: string;
}

interface MediaLightboxProps {
  items: MediaItem[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
}

export function MediaLightbox({
  items,
  initialIndex = 0,
  open,
  onOpenChange,
  onDownload,
  onShare,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  
  const haptic = useHapticFeedback();
  const currentItem = items[currentIndex];

  // Reset index when items change
  useEffect(() => {
    if (open) {
      console.log('[MediaLightbox] open', { initialIndex, itemsCount: items.length });
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setIsPlaying(false);
      setVideoError(false);
    }
  }, [open, initialIndex, items.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          if (currentItem?.type === 'video') {
            togglePlayPause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, currentItem]);

  // Reset video state when changing item
  useEffect(() => {
    setIsPlaying(false);
    setVideoError(false);
    if (videoRef) {
      try {
        videoRef.pause();
        videoRef.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      haptic.trigger('light');
      setCurrentIndex(prev => prev - 1);
      setIsZoomed(false);
    }
  }, [currentIndex, haptic]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      haptic.trigger('light');
      setCurrentIndex(prev => prev + 1);
      setIsZoomed(false);
    }
  }, [currentIndex, items.length, haptic]);

  const toggleZoom = useCallback(() => {
    haptic.trigger('light');
    setIsZoomed(prev => !prev);
  }, [haptic]);

  const togglePlayPause = useCallback(() => {
    if (videoRef) {
      if (videoRef.paused) {
        videoRef.play();
        setIsPlaying(true);
      } else {
        videoRef.pause();
        setIsPlaying(false);
      }
    }
  }, [videoRef]);


  const handleDownload = useCallback(() => {
    if (currentItem && onDownload) {
      haptic.trigger('success');
      onDownload(currentItem);
    }
  }, [currentItem, onDownload, haptic]);

  const handleShare = useCallback(() => {
    if (currentItem && onShare) {
      haptic.trigger('success');
      onShare(currentItem);
    }
  }, [currentItem, onShare, haptic]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      goToPrevious();
    } else if (info.offset.x < -threshold && currentIndex < items.length - 1) {
      goToNext();
    }
  }, [currentIndex, items.length, goToPrevious, goToNext]);

  if (!open || items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        onPointerDownCapture={(e) => {
          // Prevent Radix "outside click" handlers (Sheet/Dialog) behind the lightbox from firing
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStartCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          className="absolute top-4 right-4 z-10 text-foreground hover:bg-muted/40 h-12 w-12 rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Counter */}
        {items.length > 1 && (
          <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm">
            {currentIndex + 1} / {items.length}
          </div>
        )}

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}
        
        {currentIndex < items.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Main content */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className={cn(
            'relative max-w-[90vw] max-h-[80vh] flex items-center justify-center',
            isZoomed && 'cursor-zoom-out'
          )}
          onClick={currentItem?.type === 'photo' ? toggleZoom : undefined}
        >
          {currentItem?.type === 'video' ? (
            <div className="relative">
              <video
                ref={setVideoRef}
                src={currentItem.url}
                className="max-w-[90vw] max-h-[80vh] rounded-xl bg-black"
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  console.warn('[MediaLightbox] video error', { url: currentItem.url });
                  setVideoError(true);
                  setIsPlaying(false);
                }}
              />

              {/* Fallback when video cannot be played (often iOS + .webm) */}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-md w-full rounded-2xl border bg-background/95 backdrop-blur p-4 text-center space-y-3">
                    <p className="font-medium text-foreground">Impossible de lire cette vidéo ici</p>
                    <p className="text-sm text-muted-foreground">
                      Si tu es sur iPhone/iPad, les vidéos <span className="font-medium">.webm</span> ne sont souvent pas compatibles.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button asChild variant="default">
                        <a href={currentItem.url} target="_blank" rel="noreferrer">Ouvrir dans un nouvel onglet</a>
                      </Button>
                      <Button asChild variant="secondary">
                        <a href={currentItem.url} download rel="noreferrer">Télécharger</a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <motion.img
              src={currentItem?.url}
              alt={currentItem?.title || 'Photo'}
              className={cn(
                'max-h-[80vh] rounded-xl transition-transform duration-300',
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              )}
              draggable={false}
            />
          )}
        </motion.div>

        {/* Bottom toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
          {currentItem?.type === 'photo' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleZoom}
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
            >
              {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </Button>
          )}

          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}

          {onShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/20 h-10 w-10 rounded-full"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Title/description */}
        {(currentItem?.title || currentItem?.description) && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center text-white max-w-md px-4">
            {currentItem.title && (
              <p className="font-medium text-lg">{currentItem.title}</p>
            )}
            {currentItem.description && (
              <p className="text-sm text-white/70 mt-1">{currentItem.description}</p>
            )}
          </div>
        )}

        {/* Thumbnail strip for multiple items */}
        {items.length > 1 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[90vw] overflow-x-auto pb-2 px-4">
            {items.map((item, index) => (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic.trigger('light');
                  setCurrentIndex(index);
                  setIsZoomed(false);
                }}
                className={cn(
                  'relative shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all',
                  index === currentIndex 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black' 
                    : 'opacity-50 hover:opacity-80'
                )}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-black">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover pointer-events-none"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" fill="white" />
                    </div>
                  </div>
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Simple hook for easy lightbox usage
export function useMediaLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const openLightbox = useCallback((mediaItems: MediaItem[], startIndex = 0) => {
    setItems(mediaItems);
    setInitialIndex(startIndex);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    items,
    initialIndex,
    openLightbox,
    closeLightbox,
    setIsOpen,
  };
}

// Clickable thumbnail component
interface ClickableMediaThumbnailProps {
  src: string;
  type?: 'photo' | 'video';
  alt?: string;
  className?: string;
  onClick?: () => void;
  showPlayIcon?: boolean;
}

export function ClickableMediaThumbnail({
  src,
  type = 'photo',
  alt = '',
  className,
  onClick,
  showPlayIcon = true,
}: ClickableMediaThumbnailProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden cursor-pointer group',
        className
      )}
    >
      {type === 'video' ? (
        <>
          <video 
            src={src} 
            className="w-full h-full object-cover pointer-events-none" 
            muted 
            playsInline
            preload="metadata"
          />
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </>
      )}
    </motion.button>
  );
}
