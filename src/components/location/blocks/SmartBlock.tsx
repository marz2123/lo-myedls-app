import { ReactNode, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SmartBlockProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isLoading?: boolean;
  badge?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export const SmartBlock = ({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = true,
  isLoading = false,
  badge,
  className,
  headerAction,
}: SmartBlockProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-200",
        "hover:border-border/80 hover:shadow-sm",
        className
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <span className="text-primary">{icon}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {headerAction && (
                <div onClick={(e) => e.stopPropagation()}>
                  {headerAction}
                </div>
              )}
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-border/50 pt-4">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// Info row component for consistent styling
interface InfoRowProps {
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  onCopy?: () => void;
  className?: string;
}

export const InfoRow = ({ label, value, icon, onCopy, className }: InfoRowProps) => (
  <div className={cn(
    "flex items-center justify-between py-2.5 border-b border-border/30 last:border-0",
    className
  )}>
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span className="text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">{value}</span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

// Grid info component
interface InfoGridProps {
  items: Array<{
    label: string;
    value: string | number;
    icon?: ReactNode;
  }>;
  columns?: 2 | 3 | 4;
}

export const InfoGrid = ({ items, columns = 2 }: InfoGridProps) => (
  <div className={cn(
    "grid gap-3",
    columns === 2 && "grid-cols-2",
    columns === 3 && "grid-cols-3",
    columns === 4 && "grid-cols-4"
  )}>
    {items.map((item, index) => (
      <div key={index} className="bg-muted/30 rounded-xl p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          <span className="text-xs">{item.label}</span>
        </div>
        <p className="font-semibold text-sm">{item.value || '-'}</p>
      </div>
    ))}
  </div>
);

// Status badge component
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  label: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const colors = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium",
      colors[status]
    )}>
      {label}
    </span>
  );
};
