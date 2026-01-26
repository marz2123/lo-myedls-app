import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { FILTER_CONFIGS, FilterType } from '@/hooks/useMagicFilters';
import {
  LayoutGrid, AlertTriangle, AlertCircle, XCircle,
  Camera, CircleDashed, Square, Wrench, CheckCircle2
} from 'lucide-react';

const IconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutGrid,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Camera,
  CircleDashed,
  Square,
  Wrench,
  CheckCircle2,
};

interface MagicFiltersProps {
  activeFilters: Set<FilterType>;
  onToggleFilter: (filterId: FilterType) => void;
  counts?: Partial<Record<FilterType, number>>;
  showCounts?: boolean;
  availableFilters?: FilterType[];
  className?: string;
}

export const MagicFilters: React.FC<MagicFiltersProps> = ({
  activeFilters,
  onToggleFilter,
  counts = {},
  showCounts = true,
  availableFilters,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const haptic = useHapticFeedback();

  // Filter configs based on available filters
  const displayedFilters = availableFilters
    ? FILTER_CONFIGS.filter(f => availableFilters.includes(f.id))
    : FILTER_CONFIGS;

  // Scroll to active filter on mount
  useEffect(() => {
    if (scrollRef.current) {
      const activeFilter = [...activeFilters][0];
      const activeElement = scrollRef.current.querySelector(`[data-filter="${activeFilter}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  const handleFilterTap = (filterId: FilterType) => {
    // Haptic feedback based on filter type
    if (filterId === 'anomalies' || filterId === 'mauvais') {
      haptic.trigger('piece_complete');
    } else {
      haptic.selectionChanged();
    }
    onToggleFilter(filterId);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Scrollable filter bar */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2 -mx-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <AnimatePresence mode="popLayout">
          {displayedFilters.map((filter) => {
            const Icon = IconMap[filter.icon];
            const isActive = activeFilters.has(filter.id);
            const count = counts[filter.id];
            const hasItems = count === undefined || count > 0;

            return (
              <motion.button
                key={filter.id}
                data-filter={filter.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterTap(filter.id)}
                disabled={!hasItems && filter.id !== 'all'}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "text-xs font-medium whitespace-nowrap",
                  "transition-all duration-200 ease-out",
                  "border shadow-sm",
                  isActive
                    ? cn(filter.activeColor, "border-transparent shadow-md")
                    : cn(filter.color, "border-border/50 hover:border-border"),
                  !hasItems && filter.id !== 'all' && "opacity-40 cursor-not-allowed"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{filter.label}</span>
                {showCounts && count !== undefined && count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-white/20"
                        : "bg-foreground/10"
                    )}
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
