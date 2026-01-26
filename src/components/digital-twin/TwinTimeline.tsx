import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Play, Pause, SkipBack, SkipForward, Flag, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { DigitalTwinSnapshot } from '@/types/digital-twin';

interface TwinTimelineProps {
  snapshots: DigitalTwinSnapshot[];
  currentDate?: string;
  onDateChange: (date: string) => void;
}

export function TwinTimeline({ snapshots, currentDate, onDateChange }: TwinTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(snapshots.length - 1);

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
        <Calendar className="h-6 w-6 mb-2 opacity-50" />
        <p className="text-sm">Aucun historique disponible</p>
      </div>
    );
  }

  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  const handleSliderChange = (value: number[]) => {
    const index = value[0];
    setCurrentIndex(index);
    onDateChange(sortedSnapshots[index].snapshot_date);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      onDateChange(sortedSnapshots[currentIndex - 1].snapshot_date);
    }
  };

  const handleNext = () => {
    if (currentIndex < sortedSnapshots.length - 1) {
      setCurrentIndex(currentIndex + 1);
      onDateChange(sortedSnapshots[currentIndex + 1].snapshot_date);
    }
  };

  const currentSnapshot = sortedSnapshots[currentIndex];

  return (
    <div className="space-y-4">
      {/* Current snapshot info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {format(new Date(currentSnapshot.snapshot_date), 'PPP', { locale: fr })}
          </p>
          {currentSnapshot.description && (
            <p className="text-xs text-muted-foreground">{currentSnapshot.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentSnapshot.is_milestone && (
            <Badge variant="secondary" className="gap-1">
              <Flag className="h-3 w-3" />
              Jalon
            </Badge>
          )}
          {currentSnapshot.health_score && (
            <Badge variant="outline">
              Santé: {Math.round(currentSnapshot.health_score)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline slider */}
      <div className="px-2">
        <Slider
          value={[currentIndex]}
          min={0}
          max={sortedSnapshots.length - 1}
          step={1}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* Timeline markers */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>
          {format(new Date(sortedSnapshots[0].snapshot_date), 'dd/MM/yy')}
        </span>
        <span>
          {format(new Date(sortedSnapshots[sortedSnapshots.length - 1].snapshot_date), 'dd/MM/yy')}
        </span>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="default"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === sortedSnapshots.length - 1}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
