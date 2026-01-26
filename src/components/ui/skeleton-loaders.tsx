// Premium Skeleton Loaders for all major views
// Ensures the app always feels alive and responsive

import { Skeleton } from "@/components/ui/skeleton";

// EDL Report Skeleton
export const EDLReportSkeleton = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
    
    {/* Cover Section */}
    <div className="bg-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
    
    {/* Sections */}
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);

// Task Kanban Skeleton
export const KanbanSkeleton = () => (
  <div className="flex gap-4 p-4 overflow-x-auto animate-in fade-in duration-300">
    {['À faire', 'En cours', 'Terminé'].map((col) => (
      <div key={col} className="flex-shrink-0 w-80 bg-muted/30 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg p-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Bureau Dashboard Skeleton
export const BureauDashboardSkeleton = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    {/* Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-xl p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    
    {/* Chart Area */}
    <div className="bg-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
    
    {/* Task List */}
    <div className="bg-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

// Client View Skeleton
export const ClientViewSkeleton = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    {/* Header */}
    <div className="text-center space-y-2">
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
    
    {/* Progress Card */}
    <div className="bg-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
    
    {/* Photos Grid */}
    <div className="bg-card rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
    
    {/* Summary */}
    <div className="bg-card rounded-xl p-6 space-y-3">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  </div>
);

// Project List Skeleton
export const ProjectListSkeleton = () => (
  <div className="space-y-4 animate-in fade-in duration-300">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-card rounded-xl p-4 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    ))}
  </div>
);

// Task List Skeleton
export const TaskListSkeleton = () => (
  <div className="space-y-3 animate-in fade-in duration-300">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-card rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Sequence List Skeleton
export const SequenceListSkeleton = () => (
  <div className="space-y-4 animate-in fade-in duration-300">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-16 w-16 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// Generic Card Skeleton
export const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="bg-card rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
    <Skeleton className="h-5 w-32" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4" style={{ width: `${100 - i * 15}%` }} />
    ))}
  </div>
);

// Inline Loading Indicator
export const InlineLoader = ({ text = "Chargement..." }: { text?: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in duration-200">
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
    <span className="text-sm">{text}</span>
  </div>
);
