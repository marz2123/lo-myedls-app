import React from 'react';
import { Cloud, CloudOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SyncStatus } from '@/services/offlineQueue';

interface SyncStatusIconProps {
  status?: SyncStatus;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<SyncStatus, { 
  icon: React.ElementType; 
  label: string; 
  className: string;
}> = {
  pending: {
    icon: CloudOff,
    label: 'En attente de synchronisation',
    className: 'text-amber-500',
  },
  syncing: {
    icon: Loader2,
    label: 'Synchronisation en cours...',
    className: 'text-blue-500 animate-spin',
  },
  synced: {
    icon: Check,
    label: 'Synchronisé',
    className: 'text-emerald-500',
  },
  failed: {
    icon: AlertCircle,
    label: 'Échec de synchronisation',
    className: 'text-destructive',
  },
};

export const SyncStatusIcon: React.FC<SyncStatusIconProps> = ({
  status,
  size = 'sm',
  showTooltip = true,
  className,
}) => {
  // If no status or synced, don't show anything (clean state)
  if (!status || status === 'synced') {
    return null;
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  const iconElement = (
    <Icon className={cn(iconSize, config.className, className)} />
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Global sync status bar component
interface SyncStatusBarProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  onSync?: () => void;
  onRetry?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  failedCount,
  onSync,
  onRetry,
}) => {
  // Don't show if everything is synced
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
      !isOnline && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
      isOnline && pendingCount > 0 && "bg-blue-500/10 text-blue-600 border border-blue-500/20",
      isOnline && failedCount > 0 && pendingCount === 0 && "bg-destructive/10 text-destructive border border-destructive/20"
    )}>
      {!isOnline ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Mode hors ligne</span>
          {pendingCount > 0 && (
            <span className="text-muted-foreground">
              • {pendingCount} en attente
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Synchronisation...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{pendingCount} élément{pendingCount > 1 ? 's' : ''} en attente</span>
          <button 
            onClick={onSync}
            className="ml-1 underline hover:no-underline"
          >
            Synchroniser
          </button>
        </>
      ) : failedCount > 0 ? (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{failedCount} échec{failedCount > 1 ? 's' : ''}</span>
          <button 
            onClick={onRetry}
            className="ml-1 underline hover:no-underline"
          >
            Réessayer
          </button>
        </>
      ) : null}
    </div>
  );
};
