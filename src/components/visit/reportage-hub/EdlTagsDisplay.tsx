import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Layers, Paintbrush, Tag, Edit3, Sparkles,
  Square, RectangleVertical, CircleDot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EdlTags {
  element_type?: string;
  state?: string;
  material?: string;
  source?: 'ai' | 'manual';
}

interface EdlTagsDisplayProps {
  tags: EdlTags | null | undefined;
  variant?: 'compact' | 'full';
  showEditButton?: boolean;
  onEdit?: () => void;
}

// Element type display mapping
const elementTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  mur: { label: 'Mur', icon: <RectangleVertical className="h-3 w-3" /> },
  sol: { label: 'Sol', icon: <Square className="h-3 w-3" /> },
  plafond: { label: 'Plafond', icon: <Square className="h-3 w-3" /> },
  fenetre: { label: 'Fenêtre', icon: <Square className="h-3 w-3" /> },
  porte: { label: 'Porte', icon: <RectangleVertical className="h-3 w-3" /> },
  radiateur: { label: 'Radiateur', icon: <CircleDot className="h-3 w-3" /> },
  cuisine: { label: 'Cuisine équipée', icon: <Layers className="h-3 w-3" /> },
  sdb: { label: 'Salle de bain', icon: <CircleDot className="h-3 w-3" /> },
  equipement: { label: 'Équipement', icon: <CircleDot className="h-3 w-3" /> },
  prise: { label: 'Prise', icon: <CircleDot className="h-3 w-3" /> },
  interrupteur: { label: 'Interrupteur', icon: <CircleDot className="h-3 w-3" /> },
};

// State color mapping
const stateStyles: Record<string, string> = {
  bon: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  moyen: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  mauvais: 'bg-red-500/10 text-red-700 border-red-500/30',
};

// Material display mapping
const materialLabels: Record<string, string> = {
  peinture: 'Peinture',
  parquet: 'Parquet',
  carrelage: 'Carrelage',
  beton: 'Béton',
  pvc: 'PVC',
  faience: 'Faïence',
  moquette: 'Moquette',
  papier_peint: 'Papier peint',
  bois: 'Bois',
  aluminium: 'Aluminium',
  plastique: 'Plastique',
  metal: 'Métal',
};

export const EdlTagsDisplay: React.FC<EdlTagsDisplayProps> = ({
  tags,
  variant = 'compact',
  showEditButton = false,
  onEdit,
}) => {
  if (!tags || (!tags.element_type && !tags.state && !tags.material)) {
    return null;
  }

  const elementInfo = tags.element_type 
    ? elementTypeLabels[tags.element_type.toLowerCase()] || { label: tags.element_type, icon: <Layers className="h-3 w-3" /> }
    : null;
  
  const stateStyle = tags.state 
    ? stateStyles[tags.state.toLowerCase()] || 'bg-muted text-muted-foreground border-border'
    : null;
  
  const materialLabel = tags.material
    ? materialLabels[tags.material.toLowerCase()] || tags.material
    : null;

  // Compact variant for timeline bubbles
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-1 mt-2">
        {elementInfo && stateStyle && (
          <Badge 
            variant="outline" 
            className={cn("text-[10px] px-1.5 py-0.5 gap-1 border", stateStyle)}
          >
            {elementInfo.icon}
            {elementInfo.label} — {tags.state}
          </Badge>
        )}
        {!elementInfo && stateStyle && (
          <Badge 
            variant="outline" 
            className={cn("text-[10px] px-1.5 py-0.5 border", stateStyle)}
          >
            {tags.state}
          </Badge>
        )}
        {tags.source === 'ai' && (
          <Sparkles className="h-3 w-3 text-primary/50" />
        )}
      </div>
    );
  }

  // Full variant for SmartInspectorPanel
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Tag className="h-3.5 w-3.5" />
          Tags EDL
        </h3>
        {showEditButton && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onEdit}
          >
            <Edit3 className="h-3 w-3" />
            Modifier
          </Button>
        )}
      </div>

      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        {/* Element Type */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Élément
            </p>
            {elementInfo ? (
              <Badge variant="outline" className="capitalize gap-1">
                {elementInfo.icon}
                {elementInfo.label}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground italic">Non identifié</p>
            )}
          </div>
          {tags.source === 'ai' && (
            <Badge 
              variant="outline" 
              className="text-xs gap-1 text-primary/70 border-primary/30"
            >
              <Sparkles className="h-3 w-3" />
              IA
            </Badge>
          )}
        </div>

        {/* State */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">État</p>
          {stateStyle ? (
            <Badge variant="outline" className={cn("capitalize border", stateStyle)}>
              {tags.state}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground italic">Non évalué</p>
          )}
        </div>

        {/* Material */}
        <div>
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Paintbrush className="h-3 w-3" />
            Matériau
          </p>
          {materialLabel ? (
            <Badge variant="outline" className="capitalize">
              {materialLabel}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground italic">Non identifié</p>
          )}
        </div>
      </div>
    </div>
  );
};
