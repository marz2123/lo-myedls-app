// Live Partial Results Display
// Shows transcript chunks and vision detections as they arrive

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Eye, CheckCircle2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PartialResult {
  type: 'transcript_chunk' | 'vision_detection' | 'task_extracted' | 'segment_detected';
  data: any;
  timestamp: number;
}

interface LivePartialResultsProps {
  results: PartialResult[];
  maxDisplay?: number;
  className?: string;
}

export const LivePartialResults: React.FC<LivePartialResultsProps> = ({
  results,
  maxDisplay = 5,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [results]);

  const recentResults = results.slice(-maxDisplay);

  if (results.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "space-y-2 max-h-40 overflow-y-auto scrollbar-thin",
        className
      )}
    >
      {recentResults.map((result, idx) => (
        <div 
          key={result.timestamp + idx}
          className={cn(
            "flex items-start gap-2 p-2 rounded-lg text-sm animate-in slide-in-from-bottom-2 duration-300",
            result.type === 'transcript_chunk' && "bg-muted/50",
            result.type === 'vision_detection' && "bg-amber-500/10 border border-amber-500/20",
            result.type === 'task_extracted' && "bg-green-500/10 border border-green-500/20",
            result.type === 'segment_detected' && "bg-blue-500/10 border border-blue-500/20"
          )}
        >
          {result.type === 'transcript_chunk' && (
            <>
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-foreground/80">{result.data}</span>
            </>
          )}
          
          {result.type === 'vision_detection' && (
            <>
              <Eye className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {result.data.label || result.data.type || 'Détection'}
                </span>
                {result.data.confidence && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {Math.round(result.data.confidence * 100)}%
                  </Badge>
                )}
                {result.data.location && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {result.data.location}
                  </span>
                )}
              </div>
            </>
          )}
          
          {result.type === 'task_extracted' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-green-700 dark:text-green-400">
                  {result.data.title || 'Nouvelle tâche'}
                </span>
                {result.data.family && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {result.data.family}
                  </Badge>
                )}
              </div>
            </>
          )}
          
          {result.type === 'segment_detected' && (
            <>
              <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  {result.data.lieu || result.data.location || 'Segment'}
                </span>
                {result.data.zone && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    → {result.data.zone}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

// Compact version for overlay during capture
export const LiveTranscriptOverlay: React.FC<{
  chunks: string[];
  maxLines?: number;
}> = ({ chunks, maxLines = 3 }) => {
  const recentChunks = chunks.slice(-maxLines);
  
  if (chunks.length === 0) return null;
  
  return (
    <div className="absolute bottom-24 left-4 right-4 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 space-y-1">
        {recentChunks.map((chunk, idx) => (
          <p 
            key={idx}
            className={cn(
              "text-white text-sm leading-tight transition-opacity duration-300",
              idx < recentChunks.length - 1 && "opacity-60"
            )}
          >
            {chunk}
          </p>
        ))}
      </div>
    </div>
  );
};

// Vision detection toast-like overlay
export const VisionDetectionToast: React.FC<{
  detection: { label: string; severity?: string; location?: string } | null;
}> = ({ detection }) => {
  if (!detection) return null;
  
  return (
    <div className="absolute top-20 left-4 right-4 pointer-events-none animate-in slide-in-from-top-2 duration-300">
      <div className={cn(
        "rounded-xl p-3 flex items-center gap-3 shadow-lg",
        detection.severity === 'critical' 
          ? "bg-red-500/90 text-white"
          : detection.severity === 'warning'
          ? "bg-amber-500/90 text-white"
          : "bg-blue-500/90 text-white"
      )}>
        <Eye className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{detection.label}</p>
          {detection.location && (
            <p className="text-sm opacity-80">{detection.location}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivePartialResults;
