import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wand2, 
  Sparkles, 
  Check, 
  AlertTriangle,
  FileText,
  Camera,
  Scale,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AutoCorrectPanelProps {
  autoCorrectableCount: number;
  totalInconsistencies: number;
  appliedCorrections: number;
  onApplyAll: () => Promise<number>;
  onRefreshAnalysis: () => Promise<void>;
  isAnalyzing: boolean;
}

export const AutoCorrectPanel = ({
  autoCorrectableCount,
  totalInconsistencies,
  appliedCorrections,
  onApplyAll,
  onRefreshAnalysis,
  isAnalyzing,
}: AutoCorrectPanelProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const [correctionOptions, setCorrectionOptions] = useState({
    reformulateDescriptions: true,
    reclassifyElements: true,
    correctStates: true,
    regenerateTasks: false,
    harmonizeStyle: true,
    removeForbiddenTerms: true,
  });

  const handleApplyAll = async () => {
    setIsApplying(true);
    try {
      await onApplyAll();
    } finally {
      setIsApplying(false);
    }
  };

  const correctionProgress = totalInconsistencies > 0 
    ? Math.round((appliedCorrections / totalInconsistencies) * 100)
    : 0;

  const options = [
    { key: 'reformulateDescriptions', label: 'Reformuler les descriptions', icon: FileText },
    { key: 'removeForbiddenTerms', label: 'Supprimer termes interdits', icon: Scale },
    { key: 'correctStates', label: 'Corriger les états incohérents', icon: AlertTriangle },
    { key: 'harmonizeStyle', label: 'Harmoniser le style rédactionnel', icon: Sparkles },
    { key: 'reclassifyElements', label: 'Reclasser les éléments', icon: Camera },
    { key: 'regenerateTasks', label: 'Regénérer les tâches', icon: Zap },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          Corrections Automatiques IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="text-3xl font-bold text-primary">{autoCorrectableCount}</div>
            <div className="text-sm text-muted-foreground">Corrections disponibles</div>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10">
            <div className="text-3xl font-bold text-green-600">{appliedCorrections}</div>
            <div className="text-sm text-muted-foreground">Déjà appliquées</div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progression des corrections</span>
            <span className="font-medium">{correctionProgress}%</span>
          </div>
          <Progress value={correctionProgress} className="h-2" />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Options de correction</h4>
          {options.map((option) => {
            const Icon = option.icon;
            const isEnabled = correctionOptions[option.key as keyof typeof correctionOptions];
            
            return (
              <motion.div
                key={option.key}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-colors",
                  isEnabled ? "bg-primary/5" : "bg-muted/50"
                )}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", isEnabled ? "text-primary" : "text-muted-foreground")} />
                  <Label htmlFor={option.key} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
                <Switch
                  id={option.key}
                  checked={isEnabled}
                  onCheckedChange={(checked) => 
                    setCorrectionOptions(prev => ({ ...prev, [option.key]: checked }))
                  }
                />
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleApplyAll}
            disabled={isApplying || autoCorrectableCount === 0}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isApplying ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Application en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Corriger 100% automatiquement
                {autoCorrectableCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {autoCorrectableCount}
                  </Badge>
                )}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onRefreshAnalysis}
            disabled={isAnalyzing}
            className="w-full"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
            {isAnalyzing ? 'Analyse en cours...' : 'Relancer l\'analyse'}
          </Button>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
          <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            L'IA appliquera les corrections selon les options sélectionnées. 
            Vous pouvez toujours annuler ou modifier manuellement après.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
