import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DetectedPathology, 
  PathologyAnalysisResult,
  pathologyLabels,
  severityLabels,
  pathologyIcons,
  hazardousSubstanceLabels
} from '@/types/pathologies';
import { AlertTriangle, CheckCircle2, Clock, Info, Ruler, Euro } from 'lucide-react';

interface PathologyDetectionPanelProps {
  analysisResult: PathologyAnalysisResult;
  imageUrl: string;
}

export const PathologyDetectionPanel = ({ analysisResult, imageUrl }: PathologyDetectionPanelProps) => {
  const [selectedPathology, setSelectedPathology] = useState<DetectedPathology | null>(null);

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'faible': return 'bg-green-500 hover:bg-green-600';
      case 'modere': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'grave': return 'bg-orange-500 hover:bg-orange-600';
      case 'critique': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'high': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'critical': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Risque Faible';
      case 'medium': return 'Risque Moyen';
      case 'high': return 'Risque Élevé';
      case 'critical': return 'Risque Critique';
      default: return 'Non évalué';
    }
  };

  const getUrgencyIcon = (urgency?: string) => {
    switch (urgency) {
      case 'immediate': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'short_term': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'medium_term': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'long_term': return <Clock className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUrgencyLabel = (urgency?: string) => {
    switch (urgency) {
      case 'immediate': return 'Immédiat';
      case 'short_term': return 'Court terme';
      case 'medium_term': return 'Moyen terme';
      case 'long_term': return 'Long terme';
      default: return 'À évaluer';
    }
  };

  if (analysisResult.pathologies.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold">Aucune pathologie détectée</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          L'analyse IA n'a détecté aucune pathologie visible sur cette photo.
        </p>
        <Badge variant="outline" className="mt-4">
          Confiance IA: {Math.round(analysisResult.aiConfidence * 100)}%
        </Badge>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Pathologies Détectées
          </h3>
          <Badge variant="outline">
            {analysisResult.pathologies.length} {analysisResult.pathologies.length > 1 ? 'détectées' : 'détectée'}
          </Badge>
        </div>
        
        <Alert className={getRiskLevelColor(analysisResult.overallRiskLevel)}>
          <AlertDescription className="flex items-center gap-2">
            <strong>{getRiskLevelLabel(analysisResult.overallRiskLevel)}</strong>
            <span className="text-sm">
              • Confiance IA: {Math.round(analysisResult.aiConfidence * 100)}%
            </span>
          </AlertDescription>
        </Alert>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-4">
          <Accordion type="single" collapsible className="space-y-2">
            {analysisResult.pathologies.map((pathology, index) => (
              <AccordionItem 
                key={index} 
                value={`pathology-${index}`}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-2xl">{pathologyIcons[pathology.type]}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {pathologyLabels[pathology.type]}
                        </span>
                        <Badge className={getSeverityBadgeColor(pathology.severity)}>
                          {severityLabels[pathology.severity]}
                        </Badge>
                        {pathology.isHazardous && (
                          <Badge variant="destructive" className="text-xs">☣️ Dangereux</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {pathology.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description:</p>
                      <p className="text-sm">{pathology.description}</p>
                    </div>

                    {pathology.recommendations && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Recommandations:</p>
                        <p className="text-sm">{pathology.recommendations}</p>
                      </div>
                    )}

                    {/* Substance dangereuse */}
                    {pathology.isHazardous && pathology.hazardousType && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold">⚠️ Substance dangereuse détectée</div>
                          <div className="text-sm mt-1">{hazardousSubstanceLabels[pathology.hazardousType]}</div>
                          {pathology.regulatoryCompliance && (
                            <div className="mt-2 text-xs space-y-1">
                              <div>• Conforme CREP: {pathology.regulatoryCompliance.crepCompliant ? '✓ Oui' : '✗ Non'}</div>
                              <div>• Spécialiste requis: {pathology.regulatoryCompliance.requiresSpecialist ? '✓ Oui' : '✗ Non'}</div>
                              {pathology.regulatoryCompliance.legalDeadline && (
                                <div>• Délai légal: {pathology.regulatoryCompliance.legalDeadline}</div>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Quantification AR 3D */}
                    {(pathology.affectedSurface || pathology.affectedVolume || pathology.arMeasurements) && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <Ruler className="h-4 w-4" />
                          Quantification AR 3D
                        </div>
                        <div className="space-y-1 text-xs">
                          {pathology.affectedSurface && (
                            <div>• Surface affectée: <span className="font-semibold">{pathology.affectedSurface.toFixed(2)} m²</span></div>
                          )}
                          {pathology.affectedVolume && (
                            <div>• Volume affecté: <span className="font-semibold">{pathology.affectedVolume.toFixed(2)} m³</span></div>
                          )}
                          {pathology.arMeasurements && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="text-muted-foreground mb-1">Dimensions de la zone:</div>
                              <div>• Largeur: {pathology.arMeasurements.width.toFixed(2)}m</div>
                              <div>• Hauteur: {pathology.arMeasurements.height.toFixed(2)}m</div>
                              <div>• Profondeur: {pathology.arMeasurements.depth.toFixed(2)}m</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Estimation de coût */}
                    {pathology.repairCost && (
                      <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <Euro className="h-4 w-4" />
                          Estimation de réparation
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Main d'œuvre:</span>
                            <span className="text-sm font-semibold">{pathology.repairCost.laborCost.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Matériaux:</span>
                            <span className="text-sm font-semibold">{pathology.repairCost.materialCost.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                            <span className="text-sm font-semibold">Total estimé:</span>
                            <span className="text-base font-bold text-primary">{pathology.repairCost.totalCost.toFixed(2)} €</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            Durée estimée: {pathology.repairCost.estimatedDuration.toFixed(1)}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Prix unitaire: {pathology.repairCost.pricePerUnit.toFixed(2)} €/{pathology.repairCost.unit}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {pathology.urgency && (
                        <div className="flex items-center gap-2">
                          {getUrgencyIcon(pathology.urgency)}
                          <span className="text-sm">{getUrgencyLabel(pathology.urgency)}</span>
                        </div>
                      )}
                      
                      {pathology.estimatedArea && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Surface:</span>{' '}
                          <strong>{pathology.estimatedArea} m²</strong>
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="text-muted-foreground">Confiance:</span>{' '}
                        <strong>{Math.round(pathology.confidence * 100)}%</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Position détectée:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span>X: {pathology.location.x}%</span>
                        <span>Y: {pathology.location.y}%</span>
                        <span>Largeur: {pathology.location.width}%</span>
                        <span>Hauteur: {pathology.location.height}%</span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          💡 Analyse réalisée par IA (GPT-4 Vision). Vérification recommandée par un expert.
        </p>
      </div>
    </Card>
  );
};
