import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  audioLevel: number;
  isActive: boolean;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  audioLevel,
  isActive,
  className,
}) => {
  const bars = useMemo(() => {
    // Create 12 bars with varying heights based on audio level
    return Array.from({ length: 12 }, (_, i) => {
      const baseHeight = 0.3 + Math.sin((i / 12) * Math.PI) * 0.3;
      const variance = Math.sin(i * 0.8) * 0.2;
      return baseHeight + variance;
    });
  }, []);

  return (
    <div className={cn("flex items-center justify-center gap-0.5 h-8", className)}>
      {bars.map((baseHeight, index) => {
        const delay = index * 0.05;
        const height = isActive ? baseHeight + audioLevel * 0.7 : 0.2;
        
        return (
          <motion.div
            key={index}
            className="w-1 rounded-full bg-primary"
            initial={{ height: 4 }}
            animate={{
              height: height * 32,
              opacity: isActive ? 0.6 + audioLevel * 0.4 : 0.3,
            }}
            transition={{
              duration: 0.1,
              delay: isActive ? delay : 0,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
};
