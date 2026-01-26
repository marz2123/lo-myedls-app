import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Building2,
  Home,
  MapPin,
  Video,
  Camera,
  FileText,
  Mic,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Layers,
  Settings2,
  Filter,
  Play,
  ListTodo,
  Zap,
  Edit2,
  Plus,
} from 'lucide-react';
import { usePropertyDocumentation, type PartDocStats, type LocationDocStats } from '@/hooks/usePropertyDocumentation';
import { ZONE_TYPE_LABELS, type ZoneType } from '@/types/businessModel';
import { cn } from '@/lib/utils';
import { ZoneProblemCapture } from './ZoneProblemCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function for zone button styling
const getZoneButtonConfig = (zoneType: ZoneType) => {
  switch (zoneType) {
    case 'murs':
    case 'facade':
      return { emoji: '🧱', gradient: 'from-orange-500 to-orange-600 shadow-orange-500/30' };
    case 'sol':
      return { emoji: '🪨', gradient: 'from-amber-500 to-amber-600 shadow-amber-500/30' };
    case 'plafond':
      return { emoji: '⬜', gradient: 'from-slate-400 to-slate-500 shadow-slate-400/30' };
    case 'menuiseries':
      return { emoji: '🚪', gradient: 'from-cyan-500 to-cyan-600 shadow-cyan-500/30' };
    case 'electricite':
      return { emoji: '⚡', gradient: 'from-yellow-500 to-yellow-600 shadow-yellow-500/30' };
    case 'plomberie':
      return { emoji: '🚿', gradient: 'from-blue-500 to-blue-600 shadow-blue-500/30' };
    case 'equipements':
      return { emoji: '🔧', gradient: 'from-gray-500 to-gray-600 shadow-gray-500/30' };
    case 'ventilation':
      return { emoji: '💨', gradient: 'from-sky-500 to-sky-600 shadow-sky-500/30' };
    case 'chauffage':
      return { emoji: '🔥', gradient: 'from-red-500 to-red-600 shadow-red-500/30' };
    case 'toiture':
      return { emoji: '🏠', gradient: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30' };
    default:
      return { emoji: '📍', gradient: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30' };
  }
};

interface InteractivePropertyMapProps {
  projectId: string;
  onNavigateToReportage: (locationId: string, zoneType?: ZoneType) => void;
  onNavigateToTimeline: (filterId?: string, filterType?: 'location' | 'zone') => void;
}

// Status badge component
const StatusIndicator = ({ 
  progress, 
  size = 'md' 
}: { 
  progress: number; 
  size?: 'sm' | 'md' | 'lg';
}) => {
  const getColor = () => {
    if (progress >= 100) return 'bg-success';
    if (progress > 0) return 'bg-warning';
    return 'bg-destructive';
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('rounded-full', sizeClasses[size], getColor())} />
  );
};

// Media presence badges
const MediaBadges = ({ 
  hasVideo, 
  hasPhoto, 
  hasText, 
  hasAudio,
  compact = false,
}: { 
  hasVideo: boolean;
  hasPhoto: boolean;
  hasText: boolean;
  hasAudio: boolean;
  compact?: boolean;
}) => {
  const badges = [
    { has: hasVideo, icon: Video, label: 'Vidéo', color: 'text-primary' },
    { has: hasPhoto, icon: Camera, label: 'Photo', color: 'text-info' },
    { has: hasText, icon: FileText, label: 'Texte', color: 'text-success' },
    { has: hasAudio, icon: Mic, label: 'Audio', color: 'text-warning' },
  ].filter(b => b.has);

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
      {badges.map(({ icon: Icon, label, color }) => (
        <div
          key={label}
          className={cn(
            'rounded-full flex items-center justify-center',
            compact ? 'w-5 h-5 bg-muted/50' : 'w-6 h-6 bg-muted'
          )}
          title={label}
        >
          <Icon className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5', color)} />
        </div>
      ))}
    </div>
  );
};


// Location card
const LocationCard = ({
  stats,
  onSelect,
  expertMode,
  showOnlyMissing,
}: {
  stats: LocationDocStats;
  onSelect: () => void;
  expertMode: boolean;
  showOnlyMissing: boolean;
}) => {
  if (showOnlyMissing && stats.progress >= 100) return null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-2xl border transition-all duration-200',
        'hover:border-primary/50 hover:shadow-lg hover:scale-[1.01]',
        stats.progress >= 100
          ? 'border-success/30 bg-gradient-to-br from-success/5 to-success/10'
          : stats.progress > 0
          ? 'border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10'
          : 'border-border bg-card'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            stats.progress >= 100 ? 'bg-success/20' : stats.progress > 0 ? 'bg-warning/20' : 'bg-muted'
          )}>
            <MapPin className={cn(
              'w-5 h-5',
              stats.progress >= 100 ? 'text-success' : stats.progress > 0 ? 'text-warning' : 'text-muted-foreground'
            )} />
          </div>
          <div className="text-left">
            <p className="font-semibold">{stats.locationName}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalZones} zone{stats.totalZones > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MediaBadges
            hasVideo={stats.hasVideo}
            hasPhoto={stats.hasPhoto}
            hasText={stats.hasText}
            hasAudio={stats.hasAudio}
            compact
          />
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={stats.progress} className="h-1.5" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {stats.documentedZones}/{stats.totalZones} zones
          </span>
          <span className={cn(
            'font-medium',
            stats.progress >= 100 ? 'text-success' : stats.progress > 0 ? 'text-warning' : 'text-muted-foreground'
          )}>
            {stats.progress}%
          </span>
        </div>
      </div>

      {/* Expert mode stats */}
      {expertMode && (stats.tasksCount > 0 || stats.problemsCount > 0) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          {stats.problemsCount > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {stats.problemsCount} problème{stats.problemsCount > 1 ? 's' : ''}
            </Badge>
          )}
          {stats.tasksCount > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <ListTodo className="w-3 h-3 mr-1" />
              {stats.tasksCount} FT/CT/ST
            </Badge>
          )}
        </div>
      )}
    </button>
  );
};

// Part card (column header)
const PartCard = ({
  stats,
  isSelected,
  onSelect,
  showOnlyMissing,
}: {
  stats: PartDocStats;
  isSelected: boolean;
  onSelect: () => void;
  showOnlyMissing: boolean;
}) => {
  const isCommune = stats.partType === 'commune';
  const visibleLocations = showOnlyMissing 
    ? stats.locations.filter(l => l.progress < 100)
    : stats.locations;

  if (showOnlyMissing && stats.progress >= 100) return null;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-2xl border-2 transition-all duration-200',
        'hover:shadow-lg hover:scale-[1.01]',
        isSelected
          ? isCommune
            ? 'border-info bg-info/10 shadow-info/20 shadow-lg'
            : 'border-success bg-success/10 shadow-success/20 shadow-lg'
          : 'border-border bg-card hover:border-primary/30'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          isCommune ? 'bg-info/20' : 'bg-success/20'
        )}>
          {isCommune ? (
            <Building2 className="w-6 h-6 text-info" />
          ) : (
            <Home className="w-6 h-6 text-success" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="font-semibold">{stats.partName}</p>
          <p className="text-sm text-muted-foreground">
            {visibleLocations.length} lieu{visibleLocations.length > 1 ? 'x' : ''}
          </p>
        </div>
        <StatusIndicator progress={stats.progress} size="lg" />
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <Progress 
          value={stats.progress} 
          className={cn('h-2', isCommune ? 'bg-info/20' : 'bg-success/20')} 
        />
        <p className="text-xs text-right font-medium">
          {stats.progress}% documenté
        </p>
      </div>
    </button>
  );
};

export const InteractivePropertyMap = ({
  projectId,
  onNavigateToReportage,
  onNavigateToTimeline,
}: InteractivePropertyMapProps) => {
  const { partsWithStats, projectStats, zones, getZoneStats, loading, refresh } = usePropertyDocumentation(projectId);
  
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationDocStats | null>(null);
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  const [showZoneSheet, setShowZoneSheet] = useState(false);
  
  // Zone problem capture state
  const [showProblemCapture, setShowProblemCapture] = useState(false);
  const [selectedZone, setSelectedZone] = useState<{
    zoneType: ZoneType;
    zoneId?: string;
    customName?: string;
  } | null>(null);

  // Get selected part
  const selectedPart = useMemo(() => {
    return partsWithStats.find(p => p.partId === selectedPartId);
  }, [partsWithStats, selectedPartId]);

  // Filter parts based on showOnlyMissing
  const visibleParts = useMemo(() => {
    if (!showOnlyMissing) return partsWithStats;
    return partsWithStats.filter(p => p.progress < 100);
  }, [partsWithStats, showOnlyMissing]);

  // Get zones for selected location
  const locationZones = useMemo(() => {
    if (!selectedLocation) return [];
    return zones.filter(z => z.location_id === selectedLocation.locationId);
  }, [zones, selectedLocation]);

  // Handle zone selection with capture mode
  const handleZoneCaptureMode = (
    zoneType: ZoneType, 
    mode: 'video' | 'photo' | 'text',
    zoneId?: string, 
    customName?: string
  ) => {
    setSelectedZone({ zoneType, zoneId, customName });
    setShowZoneSheet(false);
    
    if (mode === 'text') {
      // Open text/voice capture dialog
      setShowProblemCapture(true);
    } else if (mode === 'video' && selectedLocation) {
      // Navigate to video reportage
      onNavigateToReportage(selectedLocation.locationId, zoneType);
    } else if (mode === 'photo') {
      // For now, open text capture (photo can be added there)
      setShowProblemCapture(true);
    }
  };

  // Handle location click -> open zone sheet
  const handleLocationClick = (location: LocationDocStats) => {
    setSelectedLocation(location);
    setShowZoneSheet(true);
  };

  // Handle problem capture complete
  const handleProblemCaptureComplete = () => {
    refresh?.();
  };

  // Handle zone name update
  const handleZoneNameUpdate = (zoneId: string, newName: string) => {
    refresh?.();
  };

  if (loading) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-muted-foreground">Chargement de la carte...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-premium h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span>Carte du Bien</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  {projectStats.progress}% documenté
                </p>
              </div>
            </CardTitle>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="missing-filter"
                  checked={showOnlyMissing}
                  onCheckedChange={setShowOnlyMissing}
                />
                <Label htmlFor="missing-filter" className="text-xs cursor-pointer">
                  <Filter className="w-3.5 h-3.5 inline mr-1" />
                  Manquants
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="expert-mode"
                  checked={expertMode}
                  onCheckedChange={setExpertMode}
                />
                <Label htmlFor="expert-mode" className="text-xs cursor-pointer">
                  <Settings2 className="w-3.5 h-3.5 inline mr-1" />
                  Expert
                </Label>
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mt-4 p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-success" />
                  {projectStats.documentedZones} complètes
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                  {projectStats.partialZones} partielles
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  {projectStats.undocumentedZones} à faire
                </span>
              </div>
              <MediaBadges
                hasVideo={projectStats.hasVideo}
                hasPhoto={projectStats.hasPhoto}
                hasText={projectStats.hasText}
                hasAudio={projectStats.hasAudio}
              />
            </div>
            <Progress value={projectStats.progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-4 pt-0">
          {partsWithStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                <Building2 className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucune structure définie</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Définissez d'abord la structure du bien dans l'onglet Structure
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Column 1: Parties */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Parties
                </h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-2">
                    {visibleParts.map(part => (
                      <PartCard
                        key={part.partId}
                        stats={part}
                        isSelected={selectedPartId === part.partId}
                        onSelect={() => setSelectedPartId(
                          selectedPartId === part.partId ? null : part.partId
                        )}
                        showOnlyMissing={showOnlyMissing}
                      />
                    ))}
                    {visibleParts.length === 0 && showOnlyMissing && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Toutes les parties sont documentées !
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Column 2: Lieux */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lieux
                  {selectedPart && (
                    <Badge variant="secondary" className="ml-auto">
                      {selectedPart.partName}
                    </Badge>
                  )}
                </h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-2">
                    {selectedPart ? (
                      <>
                        {selectedPart.locations.map(location => (
                          <LocationCard
                            key={location.locationId}
                            stats={location}
                            onSelect={() => handleLocationClick(location)}
                            expertMode={expertMode}
                            showOnlyMissing={showOnlyMissing}
                          />
                        ))}
                        {selectedPart.locations.filter(l => !showOnlyMissing || l.progress < 100).length === 0 && (
                          <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Tous les lieux sont documentés !
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Sélectionnez une partie</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Column 3: Quick Actions / Stats */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Actions rapides
                </h3>
                <div className="space-y-3">
                  {/* Quick capture button */}
                  <Button
                    variant="default"
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={() => {
                      if (selectedLocation) {
                        onNavigateToReportage(selectedLocation.locationId);
                      }
                    }}
                    disabled={!selectedLocation}
                  >
                    <Play className="w-6 h-6" />
                    <span>Capturer maintenant</span>
                    {selectedLocation && (
                      <span className="text-xs opacity-75">
                        {selectedLocation.locationName}
                      </span>
                    )}
                  </Button>

                  {/* View timeline */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (selectedLocation) {
                        onNavigateToTimeline(selectedLocation.locationId, 'location');
                      } else {
                        onNavigateToTimeline();
                      }
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir la Timeline
                  </Button>

                  {/* Stats summary */}
                  {expertMode && (
                    <Card className="bg-muted/30 border-0">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Statistiques
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 rounded-lg bg-background">
                            <p className="text-2xl font-bold text-warning">{projectStats.problemsCount}</p>
                            <p className="text-xs text-muted-foreground">Problèmes</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background">
                            <p className="text-2xl font-bold text-primary">{projectStats.tasksCount}</p>
                            <p className="text-xs text-muted-foreground">Tâches FT/CT/ST</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Legend */}
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-3">Légende</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-success" />
                          <span>Zone complète</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-warning" />
                          <span>Zone partielle</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-destructive" />
                          <span>Zone non documentée</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone selection sheet */}
      <Sheet open={showZoneSheet} onOpenChange={setShowZoneSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">{selectedLocation?.locationName}</SheetTitle>
            </div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{selectedPart?.partType === 'commune' ? 'Communes' : 'Privatives'}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary font-medium">{selectedLocation?.locationName}</span>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-100px)] pt-4">
            {/* Lieu card */}
            <div className="p-4 rounded-2xl bg-card/50 border border-border mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Lieu</p>
                  <h3 className="font-bold">{selectedLocation?.locationName}</h3>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide px-1 mb-3">
              Zone → Description rapide
            </p>
            
            {/* Apple-style zone buttons */}
            <div className="flex flex-wrap gap-2 pb-6">
              {locationZones.length > 0 ? (
                locationZones.map(zone => {
                  const config = getZoneButtonConfig(zone.zone_type);
                  const displayName = zone.custom_name || ZONE_TYPE_LABELS[zone.zone_type];
                  return (
                    <button
                      key={zone.id}
                      onClick={() => handleZoneCaptureMode(zone.zone_type, 'text', zone.id, zone.custom_name || undefined)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-full",
                        "bg-gradient-to-r shadow-lg active:scale-95 transition-all",
                        "hover:shadow-xl hover:scale-[1.02]",
                        config.gradient
                      )}
                    >
                      <span className="text-xl">{config.emoji}</span>
                      <span className="font-bold text-white text-sm">{displayName}</span>
                    </button>
                  );
                })
              ) : (
                // Default zones if none defined
                Object.entries(ZONE_TYPE_LABELS).map(([type, label]) => {
                  const config = getZoneButtonConfig(type as ZoneType);
                  return (
                    <button
                      key={type}
                      onClick={() => handleZoneCaptureMode(type as ZoneType, 'text')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-full",
                        "bg-gradient-to-r shadow-lg active:scale-95 transition-all",
                        "hover:shadow-xl hover:scale-[1.02]",
                        config.gradient
                      )}
                    >
                      <span className="text-xl">{config.emoji}</span>
                      <span className="font-bold text-white text-sm">{label}</span>
                    </button>
                  );
                })
              )}
              
              {/* Add zone button */}
              <button
                onClick={async () => {
                  const zoneName = prompt('Nom de la nouvelle zone (ex: Mur droit, Sol cuisine...)');
                  if (zoneName && zoneName.trim() && selectedLocation) {
                    try {
                      const { data, error } = await supabase.from('location_zones').insert({
                        project_id: projectId,
                        location_id: selectedLocation.locationId,
                        zone_type: 'autre' as any,
                        custom_name: zoneName.trim(),
                        order_index: locationZones.length,
                      }).select().single();
                      
                      if (error) throw error;
                      
                      toast.success(`Zone "${zoneName}" ajoutée - Rouvrez le lieu pour la voir`);
                      // Close and suggest reopening to see new zone
                      setShowZoneSheet(false);
                    } catch (error) {
                      console.error(error);
                      toast.error('Erreur lors de la création de la zone');
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all active:scale-95"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-muted-foreground text-sm">Ajouter</span>
              </button>
            </div>

            {/* Quick capture all */}
            <div className="sticky bottom-0 bg-background pt-4 border-t">
              <Button
                className="w-full h-14 text-lg"
                onClick={() => {
                  if (selectedLocation) {
                    setShowZoneSheet(false);
                    onNavigateToReportage(selectedLocation.locationId);
                  }
                }}
              >
                <Video className="w-5 h-5 mr-2" />
                Capturer tout le lieu
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Zone Problem Capture Dialog */}
      {selectedLocation && selectedZone && (
        <ZoneProblemCapture
          open={showProblemCapture}
          onOpenChange={setShowProblemCapture}
          projectId={projectId}
          locationId={selectedLocation.locationId}
          locationName={selectedLocation.locationName}
          zoneType={selectedZone.zoneType}
          zoneId={selectedZone.zoneId}
          customZoneName={selectedZone.customName}
          partieType={selectedPart?.partType}
          partieName={selectedPart?.partName}
          lieuName={selectedLocation.locationName}
          onComplete={handleProblemCaptureComplete}
          onZoneNameUpdate={handleZoneNameUpdate}
        />
      )}
    </>
  );
};
