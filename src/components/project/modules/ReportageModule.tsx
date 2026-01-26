import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  X, Layers, Video, ChevronRight, Sparkles, ArrowLeft, 
  Camera, MapPin, AlertTriangle, Image as ImageIcon, Send,
  Mic, Pause, Play, Square, Loader2, Eye, Zap,
  type LucideIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportageModuleProps {
  projectId: string;
  onClose?: () => void;
  initialMode?: ReportageMode;  // Permet de démarrer directement en mode "pas-a-pas"
}

type ReportageMode = "menu" | "pas-a-pas" | "a-la-volee";
type PasAPasStep = "lieu" | "zone" | "probleme" | "photos" | "review";
type VideoState = "idle" | "recording" | "paused" | "stopped";

interface ReportageData {
  lieu: string;
  zone: string;
  probleme: string;
  preconisation: string;
  photos: string[];
}

interface DetectedAnomaly {
  id: string;
  type: string;
  confidence: number;
  description: string;
  location: string;
}

const ReportageModule = ({ projectId, onClose, initialMode = "menu" }: ReportageModuleProps) => {
  const [mode, setMode] = useState<ReportageMode>(initialMode);
  const [currentStep, setCurrentStep] = useState<PasAPasStep>("lieu");
  const [data, setData] = useState<ReportageData>({
    lieu: "",
    zone: "",
    probleme: "",
    preconisation: "",
    photos: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video/Audio state
  const [videoState, setVideoState] = useState<VideoState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [detectedAnomalies, setDetectedAnomalies] = useState<DetectedAnomaly[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Locations from project
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    loadLocations();
  }, [projectId]);

  useEffect(() => {
    if (videoState === "recording") {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [videoState]);

  const loadLocations = async () => {
    try {
      const { data: locs } = await supabase
        .from('property_locations')
        .select('id, name')
        .eq('project_id', projectId);
      setLocations(locs || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const pasAPasSteps: { key: PasAPasStep; label: string; icon: LucideIcon }[] = [
    { key: "lieu", label: "Lieu", icon: MapPin },
    { key: "zone", label: "Zone", icon: Layers },
    { key: "probleme", label: "Problème", icon: AlertTriangle },
    { key: "photos", label: "Photos", icon: ImageIcon },
    { key: "review", label: "Résumé", icon: Eye },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const newPhotos: string[] = [];

      for (const file of Array.from(files)) {
        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('edl-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('edl-documents')
          .getPublicUrl(fileName);

        newPhotos.push(publicUrl);
      }

      setData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
      
      // Simuler analyse IA
      setTimeout(() => {
        const mockAnomalies: DetectedAnomaly[] = [
          {
            id: crypto.randomUUID(),
            type: "fissure",
            confidence: 0.87,
            description: "Fissure détectée sur le mur",
            location: data.lieu
          }
        ];
        setDetectedAnomalies(prev => [...prev, ...mockAnomalies]);
        setIsAnalyzing(false);
        toast.success(`${newPhotos.length} photo(s) analysée(s) par l'IA`);
      }, 2000);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("Erreur lors de l'upload des photos");
      setIsAnalyzing(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVideoState("recording");
      setIsTranscribing(true);
      
      // Simuler transcription live
      simulateLiveTranscription();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const simulateLiveTranscription = () => {
    const phrases = [
      "Je me trouve dans le salon...",
      "On observe une fissure sur le mur nord...",
      "L'état général est correct...",
      "Il y a des traces d'humidité près de la fenêtre..."
    ];
    let index = 0;
    
    const interval = setInterval(() => {
      if (videoState !== "recording" || index >= phrases.length) {
        clearInterval(interval);
        return;
      }
      setTranscription(prev => prev + " " + phrases[index]);
      index++;
    }, 3000);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && videoState === "recording") {
      mediaRecorderRef.current.pause();
      setVideoState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && videoState === "paused") {
      mediaRecorderRef.current.resume();
      setVideoState("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setVideoState("stopped");
      setIsTranscribing(false);
      toast.success("Enregistrement terminé");
    }
  };

  const handleSubmitReportage = async () => {
    if (!data.lieu || !data.probleme) {
      toast.error("Veuillez remplir au moins le lieu et le problème");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      // Créer une séquence avec les données du reportage
      const { data: sequence, error: seqError } = await supabase
        .from('visit_sequences')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'completed',
          metadata: {
            endroitName: data.lieu,
            zoneType: data.zone,
            description: data.probleme,
            recommendations: data.preconisation,
          },
          photos: data.photos.length > 0 ? data.photos : null,  // photos est JSONB, pas photo_urls
          transcription: transcription || data.probleme,
        })
        .select()
        .single();

      if (seqError) {
        console.error('Error creating sequence:', seqError);
        throw seqError;
      }

      // Créer la tâche associée
      if (sequence?.id) {
        const { error: taskError } = await supabase
          .from('extracted_tasks')
          .insert({
            project_id: projectId,
            user_id: user.id,
            visit_sequence_id: sequence.id,
            title: `${data.probleme.substring(0, 50)}${data.probleme.length > 50 ? '...' : ''}`,
            description: `Lieu: ${data.lieu}\nZone: ${data.zone}\n\nProblème: ${data.probleme}\n\nPréconisation: ${data.preconisation}`,
            location: `${data.lieu}${data.zone ? ' - ' + data.zone : ''}`,
            source_type: 'sequence',  // Utiliser 'sequence' au lieu de 'reportage' (valeur valide dans CHECK)
            priority: 'medium'
          });

        if (taskError) {
          console.error('Error creating task:', taskError);
          throw taskError;
        }
      }

      toast.success("Reportage enregistré avec succès");
      
      // Fermer et retourner au menu parent
      if (onClose) {
        onClose();
      }
      
      // Reset
      setData({
        lieu: "",
        zone: "",
        probleme: "",
        preconisation: "",
        photos: []
      });
      setDetectedAnomalies([]);
      setTranscription("");
      setMode("menu");
      setCurrentStep("lieu");
    } catch (error) {
      console.error('Error saving reportage:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextStep = () => {
    const stepIndex = pasAPasSteps.findIndex(s => s.key === currentStep);
    if (stepIndex < pasAPasSteps.length - 1) {
      setCurrentStep(pasAPasSteps[stepIndex + 1].key);
    }
  };

  const goToPrevStep = () => {
    const stepIndex = pasAPasSteps.findIndex(s => s.key === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(pasAPasSteps[stepIndex - 1].key);
    } else {
      setMode("menu");
    }
  };

  // Menu view
  if (mode === "menu") {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Reportage</h2>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <Card 
            className="bg-gradient-to-br from-cyan-500 to-blue-600 border-0 cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setMode("pas-a-pas")}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">Pas à pas</h3>
                    <p className="text-white/80 text-sm">
                      Lieu → Zone → Problème → Photos → Résumé
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  IA
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setMode("a-la-volee")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">À la volée</h3>
                    <p className="text-white/80 text-sm">
                      Vidéo libre avec transcription IA
                    </p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  Live
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick capture */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">Capture rapide</h4>
                    <p className="text-muted-foreground text-sm">Photo + analyse IA instantanée</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Capturer
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // À la volée mode
  if (mode === "a-la-volee") {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (videoState === "recording" || videoState === "paused") {
                  stopRecording();
                }
                setMode("menu");
                setVideoState("idle");
                setRecordingTime(0);
                setTranscription("");
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-bold">Mode À la volée</h2>
              <p className="text-muted-foreground text-sm">Enregistrement vidéo avec transcription</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Video preview */}
          <div className="relative aspect-video bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className="w-full h-full object-cover"
            />
            
            {videoState === "recording" && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}

            {videoState === "paused" && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-yellow-500 px-3 py-1 rounded-full">
                <Pause className="w-3 h-3 text-white" />
                <span className="text-white text-sm font-medium">PAUSE {formatTime(recordingTime)}</span>
              </div>
            )}

            {isTranscribing && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-cyan-400 text-xs font-medium">TRANSCRIPTION IA EN COURS</span>
                  </div>
                  <p className="text-white text-sm">{transcription || "En attente de voix..."}</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 flex items-center justify-center gap-4">
            {videoState === "idle" && (
              <Button 
                size="lg" 
                onClick={startVideoRecording}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
              >
                <Video className="w-6 h-6" />
              </Button>
            )}

            {videoState === "recording" && (
              <>
                <Button 
                  size="lg" 
                  onClick={pauseRecording}
                  className="h-14 w-14 rounded-full bg-yellow-500 hover:bg-yellow-600"
                >
                  <Pause className="w-6 h-6" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={stopRecording}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}

            {videoState === "paused" && (
              <>
                <Button 
                  size="lg" 
                  onClick={resumeRecording}
                  className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-6 h-6" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={stopRecording}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}

            {videoState === "stopped" && (
              <Button 
                size="lg" 
                onClick={handleSubmitReportage}
                className="gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Enregistrer le reportage
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pas à pas mode
  const currentStepIndex = pasAPasSteps.findIndex(s => s.key === currentStep);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={goToPrevStep}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold">Reportage pas à pas</h2>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1">
          {pasAPasSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-green-500/20 text-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">{step.label}</span>
                </button>
                {index < pasAPasSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    isCompleted ? "bg-green-500" : "bg-muted"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {currentStep === "lieu" && (
          <div className="space-y-4">
            <Label>Où vous trouvez-vous ?</Label>
            
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {locations.slice(0, 6).map(loc => (
                  <Button
                    key={loc.id}
                    variant={data.lieu === loc.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setData(prev => ({ ...prev, lieu: loc.name }))}
                  >
                    {loc.name}
                  </Button>
                ))}
              </div>
            )}
            
            <Input
              value={data.lieu}
              onChange={(e) => setData(prev => ({ ...prev, lieu: e.target.value }))}
              placeholder="Ex: Salon, Chambre 1, Hall d'entrée..."
            />
            <Button onClick={goToNextStep} className="w-full" disabled={!data.lieu}>
              Continuer
            </Button>
          </div>
        )}

        {currentStep === "zone" && (
          <div className="space-y-4">
            <Label>Quelle zone précisément ?</Label>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {["Mur nord", "Mur sud", "Plafond", "Sol", "Fenêtre", "Porte"].map(zone => (
                <Button
                  key={zone}
                  variant={data.zone === zone ? "default" : "outline"}
                  size="sm"
                  onClick={() => setData(prev => ({ ...prev, zone }))}
                >
                  {zone}
                </Button>
              ))}
            </div>
            
            <Input
              value={data.zone}
              onChange={(e) => setData(prev => ({ ...prev, zone: e.target.value }))}
              placeholder="Ex: Mur nord, Plafond, Fenêtre..."
            />
            <Button onClick={goToNextStep} className="w-full">
              Continuer
            </Button>
          </div>
        )}

        {currentStep === "probleme" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Décrivez le problème</Label>
              <Textarea
                value={data.probleme}
                onChange={(e) => setData(prev => ({ ...prev, probleme: e.target.value }))}
                placeholder="Décrivez le problème observé..."
                className="min-h-[100px]"
              />
            </div>
            <div>
              <Label className="mb-2 block">Préconisation (optionnel)</Label>
              <Textarea
                value={data.preconisation}
                onChange={(e) => setData(prev => ({ ...prev, preconisation: e.target.value }))}
                placeholder="Suggérez une solution ou préconisation..."
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={goToNextStep} className="w-full" disabled={!data.probleme}>
              Continuer
            </Button>
          </div>
        )}

        {currentStep === "photos" && (
          <div className="space-y-4">
            <Label>Ajoutez des photos</Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-dashed flex flex-col gap-2"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>Analyse IA en cours...</span>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8" />
                  <span>Prendre une photo ou sélectionner</span>
                </>
              )}
            </Button>

            {detectedAnomalies.length > 0 && (
              <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                    <span className="text-cyan-500 font-medium text-sm">Anomalies détectées par l'IA</span>
                  </div>
                  <div className="space-y-2">
                    {detectedAnomalies.map(anomaly => (
                      <div key={anomaly.id} className="flex items-center justify-between py-2 px-3 bg-background rounded-lg">
                        <div>
                          <p className="text-sm">{anomaly.description}</p>
                          <p className="text-muted-foreground text-xs">{anomaly.type}</p>
                        </div>
                        <Badge variant="outline" className="text-cyan-500 border-cyan-500/30">
                          {Math.round(anomaly.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {data.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={goToNextStep} className="w-full">
              Continuer
            </Button>
          </div>
        )}

        {currentStep === "review" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-4">
                <h4 className="font-medium mb-4">Résumé du reportage</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Lieu</span>
                    <span>{data.lieu}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Zone</span>
                    <span>{data.zone || "-"}</span>
                  </div>
                  <div className="py-2 border-b">
                    <span className="text-muted-foreground block mb-1">Problème</span>
                    <span>{data.probleme}</span>
                  </div>
                  {data.preconisation && (
                    <div className="py-2 border-b">
                      <span className="text-muted-foreground block mb-1">Préconisation</span>
                      <span>{data.preconisation}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Photos</span>
                    <span>{data.photos.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleSubmitReportage} 
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? "Enregistrement..." : "Enregistrer le reportage"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportageModule;
