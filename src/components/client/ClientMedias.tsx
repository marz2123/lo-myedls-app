import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Image as ImageIcon, 
  Video, 
  X,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientMediasProps {
  projectId: string;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  location: string;
  date: string;
  category: string;
}

export const ClientMedias: React.FC<ClientMediasProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [medias, setMedias] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaItem | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  useEffect(() => {
    loadMedias();
  }, [projectId]);

  const loadMedias = async () => {
    try {
      // Get frames from visit sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('visit_sessions')
        .select('id, created_at')
        .eq('project_id', projectId)
        .in('status', ['validated', 'completed']);

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setMedias([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // Get frames
      const { data: frames, error: framesError } = await supabase
        .from('extracted_frames')
        .select('id, frame_url, timestamp_seconds, created_at, manual_label')
        .in('visit_session_id', sessionIds);

      if (framesError) throw framesError;

      // Get task images
      const { data: tasks, error: tasksError } = await supabase
        .from('extracted_tasks')
        .select('id, image_url, location, created_at')
        .eq('project_id', projectId)
        .not('image_url', 'is', null);

      if (tasksError) throw tasksError;

      // Combine all media
      const allMedias: MediaItem[] = [];

      (frames || []).forEach(frame => {
        allMedias.push({
          id: frame.id,
          type: 'photo',
          url: frame.frame_url,
          location: frame.manual_label || 'Visite',
          date: frame.created_at,
          category: 'edl'
        });
      });

      (tasks || []).forEach(task => {
        if (task.image_url) {
          allMedias.push({
            id: task.id,
            type: 'photo',
            url: task.image_url,
            location: task.location || 'Non spécifié',
            date: task.created_at || new Date().toISOString(),
            category: 'task'
          });
        }
      });

      // Sort by date
      allMedias.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMedias(allMedias);
    } catch (error) {
      console.error('Error loading medias:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedias = medias.filter(media => {
    if (activeTab === 'all') return true;
    if (activeTab === 'photos') return media.type === 'photo';
    if (activeTab === 'videos') return media.type === 'video';
    if (activeTab === 'edl') return media.category === 'edl';
    return true;
  });

  const openFullscreen = (media: MediaItem) => {
    const index = filteredMedias.findIndex(m => m.id === media.id);
    setFullscreenIndex(index);
    setFullscreenMedia(media);
  };

  const navigateFullscreen = (direction: 'prev' | 'next') => {
    let newIndex = direction === 'next' 
      ? fullscreenIndex + 1 
      : fullscreenIndex - 1;
    
    if (newIndex < 0) newIndex = filteredMedias.length - 1;
    if (newIndex >= filteredMedias.length) newIndex = 0;
    
    setFullscreenIndex(newIndex);
    setFullscreenMedia(filteredMedias[newIndex]);
  };

  // Group by location for organized display
  const groupedByLocation = filteredMedias.reduce((acc, media) => {
    const key = media.location;
    if (!acc[key]) acc[key] = [];
    acc[key].push(media);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            Tous
            <Badge variant="secondary" className="ml-1">{medias.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="h-4 w-4" />
            Vidéos
          </TabsTrigger>
          <TabsTrigger value="edl">EDL</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredMedias.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucun média disponible
                </h3>
                <p className="text-muted-foreground">
                  Les photos et vidéos apparaîtront ici après les visites.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByLocation).map(([location, locationMedias]) => (
                <div key={location}>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{location}</h3>
                    <Badge variant="outline">{locationMedias.length}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {locationMedias.map((media) => (
                      <div 
                        key={media.id}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => openFullscreen(media)}
                      >
                        {media.type === 'photo' ? (
                          <img 
                            src={media.url} 
                            alt={media.location}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800">
                            <Video className="h-12 w-12 text-white" />
                          </div>
                        )}
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="h-8 w-8 text-white" />
                        </div>

                        {/* Date badge */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(media.date), 'dd/MM/yyyy', { locale: fr })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenMedia} onOpenChange={() => setFullscreenMedia(null)}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setFullscreenMedia(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation */}
            {filteredMedias.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={() => navigateFullscreen('prev')}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={() => navigateFullscreen('next')}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Media content */}
            {fullscreenMedia && (
              <div className="max-w-full max-h-full p-4">
                {fullscreenMedia.type === 'photo' ? (
                  <img 
                    src={fullscreenMedia.url} 
                    alt={fullscreenMedia.location}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  />
                ) : (
                  <video 
                    src={fullscreenMedia.url} 
                    controls
                    className="max-w-full max-h-[80vh] rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Info bar */}
            {fullscreenMedia && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{fullscreenMedia.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(fullscreenMedia.date), 'dd MMMM yyyy', { locale: fr })}</span>
                    </div>
                  </div>
                  <span className="text-sm text-white/70">
                    {fullscreenIndex + 1} / {filteredMedias.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
