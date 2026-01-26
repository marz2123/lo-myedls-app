import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PathologyDetectionPanel } from './PathologyDetectionPanel';
import { PathologyAnalysisResult } from '@/types/pathologies';
import { Activity, Loader2 } from 'lucide-react';

interface PathologyAnalysisButtonProps {
  frameId: string;
  imageUrl: string;
  existingAnalysis?: any;
  arMeasurements?: {
    width: number;
    height: number;
    depth: number;
    surfaceArea: number;
    volume: number;
  };
}

export const PathologyAnalysisButton = ({ 
  frameId, 
  imageUrl, 
  existingAnalysis,
  arMeasurements
}: PathologyAnalysisButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PathologyAnalysisResult | null>(existingAnalysis || null);

  const analyzePathologies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-pathologies', {
        body: { frameId, imageUrl, arMeasurements }
      });

      if (error) throw error;

      const result: PathologyAnalysisResult = {
        frameId: data.frameId,
        imageUrl,
        pathologies: data.pathologies || [],
        overallRiskLevel: data.overallRiskLevel || 'low',
        analysisTimestamp: data.analysisTimestamp,
        aiConfidence: data.aiConfidence || 0
      };

      setAnalysisResult(result);
      
      if (result.pathologies.length > 0) {
        toast.success(`${result.pathologies.length} pathologie(s) détectée(s)`);
      } else {
        toast.success('Aucune pathologie détectée');
      }
    } catch (error: any) {
      console.error('Error analyzing pathologies:', error);
      toast.error('Erreur lors de l\'analyse des pathologies');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    if (!analysisResult) {
      await analyzePathologies();
    }
  };

  const hasPathologies = analysisResult && analysisResult.pathologies.length > 0;
  const hasHighRisk = analysisResult && (analysisResult.overallRiskLevel === 'high' || analysisResult.overallRiskLevel === 'critical');

  return (
    <>
      <Button
        variant={hasPathologies ? (hasHighRisk ? "destructive" : "default") : "outline"}
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Activity className="h-4 w-4" />
        {hasPathologies ? `${analysisResult.pathologies.length} Pathologie${analysisResult.pathologies.length > 1 ? 's' : ''}` : 'Analyser'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analyse des Pathologies</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image preview */}
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img 
                src={imageUrl} 
                alt="Photo analysée"
                className="w-full h-auto"
              />
            </div>

            {/* Analysis results */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Analyse en cours...</span>
              </div>
            ) : analysisResult ? (
              <PathologyDetectionPanel 
                analysisResult={analysisResult}
                imageUrl={imageUrl}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Cliquez sur "Analyser" pour détecter les pathologies
              </div>
            )}

            {/* Re-analyze button */}
            {analysisResult && !loading && (
              <Button 
                onClick={analyzePathologies} 
                variant="outline" 
                className="w-full"
                disabled={loading}
              >
                Réanalyser
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
