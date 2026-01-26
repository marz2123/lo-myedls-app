import { Bot, Sparkles, Building, Layers, Calendar, AlertCircle, Eye, Loader2, Home, Zap, ThermometerSun, Lightbulb } from 'lucide-react';
import { SmartBlock, StatusBadge, InfoRow } from './SmartBlock';
import { Button } from '@/components/ui/button';
import { useBuildingAIAnalysis } from '@/hooks/useBuildingAIAnalysis';

interface AIAnalysisBlockProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  streetViewImageUrl?: string;
  aerialImageUrl?: string;
}

export const AIAnalysisBlock = ({
  latitude,
  longitude,
  address,
  streetViewImageUrl,
}: AIAnalysisBlockProps) => {
  const { aiAnalysis, isLoading, error, analyzeBuilding, getConditionColor, getDPEColor } = useBuildingAIAnalysis();

  const handleAnalyze = () => {
    if (latitude && longitude) {
      analyzeBuilding(latitude, longitude, address, streetViewImageUrl);
    }
  };

  const getConditionStatus = (condition?: string): 'success' | 'warning' | 'danger' | 'info' => {
    if (!condition) return 'info';
    const lower = condition.toLowerCase();
    if (lower.includes('bon') || lower.includes('neuf') || lower.includes('excellent')) return 'success';
    if (lower.includes('correct') || lower.includes('moyen')) return 'warning';
    if (lower.includes('mauvais') || lower.includes('dégradé') || lower.includes('refaire')) return 'danger';
    return 'info';
  };

  const analysis = aiAnalysis?.analysis;

  return (
    <SmartBlock
      icon={<Bot className="h-5 w-5" />}
      title="Analyse IA du bâtiment"
      subtitle={analysis ? "Analyse complète" : "Estimation automatique des caractéristiques"}
      isLoading={isLoading}
      badge={analysis?.confidenceScore ? (
        <StatusBadge 
          status={analysis.confidenceScore > 0.7 ? 'success' : 'warning'} 
          label={`${Math.round(analysis.confidenceScore * 100)}% confiance`} 
        />
      ) : undefined}
      defaultOpen={false}
    >
      {!analysis ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-violet-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            L'IA peut analyser les données disponibles pour estimer les caractéristiques du bâtiment
          </p>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !latitude || !longitude}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Lancer l'analyse IA
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Basé sur la localisation et le contexte urbain
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Building identification */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Identification du bâtiment
            </p>
            <div className="space-y-1">
              <InfoRow
                label="Type de bâtiment"
                value={analysis.buildingType || 'Non déterminé'}
                icon={<Building className="h-4 w-4" />}
              />
              <InfoRow
                label="Époque de construction"
                value={analysis.constructionEra || 'Non déterminée'}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoRow
                label="Nombre d'étages"
                value={analysis.estimatedFloors?.toString() || 'N/A'}
                icon={<Layers className="h-4 w-4" />}
              />
              <InfoRow
                label="Ascenseur"
                value={analysis.hasElevator || 'Non déterminé'}
                icon={<Zap className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* DPE Section */}
          {analysis.estimatedDPE && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Performance énergétique
              </p>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className={`w-12 h-12 rounded-xl ${getDPEColor(analysis.estimatedDPE)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{analysis.estimatedDPE}</span>
                </div>
                <div>
                  <p className="font-medium">DPE estimé : {analysis.estimatedDPE}</p>
                  <p className="text-xs text-muted-foreground">Estimation basée sur l'époque et le type</p>
                </div>
              </div>
            </div>
          )}

          {/* Facade analysis */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Analyse de façade
            </p>
            <div className="space-y-2">
              <InfoRow
                label="Matériau façade"
                value={analysis.facadeMaterial || 'Non déterminé'}
                icon={<Building className="h-4 w-4" />}
              />
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm">État de la façade</span>
                <StatusBadge 
                  status={getConditionStatus(analysis.facadeCondition)}
                  label={analysis.facadeCondition || 'N/A'}
                />
              </div>
              {analysis.estimatedFacadeArea && analysis.estimatedFacadeArea > 0 && (
                <InfoRow
                  label="Surface façades estimée"
                  value={`~${analysis.estimatedFacadeArea} m²`}
                  icon={<Building className="h-4 w-4" />}
                />
              )}
            </div>
          </div>

          {/* Roof analysis */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Analyse de toiture
            </p>
            <div className="space-y-2">
              <InfoRow
                label="Type de toiture"
                value={analysis.roofType || 'Non déterminé'}
                icon={<Home className="h-4 w-4" />}
              />
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm">État de la toiture</span>
                <StatusBadge 
                  status={getConditionStatus(analysis.roofCondition)}
                  label={analysis.roofCondition || 'N/A'}
                />
              </div>
            </div>
          </div>

          {/* Pathologies */}
          {analysis.pathologies && analysis.pathologies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Pathologies détectées
              </p>
              <div className="space-y-2">
                {analysis.pathologies.map((pathology, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{pathology}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Recommandations
              </p>
              <div className="space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                  >
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Relancer l'analyse
          </Button>
        </div>
      )}
    </SmartBlock>
  );
};
