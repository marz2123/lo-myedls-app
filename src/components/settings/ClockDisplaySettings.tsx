import { useState, useEffect } from "react";
import { useClockDisplay, ClockDisplayMode } from "@/hooks/useClockDisplay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Clock, Maximize2, Minimize2 } from "lucide-react";

export const ClockDisplaySettings = () => {
  const { clockMode, updateClockMode } = useClockDisplay();
  const [selectedMode, setSelectedMode] = useState<ClockDisplayMode>(clockMode);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSelectedMode(clockMode);
  }, [clockMode]);

  const handleSave = async () => {
    setLoading(true);
    await updateClockMode(selectedMode);
    toast({
      title: "Succès",
      description: "Mode d'affichage de l'horloge mis à jour",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Affichage de l'horloge</h3>
      </div>
      
      <div className="space-y-4">
        <Label>Mode d'affichage</Label>
        <RadioGroup value={selectedMode} onValueChange={(value) => setSelectedMode(value as ClockDisplayMode)}>
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="compact" id="compact" />
            <div className="flex-1 space-y-1">
              <Label htmlFor="compact" className="flex items-center gap-2 cursor-pointer">
                <Minimize2 className="h-4 w-4" />
                <span className="font-medium">Compact</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Affiche uniquement l'heure (HH:MM)
              </p>
              <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border w-fit">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">14:32</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="extended" id="extended" />
            <div className="flex-1 space-y-1">
              <Label htmlFor="extended" className="flex items-center gap-2 cursor-pointer">
                <Maximize2 className="h-4 w-4" />
                <span className="font-medium">Étendu</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Affiche la date et l'heure complètes avec secondes
              </p>
              <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border w-fit">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Lun 24 Nov</span>
                  <span className="text-xs text-muted-foreground">14:32:45</span>
                </div>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      <Button onClick={handleSave} disabled={loading || selectedMode === clockMode} className="w-full">
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};
