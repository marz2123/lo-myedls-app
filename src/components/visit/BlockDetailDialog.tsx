import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, Camera, Mic, FileText, Edit } from 'lucide-react';

interface BlockDetailDialogProps {
  blockId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRequest: (blockId: string) => void;
}

interface BlockDetail {
  id: string;
  block_number: number;
  detected_room_type: string;
  confidence_score: number;
  timestamp_start: number;
  timestamp_end: number;
  manual_label: string | null;
  extracted_frames: any[];
  audio_segments: any[];
  extracted_tasks: any[];
}

export const BlockDetailDialog: React.FC<BlockDetailDialogProps> = ({
  blockId,
  open,
  onOpenChange,
  onEditRequest
}) => {
  const [block, setBlock] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (blockId && open) {
      fetchBlockDetail();
    }
  }, [blockId, open]);

  const fetchBlockDetail = async () => {
    if (!blockId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('detected_blocks')
        .select(`
          *,
          extracted_frames(*),
          audio_segments(*),
          extracted_tasks(*)
        `)
        .eq('id', blockId)
        .single();

      if (error) throw error;
      setBlock(data);
    } catch (error) {
      console.error('Error fetching block detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: number, end: number) => {
    const duration = Math.round(end - start);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRoomTypeLabel = (roomType: string) => {
    const labels: Record<string, string> = {
      'kitchen': '🍳 Cuisine',
      'bathroom': '🚿 Salle de bain',
      'bedroom': '🛏️ Chambre',
      'living_room': '🛋️ Séjour',
      'hallway': '🚪 Couloir',
      'entrance': '🏠 Entrée',
      'staircase': '🪜 Escalier',
      'basement': '⬇️ Sous-sol',
      'attic': '⬆️ Combles',
      'facade': '🏢 Façade',
      'open_space': '🏗️ Plateau brut',
      'unknown': '❓ Zone inconnue'
    };
    return labels[roomType] || `📍 ${roomType}`;
  };

  if (!block) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              Bloc {block.block_number} - {block.manual_label || getRoomTypeLabel(block.detected_room_type)}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEditRequest(block.id);
                onOpenChange(false);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Corriger
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {/* Metadata */}
            <Card className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Durée: {formatDuration(block.timestamp_start, block.timestamp_end)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={block.confidence_score > 0.7 ? 'default' : 'secondary'}>
                    {Math.round((block.confidence_score || 0) * 100)}% confiance
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Photos */}
            {block.extracted_frames && block.extracted_frames.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Photos capturées ({block.extracted_frames.length})</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {block.extracted_frames.map((frame: any) => (
                    <div key={frame.id} className="relative group">
                      <img
                        src={frame.frame_url}
                        alt={`Frame ${frame.timestamp_seconds}s`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button variant="secondary" size="sm">
                          Voir en grand
                        </Button>
                      </div>
                      <Badge className="absolute top-2 right-2 text-xs">
                        {Math.round(frame.timestamp_seconds)}s
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Transcriptions audio */}
            {block.audio_segments && block.audio_segments.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Commentaires audio</h3>
                </div>
                <div className="space-y-3">
                  {block.audio_segments.map((segment: any) => (
                    <div key={segment.id} className="border-l-2 border-primary/30 pl-3">
                      <div className="text-sm text-muted-foreground mb-1">
                        {Math.round(segment.timestamp_start)}s - {Math.round(segment.timestamp_end)}s
                        {segment.confidence_score && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {Math.round(segment.confidence_score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm italic">{segment.transcription}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tâches extraites */}
            {block.extracted_tasks && block.extracted_tasks.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Tâches détectées ({block.extracted_tasks.length})</h3>
                </div>
                <div className="space-y-3">
                  {block.extracted_tasks.map((task: any) => (
                    <Card key={task.id} className="p-3 bg-muted/50">
                      <div className="font-medium mb-1">{task.title}</div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {task.detection_confidence && (
                          <Badge variant="outline">
                            Confiance: {Math.round(task.detection_confidence * 100)}%
                          </Badge>
                        )}
                        {task.location && (
                          <Badge variant="secondary">
                            <MapPin className="w-3 h-3 mr-1" />
                            {task.location}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
