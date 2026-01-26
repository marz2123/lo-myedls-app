import React from 'react';
import { DPE_COLORS, GES_COLORS, type EnergyClass } from '@/types/energy';
import { cn } from '@/lib/utils';

interface DPEGaugeProps {
  classe: EnergyClass;
  value?: number;
  type: 'energie' | 'ges';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const CLASSES: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const ENERGIE_LABELS = {
  A: '≤ 70',
  B: '71-110',
  C: '111-180',
  D: '181-250',
  E: '251-330',
  F: '331-420',
  G: '> 420',
};

const GES_LABELS = {
  A: '≤ 6',
  B: '7-11',
  C: '12-30',
  D: '31-50',
  E: '51-70',
  F: '71-100',
  G: '> 100',
};

export const DPEGauge: React.FC<DPEGaugeProps> = ({
  classe,
  value,
  type,
  size = 'md',
  showValue = true,
}) => {
  const colors = type === 'energie' ? DPE_COLORS : GES_COLORS;
  const labels = type === 'energie' ? ENERGIE_LABELS : GES_LABELS;
  const title = type === 'energie' ? 'Consommation énergétique' : 'Émissions de gaz à effet de serre';
  const unit = type === 'energie' ? 'kWh/m².an' : 'kg CO₂/m².an';

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const barHeight = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-9',
  };

  const arrowSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className={cn('font-medium text-foreground', sizeClasses[size])}>
        {title}
      </div>
      
      <div className="relative flex flex-col gap-0.5">
        {CLASSES.map((c) => {
          const isActive = c === classe;
          const baseWidth = 40 + (CLASSES.indexOf(c) * 8);
          
          return (
            <div key={c} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-between px-2 rounded-r-md transition-all',
                  barHeight[size],
                  isActive && 'ring-2 ring-foreground ring-offset-1 scale-105'
                )}
                style={{
                  backgroundColor: colors[c],
                  width: `${baseWidth}%`,
                }}
              >
                <span className={cn(
                  'font-bold',
                  sizeClasses[size],
                  type === 'ges' ? 'text-white' : 'text-gray-800'
                )}>
                  {c}
                </span>
                <span className={cn(
                  'text-xs',
                  type === 'ges' ? 'text-white/80' : 'text-gray-600'
                )}>
                  {labels[c]}
                </span>
              </div>
              
              {isActive && (
                <div className="flex items-center gap-1 animate-in slide-in-from-left-2">
                  <svg
                    className={cn(arrowSize[size], 'text-foreground')}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {showValue && value !== undefined && (
                    <span className={cn('font-semibold text-foreground', sizeClasses[size])}>
                      {Math.round(value)} {unit}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className={cn('text-muted-foreground mt-1', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
        {type === 'energie' 
          ? 'Logement économe ← → Logement énergivore'
          : 'Faibles émissions ← → Fortes émissions'
        }
      </div>
    </div>
  );
};
