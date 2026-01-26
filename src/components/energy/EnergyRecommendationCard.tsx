import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, 
  Wind, 
  Flame, 
  Lightbulb, 
  Droplets,
  DoorOpen,
  Check,
  Euro,
  TrendingDown,
  Clock,
  Award
} from 'lucide-react';
import type { EnergyRecommendation } from '@/types/energy';
import { cn } from '@/lib/utils';

interface EnergyRecommendationCardProps {
  recommendation: EnergyRecommendation;
  onAccept?: () => void;
}

const CATEGORY_ICONS = {
  isolation: Thermometer,
  menuiseries: DoorOpen,
  chauffage: Flame,
  ventilation: Wind,
  ecs: Droplets,
  eclairage: Lightbulb,
  autres: Lightbulb,
};

const CATEGORY_COLORS = {
  isolation: 'bg-orange-100 text-orange-700 border-orange-200',
  menuiseries: 'bg-blue-100 text-blue-700 border-blue-200',
  chauffage: 'bg-red-100 text-red-700 border-red-200',
  ventilation: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  ecs: 'bg-teal-100 text-teal-700 border-teal-200',
  eclairage: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  autres: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PRIORITY_LABELS = ['', 'Urgent', 'Important', 'Recommandé', 'Optionnel', 'À étudier'];

export const EnergyRecommendationCard: React.FC<EnergyRecommendationCardProps> = ({
  recommendation,
  onAccept,
}) => {
  const Icon = CATEGORY_ICONS[recommendation.categorie] || Lightbulb;
  const colorClass = CATEGORY_COLORS[recommendation.categorie] || CATEGORY_COLORS.autres;

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      recommendation.is_accepted && 'border-green-300 bg-green-50/50'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg border', colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {recommendation.titre}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={colorClass}>
                  {recommendation.categorie}
                </Badge>
                <Badge variant="secondary">
                  {PRIORITY_LABELS[recommendation.priorite]}
                </Badge>
              </div>
            </div>
          </div>
          
          {recommendation.is_accepted ? (
            <Badge className="bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              Accepté
            </Badge>
          ) : (
            onAccept && (
              <Button size="sm" onClick={onAccept}>
                Accepter
              </Button>
            )
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recommendation.description && (
          <p className="text-sm text-muted-foreground">
            {recommendation.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-muted-foreground text-xs">Gain énergie</div>
              <div className="font-medium">
                {recommendation.gain_pourcentage 
                  ? `${recommendation.gain_pourcentage}%`
                  : recommendation.gain_kwh_m2_an 
                    ? `${recommendation.gain_kwh_m2_an} kWh/m²`
                    : '-'
                }
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-muted-foreground text-xs">Coût estimé</div>
              <div className="font-medium">
                {recommendation.cout_estimatif_min && recommendation.cout_estimatif_max
                  ? `${formatCurrency(recommendation.cout_estimatif_min)} - ${formatCurrency(recommendation.cout_estimatif_max)}`
                  : '-'
                }
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-600" />
            <div>
              <div className="text-muted-foreground text-xs">ROI</div>
              <div className="font-medium">
                {recommendation.roi_annees 
                  ? `${recommendation.roi_annees} ans`
                  : '-'
                }
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-muted-foreground text-xs">Économie/an</div>
              <div className="font-medium">
                {formatCurrency(recommendation.economie_annuelle)}
              </div>
            </div>
          </div>
        </div>
        
        {(recommendation.eligible_maprimereonov || recommendation.eligible_cee) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Award className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">Aides disponibles:</span>
            {recommendation.eligible_maprimereonov && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                MaPrimeRénov'
              </Badge>
            )}
            {recommendation.eligible_cee && (
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                CEE
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
