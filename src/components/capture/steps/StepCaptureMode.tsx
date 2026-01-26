import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, Camera, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaptureData, CaptureMode } from '../CaptureWizard';

interface StepCaptureModeProps {
  captureData: CaptureData;
  updateCaptureData: (updates: Partial<CaptureData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CAPTURE_MODES: Array<{
  value: CaptureMode;
  title: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    value: 'video_walkthrough',
    title: 'Parcours vidéo complet',
    description: 'Tu filmes en marchant, tu décris à voix haute pièce par pièce. L\'IA s\'occupe du reste.',
    icon: Video,
  },
  {
    value: 'photos_voice',
    title: 'Photos + notes vocales',
    description: 'Tu prends des photos et tu ajoutes une courte note vocale par zone importante.',
    icon: Camera,
  },
];

export const StepCaptureMode = ({
  captureData,
  updateCaptureData,
  onNext,
  onBack,
}: StepCaptureModeProps) => {
  const selectedMode = captureData.captureMode;

  const handleModeSelect = (mode: CaptureMode) => {
    updateCaptureData({ captureMode: mode });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Mode de capture</h2>
          <p className="text-muted-foreground mt-1">
            Choisis comment tu veux réaliser l'EDL pour ce projet.
          </p>
        </div>

        {/* Mode selection - Two large cards */}
        <div className="space-y-4">
          {CAPTURE_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.value;
            
            return (
              <Card
                key={mode.value}
                className={cn(
                  "p-6 cursor-pointer transition-all relative",
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-accent"
                )}
                onClick={() => handleModeSelect(mode.value)}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    <Icon className="h-7 w-7" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-semibold text-lg mb-2">{mode.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-6 border-t bg-background safe-area-bottom">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="flex-1 h-14"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Button>
          <Button 
            size="lg"
            className="flex-1 h-14 text-lg font-semibold"
            disabled={!selectedMode}
            onClick={onNext}
          >
            Suivant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
