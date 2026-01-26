import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  RotateCcw, AlertTriangle, Tag, PenTool, Layers,
  Maximize2, Volume2, VolumeX, Play, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineItem2 } from './UnifiedTimeline2';
import { EdlTags } from './EdlTagsDisplay';

interface ImmersiveMediaViewerProps {
  item: TimelineItem2;
  items?: TimelineItem2[];
  onClose: () => void;
  onNavigate?: (item: TimelineItem2) => void;
}

const stateStyles: Record<string, string> = {
  bon: 'bg-emerald-500/80 text-white',
  moyen: 'bg-amber-500/80 text-white',
  mauvais: 'bg-red-500/80 text-white',
};

export const ImmersiveMediaViewer: React.FC<ImmersiveMediaViewerProps> = ({
  item,
  items = [],
  onClose,
  onNavigate
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  // Find current index and neighbors
  const mediaItems = items.filter(i => i.type === 'photo' || i.type === 'video' || i.type === 'segment');
  const currentIndex = mediaItems.findIndex(i => i.id === item.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mediaItems.length - 1;

  // Get annotated URL if available
  const annotatedUrl = item.raw?.analysis_result?.annotated_url;
  const displayUrl = showAnnotations && annotatedUrl ? annotatedUrl : (item.url || '');
  const isAnnotated = !!annotatedUrl;

  // Get EDL tags
  const edlTags = item.edlTags as EdlTags | null;

  // Get anomalies count
  const anomalyCount = item.anomalyCount || 0;

  // Reset view when item changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowAnnotations(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsVideoPlaying(false);
    }
  }, [item.id]);

  // Auto-play video muted
  useEffect(() => {
    if ((item.type === 'video' || item.type === 'segment') && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  }, [item.type, item.id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        navigatePrev();
      } else if (e.key === 'ArrowRight' && hasNext) {
        navigateNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onClose]);

  // Navigate to previous item
  const navigatePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(mediaItems[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, mediaItems, onNavigate]);

  // Navigate to next item
  const navigateNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(mediaItems[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, mediaItems, onNavigate]);

  // Zoom functions
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 10));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev / 1.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 1), 10);
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
    
    setScale(newScale);
  };

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleDelta = distance / lastTouchDistance.current;
      const newScale = Math.min(Math.max(scale * scaleDelta, 1), 10);
      
      lastTouchDistance.current = distance;
      setScale(newScale);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);
    
    // Simple swipe detection when not zoomed
    if (scale === 1 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - (dragStart.x + position.x);
      
      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0 && hasPrev) {
          navigatePrev();
        } else if (deltaX < 0 && hasNext) {
          navigateNext();
        }
      }
    }
  };

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoClick = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  const isVideo = item.type === 'video' || item.type === 'segment';

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      ref={containerRef}
    >
      {/* Top Bar with EDL Intelligence */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 p-4 safe-area-top",
        "bg-gradient-to-b from-black/80 to-transparent",
        "transition-opacity duration-300",
        showInfo ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-start justify-between">
          {/* Left: Close + Navigation info */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
            
            {mediaItems.length > 1 && (
              <span className="text-white/70 text-sm font-mono">
                {currentIndex + 1} / {mediaItems.length}
              </span>
            )}
          </div>

          {/* Right: Zoom controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white/70 text-xs font-mono min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 10}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            {scale > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetZoom}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* EDL Tags display */}
        {edlTags && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {edlTags.element_type && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm gap-1">
                <Layers className="h-3 w-3" />
                {edlTags.element_type}
              </Badge>
            )}
            {edlTags.state && (
              <Badge className={cn(
                "border-0 backdrop-blur-sm",
                stateStyles[edlTags.state.toLowerCase()] || "bg-white/20 text-white"
              )}>
                {edlTags.state}
              </Badge>
            )}
            {edlTags.material && (
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm gap-1">
                <Tag className="h-3 w-3" />
                {edlTags.material}
              </Badge>
            )}
          </div>
        )}

        {/* Anomalies badge */}
        {anomalyCount > 0 && (
          <div className="mt-2">
            <Badge className="bg-red-500/80 text-white border-0 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {anomalyCount} anomalie{anomalyCount > 1 ? 's' : ''} détectée{anomalyCount > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {/* Navigation arrows (desktop) */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="icon"
          onClick={navigatePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white hidden md:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          onClick={navigateNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white hidden md:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Main media area */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden touch-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setShowInfo(!showInfo)}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {isVideo ? (
          <div 
            className="relative max-w-full max-h-full"
            onClick={(e) => {
              e.stopPropagation();
              handleVideoClick();
            }}
          >
            <video
              ref={videoRef}
              src={displayUrl}
              className="max-w-full max-h-[85vh] object-contain"
              muted={isMuted}
              loop
              playsInline
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
            />
            
            {/* Video controls overlay */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              showControls || !isVideoPlaying ? "opacity-100" : "opacity-0"
            )}>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="h-16 w-16 rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                {isVideoPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={displayUrl}
            alt=""
            className="max-w-full max-h-[85vh] object-contain select-none"
            draggable={false}
            loading="eager"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          />
        )}
      </div>

      {/* Bottom Bar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 p-4 safe-area-bottom",
        "bg-gradient-to-t from-black/80 to-transparent",
        "transition-opacity duration-300",
        showInfo ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between">
          {/* Left: Annotations toggle */}
          {isAnnotated && !isVideo && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-white">
                <PenTool className="h-4 w-4" />
                <span className="text-sm">Annotations</span>
              </div>
              <Switch
                checked={showAnnotations}
                onCheckedChange={setShowAnnotations}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}
          
          {/* Center: Location */}
          {(item.location || item.zone) && (
            <div className="flex-1 text-center">
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                {item.location && item.zone 
                  ? `${item.location} • ${item.zone}`
                  : item.location || item.zone}
              </Badge>
            </div>
          )}

          {/* Right: Video controls */}
          {isVideo && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          
          {/* Spacer when no annotations */}
          {!isAnnotated && !isVideo && <div />}
        </div>

        {/* Mobile swipe hint */}
        {mediaItems.length > 1 && (
          <p className="text-white/40 text-xs text-center mt-3 md:hidden">
            Glissez pour naviguer
          </p>
        )}
      </div>
    </div>
  );
};
