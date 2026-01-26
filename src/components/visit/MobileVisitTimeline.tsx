import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, Image as ImageIcon, Mic, CheckCircle2, Edit3, Ruler, Box, ChevronLeft, ChevronRight } from "lucide-react";
import { Export3DModelDialog } from "./Export3DModelDialog";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { PathologyAnalysisButton } from "./PathologyAnalysisButton";
import { TaskOriginBadge } from "./TaskOriginBadge";

interface Block {
  id: string;
  block_number: number;
  detected_room_type: string | null;
  manual_label: string | null;
  confidence_score: number | null;
  timestamp_start: number | null;
  timestamp_end: number | null;
  volume_data: any;
  extracted_frames: Array<{
    id: string;
    frame_url: string;
    timestamp_seconds: number;
  }>;
  audio_segments: Array<{
    id: string;
    transcription: string;
    timestamp_start: number;
  }>;
}

interface MobileVisitTimelineProps {
  sessionId: string;
  onBlockSelect?: (blockId: string) => void;
}

export const MobileVisitTimeline = ({ sessionId, onBlockSelect }: MobileVisitTimelineProps) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [export3DDialogOpen, setExport3DDialogOpen] = useState(false);
  const [selectedBlockFor3D, setSelectedBlockFor3D] = useState<Block | null>(null);
  const [photoCarouselIndex, setPhotoCarouselIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchBlocks();
  }, [sessionId]);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('detected_blocks')
        .select(`
          *,
          volume_data,
          extracted_frames (
            id,
            frame_url,
            timestamp_seconds
          ),
          audio_segments (
            id,
            transcription,
            timestamp_start
          )
        `)
        .eq('visit_session_id', sessionId)
        .order('block_number', { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error fetching blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: number | null, end: number | null) => {
    if (!start || !end) return "—";
    const duration = Math.floor(end - start);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRoomTypeLabel = (type: string | null): string => {
    if (!type) return "Zone non identifiée";
    const labels: Record<string, string> = {
      'living_room': '🛋️ Séjour',
      'bedroom': '🛏️ Chambre',
      'kitchen': '🍳 Cuisine',
      'bathroom': '🚿 Salle de bain',
      'toilet': '🚽 WC',
      'hallway': '🚪 Couloir',
      'staircase': '🪜 Escalier',
      'facade': '🏢 Façade',
      'balcony': '🌿 Balcon',
      'garage': '🚗 Garage',
      'cellar': '📦 Cave',
      'attic': '🏠 Combles',
      'technical': '⚙️ Technique',
      'unknown': '❓ Zone'
    };
    return labels[type] || `📍 ${type}`;
  };

  const handleBlockClick = (blockId: string) => {
    setSelectedBlockId(blockId);
    onBlockSelect?.(blockId);
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Clock className="w-6 h-6 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="w-full bg-background">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="text-lg font-semibold">Timeline de visite</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {blocks.length} {blocks.length > 1 ? 'zones détectées' : 'zone détectée'}
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="p-3 space-y-3">
          {blocks.map((block) => (
            <Card
              key={block.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedBlockId === block.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleBlockClick(block.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-base font-bold">Bloc {block.block_number}</span>
                    {block.confidence_score && (
                      <Badge variant={block.confidence_score > 0.7 ? "default" : "secondary"}>
                        {Math.round(block.confidence_score * 100)}%
                      </Badge>
                    )}
                    {block.volume_data && (block.volume_data.area || block.volume_data.volume) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Ruler className="w-3 h-3 mr-1" />
                        AR
                      </Badge>
                    )}
                    {/* Task origin badge - simulated as AI for blocks with good confidence */}
                    {block.confidence_score && block.confidence_score > 0.8 && (
                      <TaskOriginBadge origin="ai" size="sm" />
                    )}
                    {/* User badge for manually labeled blocks */}
                    {block.manual_label && (
                      <TaskOriginBadge origin="user" size="sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(block.timestamp_start, block.timestamp_end)}</span>
                  </div>
                </div>
              </div>

              {/* Room Type */}
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {block.manual_label || getRoomTypeLabel(block.detected_room_type)}
                  </span>
                </div>
              </div>

              {/* Photo Carousel with Swipe */}
              {block.extracted_frames.length > 0 && (
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    {/* Current photo display */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      {block.extracted_frames.length > 0 && (
                        <img
                          src={block.extracted_frames[photoCarouselIndex[block.id] || 0]?.frame_url}
                          alt={`Frame ${block.extracted_frames[photoCarouselIndex[block.id] || 0]?.timestamp_seconds}s`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(block.extracted_frames[photoCarouselIndex[block.id] || 0]?.timestamp_seconds)}s
                      </div>
                      {/* Photo counter badge */}
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {(photoCarouselIndex[block.id] || 0) + 1} / {block.extracted_frames.length}
                      </div>
                    </div>

                    {/* Navigation buttons */}
                    {block.extracted_frames.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoCarouselIndex(prev => ({
                              ...prev,
                              [block.id]: Math.max(0, (prev[block.id] || 0) - 1)
                            }));
                          }}
                          disabled={(photoCarouselIndex[block.id] || 0) === 0}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoCarouselIndex(prev => ({
                              ...prev,
                              [block.id]: Math.min(block.extracted_frames.length - 1, (prev[block.id] || 0) + 1)
                            }));
                          }}
                          disabled={(photoCarouselIndex[block.id] || 0) === block.extracted_frames.length - 1}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Pathology Analysis for current frame */}
                  {block.extracted_frames[photoCarouselIndex[block.id] || 0] && (
                    <PathologyAnalysisButton
                      frameId={block.extracted_frames[photoCarouselIndex[block.id] || 0].id}
                      imageUrl={block.extracted_frames[photoCarouselIndex[block.id] || 0].frame_url}
                      existingAnalysis={(block.extracted_frames[photoCarouselIndex[block.id] || 0] as any).detected_pathologies}
                      arMeasurements={block.volume_data as any}
                    />
                  )}
                </div>
              )}

               {/* AR Measurements Preview */}
              {block.volume_data && (block.volume_data.area || block.volume_data.volume) && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Ruler className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">Mesures AR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {block.volume_data.area && (
                      <div>
                        <p className="text-xs text-muted-foreground">Surface</p>
                        <p className="font-bold text-primary">{block.volume_data.area.toFixed(2)} m²</p>
                      </div>
                    )}
                    {block.volume_data.volume && (
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="font-bold text-primary">{block.volume_data.volume.toFixed(2)} m³</p>
                      </div>
                    )}
                    {block.volume_data.width && (
                      <div>
                        <p className="text-xs text-muted-foreground">Largeur</p>
                        <p className="font-medium">{block.volume_data.width.toFixed(2)} m</p>
                      </div>
                    )}
                    {block.volume_data.height && (
                      <div>
                        <p className="text-xs text-muted-foreground">Hauteur</p>
                        <p className="font-medium">{block.volume_data.height.toFixed(2)} m</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audio Preview */}
              {block.audio_segments.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Mic className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {block.audio_segments[0].transcription}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlockClick(block.id);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Détails
                </Button>
                {block.volume_data && (block.volume_data.area || block.volume_data.volume) && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBlockFor3D(block);
                        setExport3DDialogOpen(true);
                      }}
                    >
                      <Box className="w-4 h-4" />
                    </Button>
                    <FloorPlanViewer
                      blockId={block.id}
                      blockNumber={block.block_number}
                      roomType={block.detected_room_type || block.manual_label || undefined}
                    />
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle edit
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {/* Export 3D Model Dialog */}
      {selectedBlockFor3D && (
        <Export3DModelDialog
          blockId={selectedBlockFor3D.id}
          blockLabel={selectedBlockFor3D.manual_label || getRoomTypeLabel(selectedBlockFor3D.detected_room_type)}
          volumeData={selectedBlockFor3D.volume_data}
          open={export3DDialogOpen}
          onOpenChange={setExport3DDialogOpen}
        />
      )}
    </Card>
  );
};
