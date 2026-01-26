import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2, Map } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface FloorPlanViewerProps {
  blockId: string;
  blockNumber: number;
  roomType?: string;
}

export const FloorPlanViewer = ({ blockId, blockNumber, roomType }: FloorPlanViewerProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; depth: number } | null>(null);

  const generateFloorPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-floor-plan', {
        body: { blockId }
      });

      if (error) throw error;

      setFloorPlanUrl(data.floorPlanUrl);
      setDimensions(data.dimensions);
      toast.success('Plan 2D généré avec succès');
    } catch (error: any) {
      console.error('Error generating floor plan:', error);
      toast.error('Erreur lors de la génération du plan 2D');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setOpen(true);
    if (!floorPlanUrl) {
      await generateFloorPlan();
    }
  };

  const handleDownload = async () => {
    if (!floorPlanUrl) return;

    try {
      const response = await fetch(floorPlanUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan-2d-bloc-${blockNumber}.svg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Plan 2D téléchargé');
    } catch (error) {
      console.error('Error downloading floor plan:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleShare = async () => {
    if (!floorPlanUrl) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `Plan 2D - Bloc ${blockNumber}`,
          text: `Plan 2D du bloc ${blockNumber}${roomType ? ` (${roomType})` : ''}`,
          url: floorPlanUrl,
          dialogTitle: 'Partager le plan 2D'
        });
      } catch (error) {
        console.error('Error sharing floor plan:', error);
        toast.error('Erreur lors du partage');
      }
    } else {
      try {
        await navigator.share({
          title: `Plan 2D - Bloc ${blockNumber}`,
          text: `Plan 2D du bloc ${blockNumber}${roomType ? ` (${roomType})` : ''}`,
          url: floorPlanUrl
        });
      } catch (error) {
        console.error('Error sharing floor plan:', error);
        toast.error('Partage non supporté sur ce navigateur');
      }
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Map className="h-4 w-4" />
        Plan 2D
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Plan 2D - Bloc {blockNumber}
              {roomType && <span className="text-muted-foreground ml-2">({roomType})</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Génération du plan 2D...</span>
              </div>
            ) : floorPlanUrl ? (
              <>
                <div className="bg-muted rounded-lg p-4 overflow-auto">
                  <img 
                    src={floorPlanUrl} 
                    alt={`Plan 2D du bloc ${blockNumber}`}
                    className="w-full h-auto"
                  />
                </div>

                {dimensions && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Largeur: {dimensions.width.toFixed(2)} m</span>
                    <span>•</span>
                    <span>Profondeur: {dimensions.depth.toFixed(2)} m</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger SVG
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Partager
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Erreur lors de la génération du plan 2D
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
