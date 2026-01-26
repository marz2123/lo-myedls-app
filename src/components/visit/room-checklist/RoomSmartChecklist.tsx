import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Settings, CheckCircle2, AlertTriangle, Camera,
  Bath, UtensilsCrossed, Sofa, Bed, DoorOpen, Sparkles, PartyPopper, FileText, Trophy, Map
} from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useRoomChecklist } from '@/hooks/useRoomChecklist';
import { useMagicFilters, FilterType } from '@/hooks/useMagicFilters';
import { useHandsFreeMode } from '@/hooks/useHandsFreeMode';
import { useEDLGamification } from '@/hooks/useEDLGamification';
import { ChecklistItem } from './ChecklistItem';
import { MagicFilters } from '../magic-filters/MagicFilters';
import { HandsFreeButton } from '../hands-free/HandsFreeButton';
import { SkeletonBubble } from '../reportage-hub/SkeletonBubble';
import { LiveReportBuilder } from '@/components/live-report';
import { BadgePopup, CelebrationOverlay, EDLScoreGauge } from '@/components/gamification';
import { TripleNavigationContainer } from '@/components/triple-navigation';
import { toast } from 'sonner';

// Dynamic import for confetti to avoid SSR issues
const triggerConfetti = () => {
  import('canvas-confetti').then(({ default: confetti }) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#10B981', '#6366F1'],
    });
  });
};

interface RoomSmartChecklistProps {
  projectId?: string;
  roomId?: string;
  onBack?: () => void;
  onSettings?: () => void;
}

const getRoomIcon = (name: string, locationType?: string) => {
  const lower = (name + (locationType || '')).toLowerCase();
  if (lower.includes('sdb') || lower.includes('salle de bain')) return Bath;
  if (lower.includes('cuisine') || lower.includes('kitchen')) return UtensilsCrossed;
  if (lower.includes('salon') || lower.includes('séjour')) return Sofa;
  if (lower.includes('chambre') || lower.includes('bedroom')) return Bed;
  return DoorOpen;
};

export function RoomSmartChecklist({ 
  projectId, 
  roomId, 
  onBack,
  onSettings 
}: RoomSmartChecklistProps) {
  const navigate = useNavigate();
  const haptic = useHapticFeedback();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showLiveReport, setShowLiveReport] = useState(false);
  const [showTripleNavigation, setShowTripleNavigation] = useState(false);

  // Gamification
  const gamification = useEDLGamification(projectId);

  const {
    room,
    checklistItems,
    loading,
    saving,
    stats,
    refresh,
    updateItemStatus,
    updateItemDescription,
  } = useRoomChecklist(projectId, roomId);

  // Magic Filters for checklist items
  const {
    activeFilters,
    toggleFilter,
    filterChecklistItems,
    getFilterCounts,
    autoHighlightFilters,
  } = useMagicFilters({ autoHighlight: true });

  // Filter counts for room checklist
  const filterCounts = useMemo(() => 
    getFilterCounts(undefined, checklistItems), 
    [checklistItems, getFilterCounts]
  );
  
  // Filtered checklist items
  const filteredItems = useMemo(() => 
    filterChecklistItems(checklistItems), 
    [checklistItems, filterChecklistItems]
  );

  // Available filters for room checklist
  const checklistFilters: FilterType[] = ['all', 'anomalies', 'moyen', 'mauvais', 'missing_photos', 'not_filled', 'tasks_generated', 'completed'];

  // Auto-highlight filters based on data
  useEffect(() => {
    if (!loading && checklistItems.length > 0) {
      const hasAnomalies = checklistItems.some(i => i.hasAnomaly);
      const hasMissing = checklistItems.some(i => i.status === 'pending');
      const isComplete = checklistItems.every(i => i.status !== 'pending' && i.photoCount > 0);
      autoHighlightFilters(hasAnomalies, hasMissing, isComplete);
    }
  }, [loading, checklistItems, autoHighlightFilters]);

  // Hands-free voice control
  const handsFree = useHandsFreeMode({
    onNavigate: (action) => {
      if (action === 'next_element') {
        const pendingItem = filteredItems.find(i => i.status === 'pending');
        if (pendingItem) {
          handleTakePhoto(pendingItem.type);
        }
      } else if (action === 'back') {
        handleBack();
      } else if (action === 'open_capture' || action === 'take_photo') {
        const currentItem = filteredItems[0];
        if (currentItem) {
          handleTakePhoto(currentItem.type);
        }
      }
    },
    onStatusChange: (status) => {
      const pendingItem = filteredItems.find(i => i.status === 'pending');
      if (pendingItem) {
        handleStatusChange(pendingItem.id, status);
      }
    },
    onAddDescription: (text) => {
      const pendingItem = filteredItems.find(i => i.status === 'pending');
      if (pendingItem) {
        updateItemDescription(pendingItem.id, text);
        toast.success('Description ajoutée');
      }
    },
    onAddAnomaly: (description) => {
      toast.info(`Anomalie notée: ${description}`);
      // Anomaly will be handled when implementing full anomaly system
    },
    onAddTask: (title) => {
      toast.info(`Tâche notée: ${title}`);
      // Task will be handled when implementing full task system
    },
    onValidateRoom: () => {
      handleCompleteRoom();
    },
    onQuery: (action) => {
      if (action === 'show_remaining' || action === 'show_missing') {
        toggleFilter('not_filled');
      } else if (action === 'show_anomalies') {
        toggleFilter('anomalies');
      } else if (action === 'show_tasks') {
        toggleFilter('tasks_generated');
      }
    },
  });

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (projectId) {
      navigate(`/project/${projectId}/storyline`);
    }
  }, [onBack, navigate, projectId]);

  const handleTakePhoto = useCallback((itemType: string) => {
    haptic.trigger('recording_start');
    navigate(`/project/${projectId}/capture?element=${itemType}&room=${roomId}`);
  }, [navigate, projectId, roomId, haptic]);

  const handleStatusChange = useCallback(async (itemId: string, status: 'bon' | 'moyen' | 'mauvais') => {
    await updateItemStatus(itemId, status);
    haptic.trigger('piece_complete');
    
    // Check if this completes the item
    const item = checklistItems.find(i => i.id === itemId);
    if (item && item.status === 'pending') {
      toast.success(`${item.name} validé`, { duration: 1500 });
    }
  }, [updateItemStatus, checklistItems, haptic]);

  const handleCompleteRoom = useCallback(async () => {
    if (!stats.canComplete) {
      if (!stats.allCompleted) {
        toast.error('Tous les éléments doivent être vérifiés');
      } else if (!stats.allHavePhotos) {
        toast.error('Tous les éléments doivent avoir une photo');
      }
      haptic.trigger('error');
      return;
    }

    setIsCompleting(true);
    haptic.trigger('edl_complete');

    // Trigger confetti and gamification
    triggerConfetti();
    gamification.checkBadges({
      roomCompleted: true,
      roomAnomalies: stats.anomalies,
      roomPhotosComplete: stats.allHavePhotos,
      aiPerfect: stats.anomalies === 0
    });

    toast.success('Pièce terminée !', {
      description: `${room?.name} est maintenant complète`,
      icon: <PartyPopper className="h-4 w-4" />,
    });

    setTimeout(() => {
      setIsCompleting(false);
      handleBack();
    }, 1500);
  }, [stats, haptic, room, handleBack, gamification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 pt-safe space-y-4">
          <SkeletonBubble className="h-20 w-full" />
          <SkeletonBubble className="h-12 w-full" />
          {[...Array(5)].map((_, i) => (
            <SkeletonBubble key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Pièce non trouvée</p>
          <Button variant="link" onClick={handleBack} className="mt-2">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const RoomIcon = getRoomIcon(room.name, room.locationType);

  const statusConfig = {
    not_started: { badge: 'bg-muted text-muted-foreground', label: 'À commencer' },
    in_progress: { badge: 'bg-amber-500/20 text-amber-600', label: 'En cours' },
    completed: { badge: 'bg-green-500/20 text-green-600', label: 'Terminé' },
  };

  const config = room.hasAnomaly 
    ? { ...statusConfig[room.status], badge: 'bg-red-500/20 text-red-600' }
    : statusConfig[room.status];

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4 pt-safe">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 mx-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <RoomIcon className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg truncate">{room.name}</h1>
            </div>
            <Badge className={cn('text-xs mt-1', config.badge)}>
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLiveReport(true)}
              className="h-10 w-10 rounded-full"
            >
              <FileText className="h-5 w-5 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="h-10 w-10 rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{stats.completed}/{stats.total} éléments vérifiés</span>
            <span>{stats.completionPercent}%</span>
          </div>
          <Progress value={stats.completionPercent} className="h-2" />
        </div>

        {/* Magic Filters */}
        <div className="border-t border-border">
          <MagicFilters
            activeFilters={activeFilters}
            onToggleFilter={toggleFilter}
            counts={filterCounts}
            availableFilters={checklistFilters}
          />
        </div>
      </header>

      {/* Stats summary */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-lg font-semibold">{stats.completed}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Validés</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-lg font-semibold">{stats.withPhotos}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Avec photos</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-lg font-semibold">{stats.anomalies}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Anomalies</p>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-medium text-sm">Éléments à vérifier</h2>
          </div>
          {!activeFilters.has('all') && (
            <span className="text-xs text-muted-foreground">
              {filteredItems.length}/{checklistItems.length}
            </span>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-sm text-muted-foreground">
              Aucun élément ne correspond aux filtres
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <ChecklistItem
                  item={item}
                  isExpanded={expandedItemId === item.id}
                  onTap={() => handleTakePhoto(item.type)}
                  onToggleExpand={() => {
                    setExpandedItemId(prev => prev === item.id ? null : item.id);
                    haptic.selectionChanged();
                  }}
                  onStatusChange={(status) => handleStatusChange(item.id, status)}
                  onDescriptionChange={(desc) => updateItemDescription(item.id, desc)}
                  onTakePhoto={() => handleTakePhoto(item.type)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Complete room footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-sm border-t border-border">
        {stats.anomalies > 0 && (
          <p className="text-xs text-red-500 text-center mb-2 flex items-center justify-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {stats.anomalies} anomalie{stats.anomalies > 1 ? 's' : ''} détectée{stats.anomalies > 1 ? 's' : ''}
          </p>
        )}
        
        <Button
          size="lg"
          className={cn(
            'w-full h-14 text-base font-semibold rounded-2xl transition-all',
            stats.canComplete 
              ? 'bg-primary hover:bg-primary/90' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
          disabled={!stats.canComplete || isCompleting}
          onClick={handleCompleteRoom}
        >
          {isCompleting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Terminer cette pièce
            </>
          )}
        </Button>

        {!stats.canComplete && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {!stats.allCompleted 
              ? 'Vérifiez tous les éléments' 
              : 'Ajoutez une photo pour chaque élément'}
          </p>
        )}
      </div>

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
      {projectId && (
        <LiveReportBuilder
          projectId={projectId}
          open={showLiveReport}
          onOpenChange={setShowLiveReport}
        />
      )}

      {/* Gamification: Badge Popup */}
      <BadgePopup
        badge={gamification.pendingBadge}
        onDismiss={gamification.dismissBadge}
      />

      {/* Gamification: Celebration Overlay */}
      <CelebrationOverlay
        type={gamification.showCelebration}
        onDismiss={() => gamification.setShowCelebration(null)}
      />

      {/* Triple Navigation */}
      {projectId && (
        <TripleNavigationContainer
          projectId={projectId}
          isOpen={showTripleNavigation}
          onClose={() => setShowTripleNavigation(false)}
          onRoomSelect={(roomId) => {
            setShowTripleNavigation(false);
            navigate(`/project/${projectId}/room/${roomId}`);
          }}
        />
      )}
    </div>
  );
}
