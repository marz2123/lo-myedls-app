import { useState, useEffect } from "react";
import { 
  Camera, 
  Video, 
  FileText, 
  Image as ImageIcon,
  File,
  Upload,
  Trash2,
  Eye,
  Loader2,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProjectMediasSectionProps {
  projectId: string;
  onDocumentUpload?: () => void;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'document';
  name: string;
  url: string;
  size?: number;
  createdAt: string;
  source?: string;
}

export function ProjectMediasSection({ projectId, onDocumentUpload }: ProjectMediasSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'documents'>('photos');
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [documents, setDocuments] = useState<MediaItem[]>([]);

  useEffect(() => {
    loadMedias();
  }, [projectId]);

  const loadMedias = async () => {
    setIsLoading(true);
    try {
      // Load photos and videos from visit sequences
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select('id, photos, video_url, created_at, endroit_name, property_locations(name)')
        .eq('project_id', projectId);

      const photoItems: MediaItem[] = [];
      const videoItems: MediaItem[] = [];

      if (sequences) {
        sequences.forEach((seq: any) => {
          const lieuName = seq.property_locations?.name || seq.endroit_name || '';
          
          // Handle photos array
          if (seq.photos && Array.isArray(seq.photos)) {
            seq.photos.forEach((photoUrl: string, idx: number) => {
              photoItems.push({
                id: `photo-${seq.id}-${idx}`,
                type: 'photo',
                name: `${lieuName || 'Photo'} ${idx + 1}`.trim(),
                url: photoUrl,
                createdAt: seq.created_at,
                source: 'sequence'
              });
            });
          }
          
          if (seq.video_url) {
            videoItems.push({
              id: `video-${seq.id}`,
              type: 'video',
              name: `${lieuName || 'Vidéo'}`.trim(),
              url: seq.video_url,
              createdAt: seq.created_at,
              source: 'sequence'
            });
          }
        });
      }

      // Load documents from project
      const { data: project } = await supabase
        .from('projects')
        .select('project_documents, pdf_files')
        .eq('id', projectId)
        .single();

      const docItems: MediaItem[] = [];
      
      if (project?.project_documents) {
        const docs = Array.isArray(project.project_documents) 
          ? project.project_documents 
          : JSON.parse(JSON.stringify(project.project_documents));
        
        docs.forEach((doc: any) => {
          docItems.push({
            id: doc.id || `doc-${Math.random()}`,
            type: 'document',
            name: doc.name,
            url: doc.url,
            size: doc.size,
            createdAt: doc.uploadedAt || doc.uploaded_at,
            source: doc.type || 'document'
          });
        });
      }

      if (project?.pdf_files) {
        const pdfs = Array.isArray(project.pdf_files)
          ? project.pdf_files
          : JSON.parse(JSON.stringify(project.pdf_files));
        
        pdfs.forEach((pdf: any) => {
          docItems.push({
            id: `pdf-${pdf.path}`,
            type: 'document',
            name: pdf.name,
            url: pdf.path,
            size: pdf.size,
            createdAt: pdf.uploaded_at,
            source: 'pdf'
          });
        });
      }

      setPhotos(photoItems);
      setVideos(videoItems);
      setDocuments(docItems);
    } catch (error) {
      console.error('Error loading medias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderEmptyState = (type: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-sm">
        Aucun{type === 'videos' ? 'e vidéo' : type === 'photos' ? 'e photo' : ' document'} pour le moment
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Les médias apparaîtront ici après un reportage
      </p>
    </div>
  );

  const renderMediaGrid = (items: MediaItem[], type: 'photos' | 'videos' | 'documents') => {
    if (items.length === 0) {
      return renderEmptyState(type);
    }

    if (type === 'documents') {
      return (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(item.createdAt)}</span>
                  {item.size && <span>• {formatFileSize(item.size)}</span>}
                  {item.source && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {item.source}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => window.open(item.url, '_blank')}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => window.open(item.url, '_blank')}
          >
            {type === 'photos' ? (
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Video className="w-10 h-10 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs font-medium truncate">{item.name}</p>
              <p className="text-white/70 text-[10px]">{formatDate(item.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <Camera className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{photos.length}</p>
              <p className="text-xs text-muted-foreground">Photos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{videos.length}</p>
              <p className="text-xs text-muted-foreground">Vidéos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="photos" className="gap-2">
            <Camera className="w-4 h-4" />
            Photos
            {photos.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {photos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="w-4 h-4" />
            Vidéos
            {videos.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {videos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Docs
            {documents.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {documents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-4">
          {renderMediaGrid(photos, 'photos')}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {renderMediaGrid(videos, 'videos')}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {renderMediaGrid(documents, 'documents')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
