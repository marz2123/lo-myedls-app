import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Home,
  Plus,
  Trash2,
  MapPin,
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { ConditionDot } from '@/components/visit/ConditionBadge';
import {
  PART_TYPE_LABELS,
  LOCATION_TYPE_LABELS,
  COMMON_LOCATION_TYPES,
  PRIVATE_LOCATION_TYPES,
  type PropertyPartType,
} from '@/types/businessModel';
import { cn } from '@/lib/utils';

interface PropertyStructurePanelProps {
  projectId: string;
  onLocationSelect: (locationId: string, partId: string) => void;
  selectedLocationId?: string;
}

export const PropertyStructurePanel = ({
  projectId,
  onLocationSelect,
  selectedLocationId,
}: PropertyStructurePanelProps) => {
  const {
    parts,
    locations,
    loading,
    createPart,
    createLocation,
    deletePart,
    deleteLocation,
    getLocationsForPart,
    initializeDefaultStructure,
  } = usePropertyStructure(projectId);

  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [newPartType, setNewPartType] = useState<PropertyPartType>('commune');
  const [newPartName, setNewPartName] = useState('');
  const [addingLocationToPart, setAddingLocationToPart] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState('');

  // Auto-expand parts on load
  useEffect(() => {
    if (parts.length > 0 && expandedParts.size === 0) {
      setExpandedParts(new Set(parts.map(p => p.id)));
    }
  }, [parts]);

  const togglePart = (partId: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  const handleCreatePart = async () => {
    if (!newPartName.trim()) return;
    await createPart(newPartType, newPartName);
    setNewPartName('');
  };

  const handleCreateLocation = async (partId: string) => {
    if (!newLocationName.trim()) return;
    await createLocation(partId, newLocationName, newLocationType || undefined);
    setNewLocationName('');
    setNewLocationType('');
    setAddingLocationToPart(null);
  };

  const getLocationTypes = (partType: PropertyPartType) => {
    return partType === 'commune' ? COMMON_LOCATION_TYPES : PRIVATE_LOCATION_TYPES;
  };

  if (loading) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (parts.length === 0) {
    return (
      <Card className="card-premium h-full">
        <CardContent className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Structure non définie</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Initialisez la structure du bien pour commencer vos visites
            </p>
          </div>
          <Button 
            onClick={initializeDefaultStructure} 
            className="apple-action-button-primary max-w-xs"
          >
            <Plus className="w-5 h-5" />
            Initialiser la structure
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Structure du Bien
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4 pt-0">
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            {parts.map((part, partIndex) => {
              const partLocations = getLocationsForPart(part.id);
              const isExpanded = expandedParts.has(part.id);
              const isCommune = part.part_type === 'commune';

              return (
                <div 
                  key={part.id} 
                  className={cn(
                    "rounded-2xl overflow-hidden border transition-all duration-300",
                    isExpanded ? "border-border bg-card" : "border-transparent bg-muted/30"
                  )}
                  style={{ animationDelay: `${partIndex * 50}ms` }}
                >
                  {/* Part Header */}
                  <button
                    onClick={() => togglePart(part.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 transition-colors",
                      isExpanded ? "bg-muted/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isCommune ? "bg-info/10" : "bg-success/10"
                      )}>
                        {isCommune ? (
                          <Building2 className="w-5 h-5 text-info" />
                        ) : (
                          <Home className="w-5 h-5 text-success" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="font-semibold">{part.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {partLocations.length} lieu{partLocations.length > 1 ? 'x' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePart(part.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Locations List */}
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2">
                      {partLocations.map((location, locIndex) => (
                        <button
                          key={location.id}
                          onClick={() => onLocationSelect(location.id, part.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200",
                            "animate-fade-in",
                            selectedLocationId === location.id
                              ? "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-card"
                              : "bg-muted/30 hover:bg-muted/50"
                          )}
                          style={{ animationDelay: `${locIndex * 30}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-medium">{location.name}</span>
                              {location.location_type && (
                                <p className="text-xs text-muted-foreground">
                                  {LOCATION_TYPE_LABELS[location.location_type] || location.location_type}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {location.overall_condition && (
                              <ConditionDot condition={location.overall_condition} size="sm" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLocation(location.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}

                      {/* Add Location Form */}
                      {addingLocationToPart === part.id ? (
                        <div className="p-3 bg-muted/30 rounded-xl space-y-3 animate-scale-in">
                          <Input
                            placeholder="Nom du lieu (ex: Appart 201)"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            className="h-10"
                            autoFocus
                          />
                          <Select value={newLocationType} onValueChange={setNewLocationType}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Type (optionnel)" />
                            </SelectTrigger>
                            <SelectContent>
                              {getLocationTypes(part.part_type).map((type) => (
                                <SelectItem key={type} value={type}>
                                  {LOCATION_TYPE_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleCreateLocation(part.id)}
                              disabled={!newLocationName.trim()}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Ajouter
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddingLocationToPart(null);
                                setNewLocationName('');
                                setNewLocationType('');
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground h-10 rounded-xl"
                          onClick={() => setAddingLocationToPart(part.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter un lieu
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Add Part Form */}
        <div className="pt-4 border-t border-border/50 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Ajouter une partie</p>
          <div className="flex gap-2">
            <Select
              value={newPartType}
              onValueChange={(v) => setNewPartType(v as PropertyPartType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commune">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-info" />
                    {PART_TYPE_LABELS.commune}
                  </div>
                </SelectItem>
                <SelectItem value="privative">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-success" />
                    {PART_TYPE_LABELS.privative}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Nom de la partie"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPartName.trim()) {
                  handleCreatePart();
                }
              }}
            />
            <Button 
              onClick={handleCreatePart} 
              disabled={!newPartName.trim()}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
