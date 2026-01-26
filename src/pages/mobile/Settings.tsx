import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Image, Palette, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_TEMPLATES } from "@/types/pdfTemplates";

export const MobileSettings = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState("template-architecte");
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [aiAutoClassify, setAiAutoClassify] = useState(true);
  const [aiAutoMeasure, setAiAutoMeasure] = useState(true);
  const [aiPathologyDetection, setAiPathologyDetection] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const handleSave = () => {
    // Save settings to localStorage or backend
    localStorage.setItem('mobile_settings', JSON.stringify({
      selectedTemplate,
      companyName,
      logoUrl,
      aiAutoClassify,
      aiAutoMeasure,
      aiPathologyDetection,
      theme
    }));
    
    toast.success("Paramètres enregistrés");
    navigate('/mobile');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/mobile')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">Configuration application</p>
          </div>
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* PDF Template Section */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">Template PDF</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="template">Template par défaut</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>

              <div>
                <Label htmlFor="company">Nom entreprise</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mon Entreprise BTP"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="logo">Logo entreprise (URL)</Label>
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="mt-2"
                />
                {logoUrl && (
                  <div className="mt-3 p-3 bg-muted rounded-lg flex items-center gap-3">
                    <Image className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Aperçu logo</p>
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="mt-1 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          toast.error("URL logo invalide");
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* AI Options Section */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">Options IA</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="auto-classify">Classification automatique</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Classifier automatiquement les tâches selon DSC
                  </p>
                </div>
                <Switch
                  id="auto-classify"
                  checked={aiAutoClassify}
                  onCheckedChange={setAiAutoClassify}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="auto-measure">Mesures AR automatiques</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activer scan AR pendant l'enregistrement vidéo
                  </p>
                </div>
                <Switch
                  id="auto-measure"
                  checked={aiAutoMeasure}
                  onCheckedChange={setAiAutoMeasure}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="pathology">Détection pathologies</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Détecter automatiquement fissures, humidité, moisissures
                  </p>
                </div>
                <Switch
                  id="pathology"
                  checked={aiPathologyDetection}
                  onCheckedChange={setAiPathologyDetection}
                />
              </div>
            </div>
          </Card>

          {/* Theme Section */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold">Apparence</h2>
            </div>
            
            <div>
              <Label htmlFor="theme">Thème</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark")}>
                <SelectTrigger id="theme" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
