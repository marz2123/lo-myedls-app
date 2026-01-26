import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "./AudioRecorder";
import { PdfPageSelector } from "./PdfPageSelector";
import { LocationSelector } from "./LocationSelector";
import { FileText, Mic, Image, Video, Upload, FileUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from 'pdfjs-dist';

interface BuildingComposition {
  type: 'building' | 'house';
  commonAreas: string[];
  apartments: { name: string; rooms?: string[] }[];
  basements: string[];
  parking: string[];
  gardens: string[];
  others: string[];
}

interface InspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTextSubmit: (text: string) => void;
  onImageUpload: (files: FileList) => void;
  onVideoUpload: (files: FileList) => void;
  onPdfUpload: (file: File, selectedPages?: number[]) => void;
  propertyType?: string;
  numberOfUnits?: number;
  projectId?: string;
  buildingComposition?: BuildingComposition | null;
}

export const InspectionDialog = ({ 
  open, 
  onOpenChange, 
  onTextSubmit,
  onImageUpload,
  onVideoUpload,
  onPdfUpload,
  propertyType,
  numberOfUnits,
  projectId,
  buildingComposition,
}: InspectionDialogProps) => {
  const [text, setText] = useState("");
  const [generalLocation, setGeneralLocation] = useState("");
  const [roomLocation, setRoomLocation] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (text.trim()) {
      // Include location information in the text
      const locationPrefix = [
        generalLocation && `Zone: ${generalLocation}`,
        roomLocation && `Pièce: ${roomLocation}`
      ].filter(Boolean).join(' | ');
      
      const fullText = locationPrefix 
        ? `${locationPrefix}\n\n${text}` 
        : text;
      
      onTextSubmit(fullText);
      setText("");
      setGeneralLocation("");
      setRoomLocation("");
      onOpenChange(false);
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('transcribe-and-extract', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        if (data?.text) {
          // Include location information in the transcribed text
          const locationPrefix = [
            generalLocation && `Zone: ${generalLocation}`,
            roomLocation && `Pièce: ${roomLocation}`
          ].filter(Boolean).join(' | ');
          
          const fullText = locationPrefix 
            ? `${locationPrefix}\n\n${data.text}` 
            : data.text;
          
          // Automatically submit the transcribed text for task extraction
          onTextSubmit(fullText);
          toast({
            title: "Audio traite",
            description: "Transcription et extraction des taches en cours",
          });
          setGeneralLocation("");
          setRoomLocation("");
          onOpenChange(false);
        }
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Erreur de transcription",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageUpload(e.target.files);
      onOpenChange(false);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onVideoUpload(e.target.files);
      onOpenChange(false);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('PDF file selected:', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
      setShowPdfPreview(true);
    }
  };

  const handleContinueToPageSelection = () => {
    setShowPdfPreview(false);
    setShowPageSelector(true);
  };

  const handlePagesSelected = async (selectedPages: number[]) => {
    if (!pdfFile) return;
    
    setShowPageSelector(false);
    onPdfUpload(pdfFile, selectedPages);
    setPdfFile(null);
    onOpenChange(false);
  };

  const handleCancelPageSelection = () => {
    setShowPageSelector(false);
    setShowPdfPreview(false);
    setPdfFile(null);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setShowPdfPreview(true);
      } else {
        toast({
          title: "Fichier invalide",
          description: "Veuillez déposer un fichier PDF",
          variant: "destructive",
        });
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {t('cancel') === 'Annuler' ? 'Documentation de la visite' : 'Visit Documentation'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {t('cancel') === 'Annuler' 
              ? 'Choisissez votre méthode de documentation : texte, vocal, photos, vidéos ou rapport PDF'
              : 'Choose your documentation method: text, voice, photos, videos or PDF report'}
          </DialogDescription>
        </DialogHeader>
        
        {showPdfPreview && pdfFile ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="w-5 h-5 text-primary" />
              <span>{t('cancel') === 'Annuler' ? 'Aperçu du fichier' : 'File Preview'}</span>
            </div>
            
            <div className="border rounded-lg p-6 bg-muted/50 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileUp className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate" title={pdfFile.name}>
                    {pdfFile.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{t('cancel') === 'Annuler' ? 'Taille' : 'Size'}:</span>
                      <span>{formatFileSize(pdfFile.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{t('cancel') === 'Annuler' ? 'Type' : 'Type'}:</span>
                      <span>PDF</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                <p className="text-sm">
                  {t('cancel') === 'Annuler' 
                    ? 'Le fichier sera analyse pour extraire les taches. Vous pourrez selectionner les pages specifiques a analyser a l\'etape suivante.'
                    : 'The file will be analyzed to extract tasks. You will be able to select specific pages to analyze in the next step.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelPageSelection}>
                {t('cancel')}
              </Button>
              <Button onClick={handleContinueToPageSelection}>
                {t('cancel') === 'Annuler' ? 'Continuer' : 'Continue'}
              </Button>
            </div>
          </div>
        ) : showPageSelector && pdfFile ? (
          <PdfPageSelector
            file={pdfFile}
            onPagesSelected={handlePagesSelected}
            onCancel={handleCancelPageSelection}
          />
        ) : (
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'Texte' : 'Text'}</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'Vocal' : 'Voice'}</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'Photos' : 'Photos'}</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'Vidéos' : 'Videos'}</span>
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'PDF' : 'PDF'}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4 mt-4">
            <LocationSelector
              generalLocation={generalLocation}
              roomLocation={roomLocation}
              onGeneralLocationChange={setGeneralLocation}
              onRoomLocationChange={setRoomLocation}
              propertyType={propertyType}
              numberOfUnits={numberOfUnits}
              projectId={projectId}
              buildingComposition={buildingComposition}
            />
            
            <div className="grid gap-2">
              <Label htmlFor="description">{t('workDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('workDescriptionPlaceholder')}
                className="min-h-[200px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={!text.trim()}>
                {t('extractTasks')}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="audio" className="space-y-4 mt-4">
            <div className="space-y-4">
              <LocationSelector
                generalLocation={generalLocation}
                roomLocation={roomLocation}
                onGeneralLocationChange={setGeneralLocation}
                onRoomLocationChange={setRoomLocation}
                propertyType={propertyType}
                numberOfUnits={numberOfUnits}
                projectId={projectId}
                buildingComposition={buildingComposition}
              />
              
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? '🎤 Enregistrez votre message vocal décrivant les travaux observés. La transcription et l\'extraction DSC seront automatiques.'
                    : '🎤 Record your voice message describing the observed work. Transcription and DSC extraction will be automatic.'}
                </p>
              </div>
              
              <AudioRecorder 
                onAudioRecorded={handleAudioRecorded}
                isProcessing={isTranscribing}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors cursor-pointer bg-muted/50">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="image-upload"
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload" className="cursor-pointer text-center w-full">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('cancel') === 'Annuler' ? 'Télécharger des photos' : 'Upload Photos'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('cancel') === 'Annuler' 
                    ? 'Prenez ou sélectionnez des photos du bien immobilier'
                    : 'Take or select photos of the property'}
                </p>
                <Button type="button" variant="outline" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('cancel') === 'Annuler' ? 'Choisir des photos' : 'Choose Photos'}
                </Button>
              </label>
            </div>
          </TabsContent>
          
          <TabsContent value="video" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors cursor-pointer bg-muted/50">
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                id="video-upload"
                onChange={handleVideoChange}
              />
              <label htmlFor="video-upload" className="cursor-pointer text-center w-full">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('cancel') === 'Annuler' ? 'Télécharger des vidéos' : 'Upload Videos'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('cancel') === 'Annuler' 
                    ? 'Filmez ou sélectionnez des vidéos de la visite'
                    : 'Film or select videos of the visit'}
                </p>
                <Button type="button" variant="outline" size="lg">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('cancel') === 'Annuler' ? 'Choisir des vidéos' : 'Choose Videos'}
                </Button>
              </label>
            </div>
          </TabsContent>
          
          <TabsContent value="pdf" className="space-y-4 mt-4">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              id="pdf-upload"
              onChange={handlePdfChange}
            />
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border bg-muted/50 hover:border-primary'
              }`}
            >
              <label 
                htmlFor="pdf-upload" 
                className="flex flex-col items-center justify-center w-full cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('cancel') === 'Annuler' ? 'Télécharger un rapport PDF' : 'Upload PDF Report'}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('cancel') === 'Annuler' 
                    ? 'Importez un rapport de visite existant (avec texte et images)'
                    : 'Import an existing visit report (with text and images)'}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t('cancel') === 'Annuler' 
                    ? 'Glissez-déposez un fichier PDF ou cliquez pour sélectionner'
                    : 'Drag and drop a PDF file or click to select'}
                </p>
                <div className="px-4 py-2 border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>{t('cancel') === 'Annuler' ? 'Choisir un PDF' : 'Choose PDF'}</span>
                </div>
              </label>
            </div>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};