import React from 'react';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  waveform: number[];
  isActive: boolean;
  className?: string;
}

export function WaveformVisualizer({ waveform, isActive, className }: WaveformVisualizerProps) {
  const bars = waveform.length > 0 ? waveform : Array(32).fill(0.1);
  
  return (
    <div className={cn(
      "flex items-center justify-center gap-0.5 h-16",
      className
    )}>
      {bars.slice(0, 32).map((value, index) => (
        <div
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-75",
            isActive ? "bg-primary" : "bg-muted-foreground/30"
          )}
          style={{
            height: `${Math.max(8, value * 64)}px`,
            opacity: isActive ? 0.6 + value * 0.4 : 0.3
          }}
        />
      ))}
    </div>
  );
}
