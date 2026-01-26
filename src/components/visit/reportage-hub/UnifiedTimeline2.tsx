import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Camera, Video, Mic, MapPin, MessageSquare, 
  Play, Image, AlertTriangle, ChevronDown, Search, PenTool, Cpu
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { TimelineFilters } from './TimelineFilters';
import { useAnomalyCounts } from '@/hooks/useItemAnomalies';
import { ImmersiveMediaViewer } from './ImmersiveMediaViewer';

import { EdlTagsDisplay, EdlTags } from './EdlTagsDisplay';

import { TechnicalElement } from './TechnicalElementBadge';

export interface TimelineItem2 {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'sequence' | 'note' | 'anomaly' | 'segment' | 'technical';
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  transcription?: string;
  location?: string;
  zone?: string;
  condition?: string;
  problemCount?: number;
  anomalyCount?: number;
  createdAt: Date;
  raw?: any;
  // Location ID for room filtering
  locationId?: string | null;
  // Segment-specific fields
  isSegment?: boolean;
  segmentIndex?: number;
  startTime?: number;
  endTime?: number;
  parentSequenceId?: string;
  segmentLabel?: string;
  // EDL tags
  edlTags?: EdlTags | null;
  // Annotation flag
  isAnnotated?: boolean;
  // Technical element detection
  technicalElements?: TechnicalElement[];
  isKeyTechnical?: boolean;
}

interface UnifiedTimeline2Props {
  projectId: string;
  sessionId?: string;
  onItemSelected?: (item: TimelineItem2) => void;
  selectedItemId?: string;
  filterLocationId?: string | null;
  onRoomCountsUpdate?: (counts: Map<string, number>, unlocalizedCount: number) => void;
}

const ITEMS_PER_PAGE = 20;

export const UnifiedTimeline2: React.FC<UnifiedTimeline2Props> = ({ 
  projectId, 
  sessionId,
  onItemSelected,
  selectedItemId,
  filterLocationId,
  onRoomCountsUpdate
}) => {
  const [items, setItems] = useState<TimelineItem2[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerItem, setViewerItem] = useState<TimelineItem2 | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { selectionChanged } = useHapticFeedback();
  const { counts: anomalyCounts } = useAnomalyCounts(projectId);

  const loadItems = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const allItems: TimelineItem2[] = [];
      const offset = pageNum * ITEMS_PER_PAGE;

      // Load sequences (video/audio with transcription)
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select(`
          id, video_url, audio_url, transcription, created_at,
          part_id, location_id, zone_type, endroit_name,
          user_condition, detected_condition, status, edl_tags,
          metadata, description
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      // Load problems count per sequence
      const { data: problems } = await supabase
        .from('identified_problems')
        .select('id, sequence_id, location_id')
        .eq('project_id', projectId);

      // Load extracted frames (photos) - use session_id if available, otherwise skip
      // Frames are loaded separately if no sessionId
      let frames: any[] | null = null;
      if (sessionId) {
        const { data } = await supabase
          .from('extracted_frames')
          .select('id, frame_url, timestamp_seconds, created_at, manual_label, edl_tags, analysis_result, location_id')
          .eq('visit_session_id', sessionId)
          .order('created_at', { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);
        frames = data;
      }

      // Load notes
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('id, observations, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      // Load anomalies
      const { data: anomalies } = await supabase
        .from('detected_anomalies')
        .select('id, description, severity, created_at, anomaly_type, location_data')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      // Transform sequences
      if (sequences) {
        sequences.forEach((seq: any) => {
          const metadata = seq.metadata || {};
          
          // Build location from metadata or endroit_name
          const locationParts: string[] = [];
          if (metadata.detected_partie) locationParts.push(metadata.detected_partie);
          if (metadata.detected_lieu) locationParts.push(metadata.detected_lieu);
          if (seq.endroit_name) locationParts.push(seq.endroit_name);
          if (metadata.detected_zone || seq.zone_type) locationParts.push(metadata.detected_zone || seq.zone_type);
          
          const problemCount = problems?.filter(p => p.sequence_id === seq.id).length || 0;
          
          // Check if this is a segment (child of a continuous video)
          const isSegment = metadata.isSegment === true;
          const isVoiceNote = metadata.voice_note === true;
          
          allItems.push({
            id: seq.id,
            type: isSegment ? 'segment' : (seq.video_url ? 'video' : seq.audio_url ? 'audio' : 'sequence'),
            url: seq.video_url || seq.audio_url,
            transcription: seq.transcription,
            location: locationParts.length > 0 ? locationParts.join(' › ') : undefined,
            zone: metadata.detected_zone || seq.zone_type,
            condition: seq.user_condition || seq.detected_condition,
            problemCount,
            createdAt: new Date(seq.created_at),
            raw: { ...seq, isVoiceNote },
            locationId: seq.location_id || null,
            // Segment-specific fields
            isSegment,
            segmentIndex: metadata.segmentIndex,
            startTime: metadata.startTime,
            endTime: metadata.endTime,
            parentSequenceId: metadata.parentSequenceId,
            segmentLabel: isSegment ? (seq.description || `Séquence ${metadata.segmentIndex}`) : undefined,
            // EDL tags
            edlTags: seq.edl_tags as EdlTags | null,
          });
        });
      }

      // Transform frames (photos) - with technical element detection
      if (frames) {
        frames.forEach((frame: any) => {
          const analysisResult = frame.analysis_result as Record<string, any> | null;
          const technicalElements = analysisResult?.technical_elements || [];
          const hasKeyTechnical = analysisResult?.has_key_technical_element || technicalElements.length > 0;
          
          allItems.push({
            id: frame.id,
            type: hasKeyTechnical ? 'technical' : 'photo',
            url: frame.frame_url,
            thumbnailUrl: frame.frame_url,
            content: frame.manual_label,
            createdAt: new Date(frame.created_at),
            raw: frame,
            locationId: frame.location_id || null,
            edlTags: frame.edl_tags as EdlTags | null,
            isAnnotated: !!analysisResult?.annotated_url,
            technicalElements: technicalElements,
            isKeyTechnical: hasKeyTechnical,
          });
        });
      }

      // Transform notes
      if (logs) {
        logs.forEach((log: any) => {
          if (log.observations) {
            allItems.push({
              id: log.id,
              type: 'note',
              content: log.observations,
              createdAt: new Date(log.created_at),
              raw: log,
            });
          }
        });
      }

      // Transform anomalies
      if (anomalies) {
        anomalies.forEach((anomaly: any) => {
          const locationData = anomaly.location_data as Record<string, any> | null;
          allItems.push({
            id: anomaly.id,
            type: 'anomaly',
            content: anomaly.description,
            condition: anomaly.severity,
            createdAt: new Date(anomaly.created_at),
            raw: anomaly,
            locationId: locationData?.location_id || null,
          });
        });
      }

      // Sort by date
      allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Check if more items available
      const totalItems = (sequences?.length || 0) + (frames?.length || 0) + (logs?.length || 0) + (anomalies?.length || 0);
      setHasMore(totalItems >= ITEMS_PER_PAGE);

      if (append) {
        setItems(prev => [...prev, ...allItems]);
      } else {
        setItems(allItems);
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    loadItems(0);
  }, [loadItems]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadItems(nextPage, true);
    }
  };

  const handleItemClick = (item: TimelineItem2) => {
    selectionChanged();
    onItemSelected?.(item);
  };

  const handleMediaClick = (item: TimelineItem2, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'photo' || item.type === 'video' || item.type === 'segment') {
      setViewerItem(item);
    }
  };

  const handleViewerNavigate = (item: TimelineItem2) => {
    setViewerItem(item);
  };

  // Enrich items with anomaly counts
  const enrichedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      anomalyCount: anomalyCounts.get(item.id) || 0
    }));
  }, [items, anomalyCounts]);

  // Compute room counts and notify parent
  useEffect(() => {
    if (!onRoomCountsUpdate) return;
    
    const counts = new Map<string, number>();
    let unlocalized = 0;
    
    enrichedItems.forEach(item => {
      if (item.locationId) {
        counts.set(item.locationId, (counts.get(item.locationId) || 0) + 1);
      } else {
        unlocalized++;
      }
    });
    
    onRoomCountsUpdate(counts, unlocalized);
  }, [enrichedItems, onRoomCountsUpdate]);

  // Filter items by location (room drawer) and search query
  const filteredItems = useMemo(() => {
    let result = enrichedItems;
    
    // Filter by location
    if (filterLocationId === 'unlocalized') {
      result = result.filter(item => !item.locationId);
    } else if (filterLocationId) {
      result = result.filter(item => item.locationId === filterLocationId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        if (item.content?.toLowerCase().includes(query)) return true;
        if (item.transcription?.toLowerCase().includes(query)) return true;
        if (item.location?.toLowerCase().includes(query)) return true;
        if (item.zone?.toLowerCase().includes(query)) return true;
        if (item.type.toLowerCase().includes(query)) return true;
        if (item.condition?.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    
    return result;
  }, [enrichedItems, searchQuery, filterLocationId]);

  // Group filtered items by date
  const groupedItems = filteredItems.reduce<{ date: string; items: TimelineItem2[] }[]>((acc, item) => {
    let dateLabel: string;
    if (isToday(item.createdAt)) {
      dateLabel = "Aujourd'hui";
    } else if (isYesterday(item.createdAt)) {
      dateLabel = 'Hier';
    } else {
      dateLabel = format(item.createdAt, 'EEEE d MMMM', { locale: fr });
    }

    const existing = acc.find(g => g.date === dateLabel);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ date: dateLabel, items: [item] });
    }
    return acc;
  }, []);

  const getTypeIcon = (type: TimelineItem2['type']) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'sequence': return <Camera className="h-4 w-4" />;
      case 'segment': return <Video className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
      case 'technical': return <Camera className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TimelineItem2['type']) => {
    switch (type) {
      case 'photo': return 'bg-blue-500/10 text-blue-600';
      case 'video': return 'bg-purple-500/10 text-purple-600';
      case 'audio': return 'bg-green-500/10 text-green-600';
      case 'sequence': return 'bg-primary/10 text-primary';
      case 'segment': return 'bg-indigo-500/10 text-indigo-600';
      case 'note': return 'bg-amber-500/10 text-amber-600';
      case 'anomaly': return 'bg-red-500/10 text-red-600';
      case 'technical': return 'bg-cyan-500/10 text-cyan-600';
    }
  };

  const renderBubble = (item: TimelineItem2) => {
    const isSelected = selectedItemId === item.id;
    
    return (
      <div 
        key={item.id}
        className={cn(
          "group relative animate-fade-in cursor-pointer",
          "transition-all duration-200"
        )}
        onClick={() => handleItemClick(item)}
      >
        {/* Bubble Container */}
        <div className={cn(
          "relative rounded-2xl overflow-hidden",
          "bg-card border border-border/50",
          "shadow-sm hover:shadow-md transition-shadow",
          "max-w-[85%]",
          isSelected && "ring-2 ring-primary shadow-lg"
        )}>
          {/* Media Preview (for photo/video/segment/technical) */}
          {(item.type === 'photo' || item.type === 'video' || item.type === 'segment' || item.type === 'technical') && item.url && (
            <div 
              className="relative aspect-[4/3] bg-muted cursor-zoom-in group/media"
              onClick={(e) => handleMediaClick(item, e)}
            >
              {item.type === 'segment' ? (
                // Segment preview with gradient background
                <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="h-10 w-10 text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-indigo-700">
                      {item.segmentLabel || `Séquence ${item.segmentIndex}`}
                    </p>
                  </div>
                </div>
              ) : (
                <img 
                  src={item.thumbnailUrl || item.url}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover/media:scale-105"
                  loading="lazy"
                />
              )}
              {(item.type === 'video' || item.type === 'segment') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                    <Play className="h-4 w-4 text-foreground ml-0.5" />
                  </div>
                </div>
              )}
              {/* Technical element indicator */}
              {item.type === 'technical' && item.technicalElements && item.technicalElements.length > 0 && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-cyan-600 text-white text-xs gap-1 shadow-lg">
                    <Cpu className="h-3 w-3" />
                    {item.technicalElements[0]?.label || 'Élément technique'}
                  </Badge>
                </div>
              )}
              {/* Segment timing badge */}
              {item.type === 'segment' && item.startTime !== undefined && item.endTime !== undefined && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-indigo-600 text-white text-xs font-mono">
                    {Math.floor(item.startTime / 60)}:{String(Math.floor(item.startTime % 60)).padStart(2, '0')} - {Math.floor(item.endTime / 60)}:{String(Math.floor(item.endTime % 60)).padStart(2, '0')}
                  </Badge>
                </div>
              )}
              {/* Location badge on media */}
              {item.zone && (
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/60 text-white backdrop-blur-sm text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {item.zone}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Audio indicator with player */}
          {item.type === 'audio' && (
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Mic className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {item.raw?.isVoiceNote ? 'Note vocale' : 'Enregistrement audio'}
                  </p>
                  {item.location && (
                    <p className="text-xs text-muted-foreground truncate">{item.location}</p>
                  )}
                </div>
              </div>
              {/* Audio player */}
              {item.url && (
                <audio 
                  src={item.url} 
                  controls 
                  className="w-full h-8 mt-2"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          )}

          {/* Content area */}
          <div className="p-3">
            {/* Type indicator + time */}
            <div className="flex items-center justify-between mb-2">
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", getTypeColor(item.type))}>
                {getTypeIcon(item.type)}
                <span className="capitalize">
                  {item.type === 'anomaly' ? 'Anomalie' : 
                   item.type === 'segment' ? (item.segmentLabel || 'Segment') : 
                   item.type}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {format(item.createdAt, 'HH:mm', { locale: fr })}
              </span>
            </div>
            
            {/* Segment duration info */}
            {item.type === 'segment' && item.startTime !== undefined && item.endTime !== undefined && (
              <p className="text-xs text-muted-foreground mb-2">
                Durée: {Math.round(item.endTime - item.startTime)}s
              </p>
            )}

            {/* Note/Anomaly content */}
            {(item.type === 'note' || item.type === 'anomaly') && item.content && (
              <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                {item.content}
              </p>
            )}

            {/* Transcription */}
            {item.transcription && (
              <p className="text-sm text-muted-foreground italic line-clamp-2 mt-1">
                "{item.transcription}"
              </p>
            )}

            {/* Location label - always show for all types */}
            {(item.location || item.zone) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 bg-muted/50 px-2 py-1 rounded-md w-fit">
                <MapPin className="h-3 w-3 text-primary/70" />
                <span className="truncate font-medium">
                  {item.location && item.zone 
                    ? `${item.location} • ${item.zone}`
                    : item.location || item.zone}
                </span>
              </div>
            )}
            {!item.location && !item.zone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-2 italic">
                <MapPin className="h-3 w-3" />
                <span>Pièce inconnue</span>
              </div>
            )}

            {/* Problem indicator */}
            {item.problemCount && item.problemCount > 0 && (
              <Badge variant="outline" className="mt-2 text-xs text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {item.problemCount} problème{item.problemCount > 1 ? 's' : ''}
              </Badge>
            )}

            {/* Anomaly indicator */}
            {item.anomalyCount && item.anomalyCount > 0 && item.type !== 'anomaly' && (
              <Badge className="mt-2 text-xs bg-red-500/10 text-red-600 border border-red-500/30 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {item.anomalyCount} anomalie{item.anomalyCount > 1 ? 's' : ''}
              </Badge>
            )}

            {/* EDL Tags chips */}
            {item.edlTags && (item.edlTags.element_type || item.edlTags.state) && (
              <EdlTagsDisplay tags={item.edlTags} variant="compact" />
            )}

            {/* Annotated badge */}
            {item.isAnnotated && (
              <Badge className="mt-2 text-xs bg-primary/10 text-primary border border-primary/30 gap-1">
                <PenTool className="h-3 w-3" />
                Annoté
              </Badge>
            )}

            {/* Condition badge */}
            {item.condition && item.type !== 'anomaly' && !item.edlTags?.state && (
              <Badge 
                className={cn(
                  "mt-2 text-xs border",
                  item.condition === 'Neuf' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                  item.condition === 'Bon' && 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                  item.condition === 'À refaire' && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                )}
              >
                {item.condition}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-3/4 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Reportage</h1>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? `${filteredItems.length} résultat${filteredItems.length !== 1 ? 's' : ''}` : `${items.length} élément${items.length !== 1 ? 's' : ''} capturé${items.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          
          {/* Search & Filter Bar */}
          <TimelineFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchQuery ? filteredItems.length : undefined}
          />
        </div>
      </div>

      {/* Timeline Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-safe"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Aucun élément</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Commencez à capturer des photos, vidéos ou notes pour les voir apparaître ici.
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-6">
            {groupedItems.map(group => (
              <div key={group.date} className="space-y-3">
                {/* Date separator */}
                <div className="flex justify-center">
                  <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full">
                    {group.date}
                  </span>
                </div>
                {/* Items for this date */}
                <div className="space-y-3">
                  {group.items.map(item => renderBubble(item))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Charger plus
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Immersive Media Viewer */}
    {viewerItem && (
      <ImmersiveMediaViewer
        item={viewerItem}
        items={enrichedItems}
        onClose={() => setViewerItem(null)}
        onNavigate={handleViewerNavigate}
      />
    )}
    </>
  );
};
