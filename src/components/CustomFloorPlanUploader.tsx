import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Upload,
  X,
  Plus,
  Trash2,
  Save,
  Download,
  Box,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FloorPlan3DViewer } from "./FloorPlan3DViewer";

interface AnnotatedZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CustomFloorPlanUploaderProps {
  projectId: string;
  onZoneSelect: (zone: string) => void;
  selectedZone?: string;
}

export const CustomFloorPlanUploader = ({
  projectId,
  onZoneSelect,
  selectedZone,
}: CustomFloorPlanUploaderProps) => {
  const { t } = useLanguage();
  const isFrench = t("cancel") === "Annuler";
  const { toast } = useToast();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [zones, setZones] = useState<AnnotatedZone[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZone, setCurrentZone] = useState<Partial<AnnotatedZone> | null>(
    null
  );
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: isFrench ? "Fichier invalide" : "Invalid file",
        description: isFrench
          ? "Veuillez sélectionner une image PNG ou JPG"
          : "Please select a PNG or JPG image",
        variant: "destructive",
      });
      return;
    }

    // Upload to Supabase Storage
    const fileName = `${projectId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("floor-plans")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      toast({
        title: isFrench ? "Erreur d'upload" : "Upload error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("floor-plans").getPublicUrl(fileName);

    setUploadedImage(publicUrl);
    setZones([]);
    toast({
      title: isFrench ? "Plan uploade" : "Plan uploaded",
      description: isFrench
        ? "Vous pouvez maintenant annoter les zones"
        : "You can now annotate zones",
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!uploadedImage || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setCurrentZone({
      id: Date.now().toString(),
      x,
      y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentZone || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    setCurrentZone({
      ...currentZone,
      width: currentX - (currentZone.x || 0),
      height: currentY - (currentZone.y || 0),
    });
  };

  const handleMouseUp = () => {
    if (currentZone && Math.abs(currentZone.width || 0) > 2 && Math.abs(currentZone.height || 0) > 2) {
      const label = newZoneLabel || `Zone ${zones.length + 1}`;
      setZones([...zones, { ...currentZone, label } as AnnotatedZone]);
      setNewZoneLabel("");
    }
    setIsDrawing(false);
    setCurrentZone(null);
  };

  const removeZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleSaveAnnotations = async () => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          template_data: {
            custom_floor_plan_url: uploadedImage,
            custom_floor_plan_zones: JSON.parse(JSON.stringify(zones)),
          },
        })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: isFrench ? "Annotations sauvegardees" : "Annotations saved",
        description: isFrench
          ? "Votre plan annoté a été enregistré"
          : "Your annotated plan has been saved",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: isFrench ? "Erreur de sauvegarde" : "Save error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">
            {isFrench ? "Plan personnalisé" : "Custom floor plan"}
          </h4>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            {isFrench ? "Importer" : "Import"}
          </Button>
          {uploadedImage && zones.length > 0 && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSaveAnnotations}
            >
              <Save className="w-3 h-3 mr-1" />
              {isFrench ? "Sauvegarder" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {!uploadedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors bg-muted/20"
        >
          <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            {isFrench
              ? "Cliquez pour importer un plan (PNG, JPG)"
              : "Click to import a floor plan (PNG, JPG)"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isFrench
              ? "Vous pourrez ensuite annoter les zones"
              : "You can then annotate zones"}
          </p>
        </div>
      ) : (
        <Tabs defaultValue="2d" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="2d">
              {isFrench ? "Plan 2D" : "2D Plan"}
            </TabsTrigger>
            <TabsTrigger value="3d">
              <Box className="w-4 h-4 mr-2" />
              {isFrench ? "Aperçu 3D" : "3D Preview"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="2d" className="space-y-4">
            <div className="space-y-2">
            <Label htmlFor="zone-label" className="text-xs">
              {isFrench
                ? "Nom de la zone à dessiner"
                : "Zone name to draw"}
            </Label>
            <Input
              id="zone-label"
              placeholder={
                isFrench ? "Ex: Cuisine, Salon..." : "Ex: Kitchen, Living room..."
              }
              value={newZoneLabel}
              onChange={(e) => setNewZoneLabel(e.target.value)}
              className="text-sm"
            />
          </div>

          <div
            ref={imageRef}
            className="relative border border-border rounded-lg overflow-hidden bg-background cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={uploadedImage}
              alt="Floor plan"
              className="w-full h-auto"
              draggable={false}
            />

            {/* Rendered zones */}
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="absolute border-2 border-primary bg-primary/20 cursor-pointer group"
                style={{
                  left: `${Math.min(zone.x, zone.x + zone.width)}%`,
                  top: `${Math.min(zone.y, zone.y + zone.height)}%`,
                  width: `${Math.abs(zone.width)}%`,
                  height: `${Math.abs(zone.height)}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onZoneSelect(zone.label);
                }}
              >
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
                  {zone.label}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeZone(zone.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {/* Current drawing zone */}
            {isDrawing && currentZone && (
              <div
                className="absolute border-2 border-dashed border-primary bg-primary/10"
                style={{
                  left: `${Math.min(
                    currentZone.x || 0,
                    (currentZone.x || 0) + (currentZone.width || 0)
                  )}%`,
                  top: `${Math.min(
                    currentZone.y || 0,
                    (currentZone.y || 0) + (currentZone.height || 0)
                  )}%`,
                  width: `${Math.abs(currentZone.width || 0)}%`,
                  height: `${Math.abs(currentZone.height || 0)}%`,
                }}
              />
            )}
          </div>

          {zones.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {isFrench ? "Zones annotées :" : "Annotated zones:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {zones.map((zone) => (
                  <Badge
                    key={zone.id}
                    variant={selectedZone === zone.label ? "default" : "secondary"}
                    className="text-xs cursor-pointer"
                    onClick={() => onZoneSelect(zone.label)}
                  >
                    {zone.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

            <p className="text-xs text-muted-foreground">
              {isFrench
                ? "Cliquez et glissez sur le plan pour dessiner une zone"
                : "Click and drag on the plan to draw a zone"}
            </p>
          </TabsContent>

          <TabsContent value="3d" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
              {isFrench
                ? "Utilisez la souris pour naviguer : clic gauche pour tourner, molette pour zoomer, clic droit pour deplacer"
                : "Use mouse to navigate: left click to rotate, scroll to zoom, right click to pan"}
            </div>
            <FloorPlan3DViewer floorPlanUrl={uploadedImage} zones={zones} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
