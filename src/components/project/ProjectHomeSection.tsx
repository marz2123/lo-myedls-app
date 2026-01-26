import { 
  Clapperboard,
  ChevronRight,
  Play,
  Sparkles,
  Box
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProjectMenuSection } from "./ProjectMenu";

interface ProjectHomeSectionProps {
  project: {
    id: string;
    property_type: string;
    address: string;
    postal_code?: string;
    city?: string;
    created_at: string;
    archived: boolean;
  };
  stats: {
    sequences?: number;
    tasks?: number;
    photos?: number;
    videos?: number;
    documents?: number;
  };
  onNavigate: (section: ProjectMenuSection) => void;
}

export function ProjectHomeSection({ project, stats, onNavigate }: ProjectHomeSectionProps) {
  const totalMedias = (stats.photos || 0) + (stats.videos || 0) + (stats.sequences || 0);

  return (
    <div className="space-y-4 pt-2">
      {/* Primary CTA - Reportage Hub */}
      <button
        onClick={() => onNavigate('reportage-hub')}
        className={cn(
          "w-full group relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-primary via-primary to-primary/90",
          "p-5 text-left",
          "transition-all duration-300 ease-out",
          "hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.01]",
          "active:scale-[0.99]"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <Clapperboard className="w-7 h-7 text-primary-foreground" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-foreground">
                Reportage
              </span>
              <Sparkles className="w-4 h-4 text-primary-foreground/70" />
            </div>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Capturer • Documenter • Analyser
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {totalMedias > 0 && (
              <Badge className="bg-white/25 text-primary-foreground border-0 rounded-full text-xs font-semibold px-2.5">
                {totalMedias} médias
              </Badge>
            )}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
      </button>


      {/* BIM 3D Feature */}
      <button
        onClick={() => onNavigate('bim')}
        className={cn(
          "w-full group relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500",
          "p-4 text-left",
          "transition-all duration-300 ease-out",
          "hover:shadow-xl hover:shadow-orange-500/20 hover:scale-[1.01]",
          "active:scale-[0.99]"
        )}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Box className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">
                Maquette BIM 3D
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-white/25 text-white rounded-full uppercase tracking-wide">
                New
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Jumeau numérique • Surfaces • Export
            </p>
          </div>
          
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </button>

    </div>
  );
}
