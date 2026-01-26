import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, Play, MapPin, Calendar, Clock, FileType, 
  Maximize2, Bot, AlertTriangle, MessageSquare,
  Edit3, Trash2, Link2, Image, Video, Mic, Timer, Film,
  Sparkles, Layers, Tag, PenTool, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TimelineItem2 } from './UnifiedTimeline2';
import { LocationEditor } from './LocationEditor';
import { AnomalyList } from './AnomalyList';
import { EdlTagsDisplay, EdlTags } from './EdlTagsDisplay';
import { MediaMarkupEditor } from './MediaMarkupEditor';
import { ImmersiveMediaViewer } from './ImmersiveMediaViewer';
import { TechnicalItemPanel } from './TechnicalItemPanel';
import { useItemAnomalies } from '@/hooks/useItemAnomalies';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SmartInspectorPanelProps {
  item: TimelineItem2 | null;
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onItemUpdated?: () => void;
}

export const SmartInspectorPanel: React.FC<SmartInspectorPanelProps> = ({
  item,
  isOpen,
  onClose,
  projectId,
  onItemUpdated
}) => {
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [markupEditorOpen, setMarkupEditorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  // Determine item type for anomaly query
  const itemType = item?.type === 'photo' ? 'frame' : 'sequence';
  
  // Fetch anomalies for the current item
  const { anomalies, loading: anomaliesLoading, refetch: refetchAnomalies } = useItemAnomalies(
    projectId,
    item?.id,
    item ? itemType : undefined
  );

  const handleValidateAnomaly = async (anomalyId: string) => {
    try {
      const { error } = await supabase
        .from('detected_anomalies')
        .update({ 
          is_confirmed: true,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', anomalyId);

      if (error) throw error;

      toast.success('Anomalie confirmée');
      refetchAnomalies();
    } catch (err) {
      console.error('Error confirming anomaly:', err);
      toast.error('Erreur lors de la confirmation');
    }
  };

  const getTypeIcon = (type: TimelineItem2['type']) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'sequence': return <Video className="h-4 w-4" />;
      case 'segment': return <Film className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
      case 'technical': return <Cpu className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: TimelineItem2['type']) => {
    switch (type) {
      case 'photo': return 'Photo';
      case 'video': return 'Vidéo';
      case 'audio': return 'Audio';
      case 'sequence': return 'Séquence';
      case 'segment': return 'Segment vidéo';
      case 'note': return 'Note';
      case 'anomaly': return 'Anomalie';
      case 'technical': return 'Élément technique';
    }
  };

  const formatTimeCode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] lg:w-[420px]",
          "bg-background border-l border-border shadow-xl",
          "transition-transform duration-300 ease-out",
          "lg:relative lg:z-auto lg:shadow-none",
          isOpen ? "translate-x-0" : "translate-x-full lg:hidden"
        )}
      >
        {/* Empty State */}
        {!item && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileType className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Aucun élément sélectionné</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cliquez sur un élément dans la timeline pour voir ses détails.
            </p>
          </div>
        )}

        {/* Content */}
        {item && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{getTypeLabel(item.type)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(item.createdAt, 'PPp', { locale: fr })}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Media Preview */}
                {(item.type === 'photo' || item.type === 'video' || item.type === 'segment') && item.url && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Aperçu
                      </h3>
                      {/* Annotate Button - only for photos */}
                      {item.type === 'photo' && projectId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setMarkupEditorOpen(true)}
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          Annoter
                        </Button>
                      )}
                    </div>
                    <div className="relative aspect-video bg-muted rounded-xl overflow-hidden group">
                      {item.type === 'segment' ? (
                        // Segment preview with gradient
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center">
                          <div className="text-center">
                            <Film className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-indigo-700">
                              {item.segmentLabel || `Segment ${item.segmentIndex}`}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={item.thumbnailUrl || item.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {(item.type === 'video' || item.type === 'segment') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                            <Play className="h-6 w-6 text-foreground ml-1" />
                          </div>
                        </div>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setViewerOpen(true)}
                        className="absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white rounded-full"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      {/* Annotated badge */}
                      {item.raw?.analysis_result?.annotated_url && (
                        <Badge className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs gap-1">
                          <PenTool className="h-3 w-3" />
                          Annoté
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Segment Timing Info */}
                {item.type === 'segment' && item.startTime !== undefined && item.endTime !== undefined && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5" />
                      Timing dans la vidéo
                    </h3>
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Début</p>
                          <p className="text-lg font-mono font-semibold text-indigo-600">
                            {formatTimeCode(item.startTime)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Fin</p>
                          <p className="text-lg font-mono font-semibold text-indigo-600">
                            {formatTimeCode(item.endTime)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Durée</p>
                          <p className="text-lg font-mono font-semibold text-indigo-600">
                            {Math.round(item.endTime - item.startTime)}s
                          </p>
                        </div>
                      </div>
                      {item.segmentIndex && (
                        <div className="mt-3 pt-3 border-t border-indigo-500/20 text-center">
                          <Badge className="bg-indigo-600 text-white">
                            Segment #{item.segmentIndex}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Preview */}
                {item.type === 'audio' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Aperçu Audio
                    </h3>
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/5 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center cursor-pointer hover:bg-green-500/30 transition-colors">
                          <Play className="h-5 w-5 text-green-600 ml-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-green-500/20 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-green-500 rounded-full" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">0:00 / 0:30</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note/Anomaly Content */}
                {(item.type === 'note' || item.type === 'anomaly') && item.content && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Contenu
                    </h3>
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                )}

                {/* Transcription */}
                {item.transcription && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Transcription
                    </h3>
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <p className="text-sm italic text-muted-foreground">"{item.transcription}"</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Metadata */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Métadonnées
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs">Date</span>
                      </div>
                      <p className="text-sm font-medium">
                        {format(item.createdAt, 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">Heure</span>
                      </div>
                      <p className="text-sm font-medium">
                        {format(item.createdAt, 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <FileType className="h-3.5 w-3.5" />
                        <span className="text-xs">Type</span>
                      </div>
                      <p className="text-sm font-medium capitalize">{getTypeLabel(item.type)}</p>
                    </div>
                    {item.condition && (
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-xs">État</span>
                        </div>
                        <Badge 
                          className={cn(
                            "text-xs border",
                            item.condition === 'Neuf' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                            item.condition === 'Bon' && 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                            item.condition === 'À refaire' && 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          )}
                        >
                          {item.condition}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Localisation Block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Localisation
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setLocationEditorOpen(true)}
                    >
                      <Edit3 className="h-3 w-3" />
                      Modifier
                    </Button>
                  </div>
                  
                  {item.location || item.zone ? (
                    <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                      {/* Room/Location */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Pièce / Lieu</p>
                          <p className="text-sm font-medium">{item.location || 'Non défini'}</p>
                        </div>
                        {item.raw?.location_confidence && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs gap-1",
                              item.raw.location_confidence >= 0.8 ? "text-green-600 border-green-300" :
                              item.raw.location_confidence >= 0.5 ? "text-amber-600 border-amber-300" :
                              "text-red-600 border-red-300"
                            )}
                          >
                            <Sparkles className="h-3 w-3" />
                            IA: {Math.round(item.raw.location_confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      
                      {/* Zone */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            Zone
                          </p>
                          {item.zone ? (
                            <Badge variant="outline" className="capitalize">
                              {item.zone}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Non définie</p>
                          )}
                        </div>
                        {item.raw?.zone_confidence && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs gap-1",
                              item.raw.zone_confidence >= 0.8 ? "text-green-600 border-green-300" :
                              item.raw.zone_confidence >= 0.5 ? "text-amber-600 border-amber-300" :
                              "text-red-600 border-red-300"
                            )}
                          >
                            <Sparkles className="h-3 w-3" />
                            IA: {Math.round(item.raw.zone_confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-border rounded-xl text-center">
                      <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Localisation non définie</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2 text-xs gap-1"
                        onClick={() => setLocationEditorOpen(true)}
                      >
                        <Edit3 className="h-3 w-3" />
                        Ajouter
                      </Button>
                    </div>
                  )}
                </div>

                {/* Location Editor Dialog */}
                {projectId && item && (
                  <LocationEditor
                    projectId={projectId}
                    itemId={item.id}
                    itemType={item.type === 'photo' ? 'frame' : 'sequence'}
                    currentLocationId={item.raw?.location_id}
                    currentZoneId={item.raw?.zone_id}
                    currentLocationName={item.location}
                    currentZoneName={item.zone}
                    locationConfidence={item.raw?.location_confidence}
                    zoneConfidence={item.raw?.zone_confidence}
                    open={locationEditorOpen}
                    onOpenChange={setLocationEditorOpen}
                    onUpdate={onItemUpdated}
                  />
                )}

                <Separator />

                {/* EDL Tags Section */}
                <EdlTagsDisplay 
                  tags={item.raw?.edl_tags as EdlTags | null} 
                  variant="full"
                  showEditButton={true}
                  onEdit={() => {
                    toast.info('Édition des tags à venir');
                  }}
                />

                <Separator />

                {/* Technical Elements Section - for technical items */}
                {item.type === 'technical' && item.technicalElements && item.technicalElements.length > 0 && (
                  <>
                    <TechnicalItemPanel
                      technicalElements={item.technicalElements}
                      onVerify={(element) => {
                        toast.success(`${element.label} vérifié`);
                        onItemUpdated?.();
                      }}
                      onAnnotate={() => setMarkupEditorOpen(true)}
                    />
                    <Separator />
                  </>
                )}

                {/* IA Summary Placeholder */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                    Résumé IA
                  </h3>
                  <div className="p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 text-center">
                    <Bot className="h-8 w-8 text-primary/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Résumé IA à venir</p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs gap-1.5">
                      <Bot className="h-3.5 w-3.5" />
                      Générer
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Anomalies Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Anomalies détectées
                      {anomalies.length > 0 && (
                        <Badge className="bg-red-500/10 text-red-600 text-xs">
                          {anomalies.length}
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <AnomalyList 
                    anomalies={anomalies}
                    loading={anomaliesLoading}
                    onValidate={handleValidateAnomaly}
                  />
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-12 rounded-xl gap-2 text-sm" disabled>
                      <MessageSquare className="h-4 w-4" />
                      Ajouter note
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl gap-2 text-sm" disabled>
                      <AlertTriangle className="h-4 w-4" />
                      Signaler
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl gap-2 text-sm" disabled>
                      <Link2 className="h-4 w-4" />
                      Lier tâche
                    </Button>
                    <Button variant="outline" className="h-12 rounded-xl gap-2 text-sm" disabled>
                      <Edit3 className="h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 text-sm"
                    disabled
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Markup Editor Modal */}
      {markupEditorOpen && item && item.type === 'photo' && item.url && projectId && (
        <MediaMarkupEditor
          imageUrl={item.url}
          mediaId={item.id}
          mediaType="frame"
          projectId={projectId}
          onClose={() => setMarkupEditorOpen(false)}
          onSaved={(annotatedUrl) => {
            toast.success('Image annotée sauvegardée');
            onItemUpdated?.();
          }}
        />
      )}

      {/* Immersive Media Viewer */}
      {viewerOpen && item && (item.type === 'photo' || item.type === 'video' || item.type === 'segment') && (
        <ImmersiveMediaViewer
          item={item}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
};
