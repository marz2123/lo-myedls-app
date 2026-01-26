import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Zap, Check, X, Loader2 } from "lucide-react";

interface QuickCaptureModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTasksExtracted?: () => void;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: number;
  processed: boolean;
  tasks?: number;
}

export const QuickCaptureMode = ({ open, onOpenChange, projectId, onTasksExtracted }: QuickCaptureModeProps) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capturePhoto = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPhotos(prev => [...prev, {
          id: Math.random().toString(36),
          dataUrl,
          timestamp: Date.now(),
          processed: false
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const processAllPhotos = async () => {
    if (photos.length === 0) {
      toast.error("Aucune photo à traiter");
      return;
    }

    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsProcessing(false);
      return;
    }

    try {
      let totalTasks = 0;

      for (const photo of photos) {
        if (photo.processed) continue;

        const { data, error } = await supabase.functions.invoke('extract-tasks', {
          body: {
            imageData: photo.dataUrl,
            projectId,
            userId: user.id,
            quickMode: true
          }
        });

        if (error) {
          console.error('Photo processing error:', error);
          continue;
        }

        const tasksCount = data?.tasks?.length || 0;
        totalTasks += tasksCount;

        setPhotos(prev => prev.map(p => 
          p.id === photo.id 
            ? { ...p, processed: true, tasks: tasksCount }
            : p
        ));
      }

      toast.success(`${totalTasks} tâches extraites de ${photos.length} photos`);
      onTasksExtracted?.();
      
      // Clear photos after processing
      setTimeout(() => {
        setPhotos([]);
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Batch processing error:', error);
      toast.error("Erreur lors du traitement");
    } finally {
      setIsProcessing(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Mode Capture Rapide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              ⚡ Extraction ultra-rapide
            </div>
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              Prenez plusieurs photos rapidement. L'IA extraira toutes les tâches d'un coup !
            </div>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.dataUrl}
                  alt="Captured"
                  className="w-full aspect-square object-cover rounded-lg border-2"
                />
                {photo.processed ? (
                  <Badge className="absolute top-2 right-2 bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    {photo.tasks} tâches
                  </Badge>
                ) : (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(photo.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Add Photo Card */}
            <button
              onClick={capturePhoto}
              className="w-full aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ajouter photo</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            capture="environment"
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={processAllPhotos}
              disabled={photos.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Extraire tout ({photos.length})
                </>
              )}
            </Button>
          </div>

          {/* Stats */}
          {photos.length > 0 && (
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{photos.length} photos</span>
              <span>•</span>
              <span>{photos.filter(p => p.processed).length} traitées</span>
              <span>•</span>
              <span>{photos.reduce((sum, p) => sum + (p.tasks || 0), 0)} tâches</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};