import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Table, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Share } from "@capacitor/share";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { generateEDLPDF } from "@/utils/pdfGenerator";
import { useMobile } from "@/hooks/useMobile";

export const MobileExport = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isNative } = useMobile();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState({
    includePhotos: true,
    includeAudio: false,
    includeTasks: true,
    includeTranscription: true,
  });

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select(`
          *,
          projects (
            id,
            address,
            property_type
          ),
          detected_blocks (
            id,
            block_number
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error("Erreur lors du chargement");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!sessionId) return;

    setExporting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      // Call edge function to get PDF data
      const { data, error } = await supabase.functions.invoke('generate-edl-pdf', {
        body: { sessionId, options }
      });

      if (error) throw error;

      // Generate PDF
      const pdfBlob = await generateEDLPDF(data.data);

      // Save to filesystem if native
      if (isNative) {
        const base64Data = await blobToBase64(pdfBlob);
        const fileName = `edl_${sessionId}_${Date.now()}.pdf`;
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data.split(',')[1],
          directory: Directory.Cache,
        });

        await Haptics.impact({ style: ImpactStyle.Heavy });
        toast.success("EDL PDF généré");

        // Share the file
        await Share.share({
          title: 'État des Lieux',
          text: 'EDL généré par MyEDLS',
          files: [result.uri],
          dialogTitle: 'Partager l\'EDL',
        });
      } else {
        // Download in browser
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edl_${sessionId}_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("EDL PDF téléchargé");
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!sessionId) return;

    setExporting(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      // Call edge function to get CSV data
      const { data, error } = await supabase.functions.invoke('generate-tasks-csv', {
        body: { sessionId }
      });

      if (error) throw error;

      // Create CSV blob
      const csvBlob = new Blob([data.data], { type: 'text/csv;charset=utf-8;' });

      // Save to filesystem if native
      if (isNative) {
        const base64Data = await blobToBase64(csvBlob);
        
        const result = await Filesystem.writeFile({
          path: data.filename,
          data: base64Data.split(',')[1],
          directory: Directory.Cache,
        });

        await Haptics.impact({ style: ImpactStyle.Heavy });
        toast.success("Listing CSV généré");

        // Share the file
        await Share.share({
          title: 'Listing Tâches',
          text: 'Listing des tâches généré par MyEDLS',
          files: [result.uri],
          dialogTitle: 'Partager le listing',
        });
      } else {
        // Download in browser
        const url = URL.createObjectURL(csvBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Listing CSV téléchargé");
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Export documents</h1>
            <p className="text-sm text-muted-foreground">
              {session.projects?.address}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Options */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Options d'export</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="photos"
                checked={options.includePhotos}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includePhotos: checked as boolean })
                }
              />
              <Label htmlFor="photos" className="text-base">
                Inclure les photos
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="audio"
                checked={options.includeAudio}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeAudio: checked as boolean })
                }
              />
              <Label htmlFor="audio" className="text-base">
                Inclure l'audio
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tasks"
                checked={options.includeTasks}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeTasks: checked as boolean })
                }
              />
              <Label htmlFor="tasks" className="text-base">
                Inclure les tâches
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="transcription"
                checked={options.includeTranscription}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeTranscription: checked as boolean })
                }
              />
              <Label htmlFor="transcription" className="text-base">
                Inclure la transcription
              </Label>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Statistiques</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">
                {session.detected_blocks?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Blocs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">
                {session.duration_seconds ? Math.floor(session.duration_seconds / 60) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Minutes</p>
            </div>
          </div>
        </Card>

        {/* Export Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleExportPDF}
            disabled={exporting}
            size="lg"
            className="w-full h-16 text-lg font-bold"
          >
            <FileText className="w-6 h-6 mr-3" />
            {exporting ? "Export en cours..." : "Générer EDL PDF"}
          </Button>

          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            variant="outline"
            size="lg"
            className="w-full h-16 text-lg"
          >
            <Table className="w-6 h-6 mr-3" />
            {exporting ? "Export en cours..." : "Générer listing CSV/Excel"}
          </Button>

          {isNative && (
            <Button
              onClick={() => {
                toast.info("Fonctionnalité en cours de développement");
              }}
              variant="outline"
              size="lg"
              className="w-full h-16 text-lg"
            >
              <Share2 className="w-6 h-6 mr-3" />
              Partager toutes les photos
            </Button>
          )}

          <Button
            onClick={() => {
              toast.info("Fonctionnalité à venir");
            }}
            variant="outline"
            size="lg"
            className="w-full h-16 text-lg"
          >
            <Download className="w-6 h-6 mr-3" />
            Télécharger toutes les photos
          </Button>
        </div>
      </div>
    </div>
  );
};
