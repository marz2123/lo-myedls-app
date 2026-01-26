import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, CheckCircle, AlertTriangle, Edit3, 
  Info, Camera, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TechnicalElement, TechnicalElementBadge } from './TechnicalElementBadge';

interface TechnicalItemPanelProps {
  technicalElements: TechnicalElement[];
  onVerify?: (element: TechnicalElement) => void;
  onAnnotate?: () => void;
  className?: string;
}

const GUIDANCE_TEXTS: Record<string, string> = {
  compteur_electricite: "Photographiez le relevé du compteur pour l'état des lieux.",
  compteur_eau: "Notez le relevé actuel et vérifiez l'absence de fuites.",
  compteur_gaz: "Relevez l'index et vérifiez la date du dernier contrôle.",
  tableau_electrique: "Vérifiez l'état des disjoncteurs et la présence d'un différentiel.",
  vmc: "Testez le fonctionnement et vérifiez la propreté des bouches.",
  radiateur: "Vérifiez le fonctionnement et l'état des vannes thermostatiques.",
  ballon_eau_chaude: "Vérifiez l'état général et la date du dernier entretien.",
  fenetre: "Vérifiez l'étanchéité, les joints et le mécanisme d'ouverture.",
  porte_exterieure: "Vérifiez le fonctionnement des serrures et l'état des joints.",
  detecteur_fumee: "Testez le fonctionnement et vérifiez la date de la pile.",
  chaudiere: "Vérifiez la date du dernier entretien annuel obligatoire.",
  climatisation: "Testez le fonctionnement en mode froid et chaud.",
  interphone: "Testez la sonnerie et la communication audio/vidéo.",
};

export const TechnicalItemPanel: React.FC<TechnicalItemPanelProps> = ({
  technicalElements,
  onVerify,
  onAnnotate,
  className
}) => {
  if (!technicalElements || technicalElements.length === 0) {
    return null;
  }

  const verifiedCount = technicalElements.filter(el => el.state && el.state !== 'absent').length;
  const totalCount = technicalElements.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          Éléments techniques détectés
          <Badge className="bg-primary/10 text-primary text-xs ml-1">
            {totalCount}
          </Badge>
        </h3>
        {verifiedCount > 0 && (
          <Badge className="bg-green-500/10 text-green-600 text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            {verifiedCount}/{totalCount} vérifiés
          </Badge>
        )}
      </div>

      {/* Elements List */}
      <div className="space-y-3">
        {technicalElements.map((element, idx) => (
          <div key={idx} className="space-y-2">
            <TechnicalElementBadge element={element} variant="full" />
            
            {/* Guidance */}
            {GUIDANCE_TEXTS[element.type] && (
              <div className="flex items-start gap-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg ml-4">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {GUIDANCE_TEXTS[element.type]}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex gap-2 ml-4">
              {onVerify && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onVerify(element)}
                >
                  <CheckCircle className="h-3 w-3" />
                  Vérifier
                </Button>
              )}
              {onAnnotate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={onAnnotate}
                >
                  <Edit3 className="h-3 w-3" />
                  Annoter
                </Button>
              )}
            </div>
            
            {idx < technicalElements.length - 1 && (
              <Separator className="my-2" />
            )}
          </div>
        ))}
      </div>

      {/* Auto-detection info */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary">Détection automatique</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ces éléments ont été détectés automatiquement par l'IA. 
              Vérifiez et annotez si nécessaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
