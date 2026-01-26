import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Home, Store, Building } from "lucide-react";

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
}

interface BureauProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onProjectChange: (projectId: string) => void;
}

const getPropertyIcon = (type: string) => {
  switch (type) {
    case 'immeuble':
    case 'building':
      return Building2;
    case 'maison':
    case 'house':
      return Home;
    case 'commerce':
    case 'commercial':
      return Store;
    default:
      return Building;
  }
};

export function BureauProjectSelector({
  projects,
  selectedProjectId,
  onProjectChange,
}: BureauProjectSelectorProps) {
  return (
    <Select value={selectedProjectId || ""} onValueChange={onProjectChange}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Sélectionner un projet" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => {
          const Icon = getPropertyIcon(project.property_type);
          return (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[200px]">{project.address}</span>
                {project.city && (
                  <span className="text-muted-foreground text-xs">
                    — {project.city}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
