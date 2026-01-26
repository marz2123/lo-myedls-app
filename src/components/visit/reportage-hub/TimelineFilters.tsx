import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  className?: string;
}

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "pl-9 pr-9 h-10 rounded-xl border-border/50",
            "bg-muted/30 focus:bg-background",
            "placeholder:text-muted-foreground/60",
            "transition-colors"
          )}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Filter Button (placeholder) */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl border-border/50 shrink-0"
        disabled
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>

      {/* Result count when searching */}
      {searchQuery && resultCount !== undefined && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resultCount} résultat{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
