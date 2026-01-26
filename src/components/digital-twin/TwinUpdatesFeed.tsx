import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Camera, 
  Video, 
  AlertTriangle, 
  CheckCircle2, 
  Wifi, 
  User, 
  Sparkles,
  FileImage
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DigitalTwinUpdate } from '@/types/digital-twin';

interface TwinUpdatesFeedProps {
  updates: DigitalTwinUpdate[];
  onUpdateClick?: (update: DigitalTwinUpdate) => void;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  edl: FileImage,
  autopilot: Video,
  photo: Camera,
  iot: Wifi,
  camera: Video,
  user: User,
  ai: Sparkles,
};

const UPDATE_TYPE_LABELS: Record<string, string> = {
  state_change: 'État modifié',
  anomaly: 'Anomalie',
  task: 'Tâche',
  iot: 'Capteur IoT',
  photo: 'Photo',
  video: 'Vidéo',
  camera: 'Caméra',
  intervention: 'Intervention',
};

export function TwinUpdatesFeed({ updates, onUpdateClick }: TwinUpdatesFeedProps) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Sparkles className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Aucune mise à jour</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {updates.map((update) => {
          const Icon = SOURCE_ICONS[update.source] || Sparkles;
          const isAnomaly = update.update_type === 'anomaly';
          const isValidated = update.is_validated;

          return (
            <div
              key={update.id}
              onClick={() => onUpdateClick?.(update)}
              className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full shrink-0
                ${isAnomaly ? 'bg-destructive/10' : 'bg-primary/10'}
              `}>
                {isAnomaly ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Icon className="h-4 w-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {UPDATE_TYPE_LABELS[update.update_type] || update.update_type}
                  </span>
                  {isValidated && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>
                
                {update.object_type && (
                  <p className="text-xs text-muted-foreground truncate">
                    {update.object_type} {update.object_id && `• ${update.object_id.slice(0, 8)}`}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {update.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(update.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </span>
                  {update.confidence_score < 0.7 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Confiance: {Math.round(update.confidence_score * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
