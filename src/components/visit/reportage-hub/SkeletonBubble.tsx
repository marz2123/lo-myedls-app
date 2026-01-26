import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonBubbleProps {
  hasMedia?: boolean;
  className?: string;
}

export const SkeletonBubble: React.FC<SkeletonBubbleProps> = ({ 
  hasMedia = true,
  className 
}) => {
  return (
    <div className={cn(
      "rounded-2xl overflow-hidden bg-card border border-border/50 max-w-[85%] animate-pulse",
      className
    )}>
      {hasMedia && (
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-shimmer" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonTimeline: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 p-4 pt-16">
      {/* Date header skeleton */}
      <Skeleton className="h-5 w-24 mx-auto rounded-full" />
      
      {/* Bubble skeletons with alternating media */}
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBubble key={i} hasMedia={i % 2 === 0} />
      ))}
    </div>
  );
};
