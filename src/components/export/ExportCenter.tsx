import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  ShoppingCart, 
  Code, 
  FileCheck,
  Download,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useExportEngine, ExportOptions } from '@/hooks/useExportEngine';

interface ExportCenterProps {
  edlId: string;
  projectId: string;
  projectName: string;
  onComplete?: () => void;
}

interface ExportOption {
  id: keyof ExportOptions;
  label: string;
  description: string;
  icon: React.ElementType;
  formats: string[];
  premium?: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'dpgf',
    label: 'DPGF',
    description: 'Décomposition du Prix Global et Forfaitaire quantifiée',
    icon: FileSpreadsheet,
    formats: ['Excel', 'PDF'],
  },
  {
    id: 'noticeDescriptive',
    label: 'Notice Descriptive',
    description: 'Description structurée par famille de tâches (FT → CT → ST)',
    icon: FileText,
    formats: ['PDF'],
  },
  {
    id: 'planning',
    label: 'Planning Travaux',
    description: 'Gantt prévisionnel avec phases et dépendances IA',
    icon: Calendar,
    formats: ['PDF', 'JSON'],
    premium: true,
  },
  {
    id: 'purchaseList',
    label: 'Liste des Achats',
    description: 'Matériaux et quantités estimées par tâche',
    icon: ShoppingCart,
    formats: ['Excel'],
  },
  {
    id: 'jsonTechnique',
    label: 'JSON Technique',
    description: 'Export complet pour intégration MyHome',
    icon: Code,
    formats: ['JSON'],
  },
  {
    id: 'reportEdl',
    label: 'Rapport EDL',
    description: 'Rapport complet avec photos et anomalies',
    icon: FileCheck,
    formats: ['PDF'],
  },
];

export function ExportCenter({ edlId, projectId, projectName, onComplete }: ExportCenterProps) {
  const [selectedOptions, setSelectedOptions] = useState<ExportOptions>({
    dpgf: true,
    noticeDescriptive: true,
    planning: true,
    purchaseList: true,
    jsonTechnique: false,
    reportEdl: false,
  });
  const [exportComplete, setExportComplete] = useState(false);

  const { isExporting, progress, result, exportAll, reset } = useExportEngine();

  const toggleOption = (id: keyof ExportOptions) => {
    setSelectedOptions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    setSelectedOptions({
      dpgf: true,
      noticeDescriptive: true,
      planning: true,
      purchaseList: true,
      jsonTechnique: true,
      reportEdl: true,
    });
  };

  const handleExport = async () => {
    const exportResult = await exportAll(edlId, projectId, projectName, selectedOptions);
    if (exportResult?.success) {
      setExportComplete(true);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  };

  const selectedCount = Object.values(selectedOptions).filter(Boolean).length;

  if (exportComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Export terminé !</h2>
        <p className="text-muted-foreground mb-4">
          Tous les documents ont été générés et téléchargés.
        </p>
        <Button variant="outline" onClick={() => { reset(); setExportComplete(false); }}>
          Nouvel export
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Export Travaux
          </h2>
          <p className="text-muted-foreground mt-1">
            Transformez votre EDL en documents exploitables
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={selectAll}>
          Tout sélectionner
        </Button>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOptions[option.id];

          return (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => toggleOption(option.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{option.label}</h3>
                        {option.premium && (
                          <Badge variant="secondary" className="text-xs">
                            IA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {option.description}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {option.formats.map(format => (
                          <Badge key={format} variant="outline" className="text-xs">
                            {format}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Checkbox checked={isSelected} className="mt-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Section */}
      <AnimatePresence>
        {isExporting && progress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{progress.step}</p>
                    <p className="text-sm text-muted-foreground">
                      Étape {progress.progress} sur {progress.total}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={(progress.progress / progress.total) * 100} 
                  className="h-2"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
        </div>
        <Button
          size="lg"
          onClick={handleExport}
          disabled={isExporting || selectedCount === 0}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exporter tout
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
