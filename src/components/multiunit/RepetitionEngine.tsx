import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { MultiunitUnit, SimilarityMatch } from '@/types/multiunit';
import { APARTMENT_TYPE_LABELS } from '@/types/multiunit';
import { cn } from '@/lib/utils';

interface RepetitionEngineProps {
  sourceUnit: MultiunitUnit;
  similarUnits: MultiunitUnit[];
  matches: SimilarityMatch[];
  selectedUnits: string[];
  onToggleUnit: (unitId: string) => void;
  onApplyTemplate: () => void;
  isApplying?: boolean;
}

export function RepetitionEngine({
  sourceUnit,
  similarUnits,
  matches,
  selectedUnits,
  onToggleUnit,
  onApplyTemplate,
  isApplying
}: RepetitionEngineProps) {
  const allSelected = similarUnits.length > 0 && similarUnits.every(u => selectedUnits.includes(u.id));

  const toggleAll = () => {
    if (allSelected) {
      similarUnits.forEach(u => {
        if (selectedUnits.includes(u.id)) {
          onToggleUnit(u.id);
        }
      });
    } else {
      similarUnits.forEach(u => {
        if (!selectedUnits.includes(u.id)) {
          onToggleUnit(u.id);
        }
      });
    }
  };

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-lg">Moteur de répétition IA</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {similarUnits.length} lots similaires détectés
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Unit */}
        <div className="p-3 rounded-lg bg-background border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-600">Modèle source</Badge>
          </div>
          <p className="font-semibold">{sourceUnit.unit_number}</p>
          <p className="text-sm text-muted-foreground">
            Étage {sourceUnit.floor_number}
            {sourceUnit.apartment_type && ` • ${APARTMENT_TYPE_LABELS[sourceUnit.apartment_type]}`}
            {sourceUnit.surface_m2 && ` • ${sourceUnit.surface_m2} m²`}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Similar Units List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Appliquer sur :</p>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {similarUnits.map(unit => {
              const match = matches.find(m => m.target_unit_id === unit.id);
              const isSelected = selectedUnits.includes(unit.id);
              
              return (
                <div 
                  key={unit.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected 
                      ? "border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/30" 
                      : "border-border hover:border-purple-200"
                  )}
                  onClick={() => onToggleUnit(unit.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => onToggleUnit(unit.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{unit.unit_number}</p>
                        {match && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round((match.similarity_score || 0) * 100)}% similaire
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Étage {unit.floor_number}
                        {unit.apartment_type && ` • ${APARTMENT_TYPE_LABELS[unit.apartment_type]}`}
                      </p>
                    </div>
                    {match?.differences && match.differences.length > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {match.differences.length} diff.
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optimization Info */}
        {selectedUnits.length > 0 && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Optimisation IA activée
                </p>
                <p className="text-green-600 dark:text-green-500">
                  Génération ~{Math.round(selectedUnits.length * 0.4 * 5)} min plus rapide 
                  (au lieu de ~{selectedUnits.length * 5} min)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <Button 
          onClick={onApplyTemplate}
          disabled={selectedUnits.length === 0 || isApplying}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          <Copy className="h-4 w-4 mr-2" />
          {isApplying 
            ? 'Application en cours...' 
            : `Appliquer sur ${selectedUnits.length} lots`}
        </Button>
      </CardContent>
    </Card>
  );
}
