import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronRight, 
  Video, AlertCircle, Home, Building2, DoorOpen, 
  SquareSlash, CheckCheck, ListChecks
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertyStructure } from '@/hooks/usePropertyStructure';
import { useVisitCoverage } from '@/hooks/useVisitCoverage';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface RoomCoverage {
  locationId: string;
  locationName: string;
  partId: string;
  partName: string;
  partType: string;
  zonesTotal: number;
  zonesCovered: number;
  coveragePercent: number;
  zones: Array<{
    id: string;
    name: string;
    type: string;
    covered: boolean;
    confidence: number;
  }>;
}

interface EDLChecklistProps {
  projectId: string;
  onCaptureZone?: (locationId: string, locationName: string, zoneType: string) => void;
  className?: string;
}

export const EDLChecklist: React.FC<EDLChecklistProps> = ({
  projectId,
  onCaptureZone,
  className
}) => {
  const { parts, locations, zones, loading: structureLoading } = usePropertyStructure(projectId);
  const { coverage, loading: coverageLoading } = useVisitCoverage(projectId);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  // Compute room-by-room coverage
  const roomCoverages = useMemo<RoomCoverage[]>(() => {
    if (!coverage || structureLoading) return [];

    return locations.map(loc => {
      const part = parts.find(p => p.id === loc.part_id);
      const roomZones = zones.filter(z => z.location_id === loc.id);
      
      // Check which zones are covered
      const zonesWithCoverage = roomZones.map(zone => {
        const coverageZone = coverage.zones.find(
          cz => cz.lieu === loc.name && (cz.name === zone.zone_type || cz.name === zone.custom_name)
        );
        return {
          id: zone.id,
          name: zone.custom_name || zone.zone_type,
          type: zone.zone_type,
          covered: !!coverageZone?.seen,
          confidence: coverageZone?.confidence || 0,
        };
      });

      const zonesCovered = zonesWithCoverage.filter(z => z.covered).length;
      const zonesTotal = zonesWithCoverage.length || 1; // Avoid division by zero

      return {
        locationId: loc.id,
        locationName: loc.name,
        partId: part?.id || '',
        partName: part?.name || 'Inconnu',
        partType: part?.part_type || 'commune',
        zonesTotal: roomZones.length,
        zonesCovered,
        coveragePercent: Math.round((zonesCovered / zonesTotal) * 100),
        zones: zonesWithCoverage,
      };
    });
  }, [parts, locations, zones, coverage, structureLoading]);

  // Group by part
  const groupedByPart = useMemo(() => {
    const groups = new Map<string, { part: { id: string; name: string; type: string }; rooms: RoomCoverage[] }>();
    
    roomCoverages.forEach(room => {
      if (!groups.has(room.partId)) {
        groups.set(room.partId, {
          part: { id: room.partId, name: room.partName, type: room.partType },
          rooms: []
        });
      }
      groups.get(room.partId)!.rooms.push(room);
    });

    return Array.from(groups.values());
  }, [roomCoverages]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalZones = roomCoverages.reduce((sum, r) => sum + r.zonesTotal, 0);
    const coveredZones = roomCoverages.reduce((sum, r) => sum + r.zonesCovered, 0);
    const completeRooms = roomCoverages.filter(r => r.coveragePercent === 100).length;
    
    return {
      totalRooms: roomCoverages.length,
      completeRooms,
      totalZones,
      coveredZones,
      overallPercent: totalZones > 0 ? Math.round((coveredZones / totalZones) * 100) : 0,
    };
  }, [roomCoverages]);

  const toggleRoom = (locationId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        next.add(locationId);
      }
      return next;
    });
  };

  const getCoverageColor = (percent: number) => {
    if (percent === 100) return 'text-green-600';
    if (percent >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getCoverageBgColor = (percent: number) => {
    if (percent === 100) return 'bg-green-500/10 border-green-500/30';
    if (percent >= 50) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  if (structureLoading || coverageLoading) {
    return (
      <div className={cn("p-4 space-y-3", className)}>
        <div className="h-6 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (roomCoverages.length === 0) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium text-foreground mb-1">Aucune pièce définie</h3>
        <p className="text-sm text-muted-foreground">
          Définissez la structure du bien dans les paramètres du projet pour activer la checklist.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with overall stats */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Checklist EDL
          </h3>
          <Badge 
            className={cn(
              "text-sm font-medium",
              overallStats.overallPercent === 100 
                ? 'bg-green-500 text-white' 
                : overallStats.overallPercent >= 50 
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
            )}
          >
            {overallStats.overallPercent}%
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <CheckCheck className="h-4 w-4 text-green-500" />
            {overallStats.completeRooms}/{overallStats.totalRooms} pièces
          </span>
          <span className="flex items-center gap-1">
            <SquareSlash className="h-4 w-4 text-primary" />
            {overallStats.coveredZones}/{overallStats.totalZones} zones
          </span>
        </div>
        
        <Progress value={overallStats.overallPercent} className="h-2" />
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {groupedByPart.map(group => (
            <div key={group.part.id} className="space-y-2">
              {/* Part header */}
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {group.part.type === 'commune' ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <Home className="h-3.5 w-3.5" />
                )}
                {group.part.name}
              </div>

              {/* Rooms */}
              <div className="space-y-1.5">
                {group.rooms.map(room => {
                  const isExpanded = expandedRooms.has(room.locationId);
                  const isComplete = room.coveragePercent === 100;
                  const missingZones = room.zones.filter(z => !z.covered);

                  return (
                    <Collapsible 
                      key={room.locationId} 
                      open={isExpanded}
                      onOpenChange={() => toggleRoom(room.locationId)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-between h-auto py-3 px-3 text-left",
                            "rounded-lg border transition-colors",
                            getCoverageBgColor(room.coveragePercent)
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isComplete ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className={cn("h-5 w-5 shrink-0", getCoverageColor(room.coveragePercent))} />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate">{room.locationName}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {room.zonesCovered}/{room.zonesTotal} zones documentées
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge 
                              variant="outline"
                              className={cn("text-xs font-medium", getCoverageColor(room.coveragePercent))}
                            >
                              {room.coveragePercent}%
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="pl-4 pr-2 pb-2 pt-1 space-y-1">
                        {/* Covered zones */}
                        {room.zones.filter(z => z.covered).map(zone => (
                          <div 
                            key={zone.id}
                            className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-green-500/5"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm flex-1">{zone.name}</span>
                            <Badge className="text-xs bg-green-500/10 text-green-600">
                              OK
                            </Badge>
                          </div>
                        ))}

                        {/* Missing zones */}
                        {missingZones.map(zone => (
                          <Button
                            key={zone.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between h-auto py-1.5 px-2 rounded-md bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCaptureZone?.(room.locationId, room.locationName, zone.type);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              <span className="text-sm">{zone.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Video className="h-3 w-3" />
                              Capturer
                            </div>
                          </Button>
                        ))}

                        {room.zonesTotal === 0 && (
                          <p className="text-xs text-muted-foreground italic py-2 px-2">
                            Aucune zone définie pour cette pièce
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
