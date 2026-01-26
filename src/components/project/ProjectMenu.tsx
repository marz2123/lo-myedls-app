import { 
  FileText, 
  ListChecks, 
  FileOutput,
  Building2,
  Home,
  Camera,
  Video,
  Box
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectMenuSection = 
  | 'home'
  | 'info' 
  | 'reportage-hub'
  | 'sequences-tasks'  // Combiné comme lo-myhome
  | 'report'
  | 'bim';

interface ProjectMenuProps {
  activeSection: ProjectMenuSection;
  onSectionChange: (section: ProjectMenuSection) => void;
  projectName?: string;
  stats?: {
    sequences?: number;
    tasks?: number;
    photos?: number;
    videos?: number;
    documents?: number;
  };
  className?: string;
}

const menuItems: Array<{
  id: ProjectMenuSection;
  label: string;
  icon: typeof FileText;
  color: string;
  showStat?: boolean;
}> = [
  {
    id: 'home',
    label: 'Accueil',
    icon: Home,
    color: 'text-primary',
  },
  {
    id: 'info',
    label: 'Projet',
    icon: Building2,
    color: 'text-blue-600',
  },
  {
    id: 'reportage-hub',
    label: 'Reportage',
    icon: Camera,
    color: 'text-primary',
    showStat: false,
  },
  {
    id: 'sequences-tasks',
    label: 'Séquences & Tâches',
    icon: Video,
    color: 'text-purple-600',
    showStat: true,
  },
  {
    id: 'report',
    label: 'Rapport',
    icon: FileOutput,
    color: 'text-indigo-600',
  },
  {
    id: 'bim',
    label: 'BIM 3D',
    icon: Box,
    color: 'text-orange-600',
  }
];

export function ProjectMenu({ 
  activeSection, 
  onSectionChange, 
  projectName,
  stats = {},
  className 
}: ProjectMenuProps) {
  const getStatForSection = (section: ProjectMenuSection): number | undefined => {
    switch (section) {
      case 'sequences-tasks':
        return (stats.sequences || 0) + (stats.tasks || 0);
      default:
        return undefined;
    }
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {menuItems.map((item) => {
        const isActive = activeSection === item.id;
        const stat = item.showStat !== false ? getStatForSection(item.id) : undefined;
        
        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
              "text-left transition-all duration-200",
              isActive 
                ? "bg-primary/10" 
                : "hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isActive ? "bg-primary/20" : "bg-muted/50"
            )}>
              <item.icon className={cn(
                "h-4 w-4",
                isActive ? item.color : "text-muted-foreground"
              )} />
            </div>
            
            <span className={cn(
              "flex-1 text-sm",
              isActive 
                ? "font-medium text-foreground" 
                : "text-muted-foreground"
            )}>
              {item.label}
            </span>

            {stat !== undefined && stat > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full tabular-nums",
                isActive 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {stat}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// Compact horizontal version for mobile/tablet - Apple Tab Bar Style
export function ProjectMenuBar({ 
  activeSection, 
  onSectionChange,
  stats = {},
  className 
}: Omit<ProjectMenuProps, 'projectName'>) {
  const getStatForSection = (section: ProjectMenuSection): number | undefined => {
    switch (section) {
      case 'sequences-tasks':
        return (stats.sequences || 0) + (stats.tasks || 0);
      default:
        return undefined;
    }
  };

  // For mobile bar, show only key items (combiné Séquences & Tâches)
  const mobileItems = menuItems.filter(item => 
    ['home', 'info', 'reportage-hub', 'sequences-tasks', 'report'].includes(item.id)
  );

  return (
    <div className={cn(
      "w-full bg-card",
      "pb-safe",
      className
    )}>
      <div className="flex justify-around items-center py-3 px-2">
        {mobileItems.map((item) => {
          const isActive = activeSection === item.id;
          const stat = item.showStat !== false ? getStatForSection(item.id) : undefined;
          
          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ProjectMenuBar] click', item.id);
                onSectionChange(item.id);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2 px-4 rounded-xl",
                "transition-all duration-200 min-w-0",
                "relative z-[10000]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-6 w-6",
                  isActive && "stroke-[2.5px]"
                )} />
                {stat !== undefined && stat > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-5 h-5 flex items-center justify-center px-1 text-[11px] font-semibold rounded-full bg-primary text-primary-foreground shadow-sm">
                    {stat > 99 ? '99+' : stat}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[11px]",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
