import React, { useState } from 'react';
import { 
  Glasses, 
  Ruler, 
  MapPin, 
  Navigation, 
  Eye, 
  Layers,
  Camera,
  Mic,
  X,
  Play,
  Pause,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoloScene3D } from './HoloScene3D';
import { useHoloEDL } from '@/hooks/useHoloEDL';
import { cn } from '@/lib/utils';
import type { ARMode, HoloMarker } from '@/types/holoedl';

interface HoloEDLViewerProps {
  projectId: string;
  edlId?: string;
  onClose?: () => void;
  className?: string;
}

const AR_MODES: { mode: ARMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'standard', label: 'Standard', icon: <Eye className="h-4 w-4" /> },
  { mode: 'measurement', label: 'Mesures', icon: <Ruler className="h-4 w-4" /> },
  { mode: 'guided', label: 'Guidé', icon: <Navigation className="h-4 w-4" /> },
  { mode: 'xray', label: 'X-Ray', icon: <Layers className="h-4 w-4" /> },
  { mode: 'comparison', label: 'Comparatif', icon: <RotateCcw className="h-4 w-4" /> },
];

export function HoloEDLViewer({ projectId, edlId, onClose, className }: HoloEDLViewerProps) {
  const {
    state,
    isARSupported,
    startSession,
    endSession,
    addMarker,
    switchMode,
    togglePlacingMarker,
    toggleMeasuring,
    selectMarker
  } = useHoloEDL({ projectId, edlId });
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleMarkerClick = (marker: HoloMarker) => {
    selectMarker(marker);
  };

  const handleSceneClick = (position: { x: number; y: number; z: number }) => {
    if (state.isPlacingMarker) {
      addMarker(position, {
        type: 'annotation',
        label: 'Nouveau marqueur'
      });
      togglePlacingMarker(false);
    }
  };

  const trackingBadgeColor = {
    unknown: 'bg-muted',
    limited: 'bg-yellow-500',
    normal: 'bg-green-500',
    excellent: 'bg-emerald-500'
  }[state.sceneState.trackingQuality];

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-[600px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Glasses className="h-5 w-5 text-primary" />
          <span className="font-semibold">HoloEDL</span>
          
          {state.session && (
            <Badge className={trackingBadgeColor}>
              {state.sceneState.trackingQuality === 'unknown' ? 'Initialisation...' : 
               state.sceneState.trackingQuality === 'limited' ? 'Tracking limité' :
               state.sceneState.trackingQuality === 'normal' ? 'Tracking OK' : 'Excellent'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* 3D Scene */}
        <div className="absolute inset-0">
          <HoloScene3D
            markers={state.markers}
            activePath={state.activePath}
            selectedMarkerId={state.selectedMarker?.id}
            onMarkerClick={handleMarkerClick}
          />
        </div>

        {/* Mode Selector Overlay */}
        <div className="absolute top-4 left-4 right-4">
          <Card className="bg-background/80 backdrop-blur border-0 shadow-lg">
            <CardContent className="p-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                {AR_MODES.map(({ mode, label, icon }) => (
                  <Button
                    key={mode}
                    variant={state.mode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => switchMode(mode)}
                    className="gap-1 shrink-0"
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overlay */}
        {state.session && (
          <div className="absolute top-20 right-4">
            <Card className="bg-background/80 backdrop-blur border-0 shadow-lg">
              <CardContent className="p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>{state.session.markersPlaced} marqueurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="h-3 w-3 text-muted-foreground" />
                  <span>{state.session.measurementsTaken} mesures</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="h-3 w-3 text-muted-foreground" />
                  <span>{state.session.photosCaptured} photos</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Marker Info */}
        {state.selectedMarker && (
          <div className="absolute bottom-24 left-4 right-4">
            <Card className="bg-background/90 backdrop-blur border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{state.selectedMarker.label || 'Marqueur'}</h4>
                    {state.selectedMarker.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {state.selectedMarker.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    style={{ backgroundColor: state.selectedMarker.color }}
                    className="text-white"
                  >
                    {state.selectedMarker.severity}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t bg-background/95 backdrop-blur">
        {!state.session ? (
          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={() => startSession()}
            disabled={!isARSupported}
          >
            <Play className="h-5 w-5" />
            {isARSupported ? 'Démarrer HoloEDL' : 'AR non supportée'}
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            {/* Action buttons */}
            <Button
              variant={state.isPlacingMarker ? 'default' : 'outline'}
              size="icon"
              onClick={() => togglePlacingMarker(!state.isPlacingMarker)}
              className="h-12 w-12 rounded-full"
            >
              <MapPin className="h-5 w-5" />
            </Button>
            
            <Button
              variant={state.isMeasuring ? 'default' : 'outline'}
              size="icon"
              onClick={() => toggleMeasuring(!state.isMeasuring)}
              className="h-12 w-12 rounded-full"
            >
              <Ruler className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <Camera className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
            >
              <Mic className="h-5 w-5" />
            </Button>
            
            <div className="flex-1" />
            
            <Button
              variant="destructive"
              size="lg"
              onClick={endSession}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Terminer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
