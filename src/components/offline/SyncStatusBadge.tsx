import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  isPending: boolean;
  className?: string;
}

export const SyncStatusBadge = ({ isPending, className }: SyncStatusBadgeProps) => {
  return (
    <AnimatePresence mode="wait">
      {isPending ? (
        <motion.div
          key="pending"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium',
            className
          )}
        >
          <CloudOff className="w-2.5 h-2.5" />
          <span>Offline</span>
        </motion.div>
      ) : (
        <motion.div
          key="synced"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium',
            className
          )}
        >
          <Cloud className="w-2.5 h-2.5" />
          <span>Synced</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
