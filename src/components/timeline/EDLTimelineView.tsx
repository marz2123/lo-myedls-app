import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ArrowLeft, 
  Calendar,
  Loader2,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEDLTimeline } from '@/hooks/useEDLTimeline';
import { TimelineEventCard } from './TimelineEventCard';
import { TimelineFilters } from './TimelineFilters';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface EDLTimelineViewProps {
  projectId: string;
  sessionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewPhoto?: (url: string) => void;
  onOpenRoom?: (roomName: string) => void;
  onOpenComparison?: () => void;
}

export const EDLTimelineView = ({
  projectId,
  sessionId,
  open,
  onOpenChange,
  onViewPhoto,
  onOpenRoom,
  onOpenComparison,
}: EDLTimelineViewProps) => {
  const { trigger } = useHapticFeedback();
  const {
    events,
    groupedEvents,
    loading,
    filters,
    setFilters,
  } = useEDLTimeline(projectId, sessionId);

  const handleScroll = () => {
    trigger('light');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">Timeline EDL</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Toutes les actions IA + utilisateur en temps réel
                </p>
              </div>
            </div>
            <TimelineFilters
              filters={filters}
              onFiltersChange={setFilters}
              activeCount={events.length}
            />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Chargement de la timeline...</p>
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Aucun événement</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Les événements apparaîtront ici au fur et à mesure de votre progression dans l'EDL.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full" onScrollCapture={handleScroll}>
              <div className="p-4 space-y-6">
                <AnimatePresence mode="popLayout">
                  {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                    <motion.div
                      key={date}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      {/* Date header */}
                      <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {date}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {dateEvents.length} événement(s)
                        </span>
                      </div>

                      {/* Timeline line */}
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                        
                        {/* Events */}
                        <div className="space-y-4">
                          {dateEvents.map((event, index) => (
                            <TimelineEventCard
                              key={event.id}
                              event={event}
                              onViewPhoto={onViewPhoto}
                              onOpenRoom={onOpenRoom}
                              onOpenComparison={onOpenComparison}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
