import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, MapPin, Clock, User, Play, Pause, Mic, 
  MessageSquare, AlertTriangle, Sparkles, Link2,
  Tag, Edit3, Trash2, FileText, ListChecks, Building2, Home, Layers, Pencil, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LocationSelector } from './LocationSelector';
import { LinkedTasksBlock } from './LinkedTasksBlock';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TimelineItem {
  id: string;
  type: 'media' | 'sequence' | 'note';
  mediaType?: 'photo' | 'video' | 'audio' | 'frame';
  url?: string;
  content?: string;
  transcription?: string;
  location?: string;
  zone?: string;
  partId?: string;
  partName?: string;
  locationId?: string;
  locationName?: string;
  zoneId?: string;
  zoneName?: string;
  condition?: string;
  problemCount?: number;
  taskCount?: number;
  createdAt: Date;
  raw: any;
}

// Context interface for MyAladin AI requests
export interface MyAladinItemContext {
  projectId: string;
  sessionId?: string;
  itemType: 'media' | 'sequence' | 'note';
  itemId: string;
  transcription?: string;
  content?: string;
  anomalies?: Array<{ id: string; title: string; severity?: string }>;
  problems?: Array<{ id: string; title: string; severity?: string }>;
  localisation?: {
    partId?: string;
    partName?: string;
    locationId?: string;
    locationName?: string;
    zoneId?: string;
    zoneName?: string;
  };
  linkedTasks?: Array<{
    id: string;
    title: string;
    familyCode?: string;
    categoryCode?: string;
    subcategoryCode?: string;
  }>;
  mediaUrl?: string;
  mediaType?: string;
  condition?: string;
}

interface DetailPanelProps {
  item: TimelineItem | null;
  projectId?: string;
  sessionId?: string;
  onClose: () => void;
  onAddNote?: (itemId: string) => void;
  onLinkClassification?: (itemId: string) => void;
  onMarkAsProblem?: (itemId: string) => void;
  onSummarize?: (itemId: string) => void;
  onExtractTasks?: (itemId: string) => void;
  onEditNote?: (itemId: string, content: string) => void;
  onDeleteNote?: (itemId: string) => void;
  onLocationUpdate?: () => void;
  onTasksChange?: () => void;
  onAskIA?: (context: MyAladinItemContext) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  item,
  projectId,
  sessionId,
  onClose,
  onAddNote,
  onLinkClassification,
  onMarkAsProblem,
  onSummarize,
  onExtractTasks,
  onEditNote,
  onDeleteNote,
  onLocationUpdate,
  onTasksChange,
  onAskIA,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState('');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = React.useState(false);
  const [isSavingLocation, setIsSavingLocation] = React.useState(false);

  React.useEffect(() => {
    if (item?.type === 'note' && item.content) {
      setEditContent(item.content);
    }
    setIsEditing(false);
  }, [item]);

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
        <div className="text-center p-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Sélectionnez un élément pour voir les détails</p>
        </div>
      </div>
    );
  }

  const getConditionColor = (condition: string | undefined) => {
    switch (condition) {
      case 'Neuf': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'Bon': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'À refaire': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEditNote) {
      onEditNote(item.id, editContent.trim());
      setIsEditing(false);
    }
  };

  // Build context for MyAladin AI
  const buildAIContext = (): MyAladinItemContext | null => {
    if (!projectId || !item) return null;
    
    return {
      projectId,
      sessionId: sessionId || item.raw?.visit_session_id,
      itemType: item.type,
      itemId: item.id,
      transcription: item.transcription,
      content: item.content,
      anomalies: item.raw?.detected_anomalies || [],
      problems: item.raw?.identified_problems || [],
      localisation: {
        partId: item.partId,
        partName: item.partName,
        locationId: item.locationId,
        locationName: item.locationName,
        zoneId: item.zoneId,
        zoneName: item.zoneName,
      },
      linkedTasks: item.raw?.linked_tasks || [],
      mediaUrl: item.url,
      mediaType: item.mediaType,
      condition: item.condition,
    };
  };

  const handleAskIA = () => {
    const context = buildAIContext();
    if (context && onAskIA) {
      onAskIA(context);
    }
  };

  const handleLocationSelect = async (locationData: {
    partId: string;
    partName: string;
    locationId: string;
    locationName: string;
    zoneId?: string;
    zoneName?: string;
  }) => {
    if (!item) return;
    setIsSavingLocation(true);

    try {
      // Determine which table to update based on item type
      if (item.type === 'sequence') {
        // Update visit_sequences
        const { error } = await supabase
          .from('visit_sequences')
          .update({
            part_id: locationData.partId,
            location_id: locationData.locationId,
            zone_id: locationData.zoneId || null,
            part_name: locationData.partName,
            location_name: locationData.locationName,
            zone_name: locationData.zoneName || null,
          })
          .eq('id', item.id);
        
        if (error) throw error;
      } else if (item.type === 'media' && item.raw?.visit_session_id) {
        // Update extracted_frames if it's a frame
        if (item.mediaType === 'frame') {
          const { error } = await supabase
            .from('extracted_frames')
            .update({
              manual_label: `${locationData.partName} > ${locationData.locationName}${locationData.zoneName ? ` > ${locationData.zoneName}` : ''}`,
            })
            .eq('id', item.id);
          
          if (error) throw error;
        }
      } else if (item.type === 'note') {
        // For notes, we store location in the observations field with metadata
        const { error } = await supabase
          .from('daily_logs')
          .update({
            observations: JSON.stringify({
              content: item.content,
              location: {
                partId: locationData.partId,
                partName: locationData.partName,
                locationId: locationData.locationId,
                locationName: locationData.locationName,
                zoneId: locationData.zoneId,
                zoneName: locationData.zoneName,
              }
            })
          })
          .eq('id', item.id);
        
        if (error) throw error;
      }

      toast.success('Localisation mise à jour');
      onLocationUpdate?.();
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const renderLocationBlock = () => {
    const hasLocation = item.partName || item.locationName || item.zoneName || item.location;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Localisation
          </h3>
          {projectId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setIsLocationSelectorOpen(true)}
              disabled={isSavingLocation}
            >
              <Pencil className="h-3 w-3" />
              Modifier
            </Button>
          )}
        </div>
        
        {hasLocation ? (
          <div className="space-y-2">
            {item.partName && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded bg-blue-500/10">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Partie</p>
                  <p className="text-sm font-medium truncate">{item.partName}</p>
                </div>
              </div>
            )}
            {(item.locationName || item.location) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="text-sm font-medium truncate">{item.locationName || item.location}</p>
                </div>
              </div>
            )}
            {(item.zoneName || item.zone) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-1.5 rounded bg-amber-500/10">
                  <Layers className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Zone</p>
                  <p className="text-sm font-medium truncate">{item.zoneName || item.zone}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-center">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune localisation définie</p>
            {projectId && (
              <Button
                variant="link"
                size="sm"
                className="mt-1 text-xs"
                onClick={() => setIsLocationSelectorOpen(true)}
              >
                Ajouter une localisation
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMediaDetail = () => (
    <div className="space-y-6">
      {/* Media Preview */}
      {item.url && (
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
          {item.mediaType === 'video' ? (
            <div className="relative w-full h-full">
              <video 
                src={item.url} 
                className="w-full h-full object-cover"
                controls={isPlaying}
              />
              {!isPlaying && (
                <button 
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                  onClick={() => setIsPlaying(true)}
                >
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="h-7 w-7 text-foreground ml-1" />
                  </div>
                </button>
              )}
            </div>
          ) : item.mediaType === 'audio' ? (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-green-500/20 to-emerald-500/10">
              <div className="text-center">
                <Mic className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Enregistrement audio</p>
              </div>
            </div>
          ) : (
            <img src={item.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* Location Block */}
      {renderLocationBlock()}

      {/* Metadata */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Métadonnées</h3>
        <div className="grid gap-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium truncate">
                {format(item.createdAt, 'PPP à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          {item.condition && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-1">État</p>
                <Badge className={cn("text-xs border", getConditionColor(item.condition))}>
                  {item.condition}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linked Tasks Block */}
      {projectId && (
        <LinkedTasksBlock
          itemId={item.id}
          itemType={item.type}
          projectId={projectId}
          onTasksChange={onTasksChange}
        />
      )}

      {/* Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Actions</h3>
        <div className="grid gap-2">
          {onAskIA && projectId && (
            <Button 
              className="justify-start gap-3 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80"
              onClick={handleAskIA}
            >
              <Bot className="h-4 w-4" />
              Demander à MyAladin
            </Button>
          )}
          <Button 
            variant="outline" 
            className="justify-start gap-3 h-12 rounded-xl"
            onClick={() => onAddNote?.(item.id)}
          >
            <MessageSquare className="h-4 w-4" />
            Ajouter une note
          </Button>
          <Button 
            variant="outline" 
            className="justify-start gap-3 h-12 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            onClick={() => onMarkAsProblem?.(item.id)}
          >
            <AlertTriangle className="h-4 w-4" />
            Marquer comme problème
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSequenceDetail = () => (
    <div className="space-y-6">
      {/* Video Preview */}
      {item.url && item.mediaType === 'video' && (
        <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
          <video 
            src={item.url} 
            className="w-full h-full object-cover"
            controls
          />
        </div>
      )}

      {item.mediaType === 'audio' && (
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-8">
          <div className="text-center">
            <Mic className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <audio src={item.url} controls className="w-full" />
          </div>
        </div>
      )}

      {/* Location Block */}
      {renderLocationBlock()}

      {/* State Badges */}
      <div className="space-y-3">
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
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: fr })}
        </p>
      </div>

      {/* Transcription */}
      {item.transcription && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transcription</h3>
          <div className="p-4 rounded-xl bg-muted/50 border">
            <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">
              "{item.transcription}"
            </p>
          </div>
        </div>
      )}

      {/* Linked Tasks Block */}
      {projectId && (
        <LinkedTasksBlock
          itemId={item.id}
          itemType={item.type}
          projectId={projectId}
          onTasksChange={onTasksChange}
        />
      )}

      {/* AI Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Actions IA
        </h3>
        <div className="grid gap-2">
          {onAskIA && projectId && (
            <Button 
              className="justify-start gap-3 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80"
              onClick={handleAskIA}
            >
              <Bot className="h-4 w-4" />
              Demander à MyAladin
            </Button>
          )}
          <Button 
            variant="outline" 
            className="justify-start gap-3 h-12 rounded-xl"
            onClick={() => onSummarize?.(item.id)}
          >
            <FileText className="h-4 w-4" />
            Résumer
          </Button>
          <Button 
            variant="outline"
            className="justify-start gap-3 h-12 rounded-xl"
            onClick={() => onExtractTasks?.(item.id)}
          >
            <ListChecks className="h-4 w-4" />
            Extraire les tâches
          </Button>
        </div>
      </div>
    </div>
  );

  const renderNoteDetail = () => (
    <div className="space-y-6">
      {/* Note Content */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Note</h3>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDeleteNote?.(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px] rounded-xl"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="rounded-lg" onClick={handleSaveEdit}>
                Enregistrer
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-lg"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(item.content || '');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/50 border">
            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
          </div>
        )}
      </div>

      {/* Location Block */}
      {renderLocationBlock()}

      {/* Linked Tasks Block */}
      {projectId && (
        <LinkedTasksBlock
          itemId={item.id}
          itemType={item.type}
          projectId={projectId}
          onTasksChange={onTasksChange}
        />
      )}

      {/* Metadata */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informations</h3>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Créée</p>
            <p className="text-sm font-medium">
              {format(item.createdAt, 'PPP à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
      </div>

      {/* MyAladin Action for Notes */}
      {onAskIA && projectId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Actions IA
          </h3>
          <Button 
            className="w-full justify-start gap-3 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80"
            onClick={handleAskIA}
          >
            <Bot className="h-4 w-4" />
            Demander à MyAladin
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            item.type === 'note' && "bg-primary/10",
            item.type === 'sequence' && "bg-blue-500/10",
            item.type === 'media' && "bg-amber-500/10"
          )}>
            {item.type === 'note' && <MessageSquare className="h-4 w-4 text-primary" />}
            {item.type === 'sequence' && <Mic className="h-4 w-4 text-blue-600" />}
            {item.type === 'media' && <FileText className="h-4 w-4 text-amber-600" />}
          </div>
          <div>
            <h2 className="font-semibold text-sm">
              {item.type === 'note' && 'Note'}
              {item.type === 'sequence' && 'Séquence'}
              {item.type === 'media' && 'Média'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {item.type === 'media' && renderMediaDetail()}
          {item.type === 'sequence' && renderSequenceDetail()}
          {item.type === 'note' && renderNoteDetail()}
        </div>
      </ScrollArea>

      {/* Location Selector Dialog */}
      {projectId && (
        <LocationSelector
          projectId={projectId}
          open={isLocationSelectorOpen}
          onOpenChange={setIsLocationSelectorOpen}
          onSelect={handleLocationSelect}
          currentPartId={item.partId}
          currentLocationId={item.locationId}
          currentZoneId={item.zoneId}
        />
      )}
    </div>
  );
};
