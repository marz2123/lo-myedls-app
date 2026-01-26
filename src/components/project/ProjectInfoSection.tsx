import { 
  Building2, 
  Home, 
  Users, 
  ChevronRight,
  MapPin,
  Calendar,
  Edit,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PartieCommune {
  id: string;
  name: string;
  type: string;
}

interface PartiePrivative {
  id: string;
  name: string;
  type: string;
  numero?: string;
  pieces?: Array<{ id: string; type: string; name: string }>;
}

interface ProjectInfoSectionProps {
  project: {
    id: string;
    property_type: string;
    address: string;
    postal_code?: string;
    city?: string;
    created_at: string;
    archived: boolean;
  };
  partiesCommunes: PartieCommune[];
  partiesPrivatives: PartiePrivative[];
  onEditClick: () => void;
}

const propertyTypeLabels: Record<string, string> = {
  'immeuble': 'Immeuble',
  'maison': 'Maison',
  'appartement': 'Appartement',
  'commercial': 'Local commercial',
  'building': 'Immeuble',
  'house': 'Maison',
  'apartment': 'Appartement',
};

const partieTypeIcons: Record<string, string> = {
  'hall': '🚪',
  'cage_escalier': '🪜',
  'couloir': '🚶',
  'parking': '🅿️',
  'local_poubelle': '🗑️',
  'local_velo': '🚲',
  'jardin': '🌳',
  'terrasse': '☀️',
  'cave': '📦',
  'garage': '🚗',
  'toiture': '🏠',
  'facade': '🏢',
  'appartement': '🏠',
  'studio': '🛏️',
  'box': '📦',
  'autre': '📍',
};

export function ProjectInfoSection({ 
  project, 
  partiesCommunes, 
  partiesPrivatives,
  onEditClick 
}: ProjectInfoSectionProps) {
  const hasComposition = partiesCommunes.length > 0 || partiesPrivatives.length > 0;
  
  return (
    <div className="space-y-4 pt-2">
      {/* Project Info Card */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <Badge variant="secondary" className="text-xs mb-1">
                {propertyTypeLabels[project.property_type] || project.property_type}
              </Badge>
              <h3 className="font-semibold text-foreground leading-tight">
                {project.address}
              </h3>
              {(project.postal_code || project.city) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {[project.postal_code, project.city].filter(Boolean).join(' ')}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onEditClick}
            className="shrink-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <Calendar className="w-3 h-3" />
          <span>
            Créé le {format(new Date(project.created_at), 'dd MMM yyyy', { locale: fr })}
          </span>
        </div>
      </div>

      {/* Building Composition */}
      {hasComposition ? (
        <div className="space-y-3">
          {/* Parties Communes */}
          {partiesCommunes.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">Parties Communes</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {partiesCommunes.length}
                  </Badge>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {partiesCommunes.map((partie) => (
                  <div 
                    key={partie.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-lg">
                      {partieTypeIcons[partie.type] || '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{partie.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parties Privatives */}
          {partiesPrivatives.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-sm">Parties Privatives</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {partiesPrivatives.length}
                  </Badge>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {partiesPrivatives.map((partie) => (
                  <div 
                    key={partie.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-lg">
                      {partieTypeIcons[partie.type] || '🏠'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{partie.name}</p>
                      {partie.numero && (
                        <p className="text-xs text-muted-foreground">Lot {partie.numero}</p>
                      )}
                      {partie.pieces && partie.pieces.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {partie.pieces.length} pièce{partie.pieces.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <button
          onClick={onEditClick}
          className={cn(
            "w-full rounded-2xl border-2 border-dashed border-border/50",
            "p-6 text-center",
            "hover:border-primary/50 hover:bg-primary/5 transition-all",
            "group"
          )}
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="font-medium text-foreground">Définir la structure</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez les parties communes et privatives
          </p>
        </button>
      )}

      {/* Edit Button */}
      {hasComposition && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onEditClick}
        >
          <Edit className="w-4 h-4 mr-2" />
          Modifier la structure
        </Button>
      )}
    </div>
  );
}
