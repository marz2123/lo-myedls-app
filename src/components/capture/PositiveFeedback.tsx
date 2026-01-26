import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Sparkles, Star, PartyPopper } from 'lucide-react';

interface PositiveFeedbackProps {
  show: boolean;
  type?: 'piece_complete' | 'zone_complete' | 'edl_complete' | 'critical_found';
  message?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

const FEEDBACK_CONFIG = {
  piece_complete: {
    icon: CheckCircle2,
    messages: [
      "Pièce complète ✔",
      "Parfait, on a tout ici.",
      "Nickel, bien couvert !",
      "C'est bon pour cette pièce.",
    ],
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  zone_complete: {
    icon: Star,
    messages: [
      "Zone vérifiée ✔",
      "Bien noté !",
    ],
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  edl_complete: {
    icon: PartyPopper,
    messages: [
      "EDL terminé ! 🎉",
      "Capture complète !",
      "Excellent travail !",
    ],
    color: "text-primary",
    bg: "bg-primary/10",
  },
  critical_found: {
    icon: Sparkles,
    messages: [
      "Observation critique ajoutée",
      "Point important noté",
    ],
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
};

/**
 * PositiveFeedback - Animated positive feedback messages
 * 
 * Shows brief, motivating messages with subtle animations
 */
export const PositiveFeedback = ({
  show,
  type = 'piece_complete',
  message,
  duration = 2000,
  onComplete,
  className,
}: PositiveFeedbackProps) => {
  const [visible, setVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');

  const config = FEEDBACK_CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    if (show) {
      // Pick random message if not provided
      const msg = message || config.messages[Math.floor(Math.random() * config.messages.length)];
      setDisplayMessage(msg);
      setVisible(true);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, message, config.messages, duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-1/3 z-50 flex justify-center pointer-events-none",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-lg",
          "animate-scale-in",
          config.bg,
          "backdrop-blur-sm border border-white/10"
        )}
      >
        <div className={cn(
          "p-2 rounded-full",
          config.bg,
          "animate-[bounce_0.5s_ease-out]"
        )}>
          <Icon className={cn("h-7 w-7", config.color)} />
        </div>
        
        <span className={cn(
          "text-lg font-semibold",
          config.color
        )}>
          {displayMessage}
        </span>
      </div>
    </div>
  );
};

/**
 * Hook to trigger positive feedback
 */
export function usePositiveFeedback() {
  const [feedbackState, setFeedbackState] = useState<{
    show: boolean;
    type: keyof typeof FEEDBACK_CONFIG;
    message?: string;
  }>({ show: false, type: 'piece_complete' });

  const showFeedback = (
    type: keyof typeof FEEDBACK_CONFIG,
    message?: string
  ) => {
    setFeedbackState({ show: true, type, message });
  };

  const hideFeedback = () => {
    setFeedbackState(prev => ({ ...prev, show: false }));
  };

  return {
    feedbackState,
    showFeedback,
    hideFeedback,
  };
}
