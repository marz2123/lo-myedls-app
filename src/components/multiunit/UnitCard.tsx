import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Warehouse, 
  Car, 
  Box, 
  Building2, 
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MultiunitUnit, EDLStatus, UnitType, ApartmentType } from '@/types/multiunit';
import { EDL_STATUS_COLORS, EDL_STATUS_LABELS, APARTMENT_TYPE_LABELS } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface UnitCardProps {
  unit: MultiunitUnit;
  onSelect?: (unit: MultiunitUnit) => void;
  onStartEDL?: (unit: MultiunitUnit) => void;
  onApplyTemplate?: (unit: MultiunitUnit) => void;
  similarCount?: number;
}

const UNIT_TYPE_ICONS: Record<UnitType, React.ElementType> = {
  apartment: Home,
  cave: Box,
  garage: Warehouse,
  parking: Car,
  storage: Box,
  commercial: Building2,
  technical: Building2,
  common_area: Building2
};

const STATUS_ICONS: Record<EDLStatus, React.ElementType> = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle2,
  signed: CheckCircle2,
  critical: AlertTriangle
};

export function UnitCard({ unit, onSelect, onStartEDL, onApplyTemplate, similarCount }: UnitCardProps) {
  const Icon = UNIT_TYPE_ICONS[unit.unit_type] || Home;
  const StatusIcon = STATUS_ICONS[unit.edl_status];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
        unit.edl_status === 'critical' && "border-red-300 dark:border-red-800"
      )}
      onClick={() => onSelect?.(unit)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              unit.edl_status === 'completed' || unit.edl_status === 'signed' 
                ? "bg-green-100 dark:bg-green-900/30" 
                : "bg-muted"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                unit.edl_status === 'completed' || unit.edl_status === 'signed'
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{unit.unit_number}</h4>
                {unit.apartment_type && (
                  <Badge variant="outline" className="text-xs">
                    {APARTMENT_TYPE_LABELS[unit.apartment_type]}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Étage {unit.floor_number} • {unit.surface_m2 ? `${unit.surface_m2} m²` : 'Surface N/A'}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartEDL?.(unit); }}>
                <Play className="h-4 w-4 mr-2" />
                Démarrer EDL
              </DropdownMenuItem>
              {similarCount && similarCount > 0 && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApplyTemplate?.(unit); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Appliquer sur {similarCount} lots similaires
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Badge className={cn("text-xs", EDL_STATUS_COLORS[unit.edl_status])}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {EDL_STATUS_LABELS[unit.edl_status]}
          </Badge>

          {unit.quality_score && (
            <span className={cn(
              "text-xs font-medium",
              unit.quality_score >= 80 ? "text-green-600" :
              unit.quality_score >= 60 ? "text-amber-600" : "text-red-600"
            )}>
              {Math.round(unit.quality_score)}%
            </span>
          )}
        </div>

        {unit.occupant_name && (
          <p className="mt-2 text-xs text-muted-foreground truncate">
            {unit.occupant_name}
          </p>
        )}

        {unit.is_template && (
          <Badge variant="secondary" className="mt-2 text-xs">
            Modèle
          </Badge>
        )}

        {similarCount && similarCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
            <Copy className="h-3 w-3" />
            {similarCount} lots similaires
          </div>
        )}
      </CardContent>
    </Card>
  );
}
