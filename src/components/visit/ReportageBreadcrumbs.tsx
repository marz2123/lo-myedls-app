import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportageBreadcrumbsProps {
  partie?: { id: string; name: string; type: 'commune' | 'privative' };
  lieu?: { id: string; name: string };
  endroit?: { id: string; name: string; type: string };
  zone?: { id: string; label: string };
  onNavigate: (level: 'partie' | 'lieu' | 'endroit' | 'zone', id?: string) => void;
  className?: string;
}

/**
 * Composant de breadcrumbs pour la navigation dans le reportage
 * Affiche le chemin de navigation actuel et permet de revenir en arrière
 */
export const ReportageBreadcrumbs: React.FC<ReportageBreadcrumbsProps> = ({
  partie,
  lieu,
  endroit,
  zone,
  onNavigate,
  className
}) => {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-2 bg-muted/50 rounded-xl overflow-x-auto",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate('partie')}
        className="h-auto p-1 text-xs font-medium hover:text-foreground"
      >
        {partie ? (
          <span className="flex items-center gap-1">
            <span className={cn(
              "w-2 h-2 rounded-full",
              partie.type === 'commune' ? "bg-blue-500" : "bg-emerald-500"
            )} />
            {partie.name}
          </span>
        ) : (
          'Sélectionner partie'
        )}
      </Button>
      
      {partie && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('lieu', partie.id)}
            className="h-auto p-1 text-xs font-medium hover:text-foreground"
          >
            {lieu ? lieu.name : 'Sélectionner lieu'}
          </Button>
        </>
      )}
      
      {lieu && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('endroit', lieu.id)}
            className="h-auto p-1 text-xs font-medium hover:text-foreground"
          >
            {endroit ? endroit.name : 'Sélectionner endroit'}
          </Button>
        </>
      )}
      
      {endroit && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold text-foreground">
            {zone ? zone.label : 'Sélectionner zone'}
          </span>
        </>
      )}
    </div>
  );
};
