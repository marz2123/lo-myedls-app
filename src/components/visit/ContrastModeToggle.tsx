import { useState, useEffect } from 'react';
import { Sun, Moon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ContrastMode = 'auto' | 'high' | 'dark' | 'light';

interface ContrastModeToggleProps {
  onModeChange?: (mode: ContrastMode) => void;
  className?: string;
}

export const ContrastModeToggle = ({
  onModeChange,
  className,
}: ContrastModeToggleProps) => {
  const [mode, setMode] = useState<ContrastMode>('auto');
  const [ambientLight, setAmbientLight] = useState<'bright' | 'dim' | 'dark'>('bright');

  // Detect ambient light if available
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-ignore - AmbientLightSensor may not be in TypeScript types
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          const lux = sensor.illuminance;
          if (lux < 10) {
            setAmbientLight('dark');
          } else if (lux < 100) {
            setAmbientLight('dim');
          } else {
            setAmbientLight('bright');
          }
        });
        sensor.start();
        
        return () => sensor.stop();
      } catch (e) {
        console.log('AmbientLightSensor not available');
      }
    }
  }, []);

  // Apply contrast mode
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all contrast classes
    root.classList.remove('high-contrast', 'dark-mode-forced', 'light-mode-forced');
    
    let effectiveMode = mode;
    if (mode === 'auto') {
      // Auto mode based on ambient light
      effectiveMode = ambientLight === 'dark' ? 'dark' : 
                      ambientLight === 'dim' ? 'high' : 'light';
    }
    
    switch (effectiveMode) {
      case 'high':
        root.classList.add('high-contrast');
        break;
      case 'dark':
        root.classList.add('dark');
        root.classList.add('dark-mode-forced');
        break;
      case 'light':
        root.classList.remove('dark');
        root.classList.add('light-mode-forced');
        break;
    }
    
    onModeChange?.(effectiveMode);
  }, [mode, ambientLight, onModeChange]);

  const cycleMode = () => {
    const modes: ContrastMode[] = ['auto', 'high', 'dark', 'light'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'auto':
        return <Eye className="w-5 h-5" />;
      case 'high':
        return <Eye className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'light':
        return <Sun className="w-5 h-5" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'auto':
        return 'Auto';
      case 'high':
        return 'Contraste';
      case 'dark':
        return 'Sombre';
      case 'light':
        return 'Clair';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleMode}
      className={cn(
        'gap-2 h-10 min-w-[44px]',
        mode === 'high' && 'border-yellow-500 text-yellow-600',
        mode === 'dark' && 'bg-slate-800 text-white border-slate-700',
        className
      )}
      style={{ minHeight: '44px' }}
    >
      {getModeIcon()}
      <span className="hidden sm:inline text-xs">{getModeLabel()}</span>
      {mode === 'auto' && (
        <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
          {ambientLight === 'dark' ? '🌙' : ambientLight === 'dim' ? '🌤' : '☀️'}
        </Badge>
      )}
    </Button>
  );
};

// High contrast CSS to be added to index.css
export const HIGH_CONTRAST_CSS = `
.high-contrast {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --primary: 60 100% 50%;
  --primary-foreground: 0 0% 0%;
  --muted: 0 0% 20%;
  --muted-foreground: 0 0% 80%;
  --border: 0 0% 40%;
}

.high-contrast * {
  border-color: hsl(0 0% 60%) !important;
}

.high-contrast button,
.high-contrast [role="button"] {
  border-width: 2px !important;
}
`;
