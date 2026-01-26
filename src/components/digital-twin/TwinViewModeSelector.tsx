import { 
  Box, 
  Palette, 
  AlertTriangle, 
  ListTodo, 
  Wrench, 
  Wifi, 
  Zap, 
  GitCompare, 
  Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TwinViewMode } from '@/types/digital-twin';
import { cn } from '@/lib/utils';

interface TwinViewModeSelectorProps {
  currentMode: TwinViewMode;
  onModeChange: (mode: TwinViewMode) => void;
}

const VIEW_MODES: { mode: TwinViewMode; label: string; icon: React.ElementType; color: string }[] = [
  { mode: 'structure', label: 'Structure', icon: Box, color: 'text-slate-500' },
  { mode: 'materials', label: 'Matériaux', icon: Palette, color: 'text-pink-500' },
  { mode: 'anomalies', label: 'Anomalies', icon: AlertTriangle, color: 'text-red-500' },
  { mode: 'tasks', label: 'Tâches', icon: ListTodo, color: 'text-purple-500' },
  { mode: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-orange-500' },
  { mode: 'iot', label: 'IoT', icon: Wifi, color: 'text-green-500' },
  { mode: 'energy', label: 'Énergie', icon: Zap, color: 'text-yellow-500' },
  { mode: 'before_after', label: 'Avant/Après', icon: GitCompare, color: 'text-blue-500' },
  { mode: 'timeline', label: 'Timeline', icon: Clock, color: 'text-cyan-500' },
];

export function TwinViewModeSelector({ currentMode, onModeChange }: TwinViewModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg">
      {VIEW_MODES.map(({ mode, label, icon: Icon, color }) => (
        <Button
          key={mode}
          variant={currentMode === mode ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModeChange(mode)}
          className={cn(
            'h-8 gap-1.5 text-xs',
            currentMode !== mode && color
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
