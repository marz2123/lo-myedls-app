import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfidenceBadgeProps {
  confidence: number;
  source?: string;
}

export function ConfidenceBadge({ confidence, source }: ConfidenceBadgeProps) {
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';
  
  // Determine confidence level and styling
  let level: 'high' | 'medium' | 'low';
  let icon;
  let label: string;
  let colorClass: string;
  
  if (confidence >= 0.8) {
    level = 'high';
    icon = CheckCircle;
    label = isFrench ? 'Confiance haute' : 'High confidence';
    colorClass = "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
  } else if (confidence >= 0.5) {
    level = 'medium';
    icon = Sparkles;
    label = isFrench ? 'Confiance moyenne' : 'Medium confidence';
    colorClass = "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
  } else {
    level = 'low';
    icon = AlertTriangle;
    label = isFrench ? 'Confiance basse' : 'Low confidence';
    colorClass = "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
  }

  const Icon = icon;
  const percentage = Math.round(confidence * 100);

  // Get source label with better translations
  const getSourceLabel = (src?: string) => {
    if (!src) return '';
    switch (src) {
      case 'learning':
        return isFrench ? 'Apprentissage' : 'Learning';
      case 'exact':
        return isFrench ? 'Correspondance exacte' : 'Exact match';
      case 'fuzzy':
        return isFrench ? 'Correspondance approximative' : 'Fuzzy match';
      case 'semantic':
        return isFrench ? 'Analyse sémantique' : 'Semantic analysis';
      case 'fallback':
        return isFrench ? 'Classification par défaut' : 'Fallback classification';
      default:
        return src;
    }
  };

  const sourceLabel = source ? getSourceLabel(source) : '';

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} gap-1 text-xs`}
      title={label}
    >
      <Icon className="w-3 h-3" />
      <span className="font-medium">{percentage}%</span>
      {sourceLabel && (
        <>
          <span className="text-[10px] opacity-60">•</span>
          <span className="text-[10px]">{sourceLabel}</span>
        </>
      )}
    </Badge>
  );
}
