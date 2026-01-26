import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Search, 
  RefreshCw, 
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useMissingItems, MissingItem, MissingRoomSummary } from '@/hooks/useMissingItems';
import { ScanAnimation } from './ScanAnimation';
import { MissingItemCard } from './MissingItemCard';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface MissingItemsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function MissingItemsViewer({
  open,
  onOpenChange,
  projectId
}: MissingItemsViewerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [showInitialScan, setShowInitialScan] = useState(true);

  const {
    isScanning,
    summary,
    scanMissingItems,
    markAsDone,
    confirmAnomaly,
    validateTask,
    ignoreItem
  } = useMissingItems(projectId);

  // Initial scan when opening
  useEffect(() => {
    if (open && !summary) {
      setShowInitialScan(true);
      scanMissingItems().then(() => {
        setTimeout(() => setShowInitialScan(false), 800);
      });
    }
  }, [open, summary, scanMissingItems]);

  // Celebration when reaching 100%
  useEffect(() => {
    if (summary?.totalMissing === 0 && !isScanning) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [summary?.totalMissing, isScanning]);

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const handleNavigate = (item: MissingItem) => {
    onOpenChange(false);
    navigate(`/project/${projectId}/capture?roomId=${item.roomId}&roomName=${encodeURIComponent(item.roomName)}&element=${item.elementType || ''}`);
  };

  const handleAutoComplete = async (item: MissingItem) => {
    toast({
      title: "Auto-complétion IA",
      description: "Traitement en cours..."
    });
    // Simulate AI auto-completion
    setTimeout(() => {
      markAsDone(item);
      toast({
        title: "Complété par l'IA",
        description: `${item.elementName} a été auto-complété`
      });
    }, 1500);
  };

  const handleIgnore = (item: MissingItem, reason: string) => {
    ignoreItem(item, reason);
    toast({
      title: "Élément ignoré",
      description: `${item.elementName} a été ignoré: ${reason}`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Scan Animation Overlay */}
        <AnimatePresence>
          {(isScanning || showInitialScan) && <ScanAnimation isScanning={true} />}
        </AnimatePresence>

        {/* Header */}
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Tout ce qui manque</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Voici ce qu'il faut compléter pour finaliser l'EDL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scanMissingItems()}
                disabled={isScanning}
              >
                <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        {summary && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-card border border-border">
                <p className="text-2xl font-bold text-red-600">{summary.totalBlocking}</p>
                <p className="text-xs text-muted-foreground">Bloquants</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border">
                <p className="text-2xl font-bold text-orange-600">{summary.totalMissing - summary.totalBlocking}</p>
                <p className="text-xs text-muted-foreground">À compléter</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border">
                <p className="text-2xl font-bold text-green-600">{summary.completionPercent}%</p>
                <p className="text-xs text-muted-foreground">Complété</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progression globale</span>
                <span className="font-medium">{summary.roomsWithMissing}/{summary.totalRooms} pièces à compléter</span>
              </div>
              <Progress value={summary.completionPercent} className="h-2" />
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            <AnimatePresence>
              {/* All complete celebration */}
              {summary?.totalMissing === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="inline-flex p-4 rounded-full bg-green-100 mb-4"
                  >
                    <PartyPopper className="h-10 w-10 text-green-600" />
                  </motion.div>
                  <h3 className="font-semibold text-xl mb-2">EDL complet ! 🎉</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tous les éléments ont été documentés
                  </p>
                  <Button onClick={() => onOpenChange(false)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer le rapport
                  </Button>
                </motion.div>
              )}

              {/* Room sections */}
              {summary?.rooms.map((room, index) => (
                <motion.div
                  key={room.roomId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Collapsible
                    open={expandedRooms.has(room.roomId)}
                    onOpenChange={() => toggleRoom(room.roomId)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto py-3 px-4 rounded-xl hover:bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            room.blocking > 0 ? "bg-red-100" : 
                            room.missing > 0 ? "bg-orange-100" : "bg-yellow-100"
                          )}>
                            {room.blocking > 0 ? (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{room.roomName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {room.blocking > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  {room.blocking} bloquant{room.blocking > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {room.missing > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-800">
                                  {room.missing} manquant{room.missing > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {room.recommended > 0 && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {room.recommended} recommandé{room.recommended > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{room.progress}%</p>
                            <Progress value={room.progress} className="w-16 h-1.5" />
                          </div>
                          {expandedRooms.has(room.roomId) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 pl-4">
                        {room.items.map(item => (
                          <MissingItemCard
                            key={item.id}
                            item={item}
                            onNavigate={handleNavigate}
                            onMarkAsDone={markAsDone}
                            onConfirmAnomaly={confirmAnomaly}
                            onValidateTask={validateTask}
                            onAutoComplete={handleAutoComplete}
                            onIgnore={handleIgnore}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
