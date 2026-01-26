import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Block {
  id: string;
  block_number: number;
  detected_room_type: string;
  confidence_score: number;
  timestamp_start: number;
  timestamp_end: number;
  manual_label: string | null;
  extracted_frames: any[];
  audio_segments: any[];
}

interface VisitTimelineProps {
  sessionId: string;
  onBlockSelect?: (blockId: string) => void;
}

export const VisitTimeline: React.FC<VisitTimelineProps> = ({ 
  sessionId,
  onBlockSelect 
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, [sessionId]);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('detected_blocks')
        .select(`
          *,
          extracted_frames(*),
          audio_segments(*)
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

  const formatDuration = (start: number, end: number) => {
    const duration = Math.round(end - start);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDeleteBlock = async (blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bloc ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('detected_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast.success('Bloc supprimé avec succès');
      fetchBlocks(); // Refresh the list
    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error('Erreur lors de la suppression du bloc');
    }
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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Clock className="w-5 h-5 mr-2 animate-spin" />
          Chargement de la timeline...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Timeline de visite
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {blocks.length} {blocks.length === 1 ? 'zone détectée' : 'zones détectées'}
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <Card
              key={block.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedBlockId === block.id 
                  ? 'ring-2 ring-primary' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => {
                setSelectedBlockId(block.id);
                onBlockSelect?.(block.id);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Bloc {block.block_number}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatDuration(block.timestamp_start, block.timestamp_end)}
                  </span>
                </div>
                <Badge 
                  variant={block.confidence_score > 0.7 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {Math.round((block.confidence_score || 0) * 100)}% confiance
                </Badge>
              </div>

              <div className="mb-3">
                <div className="text-base font-semibold mb-1">
                  {block.manual_label || getRoomTypeLabel(block.detected_room_type)}
                </div>
                {block.manual_label && (
                  <div className="text-xs text-muted-foreground">
                    Détection IA: {getRoomTypeLabel(block.detected_room_type)}
                  </div>
                )}
              </div>

              {block.extracted_frames && block.extracted_frames.length > 0 && (
                <div className="mb-3">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {block.extracted_frames.slice(0, 3).map((frame: any) => (
                      <div 
                        key={frame.id}
                        className="flex-shrink-0 w-24 h-16 rounded overflow-hidden bg-muted"
                      >
                        <img 
                          src={frame.frame_url} 
                          alt={`Frame ${frame.timestamp_seconds}s`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {block.extracted_frames.length > 3 && (
                      <div className="flex-shrink-0 w-24 h-16 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{block.extracted_frames.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {block.audio_segments && block.audio_segments.length > 0 && (
                <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  "{block.audio_segments[0].transcription.slice(0, 100)}
                  {block.audio_segments[0].transcription.length > 100 ? '...' : ''}"
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlockSelect?.(block.id);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Détails
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    // This will be handled by parent component
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Corriger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => handleDeleteBlock(block.id, e)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Supprimer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
