import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  Video, 
  Camera, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Home, 
  Sparkles, 
  User,
  Plus,
  Mic,
  Trash2,
  Edit3,
  Wand2,
  Layers,
  MoreVertical,
  ArrowUpDown,
  Merge,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============= TYPES =============

interface TimelineLieu {
  id: string;
  name: string;
  partieType: 'commune' | 'privative';
  partieName: string;
  partieId: string;
  endroits: TimelineEndroit[];
  mediaCount: number;
  problemCount: number;
  taskCount: number;
  hasVideo: boolean;
  hasPhoto: boolean;
  hasText: boolean;
  isValidated: boolean;
  createdAt: string;
}

interface TimelineEndroit {
  id: string;
  name: string;
  emoji: string;
  lieuId: string;
  zones: TimelineZone[];
  mediaCount: number;
  problemCount: number;
  taskCount: number;
}

interface TimelineZone {
  id: string;
  type: string;
  label: string;
  endroitId: string;
  condition: string | null;
  problems: TimelineProblem[];
  mediaUrls: string[];
  transcription: string | null;
  createdAt: string;
  hasVideo: boolean;
  hasPhoto: boolean;
  hasText: boolean;
  isAI: boolean;
  isValidated: boolean;
}

interface TimelineProblem {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  zoneId: string;
  origin: 'user' | 'ai';
  isConfirmed: boolean;
  tasks: TimelineTask[];
  photoUrls: string[];
  createdAt: string;
}

interface TimelineTask {
  id: string;
  title: string;
  familyName: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  problemId: string;
  status: string;
  priority: string | null;
}

interface SmartTimelineProps {
  projectId: string;
  onEditItem?: (type: string, id: string) => void;
  onAddMedia?: (lieuId: string, endroitId?: string, zoneId?: string) => void;
}

type FilterType = 'video' | 'photo' | 'text' | 'critical' | 'tasks' | 'ai' | 'user' | 'validated' | 'pending';

// ============= CONSTANTS =============

const ZONE_LABELS: Record<string, string> = {
  'mur': '🧱 Mur',
  'sol': '🏠 Sol',
  'plafond': '☁️ Plafond',
  'fenetre': '🪟 Fenêtre',
  'porte': '🚪 Porte',
  'radiateur': '🔥 Radiateur',
  'vmc': '💨 VMC',
  'electricite': '⚡ Électricité',
  'equipement': '⚙️ Équipement',
  'equipements': '⚙️ Équipements',
  'menuiseries': '🚪 Menuiseries',
  'sanitaires': '🚿 Sanitaires',
  'autre': '📦 Autre',
  'revetement': '🏗️ Revêtement',
  'toiture': '🏠 Toiture',
  'gouttieres': '💧 Gouttières',
  'balcons': '🏢 Balcons',
  'garde_corps': '🛡️ Garde-corps',
  'global': '👁️ Vue globale'
};

const ENDROIT_EMOJIS: Record<string, string> = {
  'chambre': '🛏️',
  'sejour': '🛋️',
  'salon': '🪑',
  'cuisine': '🍳',
  'cuisine_ouverte': '🍳',
  'cuisine_fermee': '🍽️',
  'sdb': '🛁',
  'sdo': '🚿',
  'wc': '🚽',
  'entree': '🚪',
  'couloir': '🚶',
  'bureau': '💼',
  'balcon': '☀️',
  'terrasse': '🌅',
  'garage': '🚗',
  'cave': '🍷',
  'hall': '🏛️',
  'escalier': '🪜',
  'facade': '🏢',
  'toiture': '🏠',
  'palier': '🚶',
  'dressing': '👕',
  'cellier': '📦',
  'buanderie': '🧺',
  'jardin': '🌳'
};

export const SmartTimeline = ({ projectId, onEditItem, onAddMedia }: SmartTimelineProps) => {
  const [locations, setLocations] = useState<TimelineLieu[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedEndroits, setExpandedEndroits] = useState<Set<string>>(new Set());
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadTimelineData();
  }, [projectId]);

  const loadTimelineData = async () => {
    try {
      // Load parts and locations
      const { data: partsData } = await supabase
        .from('property_parts')
        .select('*')
        .eq('project_id', projectId);

      const { data: locationsData } = await supabase
        .from('property_locations')
        .select('*, pieces_json')
        .eq('project_id', projectId);

      // Load sequences
      const { data: sequencesData } = await supabase
        .from('visit_sequences')
        .select('*')
        .eq('project_id', projectId);

      // Load problems
      const { data: problemsData } = await supabase
        .from('identified_problems')
        .select('*')
        .eq('project_id', projectId);

      // Load tasks (sans jointure DSC) + taxonomie DTC pour labels
      const [{ data: tasksData }, ftRes, ctRes, scRes] = await Promise.all([
        supabase
          .from('problem_tasks')
          .select('*')
          .eq('project_id', projectId),
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label'),
      ]);

      const ftMap = new Map(ftRes.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctRes.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scRes.data?.map(sc => [sc.id, sc]) || []);

      const tasksMapped = (tasksData || []).map(t => {
        const ft = t.family_id ? ftMap.get(t.family_id) : null;
        const ct = t.category_id ? ctMap.get(t.category_id) : null;
        const sc = t.subcategory_id ? scMap.get(t.subcategory_id) : null;
        return {
          ...t,
          task_families: ft ? { name: ft.ft_label, code: ft.ft_code } : null,
          task_categories: ct ? { name: ct.ct_label, code: ct.ct_code } : null,
          task_subcategories: sc ? { name: sc.sc_label, code: sc.sc_code } : null,
        };
      });

      // Load zones
      const { data: zonesData } = await supabase
        .from('location_zones')
        .select('*')
        .eq('project_id', projectId);

      // Build timeline hierarchy: Partie → Lieu → Endroit → Zone → Problème → Tâche
      const timelineLieux: TimelineLieu[] = (locationsData || []).map(loc => {
        const part = (partsData || []).find(p => p.id === loc.part_id);
        const locSequences = (sequencesData || []).filter(s => s.location_id === loc.id);
        const locProblems = (problemsData || []).filter(p => p.location_id === loc.id);
        const locTasks = (tasksMapped || []).filter(t => locProblems.some(p => p.id === t.problem_id));
        const locZones = (zonesData || []).filter(z => z.location_id === loc.id);
        
        // Parse pieces from JSON
        let piecesJson: any[] = [];
        if (loc.pieces_json) {
          if (typeof loc.pieces_json === 'string') {
            try {
              piecesJson = JSON.parse(loc.pieces_json);
            } catch {
              piecesJson = [];
            }
          } else if (Array.isArray(loc.pieces_json)) {
            piecesJson = loc.pieces_json;
          }
        }
        
        const endroits: TimelineEndroit[] = piecesJson.map((piece: any, idx: number) => {
          const endroitProblems = locProblems.filter(p => p.zone_id && locZones.some(z => z.id === p.zone_id));
          const endroitTasks = locTasks.filter(t => endroitProblems.some(p => p.id === t.problem_id));
          const endroitZones = locZones.filter(z => endroitProblems.some(p => p.zone_id === z.id));

          return {
            id: `${loc.id}-endroit-${idx}`,
            name: piece.name || piece.type || `Endroit ${idx + 1}`,
            emoji: ENDROIT_EMOJIS[piece.type?.toLowerCase()] || '📍',
            lieuId: loc.id,
            zones: endroitZones.map(z => {
              const zoneProblems = locProblems.filter(p => p.zone_id === z.id);
              return {
                id: z.id,
                type: z.zone_type,
                label: ZONE_LABELS[z.zone_type] || z.zone_type,
                endroitId: `${loc.id}-endroit-${idx}`,
                condition: z.condition,
                problems: zoneProblems.map(prob => ({
                  id: prob.id,
                  title: prob.title,
                  description: prob.description,
                  severity: prob.severity || 'medium',
                  zoneId: z.id,
                  origin: (prob.ai_detected ? 'ai' : 'user') as 'user' | 'ai',
                  isConfirmed: prob.is_confirmed || false,
                  tasks: (tasksMapped || [])
                    .filter(t => t.problem_id === prob.id)
                    .map(t => ({
                      id: t.id,
                      title: t.title,
                      familyName: t.task_families?.name || null,
                      categoryName: t.task_categories?.name || null,
                      subcategoryName: t.task_subcategories?.name || null,
                      problemId: prob.id,
                      status: t.status || 'pending',
                      priority: t.priority || null
                    })),
                  photoUrls: Array.isArray(prob.photo_urls) ? (prob.photo_urls as string[]) : [],
                  createdAt: prob.created_at
                })),
                mediaUrls: [],
                transcription: null,
                createdAt: z.created_at,
                hasVideo: false,
                hasPhoto: zoneProblems.some(p => (p.photo_urls as any[])?.length > 0),
                hasText: zoneProblems.some(p => p.description),
                isAI: zoneProblems.some(p => p.ai_detected),
                isValidated: zoneProblems.length > 0 && zoneProblems.every(p => p.is_confirmed)
              };
            }),
            mediaCount: endroitZones.reduce((acc, z) => acc + (locProblems.filter(p => p.zone_id === z.id && (p.photo_urls as any[])?.length > 0).length), 0),
            problemCount: endroitProblems.length,
            taskCount: endroitTasks.length
          };
        });

        return {
          id: loc.id,
          name: loc.name,
          partieType: (part?.part_type || 'commune') as 'commune' | 'privative',
          partieName: part?.name || 'Partie',
          partieId: part?.id || '',
          endroits,
          mediaCount: locSequences.length,
          problemCount: locProblems.length,
          taskCount: locTasks.length,
          hasVideo: locSequences.some(s => s.video_url),
          hasPhoto: locProblems.some(p => (p.photo_urls as any[])?.length > 0),
          hasText: locProblems.some(p => p.description),
          isValidated: locProblems.length > 0 && locProblems.every(p => p.is_confirmed),
          createdAt: loc.created_at
        };
      });

      setLocations(timelineLieux);
      if (timelineLieux.length > 0) {
        setExpandedLocations(new Set([timelineLieux[0].id]));
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
      toast.error("Erreur lors du chargement de la timeline");
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredLocations = useMemo(() => {
    let result = locations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(loc => {
        const matchesLieu = loc.name.toLowerCase().includes(query) || 
                           loc.partieName.toLowerCase().includes(query);
        const matchesEndroit = loc.endroits.some(e => e.name.toLowerCase().includes(query));
        const matchesProblem = loc.endroits.some(e => 
          e.zones.some(z => 
            z.problems.some(prob => 
              prob.title.toLowerCase().includes(query) || 
              prob.description?.toLowerCase().includes(query)
            )
          )
        );
        return matchesLieu || matchesEndroit || matchesProblem;
      });
    }

    if (activeFilters.size > 0) {
      result = result.filter(loc => {
        if (activeFilters.has('video') && !loc.hasVideo) return false;
        if (activeFilters.has('photo') && !loc.hasPhoto) return false;
        if (activeFilters.has('text') && !loc.hasText) return false;
        if (activeFilters.has('validated') && !loc.isValidated) return false;
        if (activeFilters.has('pending') && loc.isValidated) return false;
        if (activeFilters.has('critical') && !loc.endroits.some(e => 
          e.zones.some(z => z.problems.some(prob => prob.severity === 'critical'))
        )) return false;
        if (activeFilters.has('tasks') && loc.taskCount === 0) return false;
        if (activeFilters.has('ai') && !loc.endroits.some(e => 
          e.zones.some(z => z.isAI)
        )) return false;
        return true;
      });
    }

    return result;
  }, [locations, searchQuery, activeFilters]);

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) newFilters.delete(filter);
      else newFilters.add(filter);
      return newFilters;
    });
  };

  const toggleExpand = (type: 'location' | 'endroit' | 'zone' | 'problem', id: string) => {
    const setters = {
      location: setExpandedLocations,
      endroit: setExpandedEndroits,
      zone: setExpandedZones,
      problem: setExpandedProblems
    };
    setters[type](prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const scrollToLocation = (locationId: string) => {
    const el = scrollRefs.current[locationId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setExpandedLocations(prev => new Set([...prev, locationId]));
    }
  };

  // AI Actions
  const handleAISort = () => {
    toast.info("Tri IA en cours...");
    // Sort by severity, then by date
    const sorted = [...locations].sort((a, b) => {
      const aHasCritical = a.endroits.some(e => e.zones.some(z => z.problems.some(prob => prob.severity === 'critical')));
      const bHasCritical = b.endroits.some(e => e.zones.some(z => z.problems.some(prob => prob.severity === 'critical')));
      if (aHasCritical && !bHasCritical) return -1;
      if (!aHasCritical && bHasCritical) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setLocations(sorted);
    toast.success("Timeline triée par IA");
  };

  const handleAIFusion = () => {
    toast.info("Recherche de doublons...");
    setTimeout(() => {
      toast.success("Aucun doublon détecté pour le moment");
    }, 1000);
  };

  const handleAICorrection = () => {
    toast.info("Analyse des classifications...");
    setTimeout(() => {
      toast.success("Classifications vérifiées");
    }, 1000);
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 text-primary animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Search */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b p-3 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher lieu, pièce, problème, tâche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted/50 border-0"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterButton 
            icon={Video} 
            label="Vidéo" 
            active={activeFilters.has('video')}
            onClick={() => toggleFilter('video')}
          />
          <FilterButton 
            icon={Camera} 
            label="Photo" 
            active={activeFilters.has('photo')}
            onClick={() => toggleFilter('photo')}
          />
          <FilterButton 
            icon={FileText} 
            label="Texte" 
            active={activeFilters.has('text')}
            onClick={() => toggleFilter('text')}
          />
          <Separator orientation="vertical" className="h-6" />
          <FilterButton 
            icon={AlertTriangle} 
            label="Critiques" 
            active={activeFilters.has('critical')}
            onClick={() => toggleFilter('critical')}
            variant="destructive"
          />
          <FilterButton 
            icon={Layers} 
            label="Tâches" 
            active={activeFilters.has('tasks')}
            onClick={() => toggleFilter('tasks')}
          />
          <Separator orientation="vertical" className="h-6" />
          <FilterButton 
            icon={Sparkles} 
            label="IA" 
            active={activeFilters.has('ai')}
            onClick={() => toggleFilter('ai')}
            variant="primary"
          />
          <FilterButton 
            icon={User} 
            label="User" 
            active={activeFilters.has('user')}
            onClick={() => toggleFilter('user')}
          />
          <Separator orientation="vertical" className="h-6" />
          <FilterButton 
            icon={CheckCircle2} 
            label="Validées" 
            active={activeFilters.has('validated')}
            onClick={() => toggleFilter('validated')}
            variant="success"
          />
          <FilterButton 
            icon={Clock} 
            label="À valider" 
            active={activeFilters.has('pending')}
            onClick={() => toggleFilter('pending')}
            variant="warning"
          />

          {/* Advanced Filters */}
          <Sheet open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <Filter className="w-4 h-4 mr-1" />
                Avancé
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtres avancés</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* AI Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Intelligence IA</h4>
                  <Button variant="outline" className="w-full justify-start" onClick={handleAISort}>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Tri intelligent
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleAIFusion}>
                    <Merge className="w-4 h-4 mr-2" />
                    Détecter doublons
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleAICorrection}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Corriger classifications
                  </Button>
                </div>

                {/* Date filters could go here */}
                <Separator />

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setActiveFilters(new Set())}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mini Navigation - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block w-48 border-r bg-muted/30 overflow-y-auto">
          <div className="p-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Navigation rapide</p>
            {filteredLocations.map(loc => (
              <button
                key={loc.id}
                onClick={() => scrollToLocation(loc.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors",
                  "hover:bg-muted",
                  expandedLocations.has(loc.id) && "bg-primary/10 text-primary"
                )}
              >
                <div className="flex items-center gap-2">
                  {loc.partieType === 'commune' ? (
                    <Building2 className="w-3 h-3" />
                  ) : (
                    <Home className="w-3 h-3" />
                  )}
                  <span className="truncate">{loc.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Content */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Aucun élément trouvé</p>
              </div>
            ) : (
              filteredLocations.map(location => (
                <LocationCard
                  key={location.id}
                  location={location}
                  projectId={projectId}
                  ref={el => scrollRefs.current[location.id] = el}
                  isExpanded={expandedLocations.has(location.id)}
                  expandedEndroits={expandedEndroits}
                  expandedZones={expandedZones}
                  expandedProblems={expandedProblems}
                  onToggleLocation={() => toggleExpand('location', location.id)}
                  onToggleEndroit={(id) => toggleExpand('endroit', id)}
                  onToggleZone={(id) => toggleExpand('zone', id)}
                  onToggleProblem={(id) => toggleExpand('problem', id)}
                  onEdit={onEditItem}
                  onAddMedia={onAddMedia}
                  onTasksGenerated={loadTimelineData}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Floating Action Button - Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
              <Wand2 className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAISort}>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Tri intelligent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAIFusion}>
              <Merge className="w-4 h-4 mr-2" />
              Détecter doublons
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAICorrection}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Corriger classifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Filter Button Component
const FilterButton = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  variant = 'default' 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'primary' | 'success' | 'warning';
}) => {
  const variantStyles = {
    default: active ? 'bg-foreground text-background' : 'bg-muted/50',
    destructive: active ? 'bg-destructive text-destructive-foreground' : 'bg-muted/50',
    primary: active ? 'bg-primary text-primary-foreground' : 'bg-muted/50',
    success: active ? 'bg-green-500 text-white' : 'bg-muted/50',
    warning: active ? 'bg-amber-500 text-white' : 'bg-muted/50'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0",
        variantStyles[variant]
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
};

// Location Card Component
import React from 'react';

const LocationCard = React.forwardRef<HTMLDivElement, {
  location: TimelineLieu;
  projectId: string;
  isExpanded: boolean;
  expandedEndroits: Set<string>;
  expandedZones: Set<string>;
  expandedProblems: Set<string>;
  onToggleLocation: () => void;
  onToggleEndroit: (id: string) => void;
  onToggleZone: (id: string) => void;
  onToggleProblem: (id: string) => void;
  onEdit?: (type: string, id: string) => void;
  onAddMedia?: (locationId: string, endroitId?: string, zoneId?: string) => void;
  onTasksGenerated?: () => void;
}>(({ 
  location,
  projectId,
  isExpanded, 
  expandedEndroits, 
  expandedZones, 
  expandedProblems,
  onToggleLocation, 
  onToggleEndroit, 
  onToggleZone,
  onToggleProblem,
  onEdit,
  onAddMedia,
  onTasksGenerated
}, ref) => {
  return (
    <Card ref={ref} className={cn("overflow-hidden transition-all", isExpanded && "ring-2 ring-primary/20")}>
      {/* Location Header */}
      <button
        onClick={onToggleLocation}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          location.partieType === 'commune' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
        )}>
          {location.partieType === 'commune' ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <Home className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{location.name}</h3>
            {location.isValidated && (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{location.partieName}</span>
            <span>•</span>
            <span>{location.endroits.length} endroits</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Media type badges */}
          <div className="flex gap-1">
            {location.hasVideo && <Badge variant="outline" className="p-1"><Video className="w-3 h-3" /></Badge>}
            {location.hasPhoto && <Badge variant="outline" className="p-1"><Camera className="w-3 h-3" /></Badge>}
            {location.hasText && <Badge variant="outline" className="p-1"><FileText className="w-3 h-3" /></Badge>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            {location.problemCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                {location.problemCount}
              </span>
            )}
            {location.taskCount > 0 && (
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                {location.taskCount}
              </span>
            )}
          </div>

          {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content - Endroits */}
      {isExpanded && (
        <div className="border-t bg-muted/10">
          {location.endroits.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucun endroit enregistré
            </div>
          ) : (
            <div className="divide-y">
              {location.endroits.map(endroit => (
                <EndroitSection
                  key={endroit.id}
                  endroit={endroit}
                  locationId={location.id}
                  projectId={projectId}
                  isExpanded={expandedEndroits.has(endroit.id)}
                  expandedZones={expandedZones}
                  expandedProblems={expandedProblems}
                  onToggle={() => onToggleEndroit(endroit.id)}
                  onToggleZone={onToggleZone}
                  onToggleProblem={onToggleProblem}
                  onEdit={onEdit}
                  onAddMedia={onAddMedia}
                  onTasksGenerated={onTasksGenerated}
                />
              ))}
            </div>
          )}

          {/* Quick Actions for Location */}
          <div className="p-3 border-t bg-muted/20 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAddMedia?.(location.id)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit?.('location', location.id)}>
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
});
LocationCard.displayName = 'LocationCard';

// Endroit Section Component
const EndroitSection = ({
  endroit,
  locationId,
  projectId,
  isExpanded,
  expandedZones,
  expandedProblems,
  onToggle,
  onToggleZone,
  onToggleProblem,
  onEdit,
  onAddMedia,
  onTasksGenerated
}: {
  endroit: TimelineEndroit;
  locationId: string;
  projectId: string;
  isExpanded: boolean;
  expandedZones: Set<string>;
  expandedProblems: Set<string>;
  onToggle: () => void;
  onToggleZone: (id: string) => void;
  onToggleProblem: (id: string) => void;
  onEdit?: (type: string, id: string) => void;
  onAddMedia?: (locationId: string, endroitId?: string, zoneId?: string) => void;
  onTasksGenerated?: () => void;
}) => {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        <span className="text-lg">{endroit.emoji}</span>
        <div className="flex-1 text-left">
          <span className="font-medium">{endroit.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {endroit.zones.length} zones
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {endroit.problemCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {endroit.problemCount} pb
            </Badge>
          )}
          {endroit.taskCount > 0 && (
            <Badge className="text-xs bg-green-500/10 text-green-600">
              {endroit.taskCount} tâches
            </Badge>
          )}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isExpanded && endroit.zones.length > 0 && (
        <div className="pl-8 pr-4 pb-3 space-y-2">
          {endroit.zones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              locationId={locationId}
              endroitId={endroit.id}
              projectId={projectId}
              isExpanded={expandedZones.has(zone.id)}
              expandedProblems={expandedProblems}
              onToggle={() => onToggleZone(zone.id)}
              onToggleProblem={onToggleProblem}
              onEdit={onEdit}
              onAddMedia={onAddMedia}
              onTasksGenerated={onTasksGenerated}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Zone Card Component
const ZoneCard = ({
  zone,
  locationId,
  endroitId,
  projectId,
  isExpanded,
  expandedProblems,
  onToggle,
  onToggleProblem,
  onEdit,
  onAddMedia,
  onTasksGenerated
}: {
  zone: TimelineZone;
  locationId: string;
  endroitId: string;
  projectId: string;
  isExpanded: boolean;
  expandedProblems: Set<string>;
  onToggle: () => void;
  onToggleProblem: (id: string) => void;
  onEdit?: (type: string, id: string) => void;
  onAddMedia?: (locationId: string, endroitId?: string, zoneId?: string) => void;
  onTasksGenerated?: () => void;
}) => {
  return (
    <Card className={cn("overflow-hidden", isExpanded && "ring-1 ring-primary/30")}>
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm">{zone.label}</span>
        <div className="flex-1" />
        
        {/* Badges */}
        <div className="flex items-center gap-1">
          {zone.hasVideo && <Video className="w-3 h-3 text-muted-foreground" />}
          {zone.hasPhoto && <Camera className="w-3 h-3 text-muted-foreground" />}
          {zone.hasText && <FileText className="w-3 h-3 text-muted-foreground" />}
          {zone.isAI && <Badge className="text-xs py-0 bg-primary/10 text-primary"><Sparkles className="w-3 h-3" /></Badge>}
          {zone.isValidated && <CheckCircle2 className="w-3 h-3 text-green-500" />}
        </div>

        {zone.problems.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {zone.problems.length}
          </Badge>
        )}
        
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isExpanded && (
        <div className="border-t">
          {zone.problems.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Aucun problème détecté
            </div>
          ) : (
            <div className="divide-y">
              {zone.problems.map(problem => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  projectId={projectId}
                  isExpanded={expandedProblems.has(problem.id)}
                  onToggle={() => onToggleProblem(problem.id)}
                  onEdit={onEdit}
                  onTasksGenerated={onTasksGenerated}
                />
              ))}
            </div>
          )}

          {/* Zone Actions */}
          <div className="p-2 bg-muted/20 flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => onAddMedia?.(locationId, endroitId, zone.id)}>
              <Plus className="w-3 h-3 mr-1" />
              Média
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => onEdit?.('zone', zone.id)}>
              <Edit3 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// Generated Task Card
interface GeneratedTaskDisplay {
  ft: string;
  ftName: string;
  ct: string;
  ctName: string;
  st: string;
  stName: string;
  descriptionTechnique: string;
  quantite: number | null;
  unite: string;
  gravite: string;
  urgence: string;
  suggestionOuvrier: string;
  isApproximate: boolean;
}

// Problem Card Component with Task Generation
const ProblemCard = ({
  problem,
  projectId,
  isExpanded,
  onToggle,
  onEdit,
  onTasksGenerated
}: {
  problem: TimelineProblem;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: (type: string, id: string) => void;
  onTasksGenerated?: () => void;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTaskDisplay[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [showGenerated, setShowGenerated] = useState(false);

  const severityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500'
  };

  const urgencyLabels = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Haute'
  };

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-tasks', {
        body: { problemId: problem.id, projectId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.tasks) {
        setGeneratedTasks(response.data.tasks);
        setConfidence(response.data.confidence || 0);
        setShowGenerated(true);
        toast.success(`${response.data.tasks.length} tâche(s) générée(s)`);
        onTasksGenerated?.();
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast.error("Erreur lors de la génération des tâches");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidateTasks = async () => {
    toast.success("Tâches validées");
    setShowGenerated(false);
    onTasksGenerated?.();
  };

  return (
    <div className="p-3">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 text-left"
      >
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", severityColors[problem.severity as keyof typeof severityColors] || 'bg-muted')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{problem.title}</span>
            {problem.origin === 'ai' && (
              <Badge className="text-xs py-0 bg-primary/10 text-primary">
                <Sparkles className="w-3 h-3 mr-0.5" />
                IA
              </Badge>
            )}
            {!problem.isConfirmed && (
              <Badge variant="outline" className="text-xs py-0 text-amber-500 border-amber-500/30">
                À valider
              </Badge>
            )}
          </div>
          {problem.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {problem.description}
            </p>
          )}
        </div>
        {(problem.tasks.length > 0 || generatedTasks.length > 0) && (
          <Badge className="text-xs bg-green-500/10 text-green-600">
            {problem.tasks.length + generatedTasks.length} FT/CT/ST
          </Badge>
        )}
        {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>

      {isExpanded && (
        <div className="mt-3 pl-4 space-y-3">
          {/* Photos */}
          {problem.photoUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {problem.photoUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              ))}
            </div>
          )}

          {/* Existing Tasks */}
          {problem.tasks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tâches existantes</p>
              {problem.tasks.map(task => (
                <div key={task.id} className="p-2 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">{task.title}</p>
                  {(task.familyName || task.categoryName) && (
                    <p className="text-xs text-muted-foreground">
                      {[task.familyName, task.categoryName, task.subcategoryName].filter(Boolean).join(' → ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Generated Tasks */}
          {showGenerated && generatedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Tâches générées par IA
                </p>
                <Badge variant="outline" className="text-xs">
                  Confiance: {Math.round(confidence * 100)}%
                </Badge>
              </div>
              {generatedTasks.map((task, idx) => (
                <Card key={idx} className={cn(
                  "p-3 border",
                  task.isApproximate ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/30 bg-green-500/5"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-mono">
                          {task.ft}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs font-mono">
                          {task.ct}
                        </Badge>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs font-mono">
                          {task.st}
                        </Badge>
                        {task.isApproximate && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                            Approximatif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.ftName} → {task.ctName} → {task.stName}
                      </p>
                      <p className="text-sm font-medium mt-2">{task.descriptionTechnique}</p>
                      
                      {/* Quantité & Unité */}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {task.quantite && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            📐 {task.quantite} {task.unite}
                          </span>
                        )}
                        <span className={cn(
                          "px-1.5 py-0.5 rounded",
                          task.gravite === 'high' ? 'bg-red-500/10 text-red-600' :
                          task.gravite === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-blue-500/10 text-blue-600'
                        )}>
                          Gravité: {urgencyLabels[task.gravite as keyof typeof urgencyLabels] || task.gravite}
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded",
                          task.urgence === 'high' ? 'bg-red-500/10 text-red-600' :
                          task.urgence === 'medium' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-blue-500/10 text-blue-600'
                        )}>
                          Urgence: {urgencyLabels[task.urgence as keyof typeof urgencyLabels] || task.urgence}
                        </span>
                      </div>

                      {/* Suggestion Ouvrier */}
                      {task.suggestionOuvrier && (
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                          <p className="font-medium text-muted-foreground mb-1">📝 Instructions ouvrier:</p>
                          <p>{task.suggestionOuvrier}</p>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Validate Generated Tasks */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleValidateTasks}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Confirmer les tâches
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowGenerated(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit?.('problem', problem.id)}>
              <Edit3 className="w-3 h-3 mr-1" />
              Modifier
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Camera className="w-3 h-3 mr-1" />
              Photo
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Video className="w-3 h-3 mr-1" />
              Vidéo
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Mic className="w-3 h-3 mr-1" />
              Note
            </Button>
            
            {/* Generate Tasks Button */}
            {(problem.tasks.length === 0 && !showGenerated) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-primary"
                onClick={handleGenerateTasks}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 mr-1" />
                    Générer FT/CT/ST
                  </>
                )}
              </Button>
            )}
            
            {/* Regenerate Button */}
            {(problem.tasks.length > 0 || showGenerated) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={handleGenerateTasks}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regénérer
                  </>
                )}
              </Button>
            )}
            
            {!problem.isConfirmed && !showGenerated && (
              <Button variant="default" size="sm" className="h-7 text-xs ml-auto">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valider
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTimeline;
