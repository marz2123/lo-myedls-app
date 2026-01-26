import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Box, Eye, Share2 } from "lucide-react";

interface Export3DModelDialogProps {
  blockId: string;
  blockLabel: string;
  volumeData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Export3DModelDialog = ({
  blockId,
  blockLabel,
  volumeData,
  open,
  onOpenChange
}: Export3DModelDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelUrls, setModelUrls] = useState<any>(null);

  const generateModels = async () => {
    try {
      setIsGenerating(true);
      toast.info('Génération des modèles 3D en cours...', {
        description: 'Cela peut prendre quelques secondes'
      });

      const { data, error } = await supabase.functions.invoke('generate-3d-model', {
        body: { blockId }
      });

      if (error) throw error;

      if (data?.modelUrls) {
        setModelUrls(data.modelUrls);
        toast.success('Modèles 3D générés avec succès', {
          description: `Dimensions: ${data.dimensions.width.toFixed(1)}m x ${data.dimensions.height.toFixed(1)}m x ${data.dimensions.depth.toFixed(1)}m`
        });
      }

    } catch (error: any) {
      console.error('Error generating 3D models:', error);
      toast.error('Erreur lors de la génération des modèles 3D', {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadModel = (url: string, format: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `room-${blockId.slice(0, 8)}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Téléchargement du modèle ${format.toUpperCase()} démarré`);
  };

  const shareModel = async (url: string, format: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Modèle 3D - ${blockLabel}`,
          text: `Modèle 3D de la pièce au format ${format.toUpperCase()}`,
          url: url
        });
        toast.success('Partage réussi');
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  const dimensions = volumeData || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            Export Modèle 3D
          </DialogTitle>
          <DialogDescription>
            Exportez le modèle 3D de <span className="font-semibold">{blockLabel}</span> dans différents formats pour visualisation AR et logiciels 3D
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dimensions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-3">📐 Dimensions de la pièce</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Largeur</span>
                <p className="font-mono font-semibold">{dimensions.width?.toFixed(2) || '-'}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Hauteur</span>
                <p className="font-mono font-semibold">{dimensions.height?.toFixed(2) || '-'}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Profondeur</span>
                <p className="font-mono font-semibold">{dimensions.depth?.toFixed(2) || '-'}m</p>
              </div>
            </div>
            
            {dimensions.detectedObjects && dimensions.detectedObjects.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  🔍 {dimensions.detectedObjects.length} objets détectés inclus dans le modèle
                </span>
              </div>
            )}
          </div>

          {/* Model Generation */}
          {!modelUrls ? (
            <div className="text-center py-8">
              <Box className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-6">
                Générez des modèles 3D exportables de cette pièce
              </p>
              <Button
                onClick={generateModels}
                disabled={isGenerating}
                size="lg"
                className="w-full max-w-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Box className="w-5 h-5 mr-2" />
                    Générer les modèles 3D
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Modeles disponibles</h3>
              
              {/* OBJ Format */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">.OBJ</Badge>
                      <span className="text-sm font-semibold">Wavefront OBJ</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format universel compatible avec Blender, SketchUp, 3DS Max, Maya
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadModel(modelUrls.obj, 'obj')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareModel(modelUrls.obj, 'obj')}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* GLB Format */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">.GLB</Badge>
                      <span className="text-sm font-semibold">glTF Binary</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format web moderne pour visualisation 3D, viewers en ligne, Three.js
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadModel(modelUrls.glb, 'glb')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareModel(modelUrls.glb, 'glb')}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* USDZ Format */}
              <div className="border rounded-lg p-4 bg-gradient-to-r from-background to-primary/5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default">.USDZ</Badge>
                      <span className="text-sm font-semibold">Apple AR Quick Look</span>
                      <Badge variant="outline" className="text-xs">iOS</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format AR natif iOS, visualisation AR directe sur iPhone/iPad
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => downloadModel(modelUrls.usdz, 'usdz')}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualiser en AR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareModel(modelUrls.usdz, 'usdz')}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <span className="font-semibold">Astuce :</span> Sur iOS, ouvrez le fichier .usdz pour voir le modèle en réalité augmentée dans votre espace réel !
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
