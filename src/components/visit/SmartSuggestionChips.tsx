import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  AlertTriangle, 
  Droplets, 
  Zap,
  PaintBucket,
  Wrench,
  ThermometerSun,
  Bug,
  Wind,
  Flame,
  X,
  Plus,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Categories of common observations
const OBSERVATION_CATEGORIES = {
  etat: {
    label: 'État général',
    items: [
      { id: 'bon_etat', label: 'Bon état', icon: Check, color: 'bg-emerald-500', preconisation: 'RAS' },
      { id: 'usage_normal', label: 'Usure normale', icon: Check, color: 'bg-green-500', preconisation: 'Entretien courant recommandé' },
      { id: 'a_surveiller', label: 'À surveiller', icon: AlertTriangle, color: 'bg-amber-500', preconisation: 'Surveillance régulière conseillée' },
    ]
  },
  degradations: {
    label: 'Dégradations',
    items: [
      { id: 'fissure', label: 'Fissure', icon: Zap, color: 'bg-orange-500', preconisation: 'Reboucher et repeindre' },
      { id: 'trou', label: 'Trou', icon: AlertTriangle, color: 'bg-red-500', preconisation: 'Reboucher, enduire et repeindre' },
      { id: 'rayure', label: 'Rayure', icon: AlertTriangle, color: 'bg-orange-400', preconisation: 'Ponçage et remise en état' },
      { id: 'eclat', label: 'Éclat', icon: AlertTriangle, color: 'bg-red-400', preconisation: 'Réparation ou remplacement' },
      { id: 'cassure', label: 'Cassé', icon: X, color: 'bg-red-600', preconisation: 'Remplacement à prévoir' },
    ]
  },
  humidite: {
    label: 'Humidité',
    items: [
      { id: 'trace_humidite', label: 'Trace d\'humidité', icon: Droplets, color: 'bg-blue-500', preconisation: 'Traitement hydrofuge et repeindre' },
      { id: 'moisissure', label: 'Moisissure', icon: Bug, color: 'bg-purple-600', preconisation: 'Traitement anti-moisissure urgent' },
      { id: 'infiltration', label: 'Infiltration', icon: Droplets, color: 'bg-blue-600', preconisation: 'Recherche de fuite et réparation' },
      { id: 'condensation', label: 'Condensation', icon: Wind, color: 'bg-cyan-500', preconisation: 'Améliorer la ventilation' },
    ]
  },
  surface: {
    label: 'Surface',
    items: [
      { id: 'tache', label: 'Tache', icon: PaintBucket, color: 'bg-amber-600', preconisation: 'Nettoyage ou reprise peinture' },
      { id: 'decoloration', label: 'Décoloration', icon: ThermometerSun, color: 'bg-yellow-500', preconisation: 'Reprise de peinture' },
      { id: 'ecaillage', label: 'Écaillage', icon: AlertTriangle, color: 'bg-orange-500', preconisation: 'Gratter, poncer et repeindre' },
      { id: 'cloque', label: 'Cloque', icon: AlertTriangle, color: 'bg-amber-500', preconisation: 'Traiter la cause et refaire' },
    ]
  },
  equipement: {
    label: 'Équipement',
    items: [
      { id: 'defaillant', label: 'Défaillant', icon: Wrench, color: 'bg-red-500', preconisation: 'Réparation ou remplacement' },
      { id: 'vetuste', label: 'Vétuste', icon: AlertTriangle, color: 'bg-orange-600', preconisation: 'Remplacement à prévoir' },
      { id: 'bruyant', label: 'Bruyant', icon: Wind, color: 'bg-purple-500', preconisation: 'Révision ou remplacement' },
      { id: 'fuite', label: 'Fuite', icon: Droplets, color: 'bg-blue-600', preconisation: 'Réparation urgente' },
    ]
  },
  securite: {
    label: 'Sécurité',
    items: [
      { id: 'danger_electrique', label: 'Risque électrique', icon: Zap, color: 'bg-yellow-600', preconisation: 'Mise en conformité électrique urgente' },
      { id: 'risque_incendie', label: 'Risque incendie', icon: Flame, color: 'bg-red-600', preconisation: 'Mise aux normes sécurité incendie' },
      { id: 'amiante', label: 'Amiante suspect', icon: AlertTriangle, color: 'bg-red-700', preconisation: 'Diagnostic amiante obligatoire' },
    ]
  },
};

interface SmartSuggestionChipsProps {
  onSelect: (observation: { 
    id: string; 
    label: string; 
    preconisation: string;
    category: string;
  }) => void;
  selectedIds?: string[];
  variant?: 'inline' | 'expanded';
  showPreconisations?: boolean;
  className?: string;
}

export function SmartSuggestionChips({
  onSelect,
  selectedIds = [],
  variant = 'inline',
  showPreconisations = true,
  className
}: SmartSuggestionChipsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const haptic = useHapticFeedback();

  const handleSelect = (item: typeof OBSERVATION_CATEGORIES.etat.items[0], categoryKey: string) => {
    haptic.trigger('light');
    onSelect({
      id: item.id,
      label: item.label,
      preconisation: item.preconisation,
      category: categoryKey,
    });
  };

  const toggleCategory = (categoryKey: string) => {
    haptic.trigger('light');
    setExpandedCategory(prev => prev === categoryKey ? null : categoryKey);
  };

  if (variant === 'inline') {
    // Compact horizontal scroll with most common items
    const commonItems = [
      { ...OBSERVATION_CATEGORIES.etat.items[0], category: 'etat' },
      { ...OBSERVATION_CATEGORIES.degradations.items[0], category: 'degradations' },
      { ...OBSERVATION_CATEGORIES.degradations.items[1], category: 'degradations' },
      { ...OBSERVATION_CATEGORIES.humidite.items[0], category: 'humidite' },
      { ...OBSERVATION_CATEGORIES.surface.items[0], category: 'surface' },
      { ...OBSERVATION_CATEGORIES.equipement.items[0], category: 'equipement' },
    ];

    return (
      <div className={cn('', className)}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-muted-foreground">Suggestions rapides</span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {commonItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(item, item.category)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                    isSelected 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' 
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  )}
                >
                  <item.icon className={cn('h-3.5 w-3.5', isSelected ? '' : 'text-muted-foreground')} />
                  {item.label}
                  {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                </motion.button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedCategory('all')}
              className="rounded-full text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Plus
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Expanded modal */}
        <AnimatePresence>
          {expandedCategory === 'all' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedCategory(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={e => e.stopPropagation()}
                className="bg-card w-full max-w-lg rounded-t-3xl max-h-[80vh] overflow-hidden"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Toutes les suggestions</h3>
                  <Button variant="ghost" size="icon" onClick={() => setExpandedCategory(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <ScrollArea className="h-[60vh] p-4">
                  <div className="space-y-4">
                    {Object.entries(OBSERVATION_CATEGORIES).map(([key, category]) => (
                      <div key={key}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">{category.label}</h4>
                        <div className="flex flex-wrap gap-2">
                          {category.items.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                              <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(item, key)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                                  isSelected 
                                    ? 'bg-primary text-primary-foreground' 
                                    : cn(item.color, 'text-white')
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                                {isSelected && <Check className="h-4 w-4 ml-1" />}
                              </motion.button>
                            );
                          })}
                        </div>
                        {showPreconisations && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Ex: {category.items[0].preconisation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Expanded variant with accordion categories
  return (
    <div className={cn('space-y-2', className)}>
      {Object.entries(OBSERVATION_CATEGORIES).map(([key, category]) => (
        <div key={key} className="rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => toggleCategory(key)}
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-medium text-sm">{category.label}</span>
            <motion.div
              animate={{ rotate: expandedCategory === key ? 90 : 0 }}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {expandedCategory === key && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 flex flex-wrap gap-2">
                  {category.items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(item, key)}
                        className={cn(
                          'flex flex-col items-start gap-1 px-3 py-2 rounded-xl text-sm transition-all text-left',
                          isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : cn(item.color, 'text-white')
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.label}</span>
                          {isSelected && <Check className="h-4 w-4 ml-1" />}
                        </div>
                        {showPreconisations && (
                          <span className="text-xs opacity-80 line-clamp-1">
                            → {item.preconisation}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// Export categories for use elsewhere
export { OBSERVATION_CATEGORIES };
