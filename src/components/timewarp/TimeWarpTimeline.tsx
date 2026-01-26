import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, TrendingDown, TrendingUp, Minus, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TimelinePoint, ConditionLevel } from '@/types/timewarp';
import { CONDITION_COLORS } from '@/types/timewarp';

interface TimeWarpTimelineProps {
  points: TimelinePoint[];
  selectedYear: number;
  compareYear?: number;
  onSelectYear: (year: number) => void;
  onCompare: (year: number) => void;
  isCompareMode: boolean;
}

export function TimeWarpTimeline({
  points,
  selectedYear,
  compareYear,
  onSelectYear,
  onCompare,
  isCompareMode,
}: TimeWarpTimelineProps) {
  const getConditionIcon = (condition?: ConditionLevel) => {
    switch (condition) {
      case 'excellent':
      case 'good':
        return <TrendingUp className="h-3 w-3" />;
      case 'fair':
        return <Minus className="h-3 w-3" />;
      case 'poor':
      case 'critical':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getConditionColor = (condition?: ConditionLevel) => {
    if (!condition) return 'hsl(var(--muted))';
    return CONDITION_COLORS[condition];
  };

  return (
    <div className="relative w-full py-4">
      {/* Timeline line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 -translate-y-1/2 rounded-full" />

      {/* Timeline points */}
      <div className="relative flex justify-between items-center px-4">
        {points.map((point, index) => {
          const isSelected = point.year === selectedYear;
          const isCompare = point.year === compareYear;
          const isPrediction = point.type === 'prediction';

          return (
            <motion.div
              key={`${point.year}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex flex-col items-center"
            >
              {/* Year label */}
              <span className={cn(
                "text-xs font-medium mb-2 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {point.year}
              </span>

              {/* Point button */}
              <Button
                variant={isSelected ? "default" : isCompare ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "relative h-12 w-12 rounded-full p-0 transition-all",
                  isSelected && "ring-2 ring-primary ring-offset-2",
                  isCompare && "ring-2 ring-secondary ring-offset-2",
                  isPrediction && "border-dashed"
                )}
                style={{
                  borderColor: getConditionColor(point.condition),
                }}
                onClick={() => {
                  if (isCompareMode && !isSelected) {
                    onCompare(point.year);
                  } else {
                    onSelectYear(point.year);
                  }
                }}
              >
                {/* Thumbnail or icon */}
                {point.thumbnail_url ? (
                  <img
                    src={point.thumbnail_url}
                    alt={point.label}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    {isPrediction ? (
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    {getConditionIcon(point.condition)}
                  </div>
                )}

                {/* Current indicator */}
                {point.is_current && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </Button>

              {/* Health score */}
              {point.health_score !== undefined && (
                <Badge
                  variant="outline"
                  className="mt-2 text-xs"
                  style={{ borderColor: getConditionColor(point.condition) }}
                >
                  {Math.round(point.health_score)}%
                </Badge>
              )}

              {/* Type indicator */}
              <span className={cn(
                "text-xs mt-1",
                isPrediction ? "text-amber-500" : "text-muted-foreground"
              )}>
                {isPrediction ? 'Prévision' : 'EDL'}
              </span>

              {/* Compare badge */}
              {isCompare && (
                <Badge variant="secondary" className="absolute -bottom-6 text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Comparer
                </Badge>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-8 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>EDL réalisé</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Prévision IA</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Actuel</span>
        </div>
      </div>
    </div>
  );
}
