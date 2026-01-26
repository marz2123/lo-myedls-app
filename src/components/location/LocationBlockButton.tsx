import { ReactNode, useState } from 'react';
import { ChevronRight, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

type BlockStatus = 'success' | 'warning' | 'error' | 'loading' | 'idle';

interface LocationBlockButtonProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  status?: BlockStatus;
  statusText?: string;
  dataCount?: number;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export const LocationBlockButton = ({
  icon,
  title,
  subtitle,
  status = 'idle',
  statusText,
  dataCount,
  isLoading = false,
  children,
  className,
}: LocationBlockButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      case 'loading': return 'bg-blue-500 animate-pulse';
      default: return 'bg-muted-foreground/30';
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    switch (status) {
      case 'success': return <Check className="h-3.5 w-3.5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
      case 'error': return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full flex items-center gap-4 p-4 rounded-2xl",
          "bg-card border border-border/50 hover:border-primary/30",
          "transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
          "active:scale-[0.99] text-left group",
          className
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
          "transition-colors"
        )}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <span className="text-primary">{icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-[15px] truncate">{title}</h3>
            {dataCount !== undefined && dataCount > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {dataCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status !== 'idle' && (
              <span className={cn("w-2 h-2 rounded-full", getStatusColor())} />
            )}
            <p className="text-sm text-muted-foreground truncate">
              {statusText || subtitle}
            </p>
          </div>
        </div>

        {/* Status icon & chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIcon()}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
      </button>

      {/* Detail Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary">{icon}</span>
              </div>
              <div>
                <SheetTitle className="text-left">{title}</SheetTitle>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(85vh-100px)] mt-4 -mx-6 px-6">
            <div className="pb-8">
              {children}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

// Reusable detail components
interface DetailSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const DetailSection = ({ title, icon, children, className }: DetailSectionProps) => (
  <div className={cn("space-y-3", className)}>
    <div className="flex items-center gap-2">
      {icon && <span className="text-primary">{icon}</span>}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h4>
    </div>
    <div className="bg-muted/30 rounded-xl p-4">
      {children}
    </div>
  </div>
);

interface DetailRowProps {
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  copyable?: boolean;
}

export const DetailRow = ({ label, value, icon, copyable }: DetailRowProps) => {
  const handleCopy = () => {
    if (typeof value === 'string' || typeof value === 'number') {
      navigator.clipboard.writeText(String(value));
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value || '—'}</span>
        {copyable && value && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-muted rounded transition-colors opacity-50 hover:opacity-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

interface DetailGridProps {
  items: Array<{
    label: string;
    value: string | number | ReactNode;
    icon?: ReactNode;
    highlight?: boolean;
  }>;
  columns?: 2 | 3;
}

export const DetailGrid = ({ items, columns = 2 }: DetailGridProps) => (
  <div className={cn(
    "grid gap-3",
    columns === 2 && "grid-cols-2",
    columns === 3 && "grid-cols-3"
  )}>
    {items.map((item, index) => (
      <div
        key={index}
        className={cn(
          "p-3 rounded-xl",
          item.highlight ? "bg-primary/10 border border-primary/20" : "bg-background"
        )}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          {item.icon && <span className="w-3.5 h-3.5">{item.icon}</span>}
          <span className="text-xs">{item.label}</span>
        </div>
        <p className={cn(
          "font-semibold text-sm",
          item.highlight && "text-primary"
        )}>
          {item.value || '—'}
        </p>
      </div>
    ))}
  </div>
);

interface StatusChipProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
  size?: 'sm' | 'md';
}

export const StatusChip = ({ status, label, size = 'sm' }: StatusChipProps) => {
  const colors = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      size === 'sm' ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      colors[status]
    )}>
      {label}
    </span>
  );
};
