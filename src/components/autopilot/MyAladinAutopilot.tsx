import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyAladinAutopilotProps {
  message: string;
  isActive: boolean;
  variant?: 'default' | 'analyzing' | 'success' | 'warning';
}

const ALADIN_MESSAGES = {
  idle: "Prêt pour l'Autopilot ! Appuyez sur démarrer pour scanner le bien.",
  recording: "J'analyse en temps réel... Continuez à filmer lentement.",
  roomDetected: (room: string) => `Pièce détectée : ${room}. Je capture les détails.`,
  uploading: "Téléchargement de la vidéo en cours...",
  segmenting: "Je découpe la vidéo par pièce...",
  analyzing: "Analyse IA avancée en cours... Je détecte les éléments et anomalies.",
  generating: "Je génère le rapport EDL complet...",
  complete: "Analyse terminée ! Votre EDL est prêt à être validé.",
  error: "Oups, une erreur s'est produite. Veuillez réessayer."
};

export const MyAladinAutopilot: React.FC<MyAladinAutopilotProps> = ({
  message,
  isActive,
  variant = 'default'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'analyzing':
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30';
      case 'success':
        return 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/30';
      case 'warning':
        return 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-500/30';
      default:
        return 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'analyzing': return 'text-amber-400';
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            "rounded-2xl border p-4 backdrop-blur-lg",
            getVariantStyles()
          )}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <motion.div
              animate={variant === 'analyzing' ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "p-2 rounded-xl",
                variant === 'analyzing' ? 'bg-amber-500/20' :
                variant === 'success' ? 'bg-emerald-500/20' :
                variant === 'warning' ? 'bg-red-500/20' :
                'bg-blue-500/20'
              )}
            >
              <Bot className={cn("h-6 w-6", getIconColor())} />
            </motion.div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">MyAladin</span>
                {variant === 'analyzing' && (
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </motion.div>
                )}
              </div>
              <motion.p
                key={message}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-foreground/80"
              >
                {message}
              </motion.p>
            </div>
          </div>

          {/* Progress dots for analyzing state */}
          {variant === 'analyzing' && (
            <motion.div
              className="flex items-center gap-1 mt-3 pl-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-400/50"
                  animate={{
                    scale: [1, 1.3, 1],
                    backgroundColor: ['rgba(251, 191, 36, 0.5)', 'rgba(251, 191, 36, 1)', 'rgba(251, 191, 36, 0.5)']
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const getAladinMessage = (phase: string, currentRoom?: string): string => {
  switch (phase) {
    case 'idle': return ALADIN_MESSAGES.idle;
    case 'recording': return currentRoom ? ALADIN_MESSAGES.roomDetected(currentRoom) : ALADIN_MESSAGES.recording;
    case 'uploading': return ALADIN_MESSAGES.uploading;
    case 'segmenting': return ALADIN_MESSAGES.segmenting;
    case 'analyzing': return ALADIN_MESSAGES.analyzing;
    case 'generating': return ALADIN_MESSAGES.generating;
    case 'complete': return ALADIN_MESSAGES.complete;
    default: return ALADIN_MESSAGES.idle;
  }
};

export const getAladinVariant = (phase: string): 'default' | 'analyzing' | 'success' | 'warning' => {
  switch (phase) {
    case 'analyzing':
    case 'generating':
    case 'segmenting':
      return 'analyzing';
    case 'complete':
      return 'success';
    case 'error':
      return 'warning';
    default:
      return 'default';
  }
};

export default MyAladinAutopilot;
