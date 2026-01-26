import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Film, 
  Wand2, 
  Monitor, 
  Smartphone, 
  Square,
  Mic,
  Music,
  Sparkles,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAutoStory } from '@/hooks/useAutoStory';
import { 
  NARRATION_STYLES, 
  VIDEO_FORMATS, 
  VIDEO_RESOLUTIONS,
  type VideoFormat,
  type VideoResolution,
  type NarrationStyle
} from '@/types/autostory';

interface AutoStoryGeneratorProps {
  projectId: string;
  edlId?: string;
  projectTitle?: string;
  onGenerated?: (videoId: string) => void;
  className?: string;
}

const formatIcons = {
  horizontal: Monitor,
  vertical: Smartphone,
  square: Square
};

export function AutoStoryGenerator({
  projectId,
  edlId,
  projectTitle = 'EDL AutoStory',
  onGenerated,
  className
}: AutoStoryGeneratorProps) {
  const [title, setTitle] = useState(projectTitle);
  const [format, setFormat] = useState<VideoFormat>('horizontal');
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [style, setStyle] = useState<NarrationStyle>('professional');
  const [musicTrack, setMusicTrack] = useState<string>('');
  
  const { generateVideo, isGenerating, generationProgress } = useAutoStory(projectId);

  const handleGenerate = async () => {
    const video = await generateVideo({
      projectId,
      edlId,
      title,
      format,
      resolution,
      style,
      musicTrack: musicTrack || undefined
    });

    if (video && onGenerated) {
      onGenerated(video.id);
    }
  };

  const generationSteps = [
    { label: 'Analyse du projet', progress: 10, icon: Sparkles },
    { label: 'Génération du script', progress: 30, icon: Wand2 },
    { label: 'Création de la narration', progress: 50, icon: Mic },
    { label: 'Montage vidéo', progress: 70, icon: Film },
    { label: 'Finalisation', progress: 90, icon: CheckCircle }
  ];

  const currentStep = generationSteps.findIndex(s => generationProgress < s.progress) || generationSteps.length - 1;

  if (isGenerating) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </motion.div>
            <h3 className="text-xl font-semibold">Génération en cours...</h3>
            <p className="text-muted-foreground mt-1">
              Création de votre film EDL automatique
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <Progress value={generationProgress} className="h-2" />
            <p className="text-center text-sm font-medium">{generationProgress}%</p>
          </div>

          <div className="space-y-3">
            {generationSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = generationProgress >= step.progress;

              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    isActive && "bg-primary/10",
                    isCompleted && !isActive && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isCompleted ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isActive && "font-medium"
                  )}>
                    {step.label}
                  </span>
                  {isActive && (
                    <Loader2 className="w-4 h-4 ml-auto animate-spin text-primary" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary" />
          Créer un AutoStory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Titre du film</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="EDL - Appartement 302"
          />
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <Label>Format vidéo</Label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(VIDEO_FORMATS) as [VideoFormat, typeof VIDEO_FORMATS[VideoFormat]][]).map(([key, value]) => {
              const Icon = formatIcons[key];
              return (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    format === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">{value.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label>Résolution</Label>
          <RadioGroup
            value={resolution}
            onValueChange={(v) => setResolution(v as VideoResolution)}
            className="flex gap-4"
          >
            {(Object.entries(VIDEO_RESOLUTIONS) as [VideoResolution, typeof VIDEO_RESOLUTIONS[VideoResolution]][]).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={`res-${key}`} />
                <Label htmlFor={`res-${key}`} className="cursor-pointer">
                  {value.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Narration Style */}
        <div className="space-y-2">
          <Label>Style de narration</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(NARRATION_STYLES) as [NarrationStyle, typeof NARRATION_STYLES[NarrationStyle]][]).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setStyle(key)}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  style === key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-4 h-4" />
                  <span className="font-medium text-sm">{value.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{value.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Music (optional) */}
        <div className="space-y-2">
          <Label htmlFor="music" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Musique de fond (optionnel)
          </Label>
          <Input
            id="music"
            value={musicTrack}
            onChange={(e) => setMusicTrack(e.target.value)}
            placeholder="Nom de la piste ou laisser vide"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          className="w-full"
          size="lg"
          disabled={!title.trim()}
        >
          <Wand2 className="w-5 h-5 mr-2" />
          Générer le film AutoStory
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          La génération prend environ 15-30 secondes selon la complexité du projet
        </p>
      </CardContent>
    </Card>
  );
}
