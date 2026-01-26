import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Video, ChevronRight, Sparkles, Layers, Mic, Clock, Image as ImageIcon, Camera, Zap } from 'lucide-react';
import { EDLVideoCapture } from './EDLVideoCapture';
import { VoiceNoteDialog } from './VoiceNoteDialog';
import { PremiumCaptureFlow } from '@/components/capture/PremiumCaptureFlow';
import { ReportageModule } from '@/components/project/modules';
import { OfflineBanner } from './OfflineBanner';
import { UnifiedTimeline } from './UnifiedTimeline';
import { MediaGallery } from './MediaGallery';
import { CoverageWidget } from './CoverageWidget';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportageHubProps {
  projectId: string;
  sessionId?: string;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  projectName?: string;
  /** When true, opens "À la volée" capture automatically */
  initialOpenFreeVideo?: boolean;
  onOpenVideoReportage?: (mode: 'guided' | 'free') => void;
}

export const ReportageHub: React.FC<ReportageHubProps> = ({ 
  projectId, 
  sessionId,
  onClose,
  title = "Reportage",
  subtitle,
  projectName,
  initialOpenFreeVideo,
  onOpenVideoReportage
}) => {
  const [showVideoCapture, setShowVideoCapture] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  // Pour "Pas à pas", utiliser ReportageModule (afficher le menu d'abord)
  const [showStepByStep, setShowStepByStep] = useState(false);
  // Pour les autres modes (Type d'EDL), utiliser PremiumCaptureFlow
  const [showPremiumCapture, setShowPremiumCapture] = useState(false);
  const quickCaptureFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'capture' | 'timeline' | 'gallery'>('capture');
  
  const navigate = useNavigate();
  const offlineSync = useOfflineSync(projectId);

  useEffect(() => {
    if (initialOpenFreeVideo) {
      setShowVideoCapture(true);
      setShowPremiumCapture(false);
    }
  }, [initialOpenFreeVideo]);

  const handleNewCapture = useCallback(() => {
    // Mode "Pas à pas" - utiliser ReportageModule
    setShowStepByStep(true);
  }, []);

  const handleSequenceCreated = useCallback((sequenceId: string) => {
    toast.success('Séquence créée avec succès');
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-background relative overflow-y-auto">
      {/* Masquer le contenu quand un flow est ouvert */}
      {!showStepByStep && !showPremiumCapture && (
        <>
          <OfflineBanner
            isOnline={offlineSync.isOnline}
            isSyncing={offlineSync.isSyncing}
            pendingCount={offlineSync.pendingCount}
            pendingMediaCount={offlineSync.pendingMediaCount}
            failedCount={offlineSync.failedCount}
            onForceSync={offlineSync.forceSync}
          />

          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 px-5 py-4 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" className="gap-2">
              <Video className="h-4 w-4" />
              Capture
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Galerie
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full">
          {/* Capture Tab */}
          <TabsContent value="capture" className="h-full m-0 p-5 space-y-5 pb-safe">
            {/* Coverage Widget */}
            <CoverageWidget projectId={projectId} />
            
            {/* Reportage Modes */}
            <div className="space-y-3">
          {/* Pas à pas - Primary mode */}
          <button
            onClick={handleNewCapture}
            className={cn(
              "w-full group relative overflow-hidden rounded-[24px]",
              "bg-gradient-to-br from-primary via-primary to-primary/80",
              "p-6 text-left transition-all duration-300",
              "hover:shadow-xl hover:shadow-primary/25 active:scale-[0.99]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Layers className="w-7 h-7 text-primary-foreground" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary-foreground mb-0.5">Pas à pas</h3>
                <p className="text-xs text-primary-foreground/70">Lieu → Zone → Problème → Photos</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground/80" />
                <span className="text-[10px] font-medium text-primary-foreground/80">IA</span>
              </div>
            </div>
          </button>

          {/* À la volée - Video mode */}
          <button
            onClick={() => setShowVideoCapture(true)}
            className={cn(
              "w-full group relative overflow-hidden rounded-[24px]",
              "bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600",
              "p-6 text-left transition-all duration-300",
              "hover:shadow-xl hover:shadow-purple-500/25 active:scale-[0.99]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Video className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-0.5">À la volée</h3>
                <p className="text-xs text-white/70">Vidéo libre avec pauses et reprises</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </button>

          {/* Note vocale */}
          <button
            onClick={() => setShowVoiceNote(true)}
            className={cn(
              "w-full group relative overflow-hidden rounded-[24px]",
              "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600",
              "p-6 text-left transition-all duration-300",
              "hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.99]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Mic className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-0.5">Note vocale</h3>
                <p className="text-xs text-white/70">Enregistrement audio avec transcription IA</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </button>

          {/* Capture rapide */}
          <button
            onClick={() => quickCaptureFileInputRef.current?.click()}
            className={cn(
              "w-full group relative overflow-hidden rounded-[24px]",
              "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600",
              "p-6 text-left transition-all duration-300",
              "hover:shadow-xl hover:shadow-green-500/25 active:scale-[0.99]"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-0.5">Capture rapide</h3>
                <p className="text-xs text-white/70">Photo + analyse IA instantanée</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15">
                <Zap className="w-3.5 h-3.5 text-white/80" />
                <span className="text-[10px] font-medium text-white/80">IA</span>
              </div>
            </div>
          </button>
        </div>
        
        {/* Input caché pour capture rapide */}
        <input
          ref={quickCaptureFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              // TODO: Implémenter la capture rapide avec analyse IA
              toast.success('Photo capturée - Analyse IA en cours...');
            }
          }}
        />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="h-full m-0 p-0">
            <UnifiedTimeline
              projectId={projectId}
              sessionId={sessionId}
              onStartCapture={(mode) => {
                if (mode === 'free') {
                  setShowVideoCapture(true);
                } else {
                  setShowPremiumCapture(true);
                }
                setActiveTab('capture');
              }}
            />
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="h-full m-0 p-0">
            <MediaGallery projectId={projectId} sessionId={sessionId} />
          </TabsContent>
        </Tabs>
      </div>
        </>
      )}

      {/* Mode "Pas à pas" - ReportageModule avec les 5 étapes (Lieu → Zone → Problème → Photo → Résumé) */}
      {showStepByStep && (
        <ReportageModule
          projectId={projectId}
          initialMode="pas-a-pas"  // Démarrer directement en mode "pas à pas"
          onClose={() => {
            setShowStepByStep(false);
            if (onClose) {
              onClose();
            }
          }}
        />
      )}

      {/* Mode "Type d'EDL" - PremiumCaptureFlow pour les autres types */}
      <PremiumCaptureFlow 
        open={showPremiumCapture} 
        onOpenChange={(open) => {
          setShowPremiumCapture(open);
          if (!open && onClose) {
            onClose();
          }
        }} 
        projectId={projectId} 
        onSequenceCreated={(sequenceId) => {
          handleSequenceCreated(sequenceId);
          if (onClose) {
            onClose();
          }
        }} 
      />
      <EDLVideoCapture open={showVideoCapture} onOpenChange={setShowVideoCapture} projectId={projectId} sessionId={sessionId} projectName={projectName} onCaptureComplete={() => toast.success('Vidéo enregistrée')} />
      <VoiceNoteDialog open={showVoiceNote} onOpenChange={setShowVoiceNote} projectId={projectId} sessionId={sessionId} onComplete={() => toast.success('Note vocale enregistrée')} />
    </div>
  );
};
