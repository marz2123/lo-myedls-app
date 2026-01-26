import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Mic, Square, Loader2, Image as ImageIcon, FileText, X, ZoomIn } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AdditionalInfoInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId?: string;
}

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  name: string;
}


export const AdditionalInfoInput = ({ value, onChange, placeholder, projectId }: AdditionalInfoInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<PhotoFile | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe audio
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: t('cancel') === 'Annuler' 
          ? 'Impossible d\'accéder au microphone. Vérifiez les permissions.' 
          : 'Unable to access microphone. Check permissions.',
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64Audio = (reader.result as string).split(',')[1];
      
      // Call transcription function
      const { data, error } = await supabase.functions.invoke('transcribe-and-extract', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        // Append transcribed text to existing value
        const newValue = value ? `${value}\n${data.text}` : data.text;
        onChange(newValue);
        
        toast({
          title: t('cancel') === 'Annuler' ? 'Transcription reussie' : 'Transcription successful',
          description: t('cancel') === 'Annuler' 
            ? 'Le texte a été ajouté' 
            : 'Text has been added',
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur de transcription' : 'Transcription error',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (!projectId) {
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: t('cancel') === 'Annuler' 
          ? 'ID du projet manquant' 
          : 'Project ID missing',
        variant: "destructive",
      });
      return;
    }
    
    setIsUploadingImage(true);
    setUploadProgress(0);
    try {
      const newPhotos: PhotoFile[] = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentUploadingFile(file.name);
        const photoId = `${Date.now()}-${i}`;
        const fileExt = file.name.split('.').pop();
        const filePath = `${projectId}/${photoId}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('task-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading to storage:', uploadError);
          throw uploadError;
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        setUploadProgress(progress);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('task-images')
          .getPublicUrl(filePath);
        
        // Add to photos array with storage URL
        newPhotos.push({
          id: photoId,
          file,
          preview: publicUrl,
          name: file.name,
        });
        
        // Add image description to text with storage URL
        const imageNote = t('cancel') === 'Annuler' 
          ? `[Photo: ${file.name} - ${publicUrl}]` 
          : `[Photo: ${file.name} - ${publicUrl}]`;
        
        const newValue = value ? `${value}\n${imageNote}` : imageNote;
        onChange(newValue);
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
      
      toast({
        title: t('cancel') === 'Annuler' ? 'Photo(s) sauvegardee(s)' : 'Photo(s) saved',
        description: t('cancel') === 'Annuler' 
          ? `${files.length} photo(s) sauvegardée(s) dans le cloud` 
          : `${files.length} photo(s) saved to cloud`,
      });
    } catch (error) {
      console.error('Error processing images:', error);
      toast({
        title: t('cancel') === 'Annuler' ? 'Erreur' : 'Error',
        description: t('cancel') === 'Annuler' 
          ? 'Impossible de sauvegarder les photos' 
          : 'Unable to save photos',
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      setCurrentUploadingFile("");
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;
    
    // Remove from photos array
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    
    // Delete from storage if projectId exists
    if (projectId) {
      const fileExt = photo.name.split('.').pop();
      const filePath = `${projectId}/${photoId}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('task-images')
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting from storage:', error);
      }
    }
    
    // Remove reference from text (match both old and new format)
    const photoReferenceOld = `[Photo: ${photo.name}]`;
    const photoReferenceNew = `[Photo: ${photo.name} - ${photo.preview}]`;
    let newValue = value.replace(new RegExp(`\n?${photoReferenceOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '');
    newValue = newValue.replace(new RegExp(`\n?${photoReferenceNew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '');
    onChange(newValue.trim());
    
    toast({
      title: t('cancel') === 'Annuler' ? 'Photo supprimee' : 'Photo removed',
    });
  };

  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPhotoId: string) => {
    e.preventDefault();
    
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) return;

    const draggedIndex = photos.findIndex(p => p.id === draggedPhotoId);
    const targetIndex = photos.findIndex(p => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, draggedPhoto);

    setPhotos(newPhotos);
    setDraggedPhotoId(null);
  };

  const handleDragEnd = () => {
    setDraggedPhotoId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Text input section */}
      <div className="space-y-2">
        <Textarea
          id="additionalInfo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[120px]"
          disabled={isRecording || isProcessing}
        />
        
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Focus textarea for writing
              document.getElementById('additionalInfo')?.focus();
            }}
            disabled={isRecording || isProcessing}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('cancel') === 'Annuler' ? 'Écrire' : 'Write'}
          </Button>
          
          {!isRecording ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              disabled={isProcessing || isUploadingImage}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              {t('cancel') === 'Annuler' ? 'Enregistrer' : 'Record'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-md border border-destructive">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-destructive">{formatTime(recordingTime)}</span>
              </div>
              <Button
                type="button"
                onClick={stopRecording}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                {t('cancel') === 'Annuler' ? 'Arrêter' : 'Stop'}
              </Button>
            </div>
          )}
        </div>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('cancel') === 'Annuler' ? 'Transcription en cours...' : 'Transcribing...'}
          </div>
        )}
      </div>

      {/* Photo section */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          {t('cancel') === 'Annuler' ? 'Photos' : 'Photos'}
          {photos.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({photos.length} {t('cancel') === 'Annuler' ? 'photo(s) ajoutée(s)' : 'photo(s) added'})
            </span>
          )}
        </Label>
        
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 p-2 border rounded-lg">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className={`relative group aspect-square cursor-move ${draggedPhotoId === photo.id ? 'opacity-50' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, photo.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, photo.id)}
                onDragEnd={handleDragEnd}
              >
                <img 
                  src={photo.preview} 
                  alt={photo.name}
                  className="w-full h-full object-cover rounded-md"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-md flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedPhoto(photo);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-primary text-primary-foreground rounded-full"
                    type="button"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(photo.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate rounded-b-md">
                  {photo.name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div 
          onClick={() => !isUploadingImage && fileInputRef.current?.click()}
          className={`min-h-[120px] border-2 border-dashed rounded-lg p-4 ${!isUploadingImage ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed'} transition-colors flex flex-col items-center justify-center gap-2`}
        >
          {isUploadingImage ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                {t('cancel') === 'Annuler' ? 'Upload en cours...' : 'Uploading...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUploadingFile}
              </p>
              <div className="w-full max-w-xs mt-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground mt-1">
                  {uploadProgress}%
                </p>
              </div>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {t('cancel') === 'Annuler' 
                  ? 'Cliquez pour prendre ou importer des photos' 
                  : 'Click to take or upload photos'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('cancel') === 'Annuler' ? 'Plusieurs photos possibles' : 'Multiple photos allowed'}
              </p>
            </>
          )}
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files)}
      />

      {/* Photo zoom dialog */}
      <Dialog open={!!zoomedPhoto} onOpenChange={(open) => !open && setZoomedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{zoomedPhoto?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {zoomedPhoto && (
              <img 
                src={zoomedPhoto.preview} 
                alt={zoomedPhoto.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
