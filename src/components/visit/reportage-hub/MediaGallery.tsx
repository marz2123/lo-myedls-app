import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  Image, Video, Mic, Brain, Filter, X, ChevronLeft, ChevronRight,
  Plus, Link2, MessageSquare, Trash2, Download, Share
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';
import { MediaMarkupEditor } from './MediaMarkupEditor';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  url: string;
  type: 'photo' | 'video' | 'audio' | 'frame';
  name: string;
  createdAt: Date;
  location?: string;
  zone?: string;
  sequenceId?: string;
  mediaId?: string; // For annotations
}

interface MediaGalleryProps {
  projectId: string;
  sessionId?: string;
  onStartCapture?: (mode: 'guided' | 'free') => void;
}

type MediaFilter = 'all' | 'photo' | 'video' | 'audio' | 'frame';

export const MediaGallery: React.FC<MediaGalleryProps> = ({ projectId, sessionId, onStartCapture }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markupEditorOpen, setMarkupEditorOpen] = useState(false);
  const [markupMedia, setMarkupMedia] = useState<MediaItem | null>(null);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return mediaItems;
    return mediaItems.filter(item => item.type === activeFilter);
  }, [mediaItems, activeFilter]);

  useEffect(() => {
    loadMedia();
  }, [projectId, sessionId]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const allMedia: MediaItem[] = [];

      // Load from visit_sequences with location data
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select('id, video_url, audio_url, transcription, created_at, partie_name, lieu_name, endroit_name, zone_name')
        .eq('project_id', projectId);

      if (sequences) {
        sequences.forEach((seq: any) => {
          const locationParts = [seq.partie_name, seq.lieu_name, seq.endroit_name, seq.zone_name].filter(Boolean);
          const locationString = locationParts.join(' › ');
          
          if (seq.video_url) {
            allMedia.push({
              id: `video-${seq.id}`,
              url: seq.video_url,
              type: 'video',
              name: `Vidéo - ${seq.transcription?.slice(0, 30) || 'Séquence'}`,
              createdAt: new Date(seq.created_at),
              sequenceId: seq.id,
              location: locationString || undefined,
              zone: seq.zone_name || undefined,
            });
          }
          if (seq.audio_url) {
            allMedia.push({
              id: `audio-${seq.id}`,
              url: seq.audio_url,
              type: 'audio',
              name: `Audio - ${seq.transcription?.slice(0, 30) || 'Séquence'}`,
              createdAt: new Date(seq.created_at),
              sequenceId: seq.id,
              location: locationString || undefined,
              zone: seq.zone_name || undefined,
            });
          }
        });
      }

      // Load extracted frames
      if (sessionId) {
        const { data: frames } = await supabase
          .from('extracted_frames')
          .select('id, frame_url, timestamp_seconds, created_at')
          .eq('visit_session_id', sessionId);

        if (frames) {
          frames.forEach(frame => {
            allMedia.push({
              id: `frame-${frame.id}`,
              url: frame.frame_url,
              type: 'frame',
              name: `Frame IA - ${frame.timestamp_seconds}s`,
              createdAt: new Date(frame.created_at),
            });
          });
        }
      }

      allMedia.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setMediaItems(allMedia);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const openMediaViewer = useCallback((item: MediaItem, index: number) => {
    setSelectedMedia(item);
    setSelectedIndex(index);
  }, []);

  const navigateMedia = useCallback((direction: 'prev' | 'next') => {
    const items = filteredItems;
    let newIndex: number;
    
    if (direction === 'prev') {
      newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    } else {
      newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    }
    
    setSelectedIndex(newIndex);
    setSelectedMedia(items[newIndex]);
  }, [filteredItems, selectedIndex]);

  const getTypeIcon = (type: MediaItem['type']) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'frame': return <Brain className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: MediaItem['type']) => {
    switch (type) {
      case 'photo': return 'bg-blue-500/10 text-blue-500';
      case 'video': return 'bg-red-500/10 text-red-500';
      case 'audio': return 'bg-green-500/10 text-green-500';
      case 'frame': return 'bg-purple-500/10 text-purple-500';
    }
  };

  const filterButtons: { value: MediaFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Tout', icon: <Filter className="h-4 w-4" /> },
    { value: 'photo', label: 'Photos', icon: <Image className="h-4 w-4" /> },
    { value: 'video', label: 'Vidéos', icon: <Video className="h-4 w-4" /> },
    { value: 'audio', label: 'Audio', icon: <Mic className="h-4 w-4" /> },
    { value: 'frame', label: 'Frames IA', icon: <Brain className="h-4 w-4" /> },
  ];

  const getCounts = () => ({
    all: mediaItems.length,
    photo: mediaItems.filter(m => m.type === 'photo').length,
    video: mediaItems.filter(m => m.type === 'video').length,
    audio: mediaItems.filter(m => m.type === 'audio').length,
    frame: mediaItems.filter(m => m.type === 'frame').length,
  });

  const counts = getCounts();

  // Hide filter bar when empty
  const hasMedia = mediaItems.length > 0;

  const handleShare = async () => {
    if (!selectedMedia) return;
    
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: selectedMedia.name,
          text: selectedMedia.location ? `Média de ${selectedMedia.location}` : 'Média MyEDLS',
          url: selectedMedia.url,
          dialogTitle: 'Partager le média',
        });
      } else {
        // Web fallback
        if (navigator.share) {
          await navigator.share({
            title: selectedMedia.name,
            text: selectedMedia.location ? `Média de ${selectedMedia.location}` : 'Média MyEDLS',
            url: selectedMedia.url,
          });
        } else {
          // Copy to clipboard
          await navigator.clipboard.writeText(selectedMedia.url);
          toast.success('URL copiée dans le presse-papiers');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Erreur lors du partage');
    }
  };

  const handleDownload = async () => {
    if (!selectedMedia) return;
    
    try {
      const response = await fetch(selectedMedia.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedMedia.name || 'media';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Téléchargement démarré');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter Bar - only show when there's media */}
      {hasMedia && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 p-3">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              {filterButtons.map(({ value, label, icon }) => (
                <Button
                  key={value}
                  variant={activeFilter === value ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "rounded-full gap-2 shrink-0 transition-all duration-200",
                    activeFilter === value && "shadow-md"
                  )}
                  onClick={() => {
                    setActiveFilter(value);
                  }}
                >
                  {icon}
                  {label}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "ml-1 h-5 min-w-5 rounded-full text-xs",
                      activeFilter === value && "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {counts[value]}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Media Grid */}
      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyStateOnboarding 
            onStartCapture={onStartCapture || ((mode) => console.log('Start capture:', mode))} 
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((item, index) => (
              <Card
                key={item.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-2xl",
                  "cursor-pointer transition-all duration-300",
                  "hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02]",
                  "active:scale-95"
                )}
                onClick={() => openMediaViewer(item, index)}
              >
                <div className="absolute inset-0 bg-muted">
                  {item.type === 'audio' ? (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                      <Mic className="h-12 w-12 text-green-500/50" />
                    </div>
                  ) : (
                    <img src={item.url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  )}
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <div className={cn("p-1.5 rounded-lg backdrop-blur-md", getTypeColor(item.type))}>
                    {getTypeIcon(item.type)}
                  </div>
                </div>

                {/* Location badge - always visible */}
                {item.location && (
                  <div className="absolute top-2 right-2 max-w-[60%]">
                    <Badge 
                      variant="secondary" 
                      className="bg-black/60 text-white backdrop-blur-md text-[10px] px-1.5 py-0.5 truncate max-w-full"
                    >
                      {item.zone || item.location.split(' › ').pop()}
                    </Badge>
                  </div>
                )}

                {/* Bottom info - always visible on mobile */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                  {item.location ? (
                    <p className="text-white/90 text-[10px] font-medium truncate">{item.location}</p>
                  ) : (
                    <p className="text-amber-400/90 text-[10px] font-medium">📍 Non localisé</p>
                  )}
                </div>

                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg">
                      <Video className="h-4 w-4 text-foreground ml-0.5" />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Full-screen Media Viewer */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-full h-full p-0 bg-black/95 border-0" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Visualiseur de média</DialogTitle>
          </VisuallyHidden>
          <div className="relative h-full w-full flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/50 to-transparent safe-area-top">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-11 w-11" onClick={() => setSelectedMedia(null)}>
                  <X className="h-6 w-6" />
                </Button>
                <div className="flex gap-2">
                  {selectedMedia?.type === 'photo' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 h-11 w-11"
                      onClick={() => {
                        setMarkupMedia(selectedMedia);
                        setMarkupEditorOpen(true);
                      }}
                      title="Annoter"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 h-11 w-11"
                    onClick={handleShare}
                    title="Partager"
                  >
                    <Share className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 h-11 w-11"
                    onClick={handleDownload}
                    title="Télécharger"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-48">
              {selectedMedia?.type === 'audio' ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="h-32 w-32 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Mic className="h-16 w-16 text-green-500" />
                  </div>
                  <audio controls src={selectedMedia.url} className="w-full max-w-md" />
                </div>
              ) : selectedMedia?.type === 'video' ? (
                <video src={selectedMedia.url} controls playsInline className="max-h-full max-w-full rounded-xl" />
              ) : (
                <img src={selectedMedia?.url} alt={selectedMedia?.name} loading="lazy" className="max-h-full max-w-full object-contain rounded-xl" />
              )}
            </div>

            <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-11 w-11 rounded-full" onClick={() => navigateMedia('prev')}>
              <ChevronLeft className="h-7 w-7" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-11 w-11 rounded-full" onClick={() => navigateMedia('next')}>
              <ChevronRight className="h-7 w-7" />
            </Button>

            <div className="absolute bottom-0 left-0 right-0 z-50 p-4 pb-safe bg-gradient-to-t from-black/70 to-transparent">
              <div className="max-w-2xl mx-auto">
                <p className="text-white font-medium text-base">{selectedMedia?.name}</p>
                <div className="flex items-center gap-2 mt-1 text-white/70 text-xs flex-wrap">
                  {selectedMedia?.location && <span>{selectedMedia.location}</span>}
                  {selectedMedia?.zone && <><span>•</span><span>{selectedMedia.zone}</span></>}
                  <span>•</span>
                  <span>{selectedMedia && format(selectedMedia.createdAt, 'PPp', { locale: fr })}</span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="secondary" className="rounded-full gap-1.5 text-xs h-8"><Plus className="h-3.5 w-3.5" />Séquence</Button>
                  <Button size="sm" variant="secondary" className="rounded-full gap-1.5 text-xs h-8"><Link2 className="h-3.5 w-3.5" />Tâche</Button>
                  <Button size="sm" variant="destructive" className="rounded-full gap-1.5 text-xs h-8 ml-auto"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-36 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{selectedIndex + 1} / {filteredItems.length}</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Markup Editor */}
      {markupEditorOpen && markupMedia && markupMedia.type === 'photo' && (
        <MediaMarkupEditor
          imageUrl={markupMedia.url}
          mediaId={markupMedia.mediaId || markupMedia.id}
          mediaType="frame"
          projectId={projectId}
          onClose={() => {
            setMarkupEditorOpen(false);
            setMarkupMedia(null);
          }}
          onSaved={(annotatedUrl) => {
            toast.success('Annotation enregistrée');
            // Update the media item with annotated URL
            setMediaItems(prev => prev.map(item => 
              item.id === markupMedia.id 
                ? { ...item, url: annotatedUrl }
                : item
            ));
          }}
        />
      )}
    </div>
  );
};
