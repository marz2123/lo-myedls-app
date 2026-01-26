import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Droplet, Flame, CircuitBoard, Wind, 
  Thermometer, Container, Square, DoorOpen, 
  AlertCircle, Snowflake, Phone, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TechnicalElement {
  type: string;
  label: string;
  confidence: number;
  state?: 'bon' | 'moyen' | 'mauvais' | 'absent';
  reading?: string; // For meters
}

interface TechnicalElementBadgeProps {
  element: TechnicalElement;
  variant?: 'compact' | 'full';
  className?: string;
}

const TECHNICAL_ICONS: Record<string, React.ElementType> = {
  compteur_electricite: Zap,
  compteur_eau: Droplet,
  compteur_gaz: Flame,
  tableau_electrique: CircuitBoard,
  vmc: Wind,
  radiateur: Thermometer,
  ballon_eau_chaude: Container,
  fenetre: Square,
  porte_exterieure: DoorOpen,
  detecteur_fumee: AlertCircle,
  chaudiere: Flame,
  climatisation: Snowflake,
  interphone: Phone,
};

const TECHNICAL_COLORS: Record<string, string> = {
  compteur_electricite: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  compteur_eau: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  compteur_gaz: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  tableau_electrique: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  vmc: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  radiateur: 'bg-red-500/10 text-red-600 border-red-500/30',
  ballon_eau_chaude: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  fenetre: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
  porte_exterieure: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  detecteur_fumee: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  chaudiere: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  climatisation: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  interphone: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
};

const STATE_COLORS = {
  bon: 'bg-green-500/10 text-green-600 border-green-500/30',
  moyen: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  mauvais: 'bg-red-500/10 text-red-600 border-red-500/30',
  absent: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

export const TechnicalElementBadge: React.FC<TechnicalElementBadgeProps> = ({
  element,
  variant = 'compact',
  className
}) => {
  const Icon = TECHNICAL_ICONS[element.type] || Cpu;
  const colorClass = TECHNICAL_COLORS[element.type] || 'bg-gray-500/10 text-gray-600 border-gray-500/30';

  if (variant === 'compact') {
    return (
      <Badge 
        className={cn(
          "gap-1.5 text-xs font-medium border",
          colorClass,
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {element.label}
      </Badge>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border",
      colorClass,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{element.label}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {element.state && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", STATE_COLORS[element.state])}
              >
                {element.state === 'bon' && 'Bon état'}
                {element.state === 'moyen' && 'État moyen'}
                {element.state === 'mauvais' && 'Mauvais état'}
                {element.state === 'absent' && 'Absent'}
              </Badge>
            )}
            {element.confidence >= 0.8 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                IA: {Math.round(element.confidence * 100)}%
              </Badge>
            )}
            {element.reading && (
              <Badge variant="outline" className="text-xs font-mono">
                {element.reading}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TechnicalElementsList: React.FC<{
  elements: TechnicalElement[];
  variant?: 'compact' | 'full';
  className?: string;
}> = ({ elements, variant = 'full', className }) => {
  if (!elements || elements.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {elements.map((el, idx) => (
          <TechnicalElementBadge key={idx} element={el} variant="compact" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {elements.map((el, idx) => (
        <TechnicalElementBadge key={idx} element={el} variant="full" />
      ))}
    </div>
  );
};
