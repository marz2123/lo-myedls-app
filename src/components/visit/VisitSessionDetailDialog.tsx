import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Play, Folder, X, FolderPlus, ChevronLeft, Images, Plus, ClipboardList, Sparkles, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = ['Cuisine', 'Salon', 'Chambre', 'SDB', 'Entrée', 'Façade', 'Couloir'];
const CUSTOM_CATEGORIES_KEY = 'myedls-custom-album-categories';

interface VisitSessionDetailDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

interface SessionDetail {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  video_url: string | null;
  audio_url: string | null;
  status: string;
  extracted_frames: any[];
  audio_segments: any[];
  detected_blocks: any[];
}

interface Block {
  id: string;
  block_number: number;
  detected_room_type: string | null;
  manual_label: string | null;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  timestamp?: number;
  block_id: string | null;
}

interface Album {
  id: string;
  name: string;
  media: MediaItem[];
  coverUrl: string;
}

interface TaskExtractionData {
  media: MediaItem;
  location: string;
}

export const VisitSessionDetailDialog: React.FC<VisitSessionDetailDialogProps> = ({
  sessionId,
  open,
  onOpenChange,
  projectId
}) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMediaForFullscreen, setSelectedMediaForFullscreen] = useState<MediaItem | null>(null);
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  
  // Drag state
  const [draggedMedia, setDraggedMedia] = useState<MediaItem | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoveredMediaId, setHoveredMediaId] = useState<string | null>(null);
  const [showNamingDialog, setShowNamingDialog] = useState(false);
  const [pendingCombine, setPendingCombine] = useState<{source: MediaItem, target: MediaItem} | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  // Task extraction state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuMedia, setContextMenuMedia] = useState<MediaItem | null>(null);
  const [showTaskExtraction, setShowTaskExtraction] = useState(false);
  const [taskExtractionData, setTaskExtractionData] = useState<TaskExtractionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  
  // Refs for accessing current values in event handlers
  const draggedMediaRef = useRef<MediaItem | null>(null);
  const hoveredMediaIdRef = useRef<string | null>(null);
  const allMediaRef = useRef<MediaItem[]>([]);
  const sessionRef = useRef<SessionDetail | null>(null);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contextMenuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    draggedMediaRef.current = draggedMedia;
  }, [draggedMedia]);
  
  useEffect(() => {
    hoveredMediaIdRef.current = hoveredMediaId;
  }, [hoveredMediaId]);
  
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Load custom categories from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading custom categories:', e);
    }
  }, []);

  const addCustomCategory = () => {
    if (!newCategory.trim()) return;
    const trimmed = newCategory.trim();
    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Cette catégorie existe déjà');
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    setNewCategory('');
    setShowAddCategory(false);
    toast.success(`Catégorie "${trimmed}" ajoutée`);
  };

  const allCategoryButtons = [...DEFAULT_CATEGORIES, ...customCategories];

  useEffect(() => {
    if (open && sessionId) {
      fetchSessionDetail();
    }
    if (!open) {
      resetDragState();
      setCurrentAlbum(null);
      setEditingAlbum(null);
      setNewAlbumName('');
      setShowContextMenu(false);
      setShowTaskExtraction(false);
      setSession(null);
    }
  }, [open, sessionId]);

  const resetDragState = () => {
    setDraggedMedia(null);
    setHoveredMediaId(null);
    setPendingCombine(null);
    setShowNamingDialog(false);
    setZoneName('');
    setIsDragging(false);
    draggedMediaRef.current = null;
    hoveredMediaIdRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const fetchSessionDetail = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select(`*, extracted_frames(*), audio_segments(*), detected_blocks(*, extracted_frames(*), audio_segments(*))`)
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBlockWithLabel = (blockId: string | null, sessionData: SessionDetail | null): Block | null => {
    if (!blockId || !sessionData?.detected_blocks) return null;
    const block = sessionData.detected_blocks.find(b => b.id === blockId);
    return block?.manual_label ? block : null;
  };

  const getAllMedia = useCallback((): MediaItem[] => {
    if (!session) return [];
    const items: MediaItem[] = [];
    if (session.video_url) {
      items.push({ id: 'video-main', type: 'video', url: session.video_url, block_id: null });
    }
    session.extracted_frames?.forEach(f => {
      items.push({ id: f.id, type: 'photo', url: f.frame_url, timestamp: f.timestamp_seconds, block_id: f.block_id });
    });
    allMediaRef.current = items;
    return items;
  }, [session]);

  // Get albums and ungrouped media
  const getAlbumsAndUngrouped = useCallback((): { albums: Album[], ungrouped: MediaItem[] } => {
    if (!session) return { albums: [], ungrouped: [] };
    
    const allMedia = getAllMedia();
    const albumMap = new Map<string, Album>();
    const ungrouped: MediaItem[] = [];
    
    allMedia.forEach(media => {
      const block = getBlockWithLabel(media.block_id, session);
      if (block && block.manual_label) {
        if (!albumMap.has(block.id)) {
          albumMap.set(block.id, {
            id: block.id,
            name: block.manual_label,
            media: [],
            coverUrl: media.url
          });
        }
        albumMap.get(block.id)!.media.push(media);
      } else {
        ungrouped.push(media);
      }
    });
    
    return { albums: Array.from(albumMap.values()), ungrouped };
  }, [session, getAllMedia]);

  // Update allMediaRef when session changes
  useEffect(() => {
    getAllMedia();
  }, [getAllMedia]);

  const startDrag = (media: MediaItem, clientX: number, clientY: number) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setDraggedMedia(media);
    draggedMediaRef.current = media;
    setDragPosition({ x: clientX, y: clientY });
    setIsDragging(true);
    toast.info('Glissez sur une autre photo', { duration: 2000 });
  };

  const finishDrag = async () => {
    const currentDragged = draggedMediaRef.current;
    const currentHovered = hoveredMediaIdRef.current;
    const currentSession = sessionRef.current;
    const currentAllMedia = allMediaRef.current;
    
    if (currentDragged && currentHovered) {
      const targetMedia = currentAllMedia.find(m => m.id === currentHovered);
      
      if (targetMedia && targetMedia.id !== currentDragged.id) {
        const sourceAlbum = getBlockWithLabel(currentDragged.block_id, currentSession);
        const targetAlbum = getBlockWithLabel(targetMedia.block_id, currentSession);

        if (targetAlbum) {
          await addToExistingZone(targetAlbum.id, currentDragged);
        } else if (sourceAlbum) {
          await addToExistingZone(sourceAlbum.id, targetMedia);
        } else {
          setPendingCombine({ source: currentDragged, target: targetMedia });
          setShowNamingDialog(true);
          setDraggedMedia(null);
          setHoveredMediaId(null);
          setIsDragging(false);
          draggedMediaRef.current = null;
          hoveredMediaIdRef.current = null;
          return;
        }
      }
    }
    
    setDraggedMedia(null);
    setHoveredMediaId(null);
    setIsDragging(false);
    draggedMediaRef.current = null;
    hoveredMediaIdRef.current = null;
  };

  // Global event listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (clientX: number, clientY: number) => {
      setDragPosition({ x: clientX, y: clientY });
      
      const elements = document.elementsFromPoint(clientX, clientY);
      const mediaElement = elements.find(el => el.getAttribute('data-media-id'));
      const mediaId = mediaElement?.getAttribute('data-media-id');
      
      if (mediaId && mediaId !== draggedMediaRef.current?.id) {
        setHoveredMediaId(mediaId);
        hoveredMediaIdRef.current = mediaId;
      } else {
        setHoveredMediaId(null);
        hoveredMediaIdRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleGlobalMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleGlobalMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      finishDrag();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const handleMouseDown = (media: MediaItem, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Context menu after 500ms
    contextMenuTimerRef.current = setTimeout(() => {
      handleMediaLongPressForMenu(media, e.clientX, e.clientY);
    }, 500);
    
    // Start drag after 800ms (if not cancelled)
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(false);
      startDrag(media, e.clientX, e.clientY);
    }, 800);
  };

  const handleTouchStart = (media: MediaItem, e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    // Context menu after 500ms
    contextMenuTimerRef.current = setTimeout(() => {
      handleMediaLongPressForMenu(media, touch.clientX, touch.clientY);
    }, 500);
    
    // Start drag after 800ms (if not cancelled)
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(false);
      startDrag(media, touch.clientX, touch.clientY);
    }, 800);
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (contextMenuTimerRef.current) {
      clearTimeout(contextMenuTimerRef.current);
      contextMenuTimerRef.current = null;
    }
  };

  const handleMediaClick = (media: MediaItem, e: React.MouseEvent) => {
    if (isDragging || draggedMedia) {
      e.preventDefault();
      return;
    }
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (media.type === 'photo') {
      setSelectedImage(media.url);
      setSelectedMediaForFullscreen(media);
    }
  };

  // Get location for a media item from its album
  const getMediaLocation = (media: MediaItem): string => {
    if (currentAlbum) return currentAlbum.name;
    const block = getBlockWithLabel(media.block_id, session);
    return block?.manual_label || '';
  };

  // Open task extraction dialog
  const openTaskExtraction = (media: MediaItem, location: string) => {
    setTaskExtractionData({ media, location });
    setTaskLocation(location);
    setTaskTitle('');
    setTaskDescription('');
    setShowTaskExtraction(true);
    setShowContextMenu(false);
    setSelectedImage(null);
  };

  // Handle long-press to show context menu
  const handleMediaLongPressForMenu = (media: MediaItem, clientX: number, clientY: number) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setContextMenuMedia(media);
    setContextMenuPosition({ x: clientX, y: clientY });
    setShowContextMenu(true);
  };

  // AI analysis for task extraction
  const analyzeImageForTask = async () => {
    if (!taskExtractionData) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-unified-analysis', {
        body: {
          type: 'analyze-image-for-task',
          imageUrl: taskExtractionData.media.url,
          location: taskExtractionData.location
        }
      });
      
      if (error) throw error;
      
      if (data?.title) setTaskTitle(data.title);
      if (data?.description) setTaskDescription(data.description);
      
      toast.success('Analyse IA terminée');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save extracted task
  const saveExtractedTask = async () => {
    if (!taskTitle.trim() || !projectId) {
      toast.error('Titre requis');
      return;
    }
    
    setIsSavingTask(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      
      const { error } = await supabase.from('extracted_tasks').insert({
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        location: taskLocation.trim() || null,
        project_id: projectId,
        user_id: user.id,
        image_url: taskExtractionData?.media.url || null,
        frame_id: taskExtractionData?.media.id !== 'video-main' ? taskExtractionData?.media.id : null,
        visit_session_id: sessionId,
        source_type: 'visit_photo'
      });
      
      if (error) throw error;
      
      toast.success('Tâche extraite avec succès');
      setShowTaskExtraction(false);
      setTaskExtractionData(null);
    } catch (error) {
      console.error('Save task error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSavingTask(false);
    }
  };

  const createZoneFromCombine = async () => {
    if (!zoneName.trim() || !sessionId || !pendingCombine) return;
    
    const trimmedName = zoneName.trim();
    
    try {
      // Check if an album with this name already exists
      const existingBlock = session?.detected_blocks?.find(
        b => b.manual_label?.toLowerCase() === trimmedName.toLowerCase()
      );
      
      let blockId: string;
      
      if (existingBlock) {
        blockId = existingBlock.id;
      } else {
        const maxNum = session?.detected_blocks?.reduce((m, b) => Math.max(m, b.block_number), 0) || 0;
        const { data: newBlock, error: err1 } = await supabase
          .from('detected_blocks')
          .insert({ 
            visit_session_id: sessionId, 
            block_number: maxNum + 1, 
            manual_label: trimmedName, 
            detected_room_type: 'custom' 
          })
          .select().single();
        
        if (err1) {
          toast.error('Erreur lors de la création du bloc');
          return;
        }
        
        blockId = newBlock.id;
      }
      
      const frameIds = [pendingCombine.source.id, pendingCombine.target.id].filter(
        id => id !== 'video-main' && session?.extracted_frames?.some(f => f.id === id)
      );
      
      if (frameIds.length > 0) {
        const { error: updateError } = await supabase
          .from('extracted_frames')
          .update({ block_id: blockId })
          .in('id', frameIds);
        
        if (updateError) {
          toast.error('Erreur lors de la mise à jour des photos');
          return;
        }
      }
      
      const message = existingBlock 
        ? `${frameIds.length} photos ajoutées à "${trimmedName}"`
        : `Album "${trimmedName}" créé`;
      toast.success(message);
      resetDragState();
      await fetchSessionDetail();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const addToExistingZone = async (blockId: string, mediaItem: MediaItem) => {
    if (mediaItem.id === 'video-main') {
      toast.error('La vidéo principale ne peut pas être déplacée');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('extracted_frames')
        .update({ block_id: blockId })
        .eq('id', mediaItem.id);
      
      if (error) {
        toast.error('Erreur lors de l\'ajout');
        return;
      }
      
      const block = sessionRef.current?.detected_blocks?.find(b => b.id === blockId);
      toast.success(`Ajouté à "${block?.manual_label || 'Album'}"`);
      await fetchSessionDetail();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const renameAlbum = async () => {
    if (!editingAlbum || !newAlbumName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('detected_blocks')
        .update({ manual_label: newAlbumName.trim() })
        .eq('id', editingAlbum.id);
      
      if (error) {
        toast.error('Erreur lors du renommage');
        return;
      }
      
      toast.success(`Album renommé en "${newAlbumName.trim()}"`);
      setEditingAlbum(null);
      setNewAlbumName('');
      await fetchSessionDetail();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleAlbumLongPress = (album: Album) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setEditingAlbum(album);
    setNewAlbumName(album.name);
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const renderMediaItem = (media: MediaItem, showAlbumBadge: boolean = false) => {
    const isDragged = draggedMedia?.id === media.id;
    const isHovered = hoveredMediaId === media.id && isDragging;
    const album = showAlbumBadge ? getBlockWithLabel(media.block_id, session) : null;
    
    return (
      <div 
        key={media.id}
        data-media-id={media.id}
        className={`aspect-square cursor-pointer overflow-hidden relative transition-all duration-150 ${
          isDragged ? 'opacity-40 scale-90' : ''
        } ${isHovered ? 'ring-4 ring-primary ring-inset scale-[1.02] z-10' : ''}`}
        onMouseDown={(e) => handleMouseDown(media, e)}
        onMouseUp={handlePointerCancel}
        onMouseLeave={handlePointerCancel}
        onTouchStart={(e) => handleTouchStart(media, e)}
        onTouchCancel={handlePointerCancel}
        onClick={(e) => handleMediaClick(media, e)}
      >
        {media.type === 'video' ? (
          <>
            <video src={media.url} className="w-full h-full object-cover pointer-events-none" muted />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
            </div>
          </>
        ) : (
          <img 
            src={media.url} 
            alt="" 
            className="w-full h-full object-cover pointer-events-none" 
            draggable={false}
          />
        )}
        
        {/* Drop zone overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-primary/50 flex items-center justify-center pointer-events-none">
            <div className="bg-background rounded-full p-3 shadow-xl">
              <FolderPlus className="w-8 h-8 text-primary" />
            </div>
          </div>
        )}
        
        {/* Album badge - only in ungrouped view */}
        {!isDragged && album && showAlbumBadge && (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 pointer-events-none">
            <Folder className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-medium truncate max-w-[60px]">{album.manual_label}</span>
          </div>
        )}
      </div>
    );
  };

  if (!session) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Détails de la session</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-muted-foreground">
            Chargement...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { albums, ungrouped } = getAlbumsAndUngrouped();
  const allMedia = getAllMedia();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Session du {formatDate(session.started_at)}</DialogTitle>
          </DialogHeader>
          
          {/* Header */}
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              {currentAlbum && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setCurrentAlbum(null)}
                  className="shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  {currentAlbum ? currentAlbum.name : formatDate(session.started_at)}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {session.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {currentAlbum ? `${currentAlbum.media.length} photos` : `${allMedia.length} éléments`}
                  </span>
                </div>
              </div>
            </div>
            
            {isDragging && (
              <div className="mt-3 text-center py-2 bg-primary/10 rounded-lg text-sm text-primary animate-pulse">
                Déposez sur une autre photo pour créer un album
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto select-none p-2">
            {currentAlbum ? (
              // Album detail view - show all photos in the album
              <div className="grid grid-cols-3 md:grid-cols-4 gap-[2px]">
                {currentAlbum.media.map((media) => renderMediaItem(media, false))}
              </div>
            ) : (
              // Main view - Albums + Ungrouped photos
              <div className="space-y-4">
                {/* Albums section */}
                {albums.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">Albums</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {albums.map((album) => {
                        let albumLongPressTimer: NodeJS.Timeout | null = null;
                        
                        return (
                          <div 
                            key={album.id}
                            className="cursor-pointer group"
                            onClick={() => setCurrentAlbum(album)}
                            onMouseDown={() => {
                              albumLongPressTimer = setTimeout(() => handleAlbumLongPress(album), 500);
                            }}
                            onMouseUp={() => albumLongPressTimer && clearTimeout(albumLongPressTimer)}
                            onMouseLeave={() => albumLongPressTimer && clearTimeout(albumLongPressTimer)}
                            onTouchStart={() => {
                              albumLongPressTimer = setTimeout(() => handleAlbumLongPress(album), 500);
                            }}
                            onTouchEnd={() => albumLongPressTimer && clearTimeout(albumLongPressTimer)}
                            onTouchCancel={() => albumLongPressTimer && clearTimeout(albumLongPressTimer)}
                          >
                            <div className="aspect-square rounded-xl overflow-hidden relative bg-muted shadow-sm group-hover:shadow-md transition-shadow">
                              <img 
                                src={album.coverUrl} 
                                alt={album.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <div className="flex items-center gap-1.5 text-white">
                                  <Folder className="w-4 h-4" />
                                  <span className="font-medium text-sm truncate">{album.name}</span>
                                </div>
                                <span className="text-xs text-white/80">{album.media.length} photos</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Ungrouped photos section */}
                {ungrouped.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2 flex items-center gap-2">
                      <Images className="w-4 h-4" />
                      Photos non classées ({ungrouped.length})
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-[2px]">
                      {ungrouped.map((media) => renderMediaItem(media, false))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Floating dragged item */}
          {isDragging && draggedMedia && (
            <div 
              className="fixed pointer-events-none z-[100] w-20 h-20 rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary"
              style={{ 
                left: dragPosition.x - 40, 
                top: dragPosition.y - 40,
                transform: 'rotate(-5deg) scale(1.1)',
              }}
            >
              {draggedMedia.type === 'video' ? (
                <video src={draggedMedia.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={draggedMedia.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Naming dialog */}
      <Dialog open={showNamingDialog} onOpenChange={(o) => {
        if (!o) resetDragState();
        setShowNamingDialog(o);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nommer cet album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingCombine && (
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden shadow-lg">
                  {pendingCombine.source.type === 'video' ? (
                    <video src={pendingCombine.source.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={pendingCombine.source.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-2xl text-muted-foreground font-light">+</span>
                <div className="w-16 h-16 rounded-lg overflow-hidden shadow-lg">
                  {pendingCombine.target.type === 'video' ? (
                    <video src={pendingCombine.target.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={pendingCombine.target.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            )}
            
            <Input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Ex: Cuisine, Salon, Façade..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && zoneName.trim() && createZoneFromCombine()}
            />
            
            <div className="flex flex-wrap gap-2">
              {allCategoryButtons.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setZoneName(s)} className="rounded-full text-xs">
                  {s}
                </Button>
              ))}
              {showAddCategory ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nom..."
                    className="h-7 w-24 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomCategory();
                      if (e.key === 'Escape') setShowAddCategory(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={addCustomCategory} className="h-7 w-7 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowAddCategory(true)} className="rounded-full text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              )}
            </div>
            
            <Button onClick={createZoneFromCombine} disabled={!zoneName.trim()} className="w-full">
              Créer l'album
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen image viewer with Extract Task button */}
      <Dialog open={!!selectedImage} onOpenChange={() => { setSelectedImage(null); setSelectedMediaForFullscreen(null); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Aperçu de l'image</DialogTitle>
          </DialogHeader>
          {selectedImage && selectedMediaForFullscreen && (
            <div className="relative w-full h-[95vh] flex items-center justify-center">
              <img src={selectedImage} alt="" className="max-w-full max-h-full object-contain" />
              
              {/* Top right controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  onClick={() => openTaskExtraction(selectedMediaForFullscreen, getMediaLocation(selectedMediaForFullscreen))}
                >
                  <ClipboardList className="w-4 h-4" />
                  Extraire tâche
                </Button>
                <Button size="icon" className="bg-white/10 hover:bg-white/20" onClick={() => { setSelectedImage(null); setSelectedMediaForFullscreen(null); }}>
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>
              
              {/* Location badge */}
              {getMediaLocation(selectedMediaForFullscreen) && (
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">{getMediaLocation(selectedMediaForFullscreen)}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Context menu on long-press */}
      {showContextMenu && contextMenuMedia && (
        <div 
          className="fixed z-[200] bg-popover border rounded-lg shadow-xl p-1 min-w-[160px]"
          style={{ 
            left: Math.min(contextMenuPosition.x, window.innerWidth - 180), 
            top: Math.min(contextMenuPosition.y, window.innerHeight - 100) 
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors text-left"
            onClick={() => openTaskExtraction(contextMenuMedia, getMediaLocation(contextMenuMedia))}
          >
            <ClipboardList className="w-4 h-4" />
            Extraire une tâche
          </button>
        </div>
      )}
      
      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div 
          className="fixed inset-0 z-[199]" 
          onClick={() => setShowContextMenu(false)}
        />
      )}

      {/* Task extraction dialog */}
      <Dialog open={showTaskExtraction} onOpenChange={setShowTaskExtraction}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Extraire une tâche
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image preview */}
            {taskExtractionData && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img 
                  src={taskExtractionData.media.url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
                {taskLocation && (
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-white" />
                    <span className="text-xs text-white">{taskLocation}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* AI Analysis button */}
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={analyzeImageForTask}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyse en cours...' : 'Analyser avec IA'}
            </Button>
            
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Localisation
              </label>
              <Input
                value={taskLocation}
                onChange={(e) => setTaskLocation(e.target.value)}
                placeholder="Ex: Cuisine, Salon..."
              />
              <div className="flex flex-wrap gap-1.5">
                {allCategoryButtons.slice(0, 5).map((cat) => (
                  <Button 
                    key={cat} 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-xs rounded-full"
                    onClick={() => setTaskLocation(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titre de la tâche *</label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ex: Fissure murale à réparer"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Détails supplémentaires..."
                rows={3}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowTaskExtraction(false)}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={saveExtractedTask}
                disabled={!taskTitle.trim() || isSavingTask}
              >
                {isSavingTask && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename album dialog */}
      <Dialog open={!!editingAlbum} onOpenChange={(o) => {
        if (!o) {
          setEditingAlbum(null);
          setNewAlbumName('');
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer l'album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingAlbum && (
              <div className="flex items-center justify-center py-2">
                <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg">
                  <img src={editingAlbum.coverUrl} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            
            <Input
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              placeholder="Nouveau nom..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && newAlbumName.trim() && renameAlbum()}
            />
            
            <div className="flex flex-wrap gap-2">
              {allCategoryButtons.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setNewAlbumName(s)} className="rounded-full text-xs">
                  {s}
                </Button>
              ))}
              {showAddCategory ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nom..."
                    className="h-7 w-24 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomCategory();
                      if (e.key === 'Escape') setShowAddCategory(false);
                    }}
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={addCustomCategory} className="h-7 w-7 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowAddCategory(true)} className="rounded-full text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              )}
            </div>
            
            <Button onClick={renameAlbum} disabled={!newAlbumName.trim()} className="w-full">
              Renommer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
