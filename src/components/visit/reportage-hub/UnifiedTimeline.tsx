import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, Video, Mic, MapPin, MessageSquare, 
  Play, Send, Sparkles, AlertTriangle, 
  ChevronDown, ChevronUp, Loader2, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { TimelineItem } from './DetailPanel';
import { InlineActionBar } from './InlineActionBar';
import { AddNoteDialog } from './AddNoteDialog';
import { MarkAsProblemDialog } from './MarkAsProblemDialog';
import { LinkClassificationDialog } from './LinkClassificationDialog';
import { CoverageBadge } from './CoverageBadge';
import { SearchFilterBar, SearchFilters } from './SearchFilterBar';
import { SyncStatusIcon, SyncStatusBar } from './SyncStatusIcon';

export type { TimelineItem };

interface UnifiedTimelineProps {
  projectId: string;
  sessionId?: string;
  onStartCapture?: (mode: 'guided' | 'free') => void;
  onItemSelected?: (item: TimelineItem) => void;
  selectedItemId?: string;
}

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({ 
  projectId, 
  sessionId,
  onStartCapture,
  onItemSelected,
  selectedItemId
}) => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { selectionChanged } = useHapticFeedback();
  
  // Offline queue for local-first sync
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    failedCount, 
    getItemStatus, 
    queueOperation,
    forceSync,
    retryFailed 
  } = useOfflineQueue();

  // Search and filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    types: [],
  });

  // Dialog states
  const [addNoteDialog, setAddNoteDialog] = useState<{ open: boolean; item: TimelineItem | null }>({ open: false, item: null });
  const [problemDialog, setProblemDialog] = useState<{ open: boolean; item: TimelineItem | null }>({ open: false, item: null });
  const [classificationDialog, setClassificationDialog] = useState<{ open: boolean; item: TimelineItem | null }>({ open: false, item: null });

  const loadAllItems = useCallback(async () => {
    setLoading(true);
    try {
      const allItems: TimelineItem[] = [];

      // Load sequences (with media + transcription)
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select(`
          id, video_url, audio_url, transcription, created_at,
          partie_name, lieu_name, endroit_name, zone_name,
          user_condition, detected_condition, status
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Load problems to count per sequence
      const { data: problems } = await supabase
        .from('identified_problems')
        .select('id, sequence_id')
        .eq('project_id', projectId);

      // Load notes from daily_logs
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('id, observations, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (sequences) {
        sequences.forEach((seq: any) => {
          const locationParts = [seq.partie_name, seq.lieu_name, seq.endroit_name, seq.zone_name].filter(Boolean);
          const problemCount = problems?.filter(p => p.sequence_id === seq.id).length || 0;
          
          allItems.push({
            id: seq.id,
            type: 'sequence',
            mediaType: seq.video_url ? 'video' : seq.audio_url ? 'audio' : undefined,
            url: seq.video_url || seq.audio_url,
            transcription: seq.transcription,
            location: locationParts.join(' › ') || undefined,
            zone: seq.zone_name,
            condition: seq.user_condition || seq.detected_condition,
            problemCount,
            createdAt: new Date(seq.created_at),
            raw: seq,
          });
        });
      }

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

      // Sort all by date
      allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setItems(allItems);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type
    if (filters.types.length > 0) {
      result = result.filter(item => {
        if (filters.types.includes('sequence') && item.type === 'sequence') return true;
        if (filters.types.includes('media') && item.type === 'media') return true;
        if (filters.types.includes('note') && item.type === 'note') return true;
        if (filters.types.includes('problem') && item.problemCount && item.problemCount > 0) return true;
        return false;
      });
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = startOfDay(filters.dateFrom);
      result = result.filter(item => isAfter(item.createdAt, fromDate) || item.createdAt.getTime() === fromDate.getTime());
    }
    if (filters.dateTo) {
      const toDate = endOfDay(filters.dateTo);
      result = result.filter(item => isBefore(item.createdAt, toDate) || item.createdAt.getTime() === toDate.getTime());
    }

    // Filter by location (partie/lieu/zone)
    if (filters.partieId || filters.lieuId || filters.zoneType) {
      result = result.filter(item => {
        const raw = item.raw as any;
        if (!raw) return false;
        
        // Check partie match
        if (filters.partieId && raw.partie_name) {
          // This is a simplified check - in real impl we'd need part IDs
          // For now we filter by location string containing the partie name
        }

        // Check zone type match
        if (filters.zoneType && raw.zone_name) {
          if (!raw.zone_name.toLowerCase().includes(filters.zoneType.toLowerCase())) {
            return false;
          }
        }

        return true;
      });
    }

    // Filter by search query
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      result = result.filter(item => {
        // Search in transcription
        if (item.transcription?.toLowerCase().includes(query)) return true;
        // Search in content (notes)
        if (item.content?.toLowerCase().includes(query)) return true;
        // Search in location
        if (item.location?.toLowerCase().includes(query)) return true;
        // Search in zone
        if (item.zone?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    return result;
  }, [items, filters]);

  useEffect(() => {
    loadAllItems();
  }, [loadAllItems, sessionId]);

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    
    setIsAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const noteId = crypto.randomUUID();
      const noteData = {
        id: noteId,
        project_id: projectId,
        user_id: user.id,
        observations: noteInput.trim(),
        log_date: new Date().toISOString().split('T')[0],
      };

      // Use offline queue - saves locally first, syncs when online
      const { synced } = await queueOperation(
        'note',
        'create',
        'daily_logs',
        noteData,
        { projectId, itemId: noteId }
      );

      setNoteInput('');
      selectionChanged();
      toast.success(synced ? 'Note ajoutée' : 'Note sauvegardée localement');
      loadAllItems();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleItemClick = (item: TimelineItem) => {
    selectionChanged();
    onItemSelected?.(item);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    selectionChanged();
  };

  const getConditionColor = (condition: string | undefined) => {
    switch (condition) {
      case 'Neuf': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'Bon': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'À refaire': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Inline action handlers
  const handleInlineAddNote = (item: TimelineItem) => {
    setAddNoteDialog({ open: true, item });
  };

  const handleInlineMarkProblem = (item: TimelineItem) => {
    setProblemDialog({ open: true, item });
  };

  const handleInlineLinkClassification = (item: TimelineItem) => {
    setClassificationDialog({ open: true, item });
  };

  const renderTimelineItem = (item: TimelineItem) => {
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedItemId === item.id;
    const syncStatus = getItemStatus(item.id);
    
    if (item.type === 'note') {
      return (
        <Card 
          key={item.id} 
          className={cn(
            "rounded-2xl overflow-hidden border-l-4 border-l-primary/50 hover:shadow-lg transition-all cursor-pointer group",
            isSelected && "ring-2 ring-primary shadow-lg"
          )}
          onClick={() => handleItemClick(item)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0 relative">
                <MessageSquare className="h-4 w-4 text-primary" />
                <SyncStatusIcon status={syncStatus} className="absolute -top-1 -right-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap line-clamp-3">{item.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: fr })}
                    </p>
                    <SyncStatusIcon status={syncStatus} size="sm" />
                  </div>
                  <InlineActionBar
                    onAddNote={() => handleInlineAddNote(item)}
                    onMarkProblem={() => handleInlineMarkProblem(item)}
                    onLinkClassification={() => handleInlineLinkClassification(item)}
                    compact
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Sequence item (combines media + transcription + problems)
    return (
      <Card 
        key={item.id}
        className={cn(
          "rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer group",
          "hover:shadow-lg active:scale-[0.99]",
          item.problemCount && item.problemCount > 0 && "border-l-4 border-l-amber-500",
          isSelected && "ring-2 ring-primary shadow-lg"
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className="p-0">
          {/* Media Preview */}
          {item.url && item.mediaType === 'video' && (
            <div className="relative aspect-video bg-muted">
              <img 
                src={item.url} 
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-foreground ml-0.5" />
                </div>
              </div>
              {/* Location overlay */}
              {item.location && (
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge className="bg-black/60 text-white backdrop-blur-sm text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {item.zone || item.location.split(' › ').pop()}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {item.mediaType === 'audio' && (
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Enregistrement audio</p>
                  <p className="text-xs text-muted-foreground">
                    {item.location || 'Localisation non définie'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {item.condition && (
                  <Badge className={cn("text-xs border", getConditionColor(item.condition))}>
                    {item.condition}
                  </Badge>
                )}
                {item.problemCount && item.problemCount > 0 && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {item.problemCount} problème{item.problemCount > 1 ? 's' : ''}
                  </Badge>
                )}
                <SyncStatusIcon status={syncStatus} size="sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: fr })}
              </span>
            </div>

            {/* Location (if not shown in media overlay) */}
            {item.location && !item.url && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {/* Transcription */}
            {item.transcription && (
              <div className="mt-2">
                <p className={cn(
                  "text-sm text-muted-foreground italic",
                  !isExpanded && "line-clamp-2"
                )}>
                  "{item.transcription}"
                </p>
              </div>
            )}

            {/* Expand indicator */}
            {item.transcription && item.transcription.length > 100 && (
              <button 
                className="flex justify-center mt-2 w-full"
                onClick={(e) => toggleExpand(e, item.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}

            {/* Inline action bar */}
            <div className="mt-3 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <InlineActionBar
                onAddNote={() => handleInlineAddNote(item)}
                onMarkProblem={() => handleInlineMarkProblem(item)}
                onLinkClassification={() => handleInlineLinkClassification(item)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isEmpty = !loading && items.length === 0;
  const hasFilters = filters.query || filters.types.length > 0 || filters.dateFrom || filters.dateTo || filters.partieId || filters.lieuId || filters.zoneType || filters.severity;
  const noResults = !loading && hasFilters && filteredItems.length === 0 && items.length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Sync Status Bar - show when offline or has pending items */}
      {(pendingCount > 0 || failedCount > 0 || !isOnline) && (
        <div className="px-4 py-2 border-b">
          <SyncStatusBar
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            failedCount={failedCount}
            onSync={forceSync}
            onRetry={retryFailed}
          />
        </div>
      )}

      {/* Search and Filter Bar - only show when we have items */}
      {!loading && items.length > 0 && (
        <div className="px-4 pt-4 pb-2 border-b bg-background/95 backdrop-blur-sm">
          <SearchFilterBar
            projectId={projectId}
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={hasFilters ? filteredItems.length : undefined}
          />
        </div>
      )}

      {/* Timeline Content */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Commencez votre visite</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Capturez photos, vidéos et notes pour documenter l'état des lieux
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                size="lg" 
                className="rounded-2xl h-14 gap-3"
                onClick={() => onStartCapture?.('guided')}
              >
                <MapPin className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Mode Guidé</div>
                  <div className="text-xs opacity-70">Sélection manuelle des zones</div>
                </div>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-2xl h-14 gap-3"
                onClick={() => onStartCapture?.('free')}
              >
                <Video className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium flex items-center gap-2">
                    Vidéo Continue
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground">L'IA localise pour vous</div>
                </div>
              </Button>
            </div>
          </div>
        ) : noResults ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucun résultat</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Aucun élément ne correspond à vos critères de recherche
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({ query: '', types: [] })}
            >
              Effacer les filtres
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pb-32">
            {/* Stats header with coverage badge */}
            <div className="flex gap-2 overflow-x-auto pb-2 items-center">
              <CoverageBadge projectId={projectId} />
              <Badge variant="secondary" className="rounded-full px-3 py-1 shrink-0">
                <Video className="h-3 w-3 mr-1.5" />
                {items.filter(i => i.type === 'sequence').length} séquences
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 shrink-0">
                <MessageSquare className="h-3 w-3 mr-1.5" />
                {items.filter(i => i.type === 'note').length} notes
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 shrink-0 text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1.5" />
                {items.reduce((acc, i) => acc + (i.problemCount || 0), 0)} problèmes
              </Badge>
            </div>

            {/* Timeline items */}
            {filteredItems.map(renderTimelineItem)}
          </div>
        )}
      </ScrollArea>

      {/* Input bar - Always visible like Lovable chat */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur-sm p-4 pb-safe">
        <div className="flex gap-2 items-end">
          <Textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ajouter une note..."
            className="min-h-[44px] max-h-32 rounded-2xl resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <div className="flex gap-2 shrink-0">
            <Button
              size="icon"
              variant="outline"
              className="h-11 w-11 rounded-xl"
              onClick={() => onStartCapture?.('guided')}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-11 w-11 rounded-xl"
              onClick={() => onStartCapture?.('free')}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={handleAddNote}
              disabled={!noteInput.trim() || isAddingNote}
            >
              {isAddingNote ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddNoteDialog
        open={addNoteDialog.open}
        onOpenChange={(open) => setAddNoteDialog({ open, item: open ? addNoteDialog.item : null })}
        projectId={projectId}
        linkedItemId={addNoteDialog.item?.id}
        linkedItemType={addNoteDialog.item?.type}
        onSuccess={loadAllItems}
      />

      <MarkAsProblemDialog
        open={problemDialog.open}
        onOpenChange={(open) => setProblemDialog({ open, item: open ? problemDialog.item : null })}
        projectId={projectId}
        sequenceId={problemDialog.item?.type === 'sequence' ? problemDialog.item.id : undefined}
        initialTitle={problemDialog.item?.transcription?.slice(0, 50) || ''}
        initialDescription={problemDialog.item?.transcription || ''}
        onSuccess={loadAllItems}
      />

      <LinkClassificationDialog
        open={classificationDialog.open}
        onOpenChange={(open) => setClassificationDialog({ open, item: open ? classificationDialog.item : null })}
        projectId={projectId}
        sequenceId={classificationDialog.item?.type === 'sequence' ? classificationDialog.item.id : undefined}
        itemTitle={classificationDialog.item?.transcription?.slice(0, 50) || classificationDialog.item?.content?.slice(0, 50)}
        onSuccess={loadAllItems}
      />
    </div>
  );
};
