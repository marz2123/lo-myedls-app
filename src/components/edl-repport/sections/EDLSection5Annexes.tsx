import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, Video, ZoomIn, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Media {
  id: string;
  url: string;
  type: 'photo' | 'video_frame';
  piece: string;
  label?: string;
  caption?: string;
}

interface EDLSection5AnnexesProps {
  media: Media[];
  onImageClick: (url: string) => void;
}

export const EDLSection5Annexes: React.FC<EDLSection5AnnexesProps> = ({
  media,
  onImageClick
}) => {
  // Group media by piece
  const groupedMedia = media.reduce((acc, m) => {
    const piece = m.piece || 'Autres';
    if (!acc[piece]) {
      acc[piece] = [];
    }
    acc[piece].push(m);
    return acc;
  }, {} as Record<string, Media[]>);

  const pieceNames = Object.keys(groupedMedia);
  const photoCount = media.filter(m => m.type === 'photo').length;
  const frameCount = media.filter(m => m.type === 'video_frame').length;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Image className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Annexes</h2>
          <p className="text-sm text-muted-foreground">
            Photos et captures vidéo ({media.length} média{media.length > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="outline" className="flex items-center gap-1">
          <Camera className="w-3 h-3" />
          {photoCount} photo(s)
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Video className="w-3 h-3" />
          {frameCount} capture(s) vidéo
        </Badge>
      </div>

      {/* Media Gallery */}
      {media.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Camera className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune photo ou capture vidéo</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {pieceNames.map((pieceName) => (
            <div key={pieceName} className="space-y-4">
              {/* Piece Header */}
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-base">{pieceName}</h3>
                <Badge variant="secondary" className="text-xs">
                  {groupedMedia[pieceName].length}
                </Badge>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {groupedMedia[pieceName].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onImageClick(m.url)}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:shadow-lg"
                  >
                    {/* Image */}
                    <img 
                      src={m.url} 
                      alt={m.label || m.piece}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs backdrop-blur-sm",
                          m.type === 'video_frame' 
                            ? "bg-purple-500/80 text-white" 
                            : "bg-white/80 text-foreground"
                        )}
                      >
                        {m.type === 'video_frame' ? (
                          <>
                            <Video className="w-3 h-3 mr-1" />
                            Vidéo
                          </>
                        ) : (
                          <>
                            <Camera className="w-3 h-3 mr-1" />
                            Photo
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-xs truncate">
                        {m.caption || `${m.piece}${m.label ? ` – ${m.label}` : ''}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
