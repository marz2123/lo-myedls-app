import { useState } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EDLTimelineView } from './EDLTimelineView';
import { useEDLTimeline } from '@/hooks/useEDLTimeline';

interface TimelineButtonProps {
  projectId: string;
  sessionId?: string;
  variant?: 'default' | 'floating' | 'icon';
  onViewPhoto?: (url: string) => void;
  onOpenRoom?: (roomName: string) => void;
  onOpenComparison?: () => void;
}

export const TimelineButton = ({
  projectId,
  sessionId,
  variant = 'default',
  onViewPhoto,
  onOpenRoom,
  onOpenComparison,
}: TimelineButtonProps) => {
  const [open, setOpen] = useState(false);
  const { events } = useEDLTimeline(projectId, sessionId);

  if (variant === 'floating') {
    return (
      <>
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg flex items-center justify-center z-40"
        >
          <History className="w-5 h-5" />
          {events.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {events.length > 99 ? '99+' : events.length}
            </Badge>
          )}
        </motion.button>

        <EDLTimelineView
          projectId={projectId}
          sessionId={sessionId}
          open={open}
          onOpenChange={setOpen}
          onViewPhoto={onViewPhoto}
          onOpenRoom={onOpenRoom}
          onOpenComparison={onOpenComparison}
        />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative"
        >
          <History className="w-5 h-5" />
          {events.length > 0 && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]"
            >
              {events.length > 99 ? '99+' : events.length}
            </Badge>
          )}
        </Button>

        <EDLTimelineView
          projectId={projectId}
          sessionId={sessionId}
          open={open}
          onOpenChange={setOpen}
          onViewPhoto={onViewPhoto}
          onOpenRoom={onOpenRoom}
          onOpenComparison={onOpenComparison}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <History className="w-4 h-4 mr-2" />
        Timeline
        {events.length > 0 && (
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {events.length}
          </Badge>
        )}
      </Button>

      <EDLTimelineView
        projectId={projectId}
        sessionId={sessionId}
        open={open}
        onOpenChange={setOpen}
        onViewPhoto={onViewPhoto}
        onOpenRoom={onOpenRoom}
        onOpenComparison={onOpenComparison}
      />
    </>
  );
};
