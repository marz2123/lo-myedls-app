import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Video,
  ListChecks,
  FileText,
  Home,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  ChevronRight,
  Download,
  Layers,
  ClipboardList,
  Map,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PropertyStructurePanel } from '@/components/visit/PropertyStructurePanel';
import { VisitSequenceRecorder } from '@/components/visit/VisitSequenceRecorder';
import { SequenceResultsPanel } from '@/components/visit/SequenceResultsPanel';
import { FicheBienForm } from '@/components/visit/FicheBienForm';
import { SmartTimeline } from '@/components/visit/SmartTimeline';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { useVisitSequences } from '@/hooks/useVisitSequences';
import { BusinessModelExport } from '@/components/visit/BusinessModelExport';
import { ConditionBadge, ConditionDot } from '@/components/visit/ConditionBadge';
import { InteractivePropertyMap } from '@/components/visit/InteractivePropertyMap';
import type { ZoneType } from '@/types/businessModel';
import {
  PART_TYPE_LABELS,
  CONDITION_STATE_LABELS,
  type PropertyLocation,
  type ConditionState,
} from '@/types/businessModel';
import { cn } from '@/lib/utils';

export const VisitWorkflow = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bien');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [completedSequenceId, setCompletedSequenceId] = useState<string | null>(null);

  const { parts, locations, getLocationsForPart } = usePropertyStructure(projectId);
  const { sequences, tasks, problems } = useVisitSequences(projectId);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (selectedLocationId) {
      const loc = locations.find(l => l.id === selectedLocationId);
      setSelectedLocation(loc || null);
    }
  }, [selectedLocationId, locations]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Erreur lors du chargement du projet');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (locationId: string, partId: string) => {
    setSelectedLocationId(locationId);
    setSelectedPartId(partId);
    setActiveTab('enregistrer');
  };

  const handleSequenceComplete = (sequenceId: string) => {
    setCompletedSequenceId(sequenceId);
    setActiveTab('timeline');
  };

  const handleBackToStructure = () => {
    setSelectedLocationId(null);
    setSelectedPartId(null);
    setCompletedSequenceId(null);
    setActiveTab('structure');
  };

  // Handle navigation from interactive map
  const handleNavigateToReportage = (locationId: string, zoneType?: ZoneType) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      setSelectedLocationId(locationId);
      setSelectedPartId(location.part_id);
      setActiveTab('enregistrer');
    }
  };

  const handleNavigateToTimeline = (filterId?: string, filterType?: 'location' | 'zone') => {
    setActiveTab('timeline');
    // Timeline filtering can be added here if needed
  };

  // Get stats for display
  const totalSequences = sequences.length;
  const totalProblems = problems.length;
  const totalTasks = tasks.length;
  const completedLocations = new Set(sequences.filter(s => s.status === 'completed').map(s => s.location_id)).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="absolute -inset-2 bg-primary/5 rounded-3xl blur-xl -z-10" />
          </div>
          <p className="text-muted-foreground">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen pb-6 overflow-y-auto pb-safe">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass-strong border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-xl hover:bg-muted flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">{project.address}</h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>{project.property_type}</span>
                {project.city && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate">{project.city}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Stats pills - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Video className="w-3.5 h-3.5" />
                {totalSequences}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalProblems}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {totalTasks}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Premium Tab Navigation - 6 tabs */}
          <div className="glass rounded-xl sm:rounded-2xl p-1 overflow-x-auto">
            <TabsList className="flex w-full min-w-max bg-transparent gap-1">
              <TabsTrigger 
                value="bien" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
              >
                <Home className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Bien</span>
              </TabsTrigger>
              <TabsTrigger 
                value="structure" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
              >
                <Layers className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Structure</span>
              </TabsTrigger>
              <TabsTrigger 
                value="carte" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
              >
                <Map className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Carte</span>
              </TabsTrigger>
              <TabsTrigger 
                value="enregistrer" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
                disabled={!selectedLocationId}
              >
                <Video className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Enregistrer</span>
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
              >
                <ClipboardList className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger 
                value="synthese" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[50px]"
              >
                <FileText className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Synthèse</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile Stats - Shown only on mobile */}
          <div className="flex md:hidden items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
              <Video className="w-3 h-3" />
              {totalSequences}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="w-3 h-3" />
              {totalProblems}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success">
              <CheckCircle2 className="w-3 h-3" />
              {totalTasks}
            </div>
          </div>

          {/* Bien Tab - Fiche Bien */}
          <TabsContent value="bien" className="space-y-4 animate-fade-in">
            <Card className="card-premium border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Fiche du Bien</p>
                  <p className="text-sm text-muted-foreground">
                    Définissez les informations du bien avant la visite
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('structure')}
                  className="hidden sm:flex"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
            
            <FicheBienForm projectId={projectId!} />
          </TabsContent>

          {/* Structure Tab */}
          <TabsContent value="structure" className="space-y-4 animate-fade-in">
            <Card className="card-premium border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Sélectionnez un lieu</p>
                  <p className="text-sm text-muted-foreground">
                    Parties → Lieux pour démarrer l'enregistrement
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
              </CardContent>
            </Card>
            
            <div className="h-[calc(100vh-340px)] min-h-[400px]">
              <PropertyStructurePanel
                projectId={projectId!}
                onLocationSelect={handleLocationSelect}
                selectedLocationId={selectedLocationId || undefined}
              />
            </div>
          </TabsContent>

          {/* Carte Tab - Interactive Property Map */}
          <TabsContent value="carte" className="animate-fade-in h-[calc(100vh-260px)] min-h-[500px]">
            <InteractivePropertyMap
              projectId={projectId!}
              onNavigateToReportage={handleNavigateToReportage}
              onNavigateToTimeline={handleNavigateToTimeline}
            />
          </TabsContent>

          {/* Record Tab */}
          <TabsContent value="enregistrer" className="space-y-4 animate-fade-in">
            {selectedLocation && selectedPartId && (
              <>
                {/* Location Breadcrumb */}
                <Card className="card-premium">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        {parts.find(p => p.id === selectedPartId)?.part_type === 'commune' ? (
                          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-info" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <Home className="w-4 h-4 text-success" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {parts.find(p => p.id === selectedPartId)?.name}
                          </p>
                          <p className="font-semibold truncate">{selectedLocation.name}</p>
                        </div>
                      </div>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground flex-shrink-0"
                        onClick={handleBackToStructure}
                      >
                        Changer
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recorder */}
                <VisitSequenceRecorder
                  projectId={projectId!}
                  partId={selectedPartId}
                  locationId={selectedLocationId!}
                  locationName={selectedLocation.name}
                  onSequenceComplete={handleSequenceComplete}
                />
              </>
            )}

            {!selectedLocation && (
              <Card className="card-premium">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <MapPin className="w-8 sm:w-10 h-8 sm:h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucun lieu sélectionné</h3>
                  <p className="text-muted-foreground mb-4 sm:mb-6 max-w-sm mx-auto text-sm">
                    Sélectionnez d'abord un lieu dans la structure du bien
                  </p>
                  <Button
                    className="apple-action-button-primary max-w-xs mx-auto"
                    onClick={() => setActiveTab('structure')}
                  >
                    <Building2 className="w-5 h-5" />
                    Voir la structure
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="animate-fade-in h-[calc(100vh-220px)] min-h-[500px]">
            <SmartTimeline 
              projectId={projectId!} 
              onEditItem={(type, id) => {
                toast.info(`Édition ${type}: ${id}`);
              }}
              onAddMedia={(locationId, pieceId, zoneId) => {
                setSelectedLocationId(locationId);
                setActiveTab('enregistrer');
              }}
            />
          </TabsContent>

          {/* Summary/Export Tab */}
          <TabsContent value="synthese" className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="card-premium p-4 sm:p-5 hover-lift">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Video className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalSequences}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Séquences</p>
                  </div>
                </div>
              </Card>
              
              <Card className="card-premium p-4 sm:p-5 hover-lift">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <MapPin className="w-5 sm:w-6 h-5 sm:h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{completedLocations}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Lieux visités</p>
                  </div>
                </div>
              </Card>
              
              <Card className="card-premium p-4 sm:p-5 hover-lift">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 sm:w-6 h-5 sm:h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalProblems}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Problèmes</p>
                  </div>
                </div>
              </Card>
              
              <Card className="card-premium p-4 sm:p-5 hover-lift">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <ListChecks className="w-5 sm:w-6 h-5 sm:h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalTasks}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Tâches FT/CT/ST</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Export Section */}
            <BusinessModelExport projectId={projectId!} />

            {/* Tasks by Location */}
            <Card className="card-premium">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Tâches par Partie / Lieu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 sm:w-8 h-7 sm:h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Aucune tâche enregistrée</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Enregistrez des séquences pour extraire des tâches
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                      {parts.map((part) => {
                        const partTasks = tasks.filter(t => t.part_id === part.id);
                        const partLocations = locations.filter(l => l.part_id === part.id);
                        
                        if (partTasks.length === 0) return null;

                        return (
                          <div key={part.id} className="space-y-3">
                            <div className="flex items-center gap-3">
                              {part.part_type === 'commune' ? (
                                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-info" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                  <Home className="w-4 h-4 text-success" />
                                </div>
                              )}
                              <div>
                                <span className="font-semibold">{part.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {PART_TYPE_LABELS[part.part_type]}
                                </span>
                              </div>
                              <Badge variant="secondary" className="ml-auto">
                                {partTasks.length} tâche{partTasks.length > 1 ? 's' : ''}
                              </Badge>
                            </div>

                            {partLocations.map(location => {
                              const locationTasks = partTasks.filter(t => t.location_id === location.id);
                              if (locationTasks.length === 0) return null;

                              return (
                                <div key={location.id} className="ml-6 pl-4 border-l-2 border-border/50 space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="font-medium">{location.name}</span>
                                    {location.overall_condition && (
                                      <ConditionDot condition={location.overall_condition} size="sm" />
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {locationTasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className="p-3 bg-muted/30 rounded-xl space-y-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-sm font-medium">{task.title}</span>
                                          {task.condition && (
                                            <ConditionBadge condition={task.condition} size="sm" />
                                          )}
                                        </div>
                                        
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-1.5">
                                          {task.family_name && (
                                            <Badge variant="outline" className="text-xs bg-primary/5">
                                              FT: {task.family_name}
                                            </Badge>
                                          )}
                                          {task.category_name && (
                                            <Badge variant="outline" className="text-xs bg-info/5">
                                              CT: {task.category_name}
                                            </Badge>
                                          )}
                                          {task.subcategory_name && (
                                            <Badge variant="outline" className="text-xs bg-success/5">
                                              ST: {task.subcategory_name}
                                            </Badge>
                                          )}
                                        </div>

                                        {(task.quantity || task.estimated_cost_min) && (
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            {task.quantity && (
                                              <span>Qté: {task.quantity} {task.unit || ''}</span>
                                            )}
                                            {task.estimated_cost_min && (
                                              <span>
                                                Coût: {task.estimated_cost_min}€
                                                {task.estimated_cost_max && ` - ${task.estimated_cost_max}€`}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
