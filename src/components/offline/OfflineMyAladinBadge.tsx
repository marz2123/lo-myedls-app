import { motion } from 'framer-motion';
import { WifiOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineMyAladinBadgeProps {
  isOffline: boolean;
  className?: string;
}

export const OfflineMyAladinBadge = ({ isOffline, className }: OfflineMyAladinBadgeProps) => {
  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-amber-100 text-amber-700 border border-amber-200',
        'text-[10px] font-medium',
        className
      )}
    >
      <Sparkles className="w-3 h-3" />
      <span>Mode IA limité (offline)</span>
      <WifiOff className="w-3 h-3" />
    </motion.div>
  );
};
