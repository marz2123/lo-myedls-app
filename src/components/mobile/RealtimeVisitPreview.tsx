import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Mic, MapPin, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeVisitPreviewProps {
  isRecording: boolean;
  currentBlock?: {
    number: number;
    detected_room_type?: string;
    confidence_score?: number;
  };
  stats?: {
    frames_captured: number;
    blocks_detected: number;
    duration_seconds: number;
  };
}

export const RealtimeVisitPreview = ({ 
  isRecording, 
  currentBlock,
  stats 
}: RealtimeVisitPreviewProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!isRecording) {
      setIsListening(false);
      setIsAnalyzing(false);
      return;
    }

    // Simulate AI states
    const listeningInterval = setInterval(() => {
      setIsListening(prev => !prev);
    }, 2000);

    const analyzingInterval = setInterval(() => {
      setIsAnalyzing(prev => !prev);
    }, 3000);

    return () => {
      clearInterval(listeningInterval);
      clearInterval(analyzingInterval);
    };
  }, [isRecording]);

  if (!isRecording) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 pointer-events-none">
      <Card className="bg-background/95 backdrop-blur-sm border-2 shadow-lg">
        <CardContent className="p-4 space-y-3">
          {/* AI Status Indicators */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-2 transition-colors",
                isListening && "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400"
              )}
            >
              <Mic className={cn("h-3 w-3", isListening && "animate-pulse")} />
              {isListening ? "🎤 AI écoute" : "En pause"}
            </Badge>

            <Badge 
              variant="outline"
              className={cn(
                "flex items-center gap-2 transition-colors",
                isAnalyzing && "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400"
              )}
            >
              <Eye className={cn("h-3 w-3", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? "🔍 AI analyse la pièce" : "Observation"}
            </Badge>

            {currentBlock && (
              <Badge 
                variant="outline"
                className="flex items-center gap-2 bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-400"
              >
                <MapPin className="h-3 w-3 animate-bounce" />
                Bloc {currentBlock.number} détecté
              </Badge>
            )}
          </div>

          {/* Current Block Info */}
          {currentBlock?.detected_room_type && (
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type de pièce détecté:</span>
                <span className="font-medium">{currentBlock.detected_room_type}</span>
              </div>
              {currentBlock.confidence_score && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Confiance:</span>
                  <span className="font-medium">
                    {(currentBlock.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground">Photos</div>
                <div className="font-bold">{stats.frames_captured}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Blocs</div>
                <div className="font-bold">{stats.blocks_detected}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Durée</div>
                <div className="font-bold">
                  {Math.floor(stats.duration_seconds / 60)}:{(stats.duration_seconds % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};