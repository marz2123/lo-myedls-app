import React from 'react';
import { Camera, Play, ZoomIn, Building2, MapPin, LayoutGrid } from 'lucide-react';

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

type Category = 'immeuble' | 'localisation' | 'composition';

const CATEGORIES = [
  { 
    key: 'immeuble' as Category, 
    label: 'Immeuble', 
    icon: Building2,
    keywords: ['façade', 'extérieur', 'entrée', 'hall', 'parking', 'garage', 'cave', 'escalier', 'palier', 'ascenseur', 'immeuble', 'building', 'commun']
  },
  { 
    key: 'localisation' as Category, 
    label: 'Localisation', 
    icon: MapPin,
    keywords: ['vue', 'quartier', 'rue', 'environnement', 'voisinage', 'balcon', 'terrasse', 'jardin']
  },
  { 
    key: 'composition' as Category, 
    label: 'Composition', 
    icon: LayoutGrid,
    keywords: ['salon', 'chambre', 'cuisine', 'salle', 'wc', 'toilette', 'bureau', 'couloir', 'dressing', 'placard', 'séjour', 'pièce']
  }
];

const categorizeMedia = (m: Media): Category => {
  const searchText = `${m.piece} ${m.label || ''} ${m.caption || ''}`.toLowerCase();
  
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(kw => searchText.includes(kw))) {
      return cat.key;
    }
  }
  return 'composition';
};

export const EDLSection5Annexes: React.FC<EDLSection5AnnexesProps> = ({
  media,
  onImageClick
}) => {
  const categorizedMedia = media.reduce((acc, m) => {
    const category = categorizeMedia(m);
    if (!acc[category]) acc[category] = [];
    acc[category].push(m);
    return acc;
  }, {} as Record<Category, Media[]>);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Camera className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucune photo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Annexes</h2>
        <p className="text-sm text-muted-foreground mt-1">{media.length} photo{media.length > 1 ? 's' : ''}</p>
      </div>

      {/* 3 Bandeaux identiques */}
      <div className="grid grid-cols-1 gap-4">
        {CATEGORIES.map(({ key, label, icon: Icon }) => {
          const items = categorizedMedia[key] || [];

          return (
            <div 
              key={key} 
              className="rounded-xl border border-border bg-card h-32 flex flex-col overflow-hidden"
            >
              {/* Header du bandeau */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>

              {/* Contenu */}
              <div className="flex-1 p-2 overflow-hidden">
                {items.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Aucune photo</span>
                  </div>
                ) : (
                  <div className="flex gap-2 h-full overflow-x-auto">
                    {items.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onImageClick(m.url)}
                        className="group relative flex-shrink-0 h-full aspect-square rounded-lg overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <img 
                          src={m.url} 
                          alt={m.label || m.piece}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {m.type === 'video_frame' && (
                          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-foreground/60 flex items-center justify-center">
                            <Play className="w-2 h-2 text-background fill-background" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
