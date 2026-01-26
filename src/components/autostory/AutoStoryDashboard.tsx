import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Film, 
  Plus, 
  Trash2, 
  Share2, 
  Download,
  Clock,
  Eye,
  MoreVertical,
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAutoStory } from '@/hooks/useAutoStory';
import { AutoStoryGenerator } from './AutoStoryGenerator';
import { AutoStoryPlayer } from './AutoStoryPlayer';
import { AutoStoryShareDialog } from './AutoStoryShareDialog';
import type { AutoStoryVideo } from '@/types/autostory';

interface AutoStoryDashboardProps {
  projectId: string;
  edlId?: string;
  projectTitle?: string;
  className?: string;
}

export function AutoStoryDashboard({
  projectId,
  edlId,
  projectTitle,
  className
}: AutoStoryDashboardProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<AutoStoryVideo | null>(null);
  const [shareVideo, setShareVideo] = useState<AutoStoryVideo | null>(null);
  
  const {
    videos,
    isLoading,
    fetchVideos,
    deleteVideo,
    shareVideo: handleShare
  } = useAutoStory(projectId);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'En attente', variant: 'outline' },
      generating_script: { label: 'Script...', variant: 'secondary' },
      generating_audio: { label: 'Audio...', variant: 'secondary' },
      generating_video: { label: 'Vidéo...', variant: 'secondary' },
      completed: { label: 'Prêt', variant: 'default' },
      error: { label: 'Erreur', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDownload = (video: AutoStoryVideo) => {
    if (video.video_url) {
      const link = document.createElement('a');
      link.href = video.video_url;
      link.download = `${video.title}.mp4`;
      link.click();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" />
            AutoStory EDL
          </h2>
          <p className="text-muted-foreground">
            Films EDL automatiques narrés par IA
          </p>
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau film
        </Button>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="aspect-video rounded-t-lg" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Film className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun film AutoStory</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier film EDL automatique narré par IA
            </p>
            <Button onClick={() => setShowGenerator(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un film
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Thumbnail */}
                <div 
                  className="relative aspect-video bg-muted cursor-pointer group"
                  onClick={() => setSelectedVideo(video)}
                >
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <Film className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white" />
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration_seconds)}
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{video.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(video.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(video.status)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedVideo(video)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visionner
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShareVideo(video)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Partager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(video)}>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteVideo(video.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Format & Resolution */}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {video.format}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.resolution}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.style}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Créer un AutoStory</DialogTitle>
          </DialogHeader>
          <AutoStoryGenerator
            projectId={projectId}
            edlId={edlId}
            projectTitle={projectTitle}
            onGenerated={(videoId) => {
              setShowGenerator(false);
              fetchVideos();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Player Dialog */}
      <Dialog 
        open={!!selectedVideo} 
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedVideo && (
            <AutoStoryPlayer
              video={selectedVideo}
              onShare={() => {
                setShareVideo(selectedVideo);
                setSelectedVideo(null);
              }}
              onDownload={() => handleDownload(selectedVideo)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <AutoStoryShareDialog
        video={shareVideo}
        onClose={() => setShareVideo(null)}
        onShare={handleShare}
      />
    </div>
  );
}
