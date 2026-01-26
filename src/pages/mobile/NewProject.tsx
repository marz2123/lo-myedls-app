import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

export const MobileNewProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    propertyType: "building",
    address: "",
    postalCode: "",
    city: "",
    facadePhoto: null as string | null,
  });

  const handleTakeFacadePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      setFormData({ ...formData, facadePhoto: image.webPath || null });
      toast.success("Photo de façade capturée");
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error("Erreur lors de la capture photo");
    }
  };

  const handleGetLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition();
      // TODO: Reverse geocoding pour obtenir l'adresse
      toast.success("Position GPS capturée");
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error("Impossible d'obtenir la position GPS");
    }
  };

  const handleCreateProject = async () => {
    if (!formData.name || !formData.address) {
      toast.error("Nom et adresse obligatoires");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Générer un nom pour le projet (utiliser le nom saisi ou générer depuis l'adresse)
      const projectName = formData.name || 
        (formData.address 
          ? `${formData.address}${formData.city ? `, ${formData.city}` : ''}${formData.postalCode ? ` ${formData.postalCode}` : ''}`
          : `Projet EDL - ${new Date().toLocaleDateString()}`);

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('edl_projects')
        .insert({
          user_id: user.id,
          name: projectName,
          address: formData.address,
          postal_code: formData.postalCode,
          city: formData.city,
          property_type: formData.propertyType,
        })
        .select()
        .single();

      if (projectError) {
        console.error('[MobileNewProject] Project creation error:', JSON.stringify(projectError, null, 2));
        throw projectError;
      }

      toast.success("Projet créé");
      navigate(`/mobile/visit/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Nouveau projet</h1>
      </div>

      {/* Form */}
      <div className="p-4 space-y-6">
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-base">Nom du projet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Immeuble rue de la Paix"
                className="h-12 text-base mt-2"
              />
            </div>

            <div>
              <Label htmlFor="propertyType" className="text-base">Type de bien</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
              >
                <SelectTrigger className="h-12 text-base mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Immeuble</SelectItem>
                  <SelectItem value="house">Maison</SelectItem>
                  <SelectItem value="apartment">Appartement</SelectItem>
                  <SelectItem value="commercial">Plateau brut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address" className="text-base">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: 12 rue de la Paix"
                className="h-12 text-base mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="postalCode" className="text-base">Code postal</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="75001"
                  className="h-12 text-base mt-2"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-base">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                  className="h-12 text-base mt-2"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Optional actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleTakeFacadePhoto}
            className="w-full h-14"
          >
            <Camera className="w-5 h-5 mr-2" />
            Photo de façade (optionnel)
          </Button>

          <Button
            variant="outline"
            onClick={handleGetLocation}
            className="w-full h-14"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Capturer position GPS
          </Button>
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreateProject}
          disabled={loading}
          size="lg"
          className="w-full h-16 text-lg font-bold"
        >
          {loading ? "Création..." : "Créer et démarrer la visite"}
        </Button>
      </div>
    </div>
  );
};
