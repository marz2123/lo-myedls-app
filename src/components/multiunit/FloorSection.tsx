import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { UnitCard } from './UnitCard';
import type { MultiunitUnit } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface FloorSectionProps {
  floorNumber: number;
  units: MultiunitUnit[];
  isOpen?: boolean;
  onToggle?: () => void;
  onSelectUnit?: (unit: MultiunitUnit) => void;
  onStartEDL?: (unit: MultiunitUnit) => void;
  onApplyTemplate?: (unit: MultiunitUnit) => void;
  getSimilarCount?: (unitId: string) => number;
}

export function FloorSection({
  floorNumber,
  units,
  isOpen = true,
  onToggle,
  onSelectUnit,
  onStartEDL,
  onApplyTemplate,
  getSimilarCount
}: FloorSectionProps) {
  const completedCount = units.filter(u => u.edl_status === 'completed' || u.edl_status === 'signed').length;
  const criticalCount = units.filter(u => u.edl_status === 'critical').length;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">
                {floorNumber === 0 ? 'Rez-de-chaussée' : 
                 floorNumber < 0 ? `Sous-sol ${Math.abs(floorNumber)}` :
                 `Étage ${floorNumber}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {units.length} lots • {completedCount} terminés
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} critiques
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {Math.round((completedCount / units.length) * 100)}%
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 pt-0">
          {units.map(unit => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onSelect={onSelectUnit}
              onStartEDL={onStartEDL}
              onApplyTemplate={onApplyTemplate}
              similarCount={getSimilarCount?.(unit.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
