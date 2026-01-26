import React from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2 } from 'lucide-react';

interface ScanAnimationProps {
  isScanning: boolean;
  onComplete?: () => void;
}

export function ScanAnimation({ isScanning, onComplete }: ScanAnimationProps) {
  if (!isScanning) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
    >
      {/* Scanning circles */}
      <div className="relative w-32 h-32 mb-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ 
              scale: [0.5, 1.5], 
              opacity: [1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut"
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="p-4 rounded-full bg-primary/10"
          >
            <Search className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
      </div>

      {/* Scanning text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="font-semibold text-lg mb-2">Analyse en cours...</h3>
        <p className="text-sm text-muted-foreground">
          Recherche des éléments manquants
        </p>
      </motion.div>

      {/* Progress dots */}
      <div className="flex gap-1 mt-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function ScanCompleteAnimation({ itemsFound }: { itemsFound: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="p-4 rounded-full bg-green-100 mb-4"
      >
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </motion.div>
      <h3 className="font-semibold text-lg">Analyse terminée</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {itemsFound === 0 
          ? "Aucun élément manquant ! 🎉"
          : `${itemsFound} élément(s) à compléter`
        }
      </p>
    </motion.div>
  );
}
