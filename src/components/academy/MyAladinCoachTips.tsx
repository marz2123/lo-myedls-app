import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, ChevronRight, Camera, Eye, 
  FileText, AlertTriangle, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachTip {
  id: string;
  type: 'reminder' | 'tip' | 'warning' | 'suggestion';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon: React.ElementType;
  priority: number;
}

const tipIcons = {
  reminder: Camera,
  tip: Lightbulb,
  warning: AlertTriangle,
  suggestion: Eye
};

const tipColors = {
  reminder: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
  tip: 'bg-green-500/10 border-green-500/20 text-green-600',
  warning: 'bg-orange-500/10 border-orange-500/20 text-orange-600',
  suggestion: 'bg-purple-500/10 border-purple-500/20 text-purple-600'
};

interface MyAladinCoachTipsProps {
  tips: CoachTip[];
  onDismiss: (tipId: string) => void;
  className?: string;
}

export const MyAladinCoachTips: React.FC<MyAladinCoachTipsProps> = ({
  tips,
  onDismiss,
  className = ''
}) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  const activeTips = tips.filter(t => !dismissedTips.includes(t.id));
  const currentTip = activeTips[currentTipIndex];

  useEffect(() => {
    if (currentTipIndex >= activeTips.length && activeTips.length > 0) {
      setCurrentTipIndex(0);
    }
  }, [activeTips.length, currentTipIndex]);

  const handleDismiss = (tipId: string) => {
    setDismissedTips(prev => [...prev, tipId]);
    onDismiss(tipId);
  };

  const handleNext = () => {
    setCurrentTipIndex(prev => (prev + 1) % activeTips.length);
  };

  if (!currentTip) return null;

  const Icon = tipIcons[currentTip.type];
  const colorClass = tipColors[currentTip.type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentTip.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`${className}`}
      >
        <div className={`rounded-xl border p-4 ${colorClass}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-background/50 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">
                  MyAladin Coach
                </span>
              </div>
              
              <p className="text-sm mb-3">{currentTip.message}</p>
              
              {currentTip.action && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={currentTip.action.onClick}
                  className="text-xs"
                >
                  {currentTip.action.label}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {activeTips.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => handleDismiss(currentTip.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {activeTips.length > 1 && (
            <div className="flex gap-1 justify-center mt-3">
              {activeTips.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentTipIndex ? 'bg-current' : 'bg-current/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Sample tips generator based on context
export const generateCoachTips = (context: {
  currentRoom?: string;
  photosCount?: number;
  hasPlafond?: boolean;
  hasVMC?: boolean;
  anomaliesCount?: number;
}): CoachTip[] => {
  const tips: CoachTip[] = [];

  if (context.currentRoom === 'salle_de_bain' && !context.hasVMC) {
    tips.push({
      id: 'vmc_reminder',
      type: 'reminder',
      message: 'La salle de bain nécessite toujours une photo de VMC.',
      icon: Camera,
      priority: 1
    });
  }

  if (context.photosCount && context.photosCount < 3 && !context.hasPlafond) {
    tips.push({
      id: 'plafond_reminder',
      type: 'reminder',
      message: 'N\'oublie pas la photo du plafond.',
      icon: Camera,
      priority: 2
    });
  }

  if (context.anomaliesCount && context.anomaliesCount > 0) {
    tips.push({
      id: 'anomaly_tip',
      type: 'tip',
      message: `${context.anomaliesCount} anomalie(s) détectée(s). Veux-tu que je génère les tâches associées ?`,
      icon: Lightbulb,
      priority: 3
    });
  }

  tips.push({
    id: 'general_tip',
    type: 'suggestion',
    message: 'J\'ai une vidéo de 30s pour t\'aider à détecter les fissures structurelles.',
    icon: Eye,
    priority: 10
  });

  return tips.sort((a, b) => a.priority - b.priority);
};
