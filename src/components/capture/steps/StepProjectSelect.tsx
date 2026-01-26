import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Home, 
  Store, 
  Search, 
  MapPin, 
  Calendar,
  ArrowRight,
  X,
  FileCheck,
  FileInput,
  LogIn,
  LogOut,
  Loader2,
  StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaptureData, EDLType } from '../CaptureWizard';

interface Project {
  id: string;
  property_type: string;
  address: string;
  city?: string;
  created_at: string;
}

interface StepProjectSelectProps {
  captureData: CaptureData;
  updateCaptureData: (updates: Partial<CaptureData>) => void;
  onNext: () => void;
  onClose: () => void;
}

const EDL_TYPES: Array<{ value: EDLType; label: string; shortLabel: string; icon: any }> = [
  { 
    value: 'avant_travaux', 
    label: 'Avant travaux', 
    shortLabel: 'Avant',
    icon: FileCheck
  },
  { 
    value: 'apres_travaux', 
    label: 'Après travaux', 
    shortLabel: 'Après',
    icon: FileInput
  },
  { 
    value: 'location_entree', 
    label: 'Location – Entrée', 
    shortLabel: 'Entrée',
    icon: LogIn
  },
  { 
    value: 'location_sortie', 
    label: 'Location – Sortie', 
    shortLabel: 'Sortie',
    icon: LogOut
  },
];

const getPropertyIcon = (type: string) => {
  switch (type) {
    case 'immeuble':
    case 'building':
      return Building2;
    case 'commerce':
    case 'local':
      return Store;
    default:
      return Home;
  }
};

export const StepProjectSelect = ({
  captureData,
  updateCaptureData,
  onNext,
  onClose,
}: StepProjectSelectProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEdlType, setSelectedEdlType] = useState<EDLType | null>(captureData.edlType);
  const [notes, setNotes] = useState(captureData.notes || '');

  useEffect(() => {
    loadProjects();
  }, []);

  // Pre-select project if projectId is provided
  useEffect(() => {
    if (captureData.projectId && projects.length > 0) {
      const project = projects.find(p => p.id === captureData.projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [captureData.projectId, projects]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, property_type, address, city, created_at')
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const query = searchQuery.toLowerCase();
    return (
      project.address.toLowerCase().includes(query) ||
      (project.city?.toLowerCase().includes(query))
    );
  });

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    updateCaptureData({
      projectId: project.id,
      projectName: project.address,
      projectAddress: `${project.address}${project.city ? `, ${project.city}` : ''}`,
    });
  };

  const handleEdlTypeSelect = (type: EDLType) => {
    setSelectedEdlType(type);
    updateCaptureData({ edlType: type });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    updateCaptureData({ notes: value });
  };

  const canProceed = selectedProject && selectedEdlType;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Nouvel EDL</h1>
              <p className="text-muted-foreground mt-1">
                Sélectionne le projet et le type d'état des lieux.
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="shrink-0 -mt-1 -mr-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Project Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Projet *</Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un projet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Projects list */}
            <ScrollArea className="h-[180px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun projet trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProjects.map((project) => {
                    const Icon = getPropertyIcon(project.property_type);
                    const isSelected = selectedProject?.id === project.id;
                    
                    return (
                      <Card
                        key={project.id}
                        className={cn(
                          "p-4 cursor-pointer transition-all active:scale-[0.98]",
                          isSelected 
                            ? "ring-2 ring-primary bg-primary/5" 
                            : "hover:bg-accent active:bg-accent"
                        )}
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{project.address}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {project.city && (
                                <>
                                  <MapPin className="h-3 w-3" />
                                  <span>{project.city}</span>
                                </>
                              )}
                              <Calendar className="h-3 w-3 ml-2" />
                              <span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="shrink-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* EDL Type Selection - Segmented Buttons */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type d'état des lieux *</Label>
            
            <div className="grid grid-cols-2 gap-2">
              {EDL_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedEdlType === type.value;
                
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleEdlTypeSelect(type.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[88px] active:scale-[0.98]",
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                        : "border-border bg-background hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <Icon className={cn(
                      "h-6 w-6",
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium text-center leading-tight",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes rapides
              <span className="text-muted-foreground font-normal text-sm">(optionnel)</span>
            </Label>
            <Textarea
              placeholder="Ex: RDV avec le propriétaire, accès par le garage..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom action - Fixed */}
      <div className="shrink-0 p-6 border-t bg-background safe-area-bottom">
        <Button 
          className="w-full h-14 text-lg font-semibold"
          disabled={!canProceed}
          onClick={onNext}
        >
          Suivant
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
