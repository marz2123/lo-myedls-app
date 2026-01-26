import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight, Check, AlertTriangle, XCircle, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Piece {
  piece: string;
  etatGeneral: string;
  pointsForts: string;
  pointsFaibles: string;
}

interface Media {
  id: string;
  url: string;
  type: 'photo' | 'video_frame';
  piece: string;
  label?: string;
  caption?: string;
}

interface EDLSection3RoomZoneProps {
  pieces: Piece[];
  media: Media[];
  onScrollToTasks: () => void;
  onImageClick: (url: string) => void;
}

const getStateColor = (etat: string) => {
  const lower = etat.toLowerCase();
  if (lower.includes('bon') || lower.includes('neuf') || lower.includes('excellent')) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: Check,
      label: 'Bon état'
    };
  }
  if (lower.includes('moyen') || lower.includes('passable') || lower.includes('évaluer')) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      label: 'Moyen'
    };
  }
  if (lower.includes('mauvais') || lower.includes('refaire') || lower.includes('dégradé')) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'À refaire'
    };
  }
  return {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: AlertTriangle,
    label: 'À évaluer'
  };
};

export const EDLSection3RoomZone: React.FC<EDLSection3RoomZoneProps> = ({
  pieces,
  media,
  onScrollToTasks,
  onImageClick
}) => {
  const getMediaForPiece = (pieceName: string) => {
    return media.filter(m => 
      m.piece.toLowerCase().includes(pieceName.toLowerCase()) ||
      pieceName.toLowerCase().includes(m.piece.toLowerCase())
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Par pièce / zone</h2>
          <p className="text-sm text-muted-foreground">
            Détail de chaque zone inspectée ({pieces.length} zone{pieces.length > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Pieces Grid */}
      {pieces.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Home className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune zone définie pour ce projet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pieces.map((piece, index) => {
            const state = getStateColor(piece.etatGeneral);
            const StateIcon = state.icon;
            const pieceMedia = getMediaForPiece(piece.piece);

            return (
              <Card 
                key={index}
                className={cn(
                  "p-5 border-l-4 transition-colors",
                  state.border,
                  "hover:shadow-md"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", state.bg)}>
                      <Home className={cn("w-5 h-5", state.text)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{piece.piece}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-xs", state.bg, state.text, "border-0")}>
                          <StateIcon className="w-3 h-3 mr-1" />
                          {state.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* State Description */}
                {piece.etatGeneral && piece.etatGeneral !== 'À évaluer' && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {piece.etatGeneral}
                  </p>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Points forts */}
                  {piece.pointsForts && (
                    <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          Points forts
                        </span>
                      </div>
                      <p className="text-sm">{piece.pointsForts}</p>
                    </div>
                  )}

                  {/* Points faibles */}
                  {piece.pointsFaibles && (
                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Points faibles
                        </span>
                      </div>
                      <p className="text-sm">{piece.pointsFaibles}</p>
                    </div>
                  )}
                </div>

                {/* Photos Thumbnails */}
                {pieceMedia.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {pieceMedia.length} photo(s)
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {pieceMedia.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => onImageClick(m.url)}
                          className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                        >
                          <img 
                            src={m.url} 
                            alt={m.label || m.piece}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      {pieceMedia.length > 4 && (
                        <div className="shrink-0 w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            +{pieceMedia.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onScrollToTasks}
                  className="text-primary"
                >
                  Voir les tâches associées
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
