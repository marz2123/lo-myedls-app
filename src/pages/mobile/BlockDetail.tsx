import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit3, MapPin, Clock, Image as ImageIcon, Mic, Ruler, Maximize2 } from "lucide-react";
import { toast } from "sonner";

export const MobileBlockDetail = () => {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlock();
  }, [blockId]);

  const loadBlock = async () => {
    if (!blockId) return;

    try {
      const [{ data, error }, ftRes, ctRes, scRes] = await Promise.all([
        supabase
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
              timestamp_start,
              timestamp_end
            ),
            extracted_tasks (
              id,
              title,
              description,
              location,
              detection_confidence,
              family_id,
              category_id,
              subcategory_id
            )
          `)
          .eq('id', blockId)
          .single(),
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label'),
      ]);

      if (error) throw error;

      const ftMap = new Map(ftRes.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctRes.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scRes.data?.map(sc => [sc.id, sc]) || []);

      const mappedExtracted = (data?.extracted_tasks || []).map((t: any) => {
        const ft = t.family_id ? ftMap.get(t.family_id) : null;
        const ct = t.category_id ? ctMap.get(t.category_id) : null;
        const sc = t.subcategory_id ? scMap.get(t.subcategory_id) : null;
        return {
          ...t,
          task_families: ft ? { name: ft.ft_label, code: ft.ft_code } : null,
          task_categories: ct ? { name: ct.ct_label, code: ct.ct_code } : null,
          task_subcategories: sc ? { name: sc.sc_label, code: sc.sc_code } : null,
        };
      });

      setBlock({ ...data, extracted_tasks: mappedExtracted } as any);
    } catch (error) {
      console.error('Error loading block:', error);
      toast.error("Erreur lors du chargement");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: number, end: number) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!block) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Bloc {block.block_number}</h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/mobile/correction/${blockId}`)}
          >
            <Edit3 className="w-5 h-5" />
          </Button>
        </div>

        {/* Block Info */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{getRoomTypeLabel(block.detected_room_type)}</span>
          </div>
          {block.confidence_score && (
            <Badge variant={block.confidence_score > 0.7 ? "default" : "secondary"}>
              {Math.round(block.confidence_score * 100)}%
            </Badge>
          )}
          {block.timestamp_start !== null && block.timestamp_end !== null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(block.timestamp_start, block.timestamp_end)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* AR Measurements Section */}
          {block.volume_data && (block.volume_data.area || block.volume_data.volume) && (
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-primary">Mesures AR détectées</h2>
                <Badge variant="outline" className="ml-auto">
                  {block.volume_data.confidence ? `${Math.round(block.volume_data.confidence * 100)}%` : 'Auto'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                {block.volume_data.width && (
                  <div className="bg-background/80 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      Largeur
                    </p>
                    <p className="text-2xl font-bold text-primary">{block.volume_data.width.toFixed(2)} m</p>
                  </div>
                )}
                {block.volume_data.depth && (
                  <div className="bg-background/80 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      Profondeur
                    </p>
                    <p className="text-2xl font-bold text-primary">{block.volume_data.depth.toFixed(2)} m</p>
                  </div>
                )}
                {block.volume_data.height && (
                  <div className="bg-background/80 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      Hauteur
                    </p>
                    <p className="text-2xl font-bold text-primary">{block.volume_data.height.toFixed(2)} m</p>
                  </div>
                )}
                {block.volume_data.area && (
                  <div className="bg-background/80 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Surface</p>
                    <p className="text-2xl font-bold text-primary">{block.volume_data.area.toFixed(2)} m²</p>
                  </div>
                )}
              </div>

              {block.volume_data.volume && (
                <div className="bg-primary/20 rounded-lg p-4 border border-primary/30">
                  <p className="text-sm text-primary/80 mb-1">Volume total de la zone</p>
                  <p className="text-3xl font-bold text-primary">{block.volume_data.volume.toFixed(2)} m³</p>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Ruler className="w-4 h-4 mt-0.5" />
                <p>
                  Mesures calculées automatiquement par ARKit/ARCore lors de la capture.
                  Précision indicative ±5cm.
                </p>
              </div>
            </Card>
          )}

          {/* Photos */}
          {block.extracted_frames && block.extracted_frames.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Photos ({block.extracted_frames.length})</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {block.extracted_frames.map((frame: any) => (
                  <div key={frame.id} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={frame.frame_url}
                      alt={`Frame ${frame.timestamp_seconds}s`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(frame.timestamp_seconds)}s
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Audio Transcription */}
          {block.audio_segments && block.audio_segments.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mic className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Transcription</h2>
              </div>
              <div className="space-y-2">
                {block.audio_segments.map((segment: any) => (
                  <div key={segment.id} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm">{segment.transcription}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.floor(segment.timestamp_start)}s - {Math.floor(segment.timestamp_end)}s
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tasks */}
          {block.extracted_tasks && block.extracted_tasks.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold mb-3">Tâches détectées ({block.extracted_tasks.length})</h2>
              <div className="space-y-3">
                {block.extracted_tasks.map((task: any) => (
                  <div key={task.id} className="border-l-4 border-primary pl-3 py-2">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.task_families && (
                        <Badge variant="outline" className="text-xs">
                          {task.task_families.name}
                        </Badge>
                      )}
                      {task.task_categories && (
                        <Badge variant="outline" className="text-xs">
                          {task.task_categories.name}
                        </Badge>
                      )}
                      {task.task_subcategories && (
                        <Badge variant="outline" className="text-xs">
                          {task.task_subcategories.name}
                        </Badge>
                      )}
                    </div>
                    {task.detection_confidence && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Confiance: {Math.round(task.detection_confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
