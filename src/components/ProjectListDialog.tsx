import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, Calendar, MapPin, Plus, Search, ArrowUpDown, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Project {
  id: string;
  property_type: string;
  address: string;
  postal_code?: string;
  city?: string;
  number_of_units?: number;
  created_at: string;
  archived: boolean;
  taskCount?: number;
}

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectSelected: (projectId: string) => void;
  onCreateNew: () => void;
}

export const ProjectListDialog = ({ 
  open, 
  onOpenChange, 
  onProjectSelected,
  onCreateNew 
}: ProjectListDialogProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'tasks' | 'type'>('date');
  const [projectToArchive, setProjectToArchive] = useState<Project | null>(null);
  const [projectToUnarchive, setProjectToUnarchive] = useState<Project | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();

  const isFrench = t('cancel') === 'Annuler';

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Set projects immediately, then fetch task counts in background
      if (data) {
        setProjects(data.map(p => ({ ...p, taskCount: 0 })));
        
        // Fetch task counts in background with error handling
        const fetchTaskCounts = async () => {
          const projectsWithCounts = await Promise.all(
            data.map(async (project) => {
              try {
                const { count, error } = await supabase
                  .from('extracted_tasks')
                  .select('*', { count: 'exact', head: true })
                  .eq('project_id', project.id);
                
                return {
                  ...project,
                  taskCount: error ? 0 : (count || 0)
                };
              } catch {
                return { ...project, taskCount: 0 };
              }
            })
          );
          setProjects(projectsWithCounts);
        };
        
        // Don't block loading on task counts
        fetchTaskCounts();
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench 
          ? "Impossible de charger les projets" 
          : "Unable to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveProject = async () => {
    if (!projectToArchive) return;
    
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('edl_projects')
        .update({ archived: true })
        .eq('id', projectToArchive.id);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectToArchive.id ? { ...p, archived: true } : p
      ));

      toast({
        title: isFrench ? "EDL archivé" : "Report archived",
        description: isFrench 
          ? "Le projet a été archivé avec succès" 
          : "The project has been archived successfully",
      });
    } catch (error) {
      console.error('Error archiving project:', error);
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench 
          ? "Impossible d'archiver le projet" 
          : "Unable to archive the project",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
      setProjectToArchive(null);
    }
  };

  const handleUnarchiveProject = async () => {
    if (!projectToUnarchive) return;
    
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('edl_projects')
        .update({ archived: false })
        .eq('id', projectToUnarchive.id);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectToUnarchive.id ? { ...p, archived: false } : p
      ));

      toast({
        title: isFrench ? "EDL restauré" : "Report restored",
        description: isFrench 
          ? "Le projet a été restauré avec succès" 
          : "The project has been restored successfully",
      });
    } catch (error) {
      console.error('Error unarchiving project:', error);
      toast({
        title: isFrench ? "Erreur" : "Error",
        description: isFrench 
          ? "Impossible de restaurer le projet" 
          : "Unable to restore the project",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
      setProjectToUnarchive(null);
    }
  };

  const handleSelectProject = (projectId: string) => {
    onOpenChange(false);
    setTimeout(() => {
      navigate(`/project/${projectId}`);
    }, 100);
  };

  const handleCreateNew = () => {
    onOpenChange(false);
    setTimeout(() => {
      onCreateNew();
    }, 100);
  };

  const propertyTypeLabels: Record<string, string> = {
    building: isFrench ? 'Immeuble' : 'Building',
    house: isFrench ? 'Maison' : 'House',
    apartment: isFrench ? 'Appartement' : 'Apartment',
    commercial: isFrench ? 'Local commercial' : 'Commercial property',
  };

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);
  
  // Sort projects
  const sortProjects = (projectList: Project[]) => {
    return [...projectList].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'tasks') {
        return (b.taskCount || 0) - (a.taskCount || 0);
      } else if (sortBy === 'type') {
        return a.property_type.localeCompare(b.property_type);
      }
      return 0;
    });
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    const projectList = activeTab === "active" ? activeProjects : archivedProjects;
    
    // Apply search filter
    const filtered = searchQuery.trim()
      ? projectList.filter(project => 
          project.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.postal_code?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : projectList;
    
    // Apply sorting
    return sortProjects(filtered);
  }, [activeTab, activeProjects, archivedProjects, searchQuery, sortBy]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {isFrench ? 'Mes EDLs' : 'My Reports'}
            </DialogTitle>
            <DialogDescription>
              {isFrench 
                ? 'Sélectionnez un projet existant pour continuer ou créez-en un nouveau'
                : 'Select an existing project to continue or create a new one'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                {isFrench ? 'En cours' : 'Active'} ({activeProjects.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                {isFrench ? 'Archivés' : 'Archived'} ({archivedProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {/* Search and Sort Controls */}
                <div className="flex flex-col gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={isFrench ? 'Rechercher par adresse ou ville...' : 'Search by address or city...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">
                          {isFrench ? 'Par date' : 'By date'}
                        </SelectItem>
                        <SelectItem value="tasks">
                          {isFrench ? 'Par nombre de tâches' : 'By task count'}
                        </SelectItem>
                        <SelectItem value="type">
                          {isFrench ? 'Par type' : 'By type'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredAndSortedProjects.length > 0 ? (
                  <div className="grid gap-3">
                    {filteredAndSortedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="w-full p-4 rounded-lg border-2 border-border hover:border-primary transition-all duration-300 bg-card hover:bg-accent/50 hover:shadow-lg group animate-fade-in"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            onClick={() => handleSelectProject(project.id)}
                            className="flex-1 text-left space-y-2"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Building2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                              <span className="font-semibold text-lg">
                                {propertyTypeLabels[project.property_type]}
                              </span>
                              {project.taskCount !== undefined && project.taskCount > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium flex items-center gap-1 group-hover:bg-primary/20 transition-colors">
                                  <span className="font-bold">{project.taskCount}</span>
                                  {isFrench ? 'tâches' : 'tasks'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4 mt-1 flex-shrink-0 group-hover:text-primary transition-colors duration-300" />
                              <div>
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">{project.address}</p>
                                {(project.postal_code || project.city) && (
                                  <p className="text-sm">
                                    {[project.postal_code, project.city].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {project.number_of_units && (
                              <p className="text-sm text-muted-foreground">
                                {project.number_of_units} {isFrench ? 'logements' : 'units'}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {isFrench ? 'Créé le' : 'Created'}{' '}
                                {format(new Date(project.created_at), 'PPP', { 
                                  locale: isFrench ? fr : undefined 
                                })}
                              </span>
                            </div>
                          </button>
                          
                          <div className="flex flex-col items-end gap-2">
                            {activeTab === "active" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToArchive(project);
                                }}
                                className="text-muted-foreground hover:text-orange-600 hover:border-orange-600"
                              >
                                <Archive className="w-4 h-4 mr-1" />
                                {isFrench ? 'Archiver' : 'Archive'}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToUnarchive(project);
                                }}
                                className="text-muted-foreground hover:text-green-600 hover:border-green-600"
                              >
                                <ArchiveRestore className="w-4 h-4 mr-1" />
                                {isFrench ? 'Restaurer' : 'Restore'}
                              </Button>
                            )}
                            <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              {isFrench ? 'Ouvrir →' : 'Open →'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <Building2 className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                    <div>
                      <p className="text-lg font-semibold mb-2">
                        {activeTab === "active" 
                          ? (isFrench ? 'Aucun projet en cours' : 'No active projects')
                          : (isFrench ? 'Aucun projet archivé' : 'No archived projects')
                        }
                      </p>
                      <p className="text-muted-foreground">
                        {activeTab === "active" 
                          ? (isFrench 
                            ? 'Créez votre premier EDL pour commencer'
                            : 'Create your first report to get started')
                          : (isFrench
                            ? 'Les projets archivés apparaîtront ici'
                            : 'Archived projects will appear here')
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                {activeTab === "active" && (
                  <div className="pt-4 border-t">
                    <Button onClick={handleCreateNew} className="w-full text-sm sm:text-base" size="lg">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {isFrench ? 'Créer un nouveau EDL' : 'Create a new report'}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!projectToArchive} onOpenChange={() => setProjectToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFrench ? 'Archiver cet EDL ?' : 'Archive this report?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFrench 
                ? `Voulez-vous archiver le projet "${projectToArchive?.address}" ? Vous pourrez le restaurer depuis l'onglet "Archivés".`
                : `Do you want to archive the project "${projectToArchive?.address}"? You can restore it from the "Archived" tab.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>
              {isFrench ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleArchiveProject}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isArchiving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              {isFrench ? 'Archiver' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={!!projectToUnarchive} onOpenChange={() => setProjectToUnarchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFrench ? 'Restaurer cet EDL ?' : 'Restore this report?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isFrench 
                ? `Voulez-vous restaurer le projet "${projectToUnarchive?.address}" ? Il sera de nouveau disponible dans l'onglet "En cours".`
                : `Do you want to restore the project "${projectToUnarchive?.address}"? It will be available again in the "Active" tab.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>
              {isFrench ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnarchiveProject}
              disabled={isArchiving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isArchiving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArchiveRestore className="w-4 h-4 mr-2" />
              )}
              {isFrench ? 'Restaurer' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
