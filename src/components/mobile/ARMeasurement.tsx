import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, Scan, Check, X, Info } from "lucide-react";
import { toast } from "sonner";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useMobile } from "@/hooks/useMobile";

interface ARMeasurementProps {
  blockId?: string;
  onMeasurementComplete?: (measurement: {
    width: number;
    height: number;
    depth: number;
    area: number;
    volume: number;
  }) => void;
}

export const ARMeasurement = ({ blockId, onMeasurementComplete }: ARMeasurementProps) => {
  const { isNative, platform } = useMobile();
  const [isScanning, setIsScanning] = useState(false);
  const [measurement, setMeasurement] = useState<any>(null);
  const [arAvailable, setArAvailable] = useState(false);

  useEffect(() => {
    checkARAvailability();
  }, [platform]);

  const checkARAvailability = async () => {
    // Check if AR is available on the platform
    // ARKit for iOS, ARCore for Android
    if (platform === 'ios' || platform === 'android') {
      // TODO: Check actual AR capability
      setArAvailable(true);
    } else {
      setArAvailable(false);
    }
  };

  const startARMeasurement = async () => {
    if (!arAvailable) {
      toast.error("AR non disponible sur cet appareil");
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setIsScanning(true);
      
      // TODO: Launch AR session
      // For iOS: Use ARKit
      // For Android: Use ARCore
      
      // Simulate measurement for now
      setTimeout(() => {
        const mockMeasurement = {
          width: Math.random() * 5 + 2, // 2-7m
          height: Math.random() * 1 + 2.4, // 2.4-3.4m
          depth: Math.random() * 5 + 2, // 2-7m
          area: 0,
          volume: 0,
        };
        
        mockMeasurement.area = mockMeasurement.width * mockMeasurement.depth;
        mockMeasurement.volume = mockMeasurement.area * mockMeasurement.height;
        
        setMeasurement(mockMeasurement);
        setIsScanning(false);
        
        toast.success("Mesures capturées avec succès");
        Haptics.impact({ style: ImpactStyle.Heavy });
        
        onMeasurementComplete?.(mockMeasurement);
      }, 3000);
      
    } catch (error) {
      console.error('Error starting AR:', error);
      toast.error("Erreur lors du lancement AR");
      setIsScanning(false);
    }
  };

  const cancelMeasurement = () => {
    setIsScanning(false);
    setMeasurement(null);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  const confirmMeasurement = async () => {
    if (!measurement) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      
      // TODO: Save measurement to block
      if (blockId) {
        // Save to detected_blocks.volume_data
      }
      
      toast.success("Mesures enregistrées");
      setMeasurement(null);
    } catch (error) {
      console.error('Error saving measurement:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  if (!isNative) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium">Mesures AR non disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les mesures AR nécessitent l'application mobile native
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!arAvailable) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-1" />
          <div>
            <p className="text-sm font-medium">AR non disponible</p>
            <p className="text-xs text-muted-foreground mt-1">
              Votre appareil ne supporte pas la réalité augmentée
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Mesures AR</h3>
          </div>
          <Badge variant={arAvailable ? "default" : "secondary"}>
            {platform === 'ios' ? 'ARKit' : platform === 'android' ? 'ARCore' : 'N/A'}
          </Badge>
        </div>

        {!isScanning && !measurement && (
          <Button
            onClick={startARMeasurement}
            className="w-full h-14"
            size="lg"
          >
            <Scan className="w-5 h-5 mr-2" />
            Lancer scan AR
          </Button>
        )}

        {isScanning && (
          <div className="text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <Scan className="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Scan en cours...</p>
            <p className="text-xs text-muted-foreground">
              Déplacez lentement votre appareil dans la pièce
            </p>
            <Button
              onClick={cancelMeasurement}
              variant="ghost"
              size="sm"
              className="mt-4"
            >
              Annuler
            </Button>
          </div>
        )}

        {measurement && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Largeur</p>
                <p className="text-xl font-bold">{measurement.width.toFixed(2)} m</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Profondeur</p>
                <p className="text-xl font-bold">{measurement.depth.toFixed(2)} m</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Hauteur</p>
                <p className="text-xl font-bold">{measurement.height.toFixed(2)} m</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Surface</p>
                <p className="text-xl font-bold">{measurement.area.toFixed(2)} m²</p>
              </div>
            </div>

            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Volume total</p>
              <p className="text-2xl font-bold text-primary">
                {measurement.volume.toFixed(2)} m³
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={cancelMeasurement}
                variant="outline"
                size="lg"
                className="h-12"
              >
                <X className="w-5 h-5 mr-2" />
                Refaire
              </Button>
              <Button
                onClick={confirmMeasurement}
                size="lg"
                className="h-12"
              >
                <Check className="w-5 h-5 mr-2" />
                Valider
              </Button>
            </div>
          </div>
        )}

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Astuce:</strong> Pour de meilleurs résultats, assurez-vous que la pièce est bien éclairée
            et déplacez lentement votre appareil pour scanner toutes les surfaces.
          </p>
        </div>
      </div>
    </Card>
  );
};
