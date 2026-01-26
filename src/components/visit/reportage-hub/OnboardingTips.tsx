import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, Mic, Video, ListChecks, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Tip {
  id: string;
  icon: React.ReactNode;
  message: string;
  action?: string;
}

const TIPS: Tip[] = [
  {
    id: 'voice',
    icon: <Mic className="h-4 w-4" />,
    message: "Astuce : parlez pour créer une note vocale IA qui sera automatiquement transcrite et localisée.",
    action: "Essayer"
  },
  {
    id: 'video',
    icon: <Video className="h-4 w-4" />,
    message: "Filmez en continu, l'IA segmente automatiquement vos séquences par pièce.",
    action: "En savoir plus"
  },
  {
    id: 'checklist',
    icon: <ListChecks className="h-4 w-4" />,
    message: "Les zones non vues apparaissent dans la checklist EDL pour ne rien oublier.",
    action: "Voir checklist"
  },
  {
    id: 'technical',
    icon: <Lightbulb className="h-4 w-4" />,
    message: "L'IA détecte automatiquement les compteurs, tableaux électriques et équipements techniques.",
  }
];

const STORAGE_KEY = 'myedls_onboarding_tips_dismissed';

interface OnboardingTipsProps {
  className?: string;
  onAction?: (tipId: string) => void;
}

export const OnboardingTips: React.FC<OnboardingTipsProps> = ({ className, onAction }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Load dismissed tips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDismissedTips(parsed);
      } catch (e) {
        console.error('Error parsing dismissed tips:', e);
      }
    }
  }, []);

  // Get available tips (not dismissed)
  const availableTips = TIPS.filter(tip => !dismissedTips.includes(tip.id));
  const currentTip = availableTips[currentTipIndex % availableTips.length];

  // Auto-rotate tips
  useEffect(() => {
    if (availableTips.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % availableTips.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [availableTips.length]);

  const handleDismiss = (tipId: string) => {
    const newDismissed = [...dismissedTips, tipId];
    setDismissedTips(newDismissed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDismissed));
    
    if (availableTips.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleDismissAll = () => {
    const allTipIds = TIPS.map(t => t.id);
    setDismissedTips(allTipIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTipIds));
    setIsVisible(false);
  };

  const handleAction = (tipId: string) => {
    onAction?.(tipId);
    handleDismiss(tipId);
  };

  if (!isVisible || availableTips.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentTip?.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto",
          "bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50",
          "p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {currentTip?.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed">
              {currentTip?.message}
            </p>
            
            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {currentTip?.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary gap-1"
                  onClick={() => handleAction(currentTip.id)}
                >
                  {currentTip.action}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => handleDismiss(currentTip?.id || '')}
              >
                Compris
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0 -mt-1 -mr-1"
            onClick={handleDismissAll}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress dots */}
        {availableTips.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {availableTips.map((tip, index) => (
              <motion.div
                key={tip.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentTipIndex % availableTips.length
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
