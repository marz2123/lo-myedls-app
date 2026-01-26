import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, Mic, Sparkles } from 'lucide-react';

interface EmptyStateOnboardingProps {
  onStartCapture: (mode: 'guided' | 'free') => void;
}

export const EmptyStateOnboarding: React.FC<EmptyStateOnboardingProps> = ({
  onStartCapture
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 animate-in fade-in duration-500">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Camera className="h-8 w-8 text-primary" />
      </div>
      
      {/* Text */}
      <h2 className="text-lg font-semibold mb-1 text-center">Aucun média</h2>
      <p className="text-muted-foreground text-center text-sm mb-6">
        Commencez à documenter
      </p>

      {/* Two mode buttons */}
      <div className="w-full max-w-xs space-y-3">
        <Button
          onClick={() => onStartCapture('guided')}
          className="w-full h-14 rounded-2xl gap-3 justify-start px-4"
          size="lg"
        >
          <MapPin className="h-5 w-5" />
          <div className="text-left flex-1">
            <div className="font-medium text-sm">Mode Guidé</div>
            <div className="text-xs opacity-70">Sélection manuelle</div>
          </div>
        </Button>

        <Button
          onClick={() => onStartCapture('free')}
          variant="outline"
          className="w-full h-14 rounded-2xl gap-3 justify-start px-4"
          size="lg"
        >
          <Mic className="h-5 w-5 text-primary" />
          <div className="text-left flex-1">
            <div className="font-medium text-sm flex items-center gap-2">
              Vidéo Continue
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">L'IA localise pour vous</div>
          </div>
        </Button>
      </div>
    </div>
  );
};
