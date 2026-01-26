# MyEDLS - Architecture et Code pour Optimisation

## Table des matières
1. [Architecture générale](#architecture-générale)
2. [VisitWorkflow.tsx - Composant principal 5 onglets](#visitworkflowtsx)
3. [visitModel.ts - Types métier](#visitmodelts)
4. [analyze-visit-sequence - Edge Function IA](#analyze-visit-sequence)
5. [BusinessModelExport.tsx - Export CSV/PDF](#businessmodelexporttsx)
6. [ProjectTimeline.tsx - Timeline des séquences](#projecttimelinetsx)
7. [Relations entre fichiers](#relations-entre-fichiers)

---

## Architecture générale

### Structure hiérarchique métier
```
Bien → Partie (Commune/Privative) → Lieu → Zone → Problème → Tâche (FT/CT/ST)
```

### Flux de données
```
VisitWorkflow.tsx
    ├── usePropertyStructure (parts, locations)
    ├── useVisitSequences (sequences, problems, tasks)
    ├── FicheBienForm (onglet Bien)
    ├── PropertyStructurePanel (onglet Structure)
    ├── VisitSequenceRecorder (onglet Enregistrer)
    │       └── calls analyze-visit-sequence edge function
    ├── ProjectTimeline (onglet Timeline)
    └── BusinessModelExport (onglet Synthèse)
            └── calls generate-business-model-pdf/csv edge functions
```

### Imports principaux
- **VisitWorkflow** importe: PropertyStructurePanel, VisitSequenceRecorder, FicheBienForm, ProjectTimeline, BusinessModelExport
- **ProjectTimeline** utilise la vue SQL `timeline_sequences` + tables `identified_problems`, `problem_tasks`
- **BusinessModelExport** appelle les edge functions `generate-business-model-pdf` et `generate-business-model-csv`
- **analyze-visit-sequence** utilise Lovable AI (Gemini) pour analyser transcription + photos → problèmes + tâches FT/CT/ST

---

## VisitWorkflow.tsx

```tsx
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PropertyStructurePanel } from '@/components/visit/PropertyStructurePanel';
import { VisitSequenceRecorder } from '@/components/visit/VisitSequenceRecorder';
import { SequenceResultsPanel } from '@/components/visit/SequenceResultsPanel';
import { FicheBienForm } from '@/components/visit/FicheBienForm';
import { ProjectTimeline } from '@/components/visit/ProjectTimeline';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { useVisitSequences } from '@/hooks/useVisitSequences';
import { BusinessModelExport } from '@/components/visit/BusinessModelExport';
import { ConditionBadge, ConditionDot } from '@/components/visit/ConditionBadge';
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
        .from('projects')
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
    <div className="min-h-screen pb-6">
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
          {/* Premium Tab Navigation - 5 tabs */}
          <div className="glass rounded-xl sm:rounded-2xl p-1 overflow-x-auto">
            <TabsList className="flex w-full min-w-max bg-transparent gap-1">
              <TabsTrigger 
                value="bien" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[60px]"
              >
                <Home className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Bien</span>
              </TabsTrigger>
              <TabsTrigger 
                value="structure" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[60px]"
              >
                <Layers className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Structure</span>
              </TabsTrigger>
              <TabsTrigger 
                value="enregistrer" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[60px]"
                disabled={!selectedLocationId}
              >
                <Video className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Enregistrer</span>
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[60px]"
              >
                <ClipboardList className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger 
                value="synthese" 
                className="tab-premium data-[state=active]:shadow-sm flex-1 min-w-[60px]"
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
          <TabsContent value="timeline" className="space-y-4 animate-fade-in">
            <ProjectTimeline projectId={projectId!} />
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
```

---

## visitModel.ts

```typescript
// =====================================================
// MyEDLS Visit Model Types
// Structure: Bien → Partie → Lieu → Zone → Problème → Tâche
// =====================================================

export type TypeBien = 'immeuble' | 'maison' | 'appartement' | 'plateau' | 'commerce' | 'autre';
export type TypePartie = 'commune' | 'privative';
export type TypeZone = 'murs' | 'sol' | 'plafond' | 'menuiseries' | 'electricite' | 'plomberie' | 'equipements' | 'ventilation' | 'chauffage' | 'facade' | 'toiture' | 'autre';
export type EtatGlobal = 'neuf' | 'bon' | 'a_refaire';
export type Urgence = 'immediate' | 'haute' | 'normale' | 'basse';
export type OrigineProbleme = 'ia' | 'user' | 'document';
export type EtatValidation = 'en_attente' | 'valide' | 'rejete' | 'modifie';
export type Difficulte = 'facile' | 'moyenne' | 'difficile' | 'expert';
export type OccupationStatus = 'occupe' | 'vacant' | 'en_travaux';
export type MediaType = 'photo' | 'video' | 'audio' | 'document';

// Labels français
export const TYPE_BIEN_LABELS: Record<TypeBien, string> = {
  immeuble: 'Immeuble',
  maison: 'Maison',
  appartement: 'Appartement',
  plateau: 'Plateau',
  commerce: 'Commerce',
  autre: 'Autre',
};

export const TYPE_PARTIE_LABELS: Record<TypePartie, string> = {
  commune: 'Parties Communes',
  privative: 'Parties Privatives',
};

export const TYPE_ZONE_LABELS: Record<TypeZone, string> = {
  murs: 'Murs',
  sol: 'Sol',
  plafond: 'Plafond',
  menuiseries: 'Menuiseries',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
  equipements: 'Équipements',
  ventilation: 'Ventilation',
  chauffage: 'Chauffage',
  facade: 'Façade',
  toiture: 'Toiture',
  autre: 'Autre',
};

export const ETAT_GLOBAL_LABELS: Record<EtatGlobal, string> = {
  neuf: 'Neuf',
  bon: 'Bon',
  a_refaire: 'À refaire',
};

export const ETAT_GLOBAL_COLORS: Record<EtatGlobal, { bg: string; text: string; border: string }> = {
  neuf: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  bon: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  a_refaire: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
};

export const URGENCE_LABELS: Record<Urgence, string> = {
  immediate: 'Immédiate',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

export const URGENCE_COLORS: Record<Urgence, string> = {
  immediate: 'bg-destructive text-destructive-foreground',
  haute: 'bg-warning text-warning-foreground',
  normale: 'bg-info text-info-foreground',
  basse: 'bg-muted text-muted-foreground',
};

export const DIFFICULTE_LABELS: Record<Difficulte, string> = {
  facile: 'Facile',
  moyenne: 'Moyenne',
  difficile: 'Difficile',
  expert: 'Expert',
};

export const ETAT_VALIDATION_LABELS: Record<EtatValidation, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
  modifie: 'Modifié',
};

// Types de lieux suggérés par type de partie
export const LIEUX_COMMUNS = [
  'Façade rue',
  'Façade arrière',
  'Façade latérale',
  'Toiture',
  'Combles',
  'Cage d\'escalier A',
  'Cage d\'escalier B',
  'Hall d\'entrée',
  'Couloir RDC',
  'Couloir étage',
  'Local technique',
  'Local poubelles',
  'Cave commune',
  'Parking souterrain',
  'Parking extérieur',
  'Jardin commun',
  'Terrasse commune',
];

export const LIEUX_PRIVATIFS = [
  'Entrée',
  'Séjour',
  'Cuisine',
  'Chambre 1',
  'Chambre 2',
  'Chambre 3',
  'Salle de bain',
  'Salle d\'eau',
  'WC',
  'Couloir',
  'Dégagement',
  'Balcon',
  'Terrasse',
  'Loggia',
  'Cave',
  'Parking',
  'Box',
  'Garage',
  'Jardin',
  'Cellier',
  'Buanderie',
];

// Interface pour la fiche bien complète
export interface FicheBien {
  id: string;
  nom: string;
  type_bien: TypeBien;
  adresse: string;
  code_postal?: string;
  ville?: string;
  // Composition
  nb_appartements: number;
  nb_cages: number;
  nb_facades: number;
  nb_parkings: number;
  nb_boxes: number;
  nb_garages: number;
  nb_caves: number;
  nb_jardins: number;
  nb_etages: number;
  nb_locaux_techniques: number;
  surface_totale_m2?: number;
  // Contexte
  date_construction?: string;
  type_chauffage?: string;
  type_ventilation?: string;
  contexte_historique?: string;
  sinistres_precedents?: string;
  travaux_anterieurs?: string;
  contraintes?: string;
  diagnostics_existants?: any[];
  acces_handicapes: boolean;
  // Métadonnées
  created_at: string;
  updated_at: string;
}

// Interface pour une séquence de visite
export interface SequenceVisite {
  id: string;
  bien_id: string;
  partie_id: string;
  lieu_id: string;
  ordre_visite: number;
  // Médias
  video_url?: string;
  audio_url?: string;
  photos: string[];
  // Analyse
  transcription?: string;
  etat_detecte?: EtatGlobal;
  etat_confirme?: EtatGlobal;
  zones_detectees: TypeZone[];
  ai_analysis?: any;
  // Métadonnées
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
  commentaire_global?: string;
  conditions_visite?: any;
  participants?: any[];
  gps_coordinates?: { lat: number; lng: number };
}

// Interface pour une zone
export interface ZoneVisite {
  id: string;
  lieu_id: string;
  type_zone: TypeZone;
  nom_personnalise?: string;
  position_dans_lieu?: string;
  etat: EtatGlobal;
  // Mesures
  surface_m2?: number;
  longueur_m?: number;
  largeur_m?: number;
  hauteur_m?: number;
  mesures_ar?: any;
  // Détections IA
  materiaux_detectes?: string[];
  pathologies_detectees?: string[];
  notes?: string;
}

// Interface pour un problème
export interface Probleme {
  id: string;
  sequence_id: string;
  zone_id?: string;
  titre: string;
  description?: string;
  origine: OrigineProbleme;
  severite: 'low' | 'medium' | 'high' | 'critical';
  urgence: Urgence;
  // Localisation
  position_x?: number;
  position_y?: number;
  dimensions?: any;
  // Photos
  photo_urls: string[];
  video_timestamp_start?: number;
  video_timestamp_end?: number;
  // Coûts
  cout_estime_min?: number;
  cout_estime_max?: number;
  recommandations?: string;
  // Validation
  is_confirmed: boolean;
  is_resolved: boolean;
  date_constatation: string;
}

// Interface pour une tâche
export interface TacheVisite {
  id: string;
  bien_id: string;
  partie_id?: string;
  lieu_id?: string;
  zone_id?: string;
  sequence_id?: string;
  probleme_id?: string;
  // Classification FT/CT/ST
  famille_id?: string;
  famille_code?: string;
  famille_nom?: string;
  categorie_id?: string;
  categorie_code?: string;
  categorie_nom?: string;
  sous_categorie_id?: string;
  sous_categorie_code?: string;
  sous_categorie_nom?: string;
  // Détails tâche
  titre: string;
  description?: string;
  quantite?: number;
  unite?: string;
  etat: EtatGlobal;
  priorite: 'low' | 'medium' | 'high' | 'urgent';
  type_travaux?: string;
  // Coûts
  cout_estime_min?: number;
  cout_estime_max?: number;
  // Exécution
  corps_metier?: string;
  difficulte: Difficulte;
  delai_estime_jours?: number;
  ordre_execution?: number;
  // Validation
  etat_validation: EtatValidation;
  validated_at?: string;
  validated_by?: string;
  notes_validation?: string;
  // Photos
  photo_urls: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

// Interface pour un média
export interface MediaVisite {
  id: string;
  project_id: string;
  sequence_id?: string;
  zone_id?: string;
  problem_id?: string;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string;
  filename?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  timestamp_in_sequence?: number;
  ai_analysis?: any;
  annotations?: any[];
  is_key_frame: boolean;
  caption?: string;
  metadata?: any;
  created_at: string;
}

// Interface pour l'élément de timeline
export interface TimelineItem {
  sequence: SequenceVisite;
  partie_nom: string;
  partie_type: TypePartie;
  lieu_nom: string;
  lieu_type?: string;
  zones: ZoneVisite[];
  problemes: Probleme[];
  taches: TacheVisite[];
  medias: MediaVisite[];
  nb_problemes: number;
  nb_taches: number;
}

// Exemple de mapping pour le cas concret mentionné
export const EXEMPLE_MAPPING_TACHES = {
  fissures_mur: {
    famille: 'Cloisons',
    categorie: 'Réparations',
    sous_categorie: 'Fissures mur plein',
    description_type: 'Réparation fissures + ponçage + impression',
  },
  sol_irregulier: {
    famille: 'Sols',
    categorie: 'Préparation sols',
    sous_categorie: 'Ragréage auto-lissant',
    description_type: 'Ragréage auto-lissant complet',
  },
};
```

---

## analyze-visit-sequence

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zone types matching the database enum
const ZONE_TYPES = ['murs', 'sol', 'plafond', 'menuiseries', 'electricite', 'plomberie', 'equipements', 'ventilation', 'chauffage', 'facade', 'toiture', 'autre'];

// Condition states
const CONDITION_STATES = ['neuf', 'bon', 'a_refaire'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      sequenceId,
      projectId,
      partId,
      locationId,
      transcription,
      photoUrls,
      videoUrl
    } = await req.json();

    if (!sequenceId || !projectId) {
      throw new Error('sequenceId and projectId are required');
    }

    console.log(`Analyzing sequence ${sequenceId} for project ${projectId}`);

    // Update sequence status
    await supabase
      .from('visit_sequences')
      .update({ status: 'processing' })
      .eq('id', sequenceId);

    // Get project context
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Get location context if provided
    let locationContext = '';
    if (locationId) {
      const { data: location } = await supabase
        .from('property_locations')
        .select('*, property_parts(*)')
        .eq('id', locationId)
        .single();
      
      if (location) {
        locationContext = `
Lieu: ${location.name}
Type de lieu: ${location.location_type || 'Non spécifié'}
Étage: ${location.floor_level || 'Non spécifié'}
Partie: ${location.property_parts?.name || 'Non spécifié'} (${location.property_parts?.part_type || ''})
`;
      }
    }

    // Get DSC taxonomy for classification
    const { data: families } = await supabase
      .from('task_families')
      .select('id, code, name');

    const { data: categories } = await supabase
      .from('task_categories')
      .select('id, code, name, family_id');

    const { data: subcategories } = await supabase
      .from('task_subcategories')
      .select('id, code, name, category_id');

    // Build taxonomy context
    const taxonomyContext = families?.map(f => {
      const cats = categories?.filter(c => c.family_id === f.id) || [];
      return `${f.code} - ${f.name}: ${cats.map(c => `${c.code} ${c.name}`).join(', ')}`;
    }).join('\n') || '';

    // Build the analysis prompt
const analysisPrompt = `Tu es un expert en diagnostic immobilier pour MyEDLS. Analyse cette séquence de visite selon la structure métier:
Bien → Partie → Lieu → Zone → Problème → Tâche (FT/CT/ST)

CONTEXTE DU BIEN:
Type: ${project?.property_type || 'Non spécifié'}
Adresse: ${project?.address || 'Non spécifié'}
${locationContext}

TRANSCRIPTION AUDIO DE LA VISITE:
"${transcription || 'Aucune transcription disponible'}"

PHOTOS ASSOCIÉES: ${photoUrls?.length || 0} photo(s)

EXEMPLE CONCRET À SUIVRE:
Pour une transcription "On est dans le séjour de l'appart 201. Mur côté fenêtre fissuré sur 2 mètres. Sol irrégulier, il faudra tout reprendre."
Tu dois détecter:
- Zones: murs (côté fenêtre), sol
- Problèmes: Fissures mur côté fenêtre, Sol irrégulier
- Mapping FT/CT/ST depuis le catalogue:
  * Cloisons > Réparations > Fissures mur plein
  * Sols > Préparation sols > Ragréage auto-lissant

TAXONOMIE DSC DISPONIBLE (FT/CT/ST):
${taxonomyContext.slice(0, 3000)}

INSTRUCTIONS DÉTAILLÉES:
1. Détecte les ZONES observées parmi: murs, sol, plafond, menuiseries, electricite, plomberie, equipements, ventilation, chauffage, facade, toiture, autre
2. Pour chaque zone, évalue son ÉTAT: "neuf" (parfait), "bon" (correct), "a_refaire" (travaux nécessaires)
3. Identifie chaque PROBLÈME avec:
   - Titre précis (ex: "Fissure mur côté fenêtre")
   - Zone concernée
   - Sévérité: low, medium, high, critical
   - Urgence: immediate, haute, normale, basse
   - Dimensions estimées si mentionnées
4. Pour chaque problème, génère une TÂCHE avec classification FT/CT/ST:
   - Famille (FT), Catégorie (CT), Sous-catégorie (ST) depuis le catalogue
   - Quantité estimée si mentionnée (ex: "6 m²", "2 m linéaires")
   - Type de travaux: reparation, remplacement, renovation, entretien
   - Priorité: low, medium, high, urgent
   - Difficulté: facile, moyenne, difficile, expert

Réponds UNIQUEMENT avec un JSON valide:
{
  "detected_zones": ["murs", "sol"],
  "condition": "a_refaire",
  "zones_details": [
    {"zone_type": "murs", "position": "côté fenêtre", "condition": "a_refaire"},
    {"zone_type": "sol", "position": "global", "condition": "a_refaire"}
  ],
  "problems": [
    {
      "title": "Fissures mur côté fenêtre",
      "description": "Fissures sur 2 mètres linéaires sur le mur côté fenêtre",
      "severity": "high",
      "urgence": "haute",
      "zone_type": "murs",
      "dimensions": {"longueur_m": 2},
      "task": {
        "title": "Réparation fissures + ponçage + impression",
        "description": "Rebouchage des fissures, ponçage et mise en peinture",
        "family_code": "01",
        "family_name": "Cloisons",
        "category_code": "01.01",
        "category_name": "Réparations",
        "subcategory_code": "01.01.01",
        "subcategory_name": "Fissures mur plein",
        "quantity": 6,
        "unit": "m²",
        "priority": "high",
        "work_type": "reparation",
        "difficulte": "moyenne",
        "corps_metier": "Peintre"
      }
    },
    {
      "title": "Sol irrégulier / différences de niveau",
      "description": "Sol nécessitant une reprise complète par ragréage",
      "severity": "medium",
      "urgence": "normale",
      "zone_type": "sol",
      "dimensions": {"surface_m2": 20},
      "task": {
        "title": "Ragréage auto-lissant complet du séjour",
        "description": "Ragréage auto-lissant sur toute la surface du séjour",
        "family_code": "02",
        "family_name": "Sols",
        "category_code": "02.01",
        "category_name": "Préparation sols",
        "subcategory_code": "02.01.01",
        "subcategory_name": "Ragréage auto-lissant",
        "quantity": 20,
        "unit": "m²",
        "priority": "medium",
        "work_type": "renovation",
        "difficulte": "moyenne",
        "corps_metier": "Solier"
      }
    }
  ],
  "summary": "Séjour appart 201 nécessitant travaux sur mur (fissures 2m) et sol (ragréage complet 20m²)"
}`;

    let analysisResult;

    if (lovableApiKey) {
      console.log('Calling Lovable AI for sequence analysis...');
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert en diagnostic immobilier. Réponds uniquement en JSON valide.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('JSON parse error:', e);
          analysisResult = getDefaultAnalysis();
        }
      } else {
        analysisResult = getDefaultAnalysis();
      }
    } else {
      console.log('No AI key available, using default analysis');
      analysisResult = getDefaultAnalysis();
    }

    // Validate and normalize the analysis result
    const validatedZones = (analysisResult.detected_zones || [])
      .filter((z: string) => ZONE_TYPES.includes(z));
    
    const validatedCondition = CONDITION_STATES.includes(analysisResult.condition) 
      ? analysisResult.condition 
      : 'bon';

    // Update sequence with analysis results
    await supabase
      .from('visit_sequences')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        ai_analysis: analysisResult,
        detected_condition: validatedCondition,
        detected_zones: validatedZones
      })
      .eq('id', sequenceId);

    // Create identified problems and tasks
    const createdProblems = [];
    const createdTasks = [];

    for (const problem of analysisResult.problems || []) {
      // Find matching DSC classification
      let familyId = null;
      let categoryId = null;
      let subcategoryId = null;

      if (problem.task?.family_code) {
        const family = families?.find(f => f.code === problem.task.family_code);
        if (family) {
          familyId = family.id;
          if (problem.task?.category_code) {
            const category = categories?.find(c => c.code === problem.task.category_code && c.family_id === family.id);
            if (category) {
              categoryId = category.id;
              if (problem.task?.subcategory_code) {
                const subcategory = subcategories?.find(s => s.code === problem.task.subcategory_code && s.category_id === category.id);
                if (subcategory) {
                  subcategoryId = subcategory.id;
                }
              }
            }
          }
        }
      }

      // Create the problem
      const { data: createdProblem, error: problemError } = await supabase
        .from('identified_problems')
        .insert({
          project_id: projectId,
          sequence_id: sequenceId,
          location_id: locationId,
          title: problem.title,
          description: problem.description,
          severity: problem.severity || 'medium',
          zone_type: ZONE_TYPES.includes(problem.zone_type) ? problem.zone_type : null,
          photo_urls: photoUrls || [],
          ai_detected: true,
          detection_confidence: 0.8,
          is_confirmed: false
        })
        .select()
        .single();

      if (problemError) {
        console.error('Error creating problem:', problemError);
        continue;
      }

      createdProblems.push(createdProblem);

      // Create the associated task
      if (problem.task && createdProblem) {
        const { data: createdTask, error: taskError } = await supabase
          .from('problem_tasks')
          .insert({
            problem_id: createdProblem.id,
            project_id: projectId,
            part_id: partId,
            location_id: locationId,
            title: problem.task.title,
            description: problem.task.description,
            family_id: familyId,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            priority: problem.task.priority || 'medium',
            work_type: problem.task.work_type,
            condition: validatedCondition,
            photo_urls: photoUrls || [],
            status: 'pending'
          })
          .select()
          .single();

        if (taskError) {
          console.error('Error creating task:', taskError);
        } else {
          createdTasks.push(createdTask);
        }
      }
    }

    console.log(`Sequence ${sequenceId} analyzed: ${createdProblems.length} problems, ${createdTasks.length} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        sequence_id: sequenceId,
        analysis: {
          detected_zones: validatedZones,
          condition: validatedCondition,
          summary: analysisResult.summary || ''
        },
        problems_count: createdProblems.length,
        tasks_count: createdTasks.length,
        problems: createdProblems,
        tasks: createdTasks
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-visit-sequence:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getDefaultAnalysis() {
  return {
    detected_zones: ['murs', 'sol', 'plafond'],
    condition: 'bon',
    problems: [],
    summary: 'Analyse par défaut - aucun problème détecté automatiquement'
  };
}
```

---

## BusinessModelExport.tsx

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BusinessModelExportProps {
  projectId: string;
}

export const BusinessModelExport = ({ projectId }: BusinessModelExportProps) => {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-model-pdf', {
        body: { projectId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      const content = data.content;
      
      // Generate PDF using jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Helper function to add page if needed
      const checkPageBreak = (height: number) => {
        if (yPos + height > 270) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(content.title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${new Date(content.generatedAt).toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Project Info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Informations du Bien', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const projectInfo = [
        `Type: ${content.project.type}`,
        `Adresse: ${content.project.address}`,
        content.project.postalCode && content.project.city ? 
          `${content.project.postalCode} ${content.project.city}` : '',
      ].filter(Boolean);
      
      projectInfo.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Summary Stats
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Résumé de la Visite', margin, yPos);
      yPos += 8;

      const summaryData = [
        ['Parties', content.summary.totalParts.toString()],
        ['Lieux', content.summary.totalLocations.toString()],
        ['Zones', content.summary.totalZones.toString()],
        ['Séquences', content.summary.totalSequences.toString()],
        ['Problèmes', content.summary.totalProblems.toString()],
        ['Tâches', content.summary.totalTasks.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Élément', 'Nombre']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin },
        tableWidth: 80,
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Hierarchical Content: Partie → Lieu → Zone → Problème → Tâche
      for (const part of content.structure || []) {
        checkPageBreak(30);
        
        // Part Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(part.partType === 'commune' ? 59 : 34, part.partType === 'commune' ? 130 : 197, part.partType === 'commune' ? 246 : 94);
        doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${part.type}: ${part.name}`, margin + 3, yPos + 2);
        doc.setTextColor(0, 0, 0);
        yPos += 12;

        for (const location of part.locations || []) {
          checkPageBreak(25);
          
          // Location Header
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`📍 ${location.name}`, margin + 5, yPos);
          yPos += 5;

          if (location.condition || location.surface) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const locInfo = [];
            if (location.condition) locInfo.push(`État: ${location.condition}`);
            if (location.surface) locInfo.push(`Surface: ${location.surface} m²`);
            if (location.floor) locInfo.push(`Étage: ${location.floor}`);
            doc.text(locInfo.join(' • '), margin + 8, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 6;
          }

          // Zones
          if (location.zones && location.zones.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text('Zones:', margin + 8, yPos);
            yPos += 4;
            
            location.zones.forEach((zone: any) => {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              const zoneText = `• ${zone.type}${zone.customName ? ` (${zone.customName})` : ''} - ${zone.condition || 'N/A'}`;
              doc.text(zoneText, margin + 12, yPos);
              yPos += 4;
            });
            yPos += 3;
          }

          // Problems and Tasks
          for (const problem of location.problems || []) {
            checkPageBreak(30);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            doc.text(`⚠ ${problem.title}`, margin + 8, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 5;

            if (problem.description) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              const descLines = doc.splitTextToSize(problem.description, pageWidth - margin * 2 - 20);
              doc.text(descLines, margin + 12, yPos);
              yPos += descLines.length * 4 + 2;
            }

            // Tasks Table
            if (problem.tasks && problem.tasks.length > 0) {
              const taskRows = problem.tasks.map((task: any) => [
                task.title || '',
                task.family || '',
                task.category || '',
                task.subcategory || '',
                task.condition || '',
                task.quantity ? `${task.quantity} ${task.unit || ''}` : '',
                task.estimatedCostMin ? `${task.estimatedCostMin}€${task.estimatedCostMax ? `-${task.estimatedCostMax}€` : ''}` : '',
              ]);

              autoTable(doc, {
                startY: yPos,
                head: [['Tâche', 'FT', 'CT', 'ST', 'État', 'Qté', 'Coût']],
                body: taskRows,
                theme: 'striped',
                headStyles: { fillColor: [34, 197, 94], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                  0: { cellWidth: 40 },
                  1: { cellWidth: 25 },
                  2: { cellWidth: 25 },
                  3: { cellWidth: 25 },
                  4: { cellWidth: 15 },
                  5: { cellWidth: 15 },
                  6: { cellWidth: 20 },
                },
                margin: { left: margin + 10, right: margin },
              });

              yPos = (doc as any).lastAutoTable.finalY + 8;
            }
          }
          yPos += 5;
        }
        yPos += 10;
      }

      // Save PDF
      doc.save(data.filename || 'EDL_Export.pdf');
      toast.success('PDF exporté avec succès');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCsv(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-model-csv', {
        body: { projectId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Export failed');

      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'EDL_Export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`CSV exporté: ${data.stats.tasks} tâches, ${data.stats.problems} problèmes`);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export des Données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exportez l'état des lieux complet avec la structure hiérarchique:
          Bien → Partie → Lieu → Zone → Problème → Tâche (FT/CT/ST)
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* PDF Export */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-destructive/5 hover:border-destructive/30"
            onClick={handleExportPDF}
            disabled={exportingPdf}
          >
            <div className="flex items-center gap-2 w-full">
              {exportingPdf ? (
                <Loader2 className="w-5 h-5 animate-spin text-destructive" />
              ) : (
                <FileText className="w-5 h-5 text-destructive" />
              )}
              <span className="font-semibold">Export PDF</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Rapport complet pour syndic / bailleur / ASL
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">Hiérarchique</Badge>
              <Badge variant="secondary" className="text-xs">Photos</Badge>
              <Badge variant="secondary" className="text-xs">Résumé</Badge>
            </div>
          </Button>

          {/* CSV Export */}
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-success/5 hover:border-success/30"
            onClick={handleExportCSV}
            disabled={exportingCsv}
          >
            <div className="flex items-center gap-2 w-full">
              {exportingCsv ? (
                <Loader2 className="w-5 h-5 animate-spin text-success" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-success" />
              )}
              <span className="font-semibold">Export CSV/Excel</span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              Données tabulaires pour économiste / conducteur travaux
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="secondary" className="text-xs">FT/CT/ST</Badge>
              <Badge variant="secondary" className="text-xs">Quantités</Badge>
              <Badge variant="secondary" className="text-xs">Coûts</Badge>
            </div>
          </Button>
        </div>

        {/* Export Preview */}
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs font-medium mb-2">Colonnes exportées:</p>
          <div className="flex flex-wrap gap-1">
            {['Bien', 'Partie', 'Lieu', 'Zone', 'Problème', 'Tâche', 'FT', 'CT', 'ST', 'État', 'Qté', 'Coût', 'Mesures AR', 'Photos'].map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## ProjectTimeline.tsx

```tsx
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Video,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  Building2,
  Home,
  Sparkles,
  FileText,
  Edit2,
  Mic,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ConditionBadge } from '@/components/visit/ConditionBadge';
import {
  TYPE_ZONE_LABELS,
  TypeZone,
  EtatGlobal,
  TypePartie,
} from '@/types/visitModel';
import { cn } from '@/lib/utils';

interface TimelineSequence {
  sequence_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  etat_detecte: EtatGlobal | null;
  etat_confirme: EtatGlobal | null;
  zones_detectees: TypeZone[];
  transcription: string | null;
  ordre_visite: number | null;
  nb_problemes: number;
  nb_taches: number;
  nb_medias: number;
  lieu_id: string;
  nom_lieu: string;
  type_lieu: string | null;
  partie_id: string;
  nom_partie: string;
  type_partie: TypePartie;
  bien_id: string;
  adresse: string;
}

interface Problem {
  id: string;
  title: string;
  severity: string;
  zone_type: TypeZone | null;
  origine: string;
}

interface Task {
  id: string;
  title: string;
  famille_nom: string | null;
  categorie_nom: string | null;
  sous_categorie_nom: string | null;
  etat_validation: string;
}

interface ProjectTimelineProps {
  projectId: string;
  onSequenceSelect?: (sequenceId: string) => void;
  onEditSequence?: (sequenceId: string) => void;
}

export const ProjectTimeline = ({
  projectId,
  onSequenceSelect,
  onEditSequence,
}: ProjectTimelineProps) => {
  const [sequences, setSequences] = useState<TimelineSequence[]>([]);
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set());
  const [problemsBySequence, setProblemsBySequence] = useState<Record<string, Problem[]>>({});
  const [tasksBySequence, setTasksBySequence] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [projectId]);

  const loadTimeline = async () => {
    try {
      const { data: seqData } = await supabase
        .from('visit_sequences')
        .select(`
          id,
          started_at,
          ended_at,
          duration_seconds,
          status,
          detected_condition,
          user_condition,
          detected_zones,
          transcription,
          ordre_visite,
          property_locations(id, name, location_type),
          property_parts(id, name, part_type)
        `)
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });

      const seqs = (seqData || []).map((s: any) => ({
        sequence_id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        status: s.status,
        etat_detecte: s.detected_condition,
        etat_confirme: s.user_condition,
        zones_detectees: s.detected_zones || [],
        transcription: s.transcription,
        ordre_visite: s.ordre_visite,
        nb_problemes: 0,
        nb_taches: 0,
        nb_medias: 0,
        lieu_id: s.property_locations?.id,
        nom_lieu: s.property_locations?.name || 'Lieu inconnu',
        type_lieu: s.property_locations?.location_type,
        partie_id: s.property_parts?.id,
        nom_partie: s.property_parts?.name || 'Partie inconnue',
        type_partie: s.property_parts?.part_type || 'commune',
        bien_id: projectId,
        adresse: '',
      }));

      setSequences(seqs);
      if (seqs.length > 0) setExpandedSequences(new Set([seqs[0].sequence_id]));

      // Load problems
      const sequenceIds = seqs.map((s: any) => s.sequence_id);
      if (sequenceIds.length > 0) {
        const { data: probData } = await supabase
          .from('identified_problems')
          .select('id, title, severity, zone_type, origine, sequence_id')
          .in('sequence_id', sequenceIds);

        const probMap: Record<string, Problem[]> = {};
        (probData || []).forEach((p: any) => {
          if (!probMap[p.sequence_id]) probMap[p.sequence_id] = [];
          probMap[p.sequence_id].push(p);
        });
        setProblemsBySequence(probMap);

        // Update sequence counts
        setSequences(prev => prev.map(seq => ({
          ...seq,
          nb_problemes: probMap[seq.sequence_id]?.length || 0,
        })));

        // Load tasks
        const problemIds = (probData || []).map((p: any) => p.id);
        if (problemIds.length > 0) {
          const { data: taskData } = await supabase
            .from('problem_tasks')
            .select(`
              id, title, etat_validation, problem_id,
              task_families(name),
              task_categories(name),
              task_subcategories(name)
            `)
            .in('problem_id', problemIds);

          const taskMap: Record<string, Task[]> = {};
          (taskData || []).forEach((t: any) => {
            const prob = (probData || []).find((p: any) => p.id === t.problem_id);
            if (prob) {
              const seqId = prob.sequence_id;
              if (!taskMap[seqId]) taskMap[seqId] = [];
              taskMap[seqId].push({
                ...t,
                famille_nom: t.task_families?.name,
                categorie_nom: t.task_categories?.name,
                sous_categorie_nom: t.task_subcategories?.name,
              });
            }
          });
          setTasksBySequence(taskMap);

          // Update sequence counts
          setSequences(prev => prev.map(seq => ({
            ...seq,
            nb_taches: taskMap[seq.sequence_id]?.length || 0,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSequence = (seqId: string) => {
    setExpandedSequences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seqId)) newSet.delete(seqId);
      else newSet.add(seqId);
      return newSet;
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 text-primary animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (sequences.length === 0) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Video className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucune séquence enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  const sequencesByDate = sequences.reduce((acc, seq) => {
    const date = formatDate(seq.started_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(seq);
    return acc;
  }, {} as Record<string, TimelineSequence[]>);

  return (
    <Card className="card-premium h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Timeline
          <Badge variant="secondary" className="ml-auto">{sequences.length}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4 pt-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {Object.entries(sequencesByDate).map(([date, daySeqs]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{date}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3 pl-2 border-l-2 border-border ml-4">
                  {daySeqs.map((seq, idx) => {
                    const isExpanded = expandedSequences.has(seq.sequence_id);
                    const etat = seq.etat_confirme || seq.etat_detecte;
                    const problems = problemsBySequence[seq.sequence_id] || [];
                    const tasks = tasksBySequence[seq.sequence_id] || [];

                    return (
                      <div key={seq.sequence_id} className="relative pl-6 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className={cn(
                          "absolute left-0 top-4 w-3 h-3 rounded-full -translate-x-[7px] ring-4 ring-background",
                          etat === 'neuf' ? 'bg-success' :
                          etat === 'bon' ? 'bg-info' :
                          etat === 'a_refaire' ? 'bg-destructive' : 'bg-muted-foreground'
                        )} />

                        <div className={cn("card-premium overflow-hidden", isExpanded && "ring-2 ring-primary/20")}>
                          <button onClick={() => toggleSequence(seq.sequence_id)} className="w-full p-4 text-left hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {seq.type_partie === 'commune' ? (
                                    <Building2 className="w-4 h-4 text-info" />
                                  ) : (
                                    <Home className="w-4 h-4 text-success" />
                                  )}
                                  <span className="font-semibold truncate">{seq.nom_lieu}</span>
                                  {etat && <ConditionBadge condition={etat} size="sm" />}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{seq.nom_partie}</span>
                                  <span>•</span>
                                  <span className="font-mono">{formatTime(seq.started_at)}</span>
                                  <span>•</span>
                                  <span className="font-mono">{formatDuration(seq.duration_seconds)}</span>
                                </div>

                                {seq.zones_detectees.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {seq.zones_detectees.slice(0, 4).map(zone => (
                                      <Badge key={zone} variant="outline" className="text-xs py-0">
                                        {TYPE_ZONE_LABELS[zone]}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center gap-1 text-warning">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">{seq.nb_problemes}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-success">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">{seq.nb_taches}</span>
                                  </div>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border animate-slide-down">
                              {seq.transcription && (
                                <div className="p-4 bg-muted/20 border-b border-border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Mic className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-medium text-muted-foreground">Transcription</span>
                                  </div>
                                  <p className="text-sm leading-relaxed">"{seq.transcription}"</p>
                                </div>
                              )}

                              {problems.length > 0 && (
                                <div className="p-4 border-b border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    <span className="text-xs font-medium text-muted-foreground">Problèmes ({problems.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {problems.map(prob => (
                                      <div key={prob.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                          prob.severity === 'critical' ? 'bg-destructive' :
                                          prob.severity === 'high' ? 'bg-warning' : 'bg-muted-foreground'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium">{prob.title}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            {prob.zone_type && (
                                              <Badge variant="outline" className="text-xs py-0">{TYPE_ZONE_LABELS[prob.zone_type]}</Badge>
                                            )}
                                            {prob.origine === 'ia' && (
                                              <Badge className="text-xs py-0 bg-primary">
                                                <Sparkles className="w-3 h-3 mr-1" />IA
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {tasks.length > 0 && (
                                <div className="p-4 border-b border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-accent" />
                                    <span className="text-xs font-medium text-muted-foreground">Tâches FT/CT/ST ({tasks.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {tasks.map(task => (
                                      <div key={task.id} className="p-2 bg-muted/30 rounded-lg">
                                        <p className="text-sm font-medium">{task.title}</p>
                                        {(task.famille_nom || task.categorie_nom) && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {[task.famille_nom, task.categorie_nom, task.sous_categorie_nom].filter(Boolean).join(' → ')}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="p-4 flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => onSequenceSelect?.(seq.sequence_id)}>
                                  <MapPin className="w-4 h-4 mr-2" />Voir détails
                                </Button>
                                <Button size="sm" className="flex-1" onClick={() => onEditSequence?.(seq.sequence_id)}>
                                  <Edit2 className="w-4 h-4 mr-2" />Corriger
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
```

---

## Relations entre fichiers

### Graphique des dépendances

```
┌─────────────────────────────────────────────────────────────────┐
│                        VisitWorkflow.tsx                         │
│                    (Composant principal 5 onglets)               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ useProperty   │      │ useVisit      │      │ visitModel.ts │
│ Structure     │      │ Sequences     │      │ (Types)       │
│ (hook)        │      │ (hook)        │      │               │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────────────────────────────┐
│ property_parts│      │ visit_sequences                       │
│ property_     │      │ identified_problems                   │
│ locations     │      │ problem_tasks                         │
│ (DB tables)   │      │ (DB tables)                           │
└───────────────┘      └───────────────────────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │ analyze-visit-sequence        │
                │ (Edge Function - AI)          │
                │                               │
                │ • Lovable AI (Gemini 2.5)     │
                │ • Transcription → Problems    │
                │ • DSC Classification FT/CT/ST │
                └───────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────┐                    ┌───────────────────────┐
│ ProjectTimeline   │                    │ BusinessModelExport   │
│ (Timeline view)   │                    │ (PDF/CSV export)      │
│                   │                    │                       │
│ Displays:         │                    │ Calls:                │
│ • Sequences       │                    │ • generate-business-  │
│ • Problems        │                    │   model-pdf           │
│ • Tasks FT/CT/ST  │                    │ • generate-business-  │
│ • Transcriptions  │                    │   model-csv           │
└───────────────────┘                    └───────────────────────┘
```

### Tables Supabase principales

| Table | Description |
|-------|-------------|
| `projects` | Informations du bien (adresse, type, etc.) |
| `property_parts` | Parties (Communes/Privatives) |
| `property_locations` | Lieux dans chaque partie |
| `location_zones` | Zones dans chaque lieu |
| `visit_sequences` | Séquences d'enregistrement |
| `identified_problems` | Problèmes détectés par l'IA |
| `problem_tasks` | Tâches avec classification FT/CT/ST |
| `task_families` | Familles DSC (FT) |
| `task_categories` | Catégories DSC (CT) |
| `task_subcategories` | Sous-catégories DSC (ST) |

### Hooks personnalisés

- **usePropertyStructure**: Gère les parties et lieux du bien
- **useVisitSequences**: Gère les séquences, problèmes et tâches

### Edge Functions

| Function | Rôle |
|----------|------|
| `analyze-visit-sequence` | Analyse IA des séquences (transcription + vision → FT/CT/ST) |
| `generate-business-model-pdf` | Génère le contenu JSON pour l'export PDF |
| `generate-business-model-csv` | Génère le CSV avec toutes les tâches |
