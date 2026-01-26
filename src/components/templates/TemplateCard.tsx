import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Building2, 
  Store, 
  FileText, 
  Star,
  Copy,
  MoreHorizontal,
  Sparkles,
  Camera,
  Layers
} from 'lucide-react';
import { EdlTemplate } from '@/hooks/useEdlTemplates';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplateCardProps {
  template: EdlTemplate;
  onSelect?: (template: EdlTemplate) => void;
  onDuplicate?: (template: EdlTemplate) => void;
  onEdit?: (template: EdlTemplate) => void;
  onDelete?: (template: EdlTemplate) => void;
  isRecommended?: boolean;
  compact?: boolean;
}

const getPropertyIcon = (type: string | null) => {
  switch (type) {
    case 'immeuble':
      return <Building2 className="h-5 w-5" />;
    case 'commerce':
    case 'local_pro':
      return <Store className="h-5 w-5" />;
    default:
      return <Home className="h-5 w-5" />;
  }
};

const templateTypeLabels: Record<string, string> = {
  standard: 'Standard',
  entree: 'Entrée',
  sortie: 'Sortie',
  technique: 'Technique',
  audit: 'Audit',
  commercial: 'Commercial',
};

const propertyTypeLabels: Record<string, string> = {
  studio: 'Studio',
  t1: 'T1',
  t2: 'T2',
  t3: 'T3',
  t4: 'T4',
  t5: 'T5+',
  maison: 'Maison',
  immeuble: 'Immeuble',
  commerce: 'Commerce',
  local_pro: 'Local Pro',
};

const companyColors: Record<string, string> = {
  'MyHome': 'bg-primary/10 text-primary border-primary/20',
  'Archi Home': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Bati Home': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'Opti Home': 'bg-green-500/10 text-green-700 border-green-200',
  'Déco Home': 'bg-purple-500/10 text-purple-700 border-purple-200',
};

export function TemplateCard({ 
  template, 
  onSelect, 
  onDuplicate, 
  onEdit, 
  onDelete,
  isRecommended,
  compact 
}: TemplateCardProps) {
  const IconElement = getPropertyIcon(template.property_type);
  const companyClass = companyColors[template.company || 'MyHome'] || companyColors['MyHome'];

  if (compact) {
    return (
      <Card 
        className={cn(
          'cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/50',
          isRecommended && 'ring-2 ring-primary/50'
        )}
        onClick={() => onSelect?.(template)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {IconElement}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
              {isRecommended && (
                <Badge variant="default" className="text-xs bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {template.rooms_config.length} pièces • {template.min_photos_required} photos min
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'group hover:shadow-lg transition-all border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden',
        isRecommended && 'ring-2 ring-primary/50'
      )}
    >
      {/* Header with gradient */}
      <div className={cn(
        'h-24 relative flex items-center justify-center',
        template.owner_type === 'myhome' ? 'bg-gradient-to-br from-primary/20 to-primary/5' :
        template.owner_type === 'company' ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5' :
        'bg-gradient-to-br from-gray-500/20 to-gray-500/5'
      )}>
        <div className="p-4 rounded-full bg-background/80 backdrop-blur-sm">
          {IconElement}
        </div>
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {template.is_featured && (
            <Badge className="bg-yellow-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" />
              Vedette
            </Badge>
          )}
          {isRecommended && (
            <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              Recommandé
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDuplicate?.(template)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              {template.owner_type === 'user' && (
                <>
                  <DropdownMenuItem onClick={() => onEdit?.(template)}>
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(template)}
                    className="text-destructive"
                  >
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title & Company */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{template.name}</h3>
          {template.company && (
            <Badge variant="outline" className={cn('text-xs shrink-0', companyClass)}>
              {template.company}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
          {template.description || 'Aucune description'}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.template_type && (
            <Badge variant="secondary" className="text-xs">
              {templateTypeLabels[template.template_type]}
            </Badge>
          )}
          {template.property_type && (
            <Badge variant="outline" className="text-xs">
              {propertyTypeLabels[template.property_type]}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            <span>{template.rooms_config.length} pièces</span>
          </div>
          <div className="flex items-center gap-1">
            <Camera className="h-4 w-4" />
            <span>{template.min_photos_required} photos</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full"
          onClick={() => onSelect?.(template)}
        >
          Utiliser ce modèle
        </Button>
      </CardContent>
    </Card>
  );
}
