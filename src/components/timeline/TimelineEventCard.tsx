import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Bot, 
  AlertTriangle, 
  Wrench, 
  Home, 
  Sparkles, 
  Edit, 
  GitCompare,
  RefreshCw,
  Check,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EDLEvent } from '@/hooks/useEDLTimeline';

interface TimelineEventCardProps {
  event: EDLEvent;
  onViewPhoto?: (url: string) => void;
  onOpenRoom?: (roomName: string) => void;
  onValidateAnomaly?: (anomalyId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenComparison?: () => void;
}

const eventIcons: Record<string, React.ReactNode> = {
  photo: <Camera className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  anomaly: <AlertTriangle className="w-4 h-4" />,
  task: <Wrench className="w-4 h-4" />,
  room: <Home className="w-4 h-4" />,
  myaladin: <Sparkles className="w-4 h-4" />,
  user: <Edit className="w-4 h-4" />,
  comparison: <GitCompare className="w-4 h-4" />,
  sync: <RefreshCw className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  photo: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ai: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  anomaly: 'bg-red-500/10 text-red-600 border-red-500/20',
  task: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  room: 'bg-green-500/10 text-green-600 border-green-500/20',
  myaladin: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  user: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  comparison: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  sync: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
};

const severityBadges: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-yellow-100 text-yellow-700', label: 'Faible' },
  medium: { color: 'bg-orange-100 text-orange-700', label: 'Moyen' },
  high: { color: 'bg-red-100 text-red-700', label: 'Important' },
  critical: { color: 'bg-red-500 text-white', label: 'Critique' },
};

export const TimelineEventCard = ({
  event,
  onViewPhoto,
  onOpenRoom,
  onValidateAnomaly,
  onOpenTask,
  onOpenComparison,
}: TimelineEventCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(event.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const icon = eventIcons[event.event_category] || <Edit className="w-4 h-4" />;
  const colorClass = categoryColors[event.event_category] || categoryColors.user;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-8"
    >
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-0 top-3 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-background",
        colorClass
      )}>
        {icon}
      </div>

      {/* Event card */}
      <div className={cn(
        "bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
        event.severity === 'critical' && "border-red-500/50 bg-red-50/50"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-mono">
                {time}
              </span>
              {event.is_ai_generated && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                  <Bot className="w-3 h-3 mr-1" />
                  IA
                </Badge>
              )}
              {event.severity && severityBadges[event.severity] && (
                <Badge className={cn("text-xs", severityBadges[event.severity].color)}>
                  {severityBadges[event.severity].label}
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm truncate">{event.title}</h4>
            {event.room_name && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📍 {event.room_name}
                {event.element_name && ` — ${event.element_name}`}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Photo thumbnail */}
        {event.related_photo_url && (
          <div className="mt-3">
            <img
              src={event.related_photo_url}
              alt="Event photo"
              className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onViewPhoto?.(event.related_photo_url!)}
            />
          </div>
        )}

        {/* Expanded content */}
        {expanded && event.description && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t"
          >
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {event.event_category === 'photo' && event.related_photo_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewPhoto?.(event.related_photo_url!)}
            >
              <Eye className="w-3 h-3 mr-1" />
              Voir photo
            </Button>
          )}

          {event.event_category === 'room' && event.room_name && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenRoom?.(event.room_name!)}
            >
              <Home className="w-3 h-3 mr-1" />
              Ouvrir la pièce
            </Button>
          )}

          {event.event_category === 'anomaly' && event.related_anomaly_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onValidateAnomaly?.(event.related_anomaly_id!)}
            >
              <Check className="w-3 h-3 mr-1" />
              Valider anomalie
            </Button>
          )}

          {event.event_category === 'task' && event.related_task_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTask?.(event.related_task_id!)}
            >
              <Wrench className="w-3 h-3 mr-1" />
              Voir tâche
            </Button>
          )}

          {event.event_category === 'comparison' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenComparison}
            >
              <GitCompare className="w-3 h-3 mr-1" />
              Ouvrir comparatif
            </Button>
          )}

          {event.event_category === 'myaladin' && (
            <Button
              variant="outline"
              size="sm"
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Exécuter suggestion
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
