import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle2, X, Camera, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Detection {
  id: string;
  type: 'zone' | 'pathology' | 'element';
  label: string;
  confidence: number;
  severity?: 'info' | 'warning' | 'critical';
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface AIDetectionOverlayProps {
  enabled: boolean;
  imageUrl?: string;
  videoStream?: MediaStream;
  onDetection?: (detections: Detection[]) => void;
  onSelectDetection?: (detection: Detection) => void;
  className?: string;
}

export const AIDetectionOverlay = ({
  enabled,
  imageUrl,
  videoStream,
  onDetection,
  onSelectDetection,
  className,
}: AIDetectionOverlayProps) => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect video stream
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play();
    }
  }, [videoStream]);

  // Periodic analysis for video
  useEffect(() => {
    if (!enabled || !videoStream) {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      return;
    }

    // Analyze every 3 seconds
    analysisIntervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 3000);

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [enabled, videoStream]);

  // Analyze image when provided
  useEffect(() => {
    if (enabled && imageUrl) {
      analyzeImage(imageUrl);
    }
  }, [enabled, imageUrl]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    await analyzeImage(imageData);
  };

  const analyzeImage = async (image: string) => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-video-frame', {
        body: {
          imageBase64: image.replace(/^data:image\/\w+;base64,/, ''),
          context: 'property_inspection',
          detectZones: true,
          detectPathologies: true,
        },
      });

      if (error) throw error;

      if (data?.detections) {
        const newDetections: Detection[] = data.detections.map((d: any, index: number) => ({
          id: `detection-${Date.now()}-${index}`,
          type: d.type || 'element',
          label: d.label,
          confidence: d.confidence || 0.8,
          severity: d.severity || 'info',
          boundingBox: d.boundingBox,
        }));

        setDetections(newDetections);
        setLastAnalysis(new Date());
        onDetection?.(newDetections);

        // Alert for critical pathologies
        const criticalDetections = newDetections.filter(d => d.severity === 'critical');
        if (criticalDetections.length > 0) {
          toast.warning(
            `⚠️ ${criticalDetections.length} pathologie(s) détectée(s)`,
            { duration: 5000 }
          );
          
          // Haptic feedback for critical detection
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100, 50, 100]);
          }
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectDetection = (detection: Detection) => {
    onSelectDetection?.(detection);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    toast.success(`Zone sélectionnée: ${detection.label}`);
  };

  const dismissDetection = (id: string) => {
    setDetections(prev => prev.filter(d => d.id !== id));
  };

  if (!enabled) return null;

  return (
    <div className={cn('relative', className)}>
      {/* Hidden video and canvas for processing */}
      {videoStream && (
        <>
          <video ref={videoRef} className="hidden" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <Badge variant="secondary" className="gap-2 animate-pulse">
            <Sparkles className="w-3 h-3" />
            Analyse IA...
          </Badge>
        </div>
      )}

      {/* Detection badges */}
      <div className="absolute top-4 right-4 space-y-2 z-50 max-h-[60%] overflow-y-auto">
        {detections.map(detection => (
          <div
            key={detection.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg shadow-lg backdrop-blur-sm animate-fade-in cursor-pointer',
              'transition-all duration-200 hover:scale-105 active:scale-95',
              detection.severity === 'critical' && 'bg-red-500/90 text-white',
              detection.severity === 'warning' && 'bg-amber-500/90 text-white',
              detection.severity === 'info' && 'bg-background/90 border'
            )}
            onClick={() => handleSelectDetection(detection)}
            style={{ minHeight: '44px' }}
          >
            {detection.severity === 'critical' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : detection.type === 'pathology' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Zap className="w-4 h-4 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{detection.label}</p>
              <p className="text-xs opacity-80">
                {Math.round(detection.confidence * 100)}% confiance
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                dismissDetection(detection.id);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Zone suggestions */}
      {detections.filter(d => d.type === 'zone').length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Zones détectées
            </p>
            <div className="flex flex-wrap gap-2">
              {detections
                .filter(d => d.type === 'zone')
                .slice(0, 4)
                .map(detection => (
                  <Button
                    key={detection.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectDetection(detection)}
                    className="h-10 gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {detection.label}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Last analysis time */}
      {lastAnalysis && !isAnalyzing && (
        <div className="absolute bottom-4 right-4 z-50">
          <Badge variant="outline" className="text-xs">
            Analysé {new Date(lastAnalysis).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </Badge>
        </div>
      )}
    </div>
  );
};
