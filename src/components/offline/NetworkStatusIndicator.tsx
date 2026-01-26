import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  projectId?: string;
  variant?: 'bar' | 'badge' | 'minimal';
}

export const NetworkStatusIndicator = ({
  projectId,
  variant = 'bar',
}: NetworkStatusIndicatorProps) => {
  const { status, isOnline, isOffline, isSyncing } = useNetworkStatus();
  const { progress } = useSyncEngine(projectId);

  const statusConfig = {
    online: {
      icon: Wifi,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'En ligne',
    },
    offline: {
      icon: WifiOff,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Hors ligne',
    },
    syncing: {
      icon: RefreshCw,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      label: 'Synchronisation...',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === 'minimal') {
    return (
      <div className={cn('w-2 h-2 rounded-full', config.color)} />
    );
  }

  if (variant === 'badge') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border',
            config.bgColor,
            config.textColor,
            config.borderColor
          )}
        >
          <Icon className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
          <span>{config.label}</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Bar variant (default)
  return (
    <AnimatePresence>
      {(isOffline || isSyncing) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-[100] safe-area-top',
            config.bgColor,
            config.borderColor,
            'border-b'
          )}
        >
          <div className="px-4 py-2 flex items-center justify-center gap-2">
            <Icon className={cn('w-4 h-4', config.textColor, isSyncing && 'animate-spin')} />
            <span className={cn('text-sm font-medium', config.textColor)}>
              {isSyncing && progress.total > 0 ? (
                <>Synchronisation en cours ({progress.completed}/{progress.total})</>
              ) : (
                config.label
              )}
            </span>
            {isSyncing && progress.total > 0 && (
              <div className="ml-2 w-24 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
