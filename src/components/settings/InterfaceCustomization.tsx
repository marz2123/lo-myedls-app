import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, X, Palette, RotateCcw, Sparkles, Download, FileUp, Eye, ArrowLeftRight, Wand2, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  generateComplementary, 
  generateAnalogous, 
  generateTriadic,
  type PaletteType,
  type ColorPalette 
} from "@/lib/colorPalette";

// Predefined professional themes
const PREDEFINED_THEMES = [
  {
    id: 'default',
    name: { fr: 'Défaut', en: 'Default' },
    description: { fr: 'Thème par défaut', en: 'Default theme' },
    primaryColor: '214 85% 35%',
    accentColor: '25 95% 53%',
  },
  {
    id: 'corporate-blue',
    name: { fr: 'Bleu Corporate', en: 'Corporate Blue' },
    description: { fr: 'Professionnel et élégant', en: 'Professional and elegant' },
    primaryColor: '221 83% 53%',
    accentColor: '199 89% 48%',
  },
  {
    id: 'modern-green',
    name: { fr: 'Vert Moderne', en: 'Modern Green' },
    description: { fr: 'Écologique et frais', en: 'Eco-friendly and fresh' },
    primaryColor: '142 71% 45%',
    accentColor: '173 58% 39%',
  },
  {
    id: 'creative-purple',
    name: { fr: 'Violet Créatif', en: 'Creative Purple' },
    description: { fr: 'Artistique et innovant', en: 'Artistic and innovative' },
    primaryColor: '271 81% 56%',
    accentColor: '291 64% 42%',
  },
  {
    id: 'warm-sunset',
    name: { fr: 'Coucher de Soleil', en: 'Warm Sunset' },
    description: { fr: 'Chaleureux et accueillant', en: 'Warm and welcoming' },
    primaryColor: '14 100% 57%',
    accentColor: '38 92% 50%',
  },
  {
    id: 'ocean-breeze',
    name: { fr: 'Brise Océanique', en: 'Ocean Breeze' },
    description: { fr: 'Calme et apaisant', en: 'Calm and soothing' },
    primaryColor: '199 89% 48%',
    accentColor: '187 85% 43%',
  },
  {
    id: 'elegant-black',
    name: { fr: 'Noir Élégant', en: 'Elegant Black' },
    description: { fr: 'Luxueux et sophistiqué', en: 'Luxurious and sophisticated' },
    primaryColor: '210 11% 15%',
    accentColor: '47 96% 53%',
  },
  {
    id: 'vibrant-red',
    name: { fr: 'Rouge Vibrant', en: 'Vibrant Red' },
    description: { fr: 'Énergique et passionné', en: 'Energetic and passionate' },
    primaryColor: '0 84% 60%',
    accentColor: '16 100% 50%',
  },
];

export const InterfaceCustomization = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState("214 85% 35%");
  const [accentColor, setAccentColor] = useState("25 95% 53%");
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [originalPrimaryColor, setOriginalPrimaryColor] = useState("214 85% 35%");
  const [originalAccentColor, setOriginalAccentColor] = useState("25 95% 53%");
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);
  const [selectedPaletteType, setSelectedPaletteType] = useState<PaletteType>('complementary');
  const [generatedPalettes, setGeneratedPalettes] = useState<Record<PaletteType, ColorPalette> | null>(null);
  const [dualModePreview, setDualModePreview] = useState(false);

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('myaladin_preferences')
        .select('custom_logo_url, primary_color, accent_color')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLogoUrl(data.custom_logo_url);
        setPrimaryColor(data.primary_color || "214 85% 35%");
        setAccentColor(data.accent_color || "25 95% 53%");
        
        // Save original colors for comparison
        setOriginalPrimaryColor(data.primary_color || "214 85% 35%");
        setOriginalAccentColor(data.accent_color || "25 95% 53%");
        
        // Apply colors to CSS variables
        applyColors(data.primary_color || "214 85% 35%", data.accent_color || "25 95% 53%");
      } else {
        // Save default colors as original
        setOriginalPrimaryColor("214 85% 35%");
        setOriginalAccentColor("25 95% 53%");
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const applyColors = (primary: string, accent: string) => {
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--accent', accent);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Fichier trop volumineux' : '❌ File too large',
        description: t('cancel') === 'Annuler' 
          ? 'La taille maximale est 2MB' 
          : 'Maximum size is 2MB',
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Type de fichier invalide' : '❌ Invalid file type',
        description: t('cancel') === 'Annuler' 
          ? 'Veuillez choisir une image' 
          : 'Please choose an image',
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  const handleRemoveLogo = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Delete from storage if exists
      if (logoUrl && !logoUrl.startsWith('blob:')) {
        const fileName = logoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('user-logos')
            .remove([`${userId}/${fileName}`]);
        }
      }

      // Update database
      const { error } = await supabase
        .from('myaladin_preferences')
        .upsert({
          user_id: userId,
          custom_logo_url: null,
        });

      if (error) throw error;

      setLogoUrl(null);
      setLogoFile(null);

      toast({
        title: t('cancel') === 'Annuler' ? '✅ Logo supprimé' : '✅ Logo removed',
        description: t('cancel') === 'Annuler' 
          ? 'Votre logo a été supprimé avec succès' 
          : 'Your logo has been removed successfully',
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Erreur' : '❌ Error',
        description: t('cancel') === 'Annuler' 
          ? 'Impossible de supprimer le logo' 
          : 'Failed to remove logo',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetColors = () => {
    const defaultPrimary = "214 85% 35%";
    const defaultAccent = "25 95% 53%";
    setPrimaryColor(defaultPrimary);
    setAccentColor(defaultAccent);
    setSelectedTheme('default');
    applyColors(defaultPrimary, defaultAccent);
  };

  const handleApplyTheme = (theme: typeof PREDEFINED_THEMES[0]) => {
    setPrimaryColor(theme.primaryColor);
    setAccentColor(theme.accentColor);
    setSelectedTheme(theme.id);
    applyColors(theme.primaryColor, theme.accentColor);
    
    toast({
      title: t('cancel') === 'Annuler' ? '✅ Thème appliqué' : '✅ Theme applied',
      description: t('cancel') === 'Annuler' 
        ? `Le thème "${theme.name.fr}" a été appliqué` 
      : `Theme "${theme.name.en}" has been applied`,
    });
  };

  const handleExportTheme = () => {
    const themeData = {
      name: t('cancel') === 'Annuler' ? 'Mon thème personnalisé' : 'My custom theme',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      primaryColor,
      accentColor,
      logoUrl: logoUrl && !logoUrl.startsWith('blob:') ? logoUrl : null,
    };

    const dataStr = JSON.stringify(themeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: t('cancel') === 'Annuler' ? '✅ Thème exporté' : '✅ Theme exported',
      description: t('cancel') === 'Annuler' 
        ? 'Votre thème a été exporté avec succès' 
        : 'Your theme has been exported successfully',
    });
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Type de fichier invalide' : '❌ Invalid file type',
        description: t('cancel') === 'Annuler' 
          ? 'Veuillez choisir un fichier JSON' 
          : 'Please choose a JSON file',
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const themeData = JSON.parse(content);

        // Validate theme structure
        if (!themeData.primaryColor || !themeData.accentColor) {
          throw new Error('Invalid theme structure');
        }

        // Validate HSL format
        const hslPattern = /^\d+\s+\d+%\s+\d+%$/;
        if (!hslPattern.test(themeData.primaryColor) || !hslPattern.test(themeData.accentColor)) {
          throw new Error('Invalid color format');
        }

        // Apply imported theme
        setPrimaryColor(themeData.primaryColor);
        setAccentColor(themeData.accentColor);
        applyColors(themeData.primaryColor, themeData.accentColor);
        setSelectedTheme(null);

        // Handle logo URL if present
        if (themeData.logoUrl) {
          setLogoUrl(themeData.logoUrl);
        }

        toast({
          title: t('cancel') === 'Annuler' ? '✅ Thème importé' : '✅ Theme imported',
          description: t('cancel') === 'Annuler' 
            ? `Le thème "${themeData.name}" a été appliqué avec succès` 
            : `Theme "${themeData.name}" has been applied successfully`,
        });
      } catch (error) {
        console.error('Error importing theme:', error);
        toast({
          title: t('cancel') === 'Annuler' ? '❌ Erreur d\'importation' : '❌ Import error',
          description: t('cancel') === 'Annuler' 
            ? 'Le fichier JSON est invalide ou corrompu' 
            : 'The JSON file is invalid or corrupted',
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    // Reset input value to allow re-importing the same file
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload logo if new file selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-logos')
          .getPublicUrl(filePath);

        finalLogoUrl = publicUrl;
      }

      // Update preferences
      const { error } = await supabase
        .from('myaladin_preferences')
        .upsert({
          user_id: userId,
          custom_logo_url: finalLogoUrl,
          primary_color: primaryColor,
          accent_color: accentColor,
        });

      if (error) throw error;

      // Apply colors
      applyColors(primaryColor, accentColor);

      toast({
        title: t('cancel') === 'Annuler' ? '✅ Personnalisation enregistrée' : '✅ Customization saved',
        description: t('cancel') === 'Annuler' 
          ? 'Vos préférences ont été sauvegardées avec succès' 
          : 'Your preferences have been saved successfully',
      });

      setLogoFile(null);
    } catch (error) {
      console.error('Error saving customization:', error);
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Erreur' : '❌ Error',
        description: t('cancel') === 'Annuler' 
          ? 'Impossible de sauvegarder les préférences' 
          : 'Failed to save preferences',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert HSL to hex for color picker
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
    const lightness = l / 100;
    const a = (s * Math.min(lightness, 1 - lightness)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "214 85% 35%";
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Handle palette generation
  const handleGeneratePalettes = () => {
    const palettes = {
      complementary: generateComplementary(primaryColor),
      analogous: generateAnalogous(primaryColor),
      triadic: generateTriadic(primaryColor),
    };
    setGeneratedPalettes(palettes);
    setShowPaletteGenerator(true);
  };

  // Apply palette color
  const handleApplyPaletteColor = (color: string, index: number) => {
    if (index === 0) {
      setPrimaryColor(color);
      applyColors(color, accentColor);
    } else {
      setAccentColor(color);
      applyColors(primaryColor, color);
    }
    
    toast({
      title: t('cancel') === 'Annuler' ? '✅ Couleur appliquée' : '✅ Color applied',
      description: t('cancel') === 'Annuler' 
        ? 'La couleur de la palette a été appliquée' 
        : 'Palette color has been applied',
    });
  };

  return (
    <div className="space-y-6">
      {/* Export/Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Partager mon thème' : 'Share My Theme'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Exportez ou importez des thèmes au format JSON' 
              : 'Export or import themes in JSON format'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleExportTheme}
              className="gap-2 flex-1 sm:flex-none hover-scale"
              aria-label={t('cancel') === 'Annuler' ? 'Exporter le thème actuel' : 'Export current theme'}
            >
              <Download className="w-4 h-4" />
              {t('cancel') === 'Annuler' ? 'Exporter mon thème' : 'Export My Theme'}
            </Button>

            <Label htmlFor="theme-import" className="flex-1 sm:flex-none">
              <div className="cursor-pointer">
                <Button
                  variant="outline"
                  className="gap-2 w-full hover-scale"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4" />
                    {t('cancel') === 'Annuler' ? 'Importer un thème' : 'Import Theme'}
                  </span>
                </Button>
              </div>
            </Label>
            <Input
              id="theme-import"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportTheme}
            />
          </div>
          
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              {t('cancel') === 'Annuler' 
                ? '💡 Astuce : Exportez votre thème pour le partager avec d\'autres utilisateurs ou le sauvegarder comme backup. Les thèmes exportés incluent les couleurs et le lien vers le logo.' 
                : '💡 Tip: Export your theme to share it with other users or save it as a backup. Exported themes include colors and logo URL.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Predefined Themes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Thèmes prédéfinis' : 'Predefined Themes'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Sélectionnez un thème professionnel pour une personnalisation rapide' 
              : 'Select a professional theme for quick customization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PREDEFINED_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleApplyTheme(theme)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-300 text-left
                    hover:scale-105 hover:shadow-lg group
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  aria-label={`${t('cancel') === 'Annuler' ? 'Appliquer le thème' : 'Apply theme'} ${theme.name[t('cancel') === 'Annuler' ? 'fr' : 'en']}`}
                >
                  {/* Color Preview */}
                  <div className="flex gap-2 mb-3">
                    <div 
                      className="w-8 h-8 rounded-md shadow-sm border border-border transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `hsl(${theme.primaryColor})` }}
                    />
                    <div 
                      className="w-8 h-8 rounded-md shadow-sm border border-border transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `hsl(${theme.accentColor})` }}
                    />
                  </div>
                  
                  {/* Theme Name */}
                  <h3 className="font-semibold text-sm mb-1 text-foreground">
                    {theme.name[t('cancel') === 'Annuler' ? 'fr' : 'en']}
                  </h3>
                  
                  {/* Theme Description */}
                  <p className="text-xs text-muted-foreground">
                    {theme.description[t('cancel') === 'Annuler' ? 'fr' : 'en']}
                  </p>
                  
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Logo personnalisé' : 'Custom Logo'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Ajoutez votre propre logo (max 2MB, formats: PNG, JPG, SVG)' 
              : 'Add your own logo (max 2MB, formats: PNG, JPG, SVG)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="relative inline-block">
              <img
                src={logoUrl}
                alt="Custom logo"
                className="h-24 w-auto object-contain border border-border rounded-lg p-2 bg-card"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveLogo}
                disabled={loading}
                aria-label={t('cancel') === 'Annuler' ? 'Supprimer le logo' : 'Remove logo'}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? 'Cliquez pour choisir un logo' 
                    : 'Click to choose a logo'}
                </p>
              </div>
            </Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Palette Generator Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Générateur de palettes harmonieuses' : 'Harmonic Palette Generator'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Générez des palettes de couleurs basées sur la théorie des couleurs' 
              : 'Generate color palettes based on color theory'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleGeneratePalettes}
              className="gap-2 hover-scale"
              aria-label={t('cancel') === 'Annuler' ? 'Générer des palettes' : 'Generate palettes'}
            >
              <Wand2 className="w-4 h-4" />
              {t('cancel') === 'Annuler' ? 'Générer des palettes' : 'Generate Palettes'}
            </Button>
            
            {showPaletteGenerator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPaletteGenerator(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('cancel') === 'Annuler' ? 'Masquer' : 'Hide'}
              </Button>
            )}
          </div>

          {showPaletteGenerator && generatedPalettes && (
            <div className="space-y-4 animate-fade-in">
              <Tabs value={selectedPaletteType} onValueChange={(v) => setSelectedPaletteType(v as PaletteType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="complementary">
                    {t('cancel') === 'Annuler' ? 'Complémentaire' : 'Complementary'}
                  </TabsTrigger>
                  <TabsTrigger value="analogous">
                    {t('cancel') === 'Annuler' ? 'Analogue' : 'Analogous'}
                  </TabsTrigger>
                  <TabsTrigger value="triadic">
                    {t('cancel') === 'Annuler' ? 'Triadique' : 'Triadic'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="complementary" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('cancel') === 'Annuler' 
                      ? 'Couleurs opposées sur le cercle chromatique pour un contraste maximal' 
                      : 'Opposite colors on the color wheel for maximum contrast'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {generatedPalettes.complementary.colors.map((color, idx) => (
                      <div key={idx} className="space-y-2">
                        <div 
                          className="h-24 rounded-lg border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: `hsl(${color})` }}
                          onClick={() => handleApplyPaletteColor(color, idx)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${t('cancel') === 'Annuler' ? 'Appliquer' : 'Apply'} ${generatedPalettes.complementary.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}`}
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground">
                            {generatedPalettes.complementary.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            hsl({color})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="analogous" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('cancel') === 'Annuler' 
                      ? 'Couleurs adjacentes sur le cercle chromatique pour une harmonie douce' 
                      : 'Adjacent colors on the color wheel for soft harmony'}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {generatedPalettes.analogous.colors.map((color, idx) => (
                      <div key={idx} className="space-y-2">
                        <div 
                          className="h-24 rounded-lg border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: `hsl(${color})` }}
                          onClick={() => handleApplyPaletteColor(color, idx === 0 ? 0 : 1)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${t('cancel') === 'Annuler' ? 'Appliquer' : 'Apply'} ${generatedPalettes.analogous.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}`}
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground">
                            {generatedPalettes.analogous.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            hsl({color})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="triadic" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('cancel') === 'Annuler' 
                      ? 'Trois couleurs équidistantes sur le cercle chromatique pour un équilibre vibrant' 
                      : 'Three equally-spaced colors on the color wheel for vibrant balance'}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {generatedPalettes.triadic.colors.map((color, idx) => (
                      <div key={idx} className="space-y-2">
                        <div 
                          className="h-24 rounded-lg border-2 border-border shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: `hsl(${color})` }}
                          onClick={() => handleApplyPaletteColor(color, idx === 0 ? 0 : 1)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${t('cancel') === 'Annuler' ? 'Appliquer' : 'Apply'} ${generatedPalettes.triadic.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}`}
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-foreground">
                            {generatedPalettes.triadic.labels[idx][t('cancel') === 'Annuler' ? 'fr' : 'en']}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            hsl({color})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? '💡 Astuce : Cliquez sur une couleur pour l\'appliquer comme couleur principale ou accent selon sa position dans la palette.' 
                    : '💡 Tip: Click on a color to apply it as primary or accent color based on its position in the palette.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            {t('cancel') === 'Annuler' ? 'Couleurs personnalisées' : 'Custom Colors'}
          </CardTitle>
          <CardDescription>
            {t('cancel') === 'Annuler' 
              ? 'Personnalisez les couleurs de l\'interface' 
              : 'Customize interface colors'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compare Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('cancel') === 'Annuler' ? 'Mode Comparaison' : 'Compare Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? 'Voir l\'ancien et le nouveau thème côte à côte' 
                    : 'See old and new theme side by side'}
                </p>
              </div>
            </div>
            <Switch
              checked={compareMode}
              onCheckedChange={setCompareMode}
              aria-label={t('cancel') === 'Annuler' ? 'Activer le mode comparaison' : 'Enable compare mode'}
            />
          </div>

          {/* Dual Mode Preview Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Sun className="w-4 h-4 text-primary" />
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('cancel') === 'Annuler' ? 'Aperçu Dual Mode' : 'Dual Mode Preview'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? 'Voir le thème en mode clair et sombre simultanément' 
                    : 'See theme in light and dark mode simultaneously'}
                </p>
              </div>
            </div>
            <Switch
              checked={dualModePreview}
              onCheckedChange={setDualModePreview}
              aria-label={t('cancel') === 'Annuler' ? 'Activer l\'aperçu dual mode' : 'Enable dual mode preview'}
            />
          </div>

          {/* Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                {t('cancel') === 'Annuler' ? 'Aperçu en direct' : 'Live Preview'}
              </h4>
            </div>
            
            <div className={`grid gap-4 ${compareMode ? 'grid-cols-1 lg:grid-cols-2' : dualModePreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Before/Original Theme Preview */}
              {compareMode && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('cancel') === 'Annuler' ? '← Avant (Original)' : '← Before (Original)'}
                    </p>
                  </div>
                  <div 
                    className="border-2 border-border rounded-lg p-4 bg-background space-y-4"
                    style={{
                      '--preview-primary': originalPrimaryColor,
                      '--preview-accent': originalAccentColor,
                    } as React.CSSProperties}
                  >
                    {/* Mini Navbar Preview */}
                    <div 
                      className="h-12 rounded-md flex items-center justify-between px-4 shadow-sm"
                      style={{ 
                        backgroundColor: `hsl(${originalPrimaryColor})`,
                        color: 'hsl(0 0% 100%)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/20" />
                        <span className="text-sm font-semibold">MyEDLs</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-16 h-6 rounded bg-white/20" />
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      </div>
                    </div>

                    <Separator />

                    {/* Buttons Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t('cancel') === 'Annuler' ? 'Boutons' : 'Buttons'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${originalPrimaryColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Principal' : 'Primary'}
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${originalAccentColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Accent' : 'Accent'}
                        </button>
                      </div>
                    </div>

                    <Separator />

                    {/* Cards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t('cancel') === 'Annuler' ? 'Cartes' : 'Cards'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border rounded-lg p-2 space-y-2 bg-card">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${originalPrimaryColor} / 0.1)`,
                              color: `hsl(${originalPrimaryColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${originalPrimaryColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 bg-foreground/20 rounded w-3/4" />
                            <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-2 space-y-2 bg-card">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${originalAccentColor} / 0.1)`,
                              color: `hsl(${originalAccentColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${originalAccentColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 bg-foreground/20 rounded w-3/4" />
                            <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Light Mode Preview (when dual mode is active) */}
              {dualModePreview && !compareMode && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      {t('cancel') === 'Annuler' ? 'Mode Clair' : 'Light Mode'}
                    </p>
                  </div>
                  <div 
                    className="border-2 border-border rounded-lg p-4 space-y-4 light"
                    style={{
                      '--preview-primary': primaryColor,
                      '--preview-accent': accentColor,
                      '--background': '0 0% 100%',
                      '--foreground': '222.2 84% 4.9%',
                      '--card': '0 0% 100%',
                      '--card-foreground': '222.2 84% 4.9%',
                      '--muted': '210 40% 96.1%',
                      '--muted-foreground': '215.4 16.3% 46.9%',
                      '--border': '214.3 31.8% 91.4%',
                    } as React.CSSProperties}
                  >
                    {/* Mini Navbar Preview */}
                    <div 
                      className="h-12 rounded-md flex items-center justify-between px-4 shadow-sm"
                      style={{ 
                        backgroundColor: `hsl(${primaryColor})`,
                        color: 'hsl(0 0% 100%)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/20" />
                        <span className="text-sm font-semibold">MyEDLs</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-16 h-6 rounded bg-white/20" />
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      </div>
                    </div>

                    <Separator style={{ backgroundColor: 'hsl(214.3 31.8% 91.4%)' }} />

                    {/* Buttons Preview */}
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: 'hsl(215.4 16.3% 46.9%)' }}>
                        {t('cancel') === 'Annuler' ? 'Boutons' : 'Buttons'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1.5 text-xs rounded-md font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${primaryColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Principal' : 'Primary'}
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs rounded-md font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${accentColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Accent' : 'Accent'}
                        </button>
                      </div>
                    </div>

                    <Separator style={{ backgroundColor: 'hsl(214.3 31.8% 91.4%)' }} />

                    {/* Cards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: 'hsl(215.4 16.3% 46.9%)' }}>
                        {t('cancel') === 'Annuler' ? 'Cartes' : 'Cards'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border rounded-lg p-2 space-y-2" style={{ backgroundColor: 'hsl(0 0% 100%)', borderColor: 'hsl(214.3 31.8% 91.4%)' }}>
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${primaryColor} / 0.1)`,
                              color: `hsl(${primaryColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${primaryColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: 'hsl(222.2 84% 4.9% / 0.2)' }} />
                            <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: 'hsl(222.2 84% 4.9% / 0.1)' }} />
                          </div>
                        </div>
                        <div className="border rounded-lg p-2 space-y-2" style={{ backgroundColor: 'hsl(0 0% 100%)', borderColor: 'hsl(214.3 31.8% 91.4%)' }}>
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${accentColor} / 0.1)`,
                              color: `hsl(${accentColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${accentColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 rounded w-3/4" style={{ backgroundColor: 'hsl(222.2 84% 4.9% / 0.2)' }} />
                            <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: 'hsl(222.2 84% 4.9% / 0.1)' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dark Mode Preview (when dual mode is active) OR Standard Preview */}
              {(!dualModePreview || dualModePreview) && !compareMode && (
                <div className={`space-y-2 ${dualModePreview ? 'animate-fade-in' : ''}`}>
                  {dualModePreview && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Moon className="w-3 h-3" />
                        {t('cancel') === 'Annuler' ? 'Mode Sombre' : 'Dark Mode'}
                      </p>
                    </div>
                  )}
                  <div 
                    className="border-2 border-primary/50 rounded-lg p-4 space-y-4 animate-fade-in dark"
                    style={{
                      '--preview-primary': primaryColor,
                      '--preview-accent': accentColor,
                      '--background': '222.2 84% 4.9%',
                      '--foreground': '210 40% 98%',
                      '--card': '222.2 84% 4.9%',
                      '--card-foreground': '210 40% 98%',
                      '--muted': '217.2 32.6% 17.5%',
                      '--muted-foreground': '215 20.2% 65.1%',
                      '--border': '217.2 32.6% 17.5%',
                    } as React.CSSProperties}
                  >
                    {/* Mini Navbar Preview */}
                    <div 
                      className="h-12 rounded-md flex items-center justify-between px-4 shadow-sm"
                      style={{ 
                        backgroundColor: `hsl(${primaryColor})`,
                        color: 'hsl(0 0% 100%)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/20" />
                        <span className="text-sm font-semibold">MyEDLs</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-16 h-6 rounded bg-white/20" />
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      </div>
                    </div>

                    <Separator style={{ backgroundColor: 'hsl(217.2 32.6% 17.5%)' }} />

                    {/* Buttons Preview */}
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: 'hsl(215 20.2% 65.1%)' }}>
                        {t('cancel') === 'Annuler' ? 'Boutons' : 'Buttons'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`${dualModePreview ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-md font-medium transition-all hover:opacity-90`}
                          style={{ 
                            backgroundColor: `hsl(${primaryColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Principal' : 'Primary'}
                        </button>
                        <button
                          className={`${dualModePreview ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-md font-medium transition-all hover:opacity-90`}
                          style={{ 
                            backgroundColor: `hsl(${accentColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Accent' : 'Accent'}
                        </button>
                        {!dualModePreview && (
                          <button
                            className="px-4 py-2 rounded-md text-sm font-medium border transition-all hover:bg-opacity-10"
                            style={{ 
                              borderColor: `hsl(${primaryColor})`,
                              color: `hsl(${primaryColor})`
                            }}
                          >
                            {t('cancel') === 'Annuler' ? 'Contour' : 'Outline'}
                          </button>
                        )}
                      </div>
                    </div>

                    <Separator style={{ backgroundColor: 'hsl(217.2 32.6% 17.5%)' }} />

                    {/* Cards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs" style={{ color: 'hsl(215 20.2% 65.1%)' }}>
                        {t('cancel') === 'Annuler' ? 'Cartes' : 'Cards'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`border rounded-lg ${dualModePreview ? 'p-2' : 'p-3'} space-y-2 hover:shadow-md transition-shadow`} style={{ backgroundColor: 'hsl(222.2 84% 4.9%)', borderColor: 'hsl(217.2 32.6% 17.5%)' }}>
                          <div 
                            className={`${dualModePreview ? 'w-6 h-6' : 'w-8 h-8'} rounded flex items-center justify-center`}
                            style={{ 
                              backgroundColor: `hsl(${primaryColor} / 0.1)`,
                              color: `hsl(${primaryColor})`
                            }}
                          >
                            <div className={`${dualModePreview ? 'w-3 h-3' : 'w-4 h-4'} rounded-full`} style={{ backgroundColor: `hsl(${primaryColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className={`${dualModePreview ? 'h-1.5' : 'h-2'} rounded w-3/4`} style={{ backgroundColor: 'hsl(210 40% 98% / 0.2)' }} />
                            <div className={`${dualModePreview ? 'h-1.5' : 'h-2'} rounded w-1/2`} style={{ backgroundColor: 'hsl(210 40% 98% / 0.1)' }} />
                          </div>
                        </div>
                        <div className={`border rounded-lg ${dualModePreview ? 'p-2' : 'p-3'} space-y-2 hover:shadow-md transition-shadow`} style={{ backgroundColor: 'hsl(222.2 84% 4.9%)', borderColor: 'hsl(217.2 32.6% 17.5%)' }}>
                          <div 
                            className={`${dualModePreview ? 'w-6 h-6' : 'w-8 h-8'} rounded flex items-center justify-center`}
                            style={{ 
                              backgroundColor: `hsl(${accentColor} / 0.1)`,
                              color: `hsl(${accentColor})`
                            }}
                          >
                            <div className={`${dualModePreview ? 'w-3 h-3' : 'w-4 h-4'} rounded-full`} style={{ backgroundColor: `hsl(${accentColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className={`${dualModePreview ? 'h-1.5' : 'h-2'} rounded w-3/4`} style={{ backgroundColor: 'hsl(210 40% 98% / 0.2)' }} />
                            <div className={`${dualModePreview ? 'h-1.5' : 'h-2'} rounded w-1/2`} style={{ backgroundColor: 'hsl(210 40% 98% / 0.1)' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info Badge */}
                    {!dualModePreview && (
                      <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: 'hsl(217.2 32.6% 17.5% / 0.5)' }}>
                        <Eye className="w-4 h-4" style={{ color: `hsl(${primaryColor})` }} />
                        <p className="text-xs" style={{ color: 'hsl(215 20.2% 65.1%)' }}>
                          {t('cancel') === 'Annuler' 
                            ? 'Cet aperçu se met à jour en temps réel' 
                            : 'This preview updates in real-time'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* After/New Theme Preview (for compare mode) */}
              {compareMode && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {t('cancel') === 'Annuler' ? 'Après (Nouveau) →' : 'After (New) →'}
                    </p>
                  </div>
                  <div 
                    className="border-2 border-primary/50 rounded-lg p-4 bg-background space-y-4 animate-fade-in"
                    style={{
                      '--preview-primary': primaryColor,
                      '--preview-accent': accentColor,
                    } as React.CSSProperties}
                  >
                    {/* Mini Navbar Preview */}
                    <div 
                      className="h-12 rounded-md flex items-center justify-between px-4 shadow-sm"
                      style={{ 
                        backgroundColor: `hsl(${primaryColor})`,
                        color: 'hsl(0 0% 100%)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/20" />
                        <span className="text-sm font-semibold">MyEDLs</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-16 h-6 rounded bg-white/20" />
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      </div>
                    </div>

                    <Separator />

                    {/* Buttons Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t('cancel') === 'Annuler' ? 'Boutons' : 'Buttons'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-3 py-1.5 text-xs rounded-md font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${primaryColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Principal' : 'Primary'}
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs rounded-md font-medium transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: `hsl(${accentColor})`,
                            color: 'hsl(0 0% 100%)'
                          }}
                        >
                          {t('cancel') === 'Annuler' ? 'Accent' : 'Accent'}
                        </button>
                      </div>
                    </div>

                    <Separator />

                    {/* Cards Preview */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t('cancel') === 'Annuler' ? 'Cartes' : 'Cards'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border rounded-lg p-2 space-y-2 bg-card">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${primaryColor} / 0.1)`,
                              color: `hsl(${primaryColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${primaryColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 bg-foreground/20 rounded w-3/4" />
                            <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="border rounded-lg p-2 space-y-2 bg-card">
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ 
                              backgroundColor: `hsl(${accentColor} / 0.1)`,
                              color: `hsl(${accentColor})`
                            }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${accentColor})` }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 bg-foreground/20 rounded w-3/4" />
                            <div className="h-1.5 bg-foreground/10 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">
                {t('cancel') === 'Annuler' ? 'Couleur principale' : 'Primary Color'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={hslToHex(primaryColor)}
                  onChange={(e) => setPrimaryColor(hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="214 85% 35%"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">
                {t('cancel') === 'Annuler' ? 'Couleur d\'accent' : 'Accent Color'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={hslToHex(accentColor)}
                  onChange={(e) => setAccentColor(hexToHsl(e.target.value))}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="25 95% 53%"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetColors}
            className="gap-2"
            disabled={selectedTheme === 'default'}
            aria-label={t('cancel') === 'Annuler' ? 'Réinitialiser les couleurs' : 'Reset colors'}
          >
            <RotateCcw className="w-4 h-4" />
            {t('cancel') === 'Annuler' ? 'Réinitialiser au défaut' : 'Reset to default'}
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="gap-2"
          aria-label={t('cancel') === 'Annuler' ? 'Sauvegarder la personnalisation' : 'Save customization'}
        >
          {loading ? (
            t('cancel') === 'Annuler' ? 'Sauvegarde...' : 'Saving...'
          ) : (
            t('cancel') === 'Annuler' ? 'Sauvegarder' : 'Save'
          )}
        </Button>
      </div>
    </div>
  );
};