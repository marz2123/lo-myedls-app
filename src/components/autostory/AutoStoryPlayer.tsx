import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Share2,
  Download,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { AutoStoryVideo, AutoStoryChapter } from '@/types/autostory';

interface AutoStoryPlayerProps {
  video: AutoStoryVideo;
  chapters?: AutoStoryChapter[];
  onShare?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function AutoStoryPlayer({ 
  video, 
  chapters = [], 
  onShare,
  onDownload,
  className 
}: AutoStoryPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration_seconds || 120);
  const [showControls, setShowControls] = useState(true);
  const [activeChapter, setActiveChapter] = useState<AutoStoryChapter | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (chapters.length > 0) {
      const current = chapters.find(
        c => currentTime >= c.start_time_seconds && currentTime < c.end_time_seconds
      );
      setActiveChapter(current || null);
    }
  }, [currentTime, chapters]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleChapterClick = (chapter: AutoStoryChapter) => {
    if (videoRef.current) {
      videoRef.current.currentTime = chapter.start_time_seconds;
      setCurrentTime(chapter.start_time_seconds);
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, currentTime + 10);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 10);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const aspectRatioClass = {
    horizontal: 'aspect-video',
    vertical: 'aspect-[9/16]',
    square: 'aspect-square'
  }[video.format] || 'aspect-video';

  return (
    <div 
      className={cn("relative bg-black rounded-xl overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Container */}
      <div className={cn("relative w-full", aspectRatioClass)}>
        {video.video_url ? (
          <video
            ref={videoRef}
            src={video.video_url}
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
            muted={isMuted}
          />
        ) : (
          // Placeholder with animated gradient for videos in generation
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-primary/30 border-t-primary"
              />
              <p className="text-lg font-medium text-foreground">Génération en cours...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {video.generation_progress}% complété
              </p>
            </motion.div>
          </div>
        )}

        {/* Current Chapter Overlay */}
        <AnimatePresence>
          {activeChapter && showControls && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4"
            >
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-white/70">Chapitre actuel</p>
                <p className="text-white font-medium">{activeChapter.title}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
            >
              {/* Center Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10" />
                  ) : (
                    <Play className="w-10 h-10 ml-1" />
                  )}
                </Button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-xs text-white/70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipBackward}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipBack className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipForward}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onShare && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onShare}
                        className="text-white hover:bg-white/20"
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDownload}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => videoRef.current?.requestFullscreen()}
                      className="text-white hover:bg-white/20"
                    >
                      <Maximize className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Timeline / Chapters */}
      {chapters.length > 0 && (
        <div className="p-4 bg-background border-t">
          <h4 className="text-sm font-medium mb-3">Chapitres</h4>
          <div className="space-y-2">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => handleChapterClick(chapter)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                  activeChapter?.id === chapter.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center text-xs">
                  {formatTime(chapter.start_time_seconds)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chapter.title}</p>
                  {chapter.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {chapter.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
