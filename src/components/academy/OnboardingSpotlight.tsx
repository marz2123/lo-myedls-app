import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, X, Camera, CheckSquare, Wand2, 
  Clock, FileDown, RefreshCw, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpotlightStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position?: 'center' | 'top' | 'bottom';
}

const onboardingSteps: SpotlightStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur MyEDLs !',
    description: 'Découvrez comment réaliser des états des lieux professionnels en quelques minutes.',
    icon: Sparkles,
    position: 'center'
  },
  {
    id: 'capture',
    title: 'Capture Hub',
    description: 'Capturez photos, vidéos et notes vocales directement depuis votre appareil.',
    icon: Camera,
    position: 'center'
  },
  {
    id: 'checklist',
    title: 'Smart Checklist',
    description: 'Notre checklist intelligente vous guide pour ne rien oublier.',
    icon: CheckSquare,
    position: 'center'
  },
  {
    id: 'magic',
    title: 'Magic Button',
    description: 'Un clic pour compléter automatiquement tout ce qui manque avec l\'IA.',
    icon: Wand2,
    position: 'center'
  },
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Visualisez l\'historique complet de vos actions et observations.',
    icon: Clock,
    position: 'center'
  },
  {
    id: 'export',
    title: 'Export Pro',
    description: 'Générez des rapports PDF, DPGF et notices descriptives en un clic.',
    icon: FileDown,
    position: 'center'
  },
  {
    id: 'sync',
    title: 'Sync MyHome',
    description: 'Synchronisez automatiquement vos EDL avec l\'écosystème MyHome.',
    icon: RefreshCw,
    position: 'center'
  }
];

interface OnboardingSpotlightProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingSpotlight: React.FC<OnboardingSpotlightProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border/50"
          >
            {/* Progress */}
            <div className="flex gap-1 mb-6">
              {onboardingSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <step.icon className="w-8 h-8 text-primary" />
              </motion.div>
              
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Passer
              </Button>
              <Button onClick={handleNext} className="flex-1">
                {isLastStep ? 'Commencer' : 'Suivant'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Step indicator */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              {currentStep + 1} / {onboardingSteps.length}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('myedls_onboarding_complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('myedls_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('myedls_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('myedls_onboarding_complete');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  };
};
