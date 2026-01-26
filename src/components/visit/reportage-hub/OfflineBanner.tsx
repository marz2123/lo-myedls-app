import React from 'react';
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingMediaCount: number;
  failedCount: number;
  onForceSync?: () => void;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  pendingMediaCount,
  failedCount,
  onForceSync,
  className,
}) => {
  const totalPending = pendingCount + pendingMediaCount;
  const showBanner = !isOnline || totalPending > 0 || isSyncing;

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] safe-area-top",
          className
        )}
      >
        <div
          className={cn(
            "px-4 py-2 flex items-center justify-between gap-3",
            "backdrop-blur-md border-b",
            !isOnline 
              ? "bg-amber-500/90 text-white border-amber-600"
              : isSyncing
                ? "bg-blue-500/90 text-white border-blue-600"
                : failedCount > 0
                  ? "bg-red-500/90 text-white border-red-600"
                  : "bg-green-500/90 text-white border-green-600"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {!isOnline ? (
              <>
                <CloudOff className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  Mode hors ligne — vos données seront synchronisées automatiquement
                </span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
                <span className="text-sm font-medium truncate">
                  Synchronisation en cours...
                </span>
              </>
            ) : failedCount > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {failedCount} élément{failedCount > 1 ? 's' : ''} en échec
                </span>
              </>
            ) : totalPending > 0 ? (
              <>
                <Wifi className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {totalPending} en attente de synchronisation
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  Tout est synchronisé
                </span>
              </>
            )}
          </div>

          {isOnline && totalPending > 0 && !isSyncing && onForceSync && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onForceSync}
              className="h-7 px-2 text-white hover:bg-white/20 flex-shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Sync
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact version for inline use
export const OfflineIndicator: React.FC<{
  isOnline: boolean;
  pendingCount: number;
  className?: string;
}> = ({ isOnline, pendingCount, className }) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        !isOnline 
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        className
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-3 w-3" />
          <span>Hors ligne</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3" />
          <span>{pendingCount} en attente</span>
        </>
      )}
    </div>
  );
};
