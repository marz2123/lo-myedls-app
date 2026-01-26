import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { StepProjectSelect } from './steps/StepProjectSelect';
import { StepCaptureMode } from './steps/StepCaptureMode';
import { StepRecording } from './steps/StepRecording';
import { StepAIProcessing } from './steps/StepAIProcessing';
import { StepReview } from './steps/StepReview';
import { Check } from 'lucide-react';

export type EDLType = 'avant_travaux' | 'apres_travaux' | 'location_entree' | 'location_sortie';
export type CaptureMode = 'video_walkthrough' | 'photos_voice';

export interface ExtractedTask {
  id: string;
  title: string;
  description: string;
  familyCode: string;
  familyName: string;
  category: string;
  subCategory: string;
  location: string;
  zone: string;
  priority: 'basse' | 'normale' | 'haute' | 'urgente';
  confidence: number;
  observations?: string;
}

export interface EdlSummary {
  resumeGlobal?: string;
  generalState?: string;
  criticalIssues?: string[];
  parPieces?: Array<{
    piece: string;
    etatGeneral: string;
    pointsForts?: string[];
    pointsFaibles?: string[];
  }>;
  byLocation?: Array<{
    location: string;
    state: string;
    observations: string[];
    photoUrls: string[];
  }>;
}

export interface CaptureData {
  projectId: string | null;
  projectName: string;
  projectAddress: string;
  edlType: EDLType | null;
  notes: string;
  captureMode: CaptureMode | null;
  videoBlob: Blob | null;
  audioBlobs: Blob[];
  photos: Array<{ url: string; timestamp: number }>;
  transcript: string;
  segments: Array<{
    id: string;
    startTime: number;
    endTime: number;
    transcript: string;
    location: string;
    zone: string;
    frameUrl?: string;
  }>;
  extractedTasks: ExtractedTask[];
  edlSummary: EdlSummary | null;
}

interface CaptureWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProjectId?: string;
  onComplete?: (data: CaptureData) => void;
}

const STEPS = [
  { id: 1, name: 'Projet', description: 'Sélection du projet' },
  { id: 2, name: 'Mode', description: 'Choix du mode de capture' },
  { id: 3, name: 'Capture', description: 'Enregistrement' },
  { id: 4, name: 'IA', description: 'Traitement IA' },
  { id: 5, name: 'Révision', description: 'Validation' },
];

export const CaptureWizard = ({
  open,
  onOpenChange,
  initialProjectId,
  onComplete,
}: CaptureWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [captureData, setCaptureData] = useState<CaptureData>({
    projectId: initialProjectId || null,
    projectName: '',
    projectAddress: '',
    edlType: null,
    notes: '',
    captureMode: null,
    videoBlob: null,
    audioBlobs: [],
    photos: [],
    transcript: '',
    segments: [],
    extractedTasks: [],
    edlSummary: null,
  });

  // Reset when opening with a project
  useEffect(() => {
    if (open && initialProjectId) {
      setCaptureData(prev => ({
        ...prev,
        projectId: initialProjectId,
      }));
      // Skip to step 2 if project is pre-selected
      setCurrentStep(1);
    }
  }, [open, initialProjectId]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setCaptureData({
        projectId: initialProjectId || null,
        projectName: '',
        projectAddress: '',
        edlType: null,
        notes: '',
        captureMode: null,
        videoBlob: null,
        audioBlobs: [],
        photos: [],
        transcript: '',
        segments: [],
        extractedTasks: [],
        edlSummary: null,
      });
    }
  }, [open, initialProjectId]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.(captureData);
    onOpenChange(false);
  };

  const updateCaptureData = (updates: Partial<CaptureData>) => {
    setCaptureData(prev => ({ ...prev, ...updates }));
  };

  const progressPercent = (currentStep / 5) * 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] p-0 rounded-t-3xl overflow-hidden flex flex-col"
      >
        {/* Header with steps */}
        <div className="flex-shrink-0 bg-background border-b">
          {/* Progress bar */}
          <Progress value={progressPercent} className="h-1 rounded-none" />
          
          {/* Steps indicator */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                          isCompleted && "bg-primary text-primary-foreground",
                          isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                          !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className={cn(
                        "text-xs mt-1 font-medium",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.name}
                      </span>
                    </div>
                    
                    {index < STEPS.length - 1 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-1",
                        currentStep > step.id ? "bg-primary" : "bg-muted"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <StepProjectSelect
              captureData={captureData}
              updateCaptureData={updateCaptureData}
              onNext={handleNext}
              onClose={() => onOpenChange(false)}
            />
          )}
          
          {currentStep === 2 && (
            <StepCaptureMode
              captureData={captureData}
              updateCaptureData={updateCaptureData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <StepRecording
              captureData={captureData}
              updateCaptureData={updateCaptureData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <StepAIProcessing
              captureData={captureData}
              updateCaptureData={updateCaptureData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 5 && (
            <StepReview
              captureData={captureData}
              updateCaptureData={updateCaptureData}
              onComplete={handleComplete}
              onBack={handleBack}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
