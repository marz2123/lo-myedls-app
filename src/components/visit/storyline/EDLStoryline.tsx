import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Settings, Sparkles,
  AlertCircle, ListChecks, FileText, Trophy, Map, ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEDLProgress, StorylineRoom, RoomElement } from '@/hooks/useEDLProgress';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useMagicFilters, FilterType } from '@/hooks/useMagicFilters';
import { useHandsFreeMode } from '@/hooks/useHandsFreeMode';
import { useEDLGamification } from '@/hooks/useEDLGamification';
import { StorylineProgressHero } from './StorylineProgressHero';
import { StorylineRoomCard } from './StorylineRoomCard';
import { MagicFilters } from '../magic-filters/MagicFilters';
import { HandsFreeButton } from '../hands-free/HandsFreeButton';
import { SkeletonBubble } from '../reportage-hub/SkeletonBubble';
import { LiveReportBuilder } from '@/components/live-report';
import { BadgePopup, EDLScoreGauge, CelebrationOverlay, BadgeCollection } from '@/components/gamification';
import { TripleNavigationContainer } from '@/components/triple-navigation';
import { EDLComparisonDialog } from '@/components/edl-comparison';
import { MagicButton } from '@/components/missing-items';
import { MyAladinCoach } from '@/components/myaladin';
import { TimelineButton } from '@/components/timeline';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface EDLStorylineProps {
  projectId: string;
  onClose?: () => void;
}

export const EDLStoryline: React.FC<EDLStorylineProps> = ({
  projectId,
  onClose
}) => {
  const navigate = useNavigate();
  const haptic = useHapticFeedback();
  const {
    rooms,
    totalRooms,
    completedRooms,
    completionPercent,
    totalAnomalies,
    totalTasks,
    totalPhotos,
    loading,
    refresh
  } = useEDLProgress(projectId);

  const [showLiveReport, setShowLiveReport] = useState(false);
  const [showBadgesSheet, setShowBadgesSheet] = useState(false);
  const [showTripleNavigation, setShowTripleNavigation] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Entry/Exit session IDs (would come from project data in real implementation)
  const [entrySessionId] = useState<string | null>(null);
  const [exitSessionId] = useState<string | null>(null);

  // Gamification
  const gamification = useEDLGamification(projectId);

  // Magic Filters
  const {
    activeFilters,
    toggleFilter,
    filterRooms,
    getFilterCounts,
    autoHighlightFilters,
  } = useMagicFilters({ autoHighlight: true });

  // Filter counts for storyline
  const filterCounts = useMemo(() => getFilterCounts(rooms), [rooms, getFilterCounts]);
  
  // Filtered rooms based on active filters
  const filteredRooms = useMemo(() => filterRooms(rooms), [rooms, filterRooms]);

  // Auto-highlight filters based on data
  useEffect(() => {
    if (!loading && rooms.length > 0) {
      const hasAnomalies = rooms.some(r => r.hasAnomaly);
      const hasMissing = rooms.some(r => r.elements.some(e => e.status === 'pending'));
      const isComplete = rooms.every(r => r.status === 'completed');
      autoHighlightFilters(hasAnomalies, hasMissing, isComplete);
    }
  }, [loading, rooms, autoHighlightFilters]);

  // Update gamification score
  useEffect(() => {
    if (!loading) {
      gamification.calculateScore({
        roomsCompleted: completedRooms,
        totalRooms,
        itemsCompleted: rooms.reduce((acc, r) => acc + r.elements.filter(e => e.status === 'done').length, 0),
        totalItems: rooms.reduce((acc, r) => acc + r.elements.length, 0),
        photosCount: totalPhotos,
        anomaliesCount: totalAnomalies,
        tasksGenerated: totalTasks,
        precision: 0.85
      });

      // Check for badges
      gamification.checkBadges({
        edlProgress: completionPercent,
        totalAnomalies,
        tasksGenerated: totalTasks
      });
    }
  }, [loading, completedRooms, totalRooms, totalPhotos, totalAnomalies, totalTasks, completionPercent]);

  // Get pending rooms
  const pendingRooms = rooms.filter(r => r.status !== 'completed');
  const missingElements = rooms.flatMap(r => 
    r.elements.filter(e => e.status === 'pending').map(e => ({
      room: r,
      element: e
    }))
  );

  // Available filters for storyline (exclude item-specific ones)
  const storylineFilters: FilterType[] = ['all', 'anomalies', 'not_started', 'not_filled', 'missing_photos', 'tasks_generated', 'completed'];

  // Hands-free voice control
  const handsFree = useHandsFreeMode({
    onNavigate: (action) => {
      if (action === 'next_room' && filteredRooms.length > 0) {
        const nextRoom = filteredRooms.find(r => r.status !== 'completed') || filteredRooms[0];
        handleTapRoom(nextRoom);
      } else if (action === 'back') {
        handleBack();
      } else if (action === 'open_capture' && filteredRooms.length > 0) {
        const currentRoom = filteredRooms[0];
        const pendingElement = currentRoom.elements.find(e => e.status === 'pending');
        if (pendingElement) {
          handleTapElement(currentRoom, pendingElement);
        }
      }
    },
    onQuery: (action) => {
      if (action === 'show_anomalies') {
        toggleFilter('anomalies');
      } else if (action === 'show_tasks') {
        toggleFilter('tasks_generated');
      }
    },
  });

  const handleTapRoom = useCallback((room: StorylineRoom) => {
    haptic.trigger('zone_complete');
    // Navigate to room checklist
    navigate(`/project/${projectId}/room/${room.id}`);
  }, [navigate, projectId, haptic]);

  const handleTapElement = useCallback((room: StorylineRoom, element: RoomElement) => {
    haptic.trigger('zone_complete');
    // Navigate to capture hub with room and element pre-selected
    navigate(`/project/${projectId}/capture?roomId=${room.id}&roomName=${encodeURIComponent(room.name)}&element=${element.type}`);
  }, [navigate, projectId, haptic]);

  const handleEndEDL = useCallback(() => {
    haptic.trigger('edl_complete');
    // Navigate to EDL summary/export
    navigate(`/project/${projectId}`);
  }, [navigate, projectId, haptic]);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate(`/project/${projectId}`);
    }
  }, [navigate, projectId, onClose]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 space-y-4">
          <div className="h-32 bg-muted animate-pulse rounded-2xl" />
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SkeletonBubble key={i} hasMedia={true} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b safe-area-top">
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="font-semibold text-foreground">EDL Storyline</h1>

          <div className="flex items-center gap-1">
            <TimelineButton
              projectId={projectId}
              variant="icon"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowComparison(true)}
              title="Comparer Entrée/Sortie"
            >
              <ArrowLeftRight className="h-5 w-5 text-orange-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowTripleNavigation(true)}
            >
              <Map className="h-5 w-5 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowBadgesSheet(true)}
            >
              <Trophy className="h-5 w-5 text-amber-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowLiveReport(true)}
            >
              <FileText className="h-5 w-5 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Magic Filters */}
      <div className="sticky top-[57px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <MagicFilters
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          counts={filterCounts}
          availableFilters={storylineFilters}
        />
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-32 space-y-4">
          {/* Hero progress section */}
          <StorylineProgressHero
            completionPercent={completionPercent}
            completedRooms={completedRooms}
            totalRooms={totalRooms}
            totalAnomalies={totalAnomalies}
            totalTasks={totalTasks}
            totalPhotos={totalPhotos}
            onEndEDL={handleEndEDL}
            onViewReport={() => setShowLiveReport(true)}
          />

          {/* Empty state */}
          {rooms.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 px-6"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Prêt à démarrer ?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Définissez la structure du bien dans les paramètres pour commencer la visite.
              </p>
              <Button onClick={() => navigate(`/project/${projectId}/edit`)}>
                Configurer le bien
              </Button>
            </motion.div>
          )}

          {/* Storyline timeline */}
          {rooms.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Parcours de visite
                  </span>
                </div>
                {!activeFilters.has('all') && (
                  <span className="text-xs text-muted-foreground">
                    {filteredRooms.length}/{rooms.length} pièces
                  </span>
                )}
              </div>

              {filteredRooms.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <p className="text-sm text-muted-foreground">
                    Aucune pièce ne correspond aux filtres sélectionnés
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {filteredRooms.map((room, index) => (
                    <StorylineRoomCard
                      key={room.id}
                      room={room}
                      index={index}
                      onTapRoom={handleTapRoom}
                      onTapElement={handleTapElement}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Magic Button - Everything Missing */}
      <MagicButton projectId={projectId} variant="floating" />

      {/* Hands-Free Voice Control Button */}
      <HandsFreeButton
        isActive={handsFree.isActive}
        isListening={handsFree.isListening}
        isProcessing={handsFree.isProcessing}
        audioLevel={handsFree.audioLevel}
        transcript={handsFree.transcript}
        statusMessage={handsFree.statusMessage}
        onTap={handsFree.toggle}
        onLongPressStart={handsFree.startContinuousMode}
        onLongPressEnd={handsFree.stopAndProcess}
      />

      {/* Live Report Builder */}
      <LiveReportBuilder
        projectId={projectId}
        open={showLiveReport}
        onOpenChange={setShowLiveReport}
      />

      {/* Gamification: Badge Popup */}
      <BadgePopup
        badge={gamification.pendingBadge}
        onDismiss={gamification.dismissBadge}
      />

      {/* Gamification: Celebration Overlay */}
      <CelebrationOverlay
        type={gamification.showCelebration}
        score={gamification.score.totalScore}
        onViewReport={() => {
          gamification.setShowCelebration(null);
          setShowLiveReport(true);
        }}
        onExportPDF={() => {
          gamification.setShowCelebration(null);
          toast.info('Export PDF en cours...');
        }}
        onDismiss={() => gamification.setShowCelebration(null)}
      />

      {/* Gamification: Badges Sheet */}
      <Sheet open={showBadgesSheet} onOpenChange={setShowBadgesSheet}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Mes Badges
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="space-y-4 pb-6">
              <EDLScoreGauge score={gamification.score} variant="detailed" />
              <BadgeCollection badges={gamification.badges} showLocked />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Triple Navigation */}
      <TripleNavigationContainer
        projectId={projectId}
        isOpen={showTripleNavigation}
        onClose={() => setShowTripleNavigation(false)}
        onRoomSelect={(roomId) => {
          setShowTripleNavigation(false);
          navigate(`/project/${projectId}/room/${roomId}`);
        }}
        onElementSelect={(roomId, elementId) => {
          setShowTripleNavigation(false);
          navigate(`/project/${projectId}/capture?roomId=${roomId}&elementId=${elementId}`);
        }}
      />

      {/* EDL Comparison Dialog */}
      {showComparison && (
        <EDLComparisonDialog
          open={showComparison}
          onOpenChange={setShowComparison}
          projectId={projectId}
          entrySessionId={entrySessionId || 'demo-entry'}
          exitSessionId={exitSessionId || 'demo-exit'}
        />
      )}

      {/* MyAladin AI Coach */}
      <MyAladinCoach
        projectId={projectId}
        context="checklist"
        onNavigateToRoom={(roomId) => navigate(`/project/${projectId}/room/${roomId}`)}
        onShowMissingItems={() => {}}
        onCreateTask={() => {}}
      />
    </div>
  );
};
