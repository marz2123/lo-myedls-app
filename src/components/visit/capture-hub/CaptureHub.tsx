import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Settings,
  Zap,
  ZapOff,
  ImagePlus,
  Sparkles,
  Camera,
  SwitchCamera,
} from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useCaptureAI } from './useCaptureAI';
import { AutoFillResultPanel } from './AutoFillResultPanel';
import { toast } from 'sonner';

interface CaptureHubProps {
  projectId?: string;
  onBack: () => void;
  onSettings?: () => void;
}

export function CaptureHub({ projectId, onBack, onSettings }: CaptureHubProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [autoTagEnabled, setAutoTagEnabled] = useState(false);

  const haptic = useHapticFeedback();
  const {
    isAnalyzing,
    lastResult,
    analyzePhoto,
    createDraftResult,
    saveToEDL,
    clearResult,
  } = useCaptureAI(projectId);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    haptic.trigger('recording_start');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply flash effect
    if (flashMode !== 'off') {
      const flashOverlay = document.getElementById('flash-overlay');
      if (flashOverlay) {
        flashOverlay.classList.add('flash-active');
        setTimeout(() => flashOverlay.classList.remove('flash-active'), 150);
      }
    }

    ctx.drawImage(video, 0, 0);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(photoDataUrl);

    // 1) Toujours: ouvrir la fiche de description (mode manuel)
    createDraftResult(photoDataUrl);
    setShowResultPanel(true);

    // 2) Optionnel: lancer l'IA si l'utilisateur l'a activée
    if (autoTagEnabled) {
      const result = await analyzePhoto(photoDataUrl);
      if (result) {
        haptic.trigger('piece_complete');
      }
    }
  }, [flashMode, autoTagEnabled, analyzePhoto, createDraftResult, haptic]);

  const handleImportPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const photoDataUrl = reader.result as string;
        setCapturedPhoto(photoDataUrl);

        createDraftResult(photoDataUrl);
        setShowResultPanel(true);

        if (autoTagEnabled) {
          await analyzePhoto(photoDataUrl);
        }
      };
      reader.readAsDataURL(file);
    },
    [autoTagEnabled, analyzePhoto, createDraftResult]
  );

  const handleSave = useCallback(async (edits?: any, selectedTaskIndices?: number[]) => {
    if (!lastResult) return;

    setIsSaving(true);
    
    // Filter tasks based on selection
    const tasksToSave = selectedTaskIndices 
      ? lastResult.analysis.generated_tasks.filter((_, idx) => selectedTaskIndices.includes(idx))
      : lastResult.analysis.generated_tasks;

    const resultWithFilteredTasks = {
      ...lastResult,
      analysis: {
        ...lastResult.analysis,
        ...edits,
        generated_tasks: tasksToSave,
      },
    };

    const success = await saveToEDL(resultWithFilteredTasks, edits);
    setIsSaving(false);

    if (success) {
      toast.success('Photo enregistrée automatiquement');
      haptic.trigger('zone_complete');
      setShowResultPanel(false);
      setCapturedPhoto(null);
      clearResult();
    } else {
      toast.error('Erreur lors de l\'enregistrement');
      haptic.trigger('error');
    }
  }, [lastResult, saveToEDL, haptic, clearResult]);

  const handleRetake = useCallback(() => {
    setShowResultPanel(false);
    setCapturedPhoto(null);
    clearResult();
  }, [clearResult]);

  const toggleFlash = () => {
    const modes: Array<'auto' | 'on' | 'off'> = ['auto', 'on', 'off'];
    const currentIndex = modes.indexOf(flashMode);
    setFlashMode(modes[(currentIndex + 1) % modes.length]);
    haptic.selectionChanged();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    haptic.selectionChanged();
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Flash overlay */}
      <div 
        id="flash-overlay"
        className="fixed inset-0 bg-white pointer-events-none opacity-0 transition-opacity duration-150 z-50"
        style={{ opacity: 0 }}
      />

      {/* Camera preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'w-full h-full object-cover',
          capturedPhoto && 'hidden'
        )}
      />

      {/* Captured photo preview */}
      {capturedPhoto && (
        <img 
          src={capturedPhoto} 
          alt="Captured" 
          className="w-full h-full object-cover"
        />
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-background/90 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="p-4 rounded-full bg-primary/10"
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Analyse IA en cours</p>
                <p className="text-sm text-muted-foreground">Détection des éléments...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between z-30">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettings}
          className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe z-30">
        {/* IA optionnelle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center mb-4"
        >
          <button
            onClick={() => {
              setAutoTagEnabled(!autoTagEnabled);
              haptic.selectionChanged();
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all',
              autoTagEnabled ? 'bg-primary/90 text-white' : 'bg-white/20 text-white/80'
            )}
          >
            <Sparkles className={cn('h-4 w-4', autoTagEnabled && 'animate-pulse')} />
            <span className="text-sm font-medium">
              {autoTagEnabled ? 'IA activée (auto)' : 'IA (optionnel)'}
            </span>
          </button>
        </motion.div>

        <p className="text-center text-white/60 text-xs mb-4 px-6">
          {autoTagEnabled
            ? "Après la photo, l’IA proposera un contre-avis (modifiable)"
            : 'Photo → description → enregistrer. IA en option.'}
        </p>

        {/* Control buttons row */}
        <div className="flex items-center justify-between px-8 pb-6">
          {/* Flash button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFlash}
            className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          >
            {flashMode === 'off' ? (
              <ZapOff className="h-5 w-5" />
            ) : (
              <Zap className={cn('h-5 w-5', flashMode === 'on' && 'text-yellow-400')} />
            )}
          </Button>

          {/* Capture button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={capturePhoto}
            disabled={isAnalyzing}
            className={cn(
              'relative h-20 w-20 rounded-full transition-all',
              isAnalyzing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Outer ring with pulse animation */}
            <motion.div
              animate={!isAnalyzing ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-4 border-white/80"
            />
            {/* Inner circle */}
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center shadow-lg">
              <Camera className="h-8 w-8 text-primary" />
            </div>
          </motion.button>

          {/* Import button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleImportPhoto}
            className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
        </div>

        {/* Camera switch (secondary) */}
        <div className="flex justify-center pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCamera}
            className="text-white/60 hover:text-white hover:bg-transparent"
          >
            <SwitchCamera className="h-4 w-4 mr-2" />
            <span className="text-xs">Changer caméra</span>
          </Button>
        </div>
      </div>

      {/* Auto-Fill / Manual panel */}
      {lastResult && (
        <AutoFillResultPanel
          analysis={lastResult.analysis}
          isOpen={showResultPanel}
          onClose={() => setShowResultPanel(false)}
          onSave={handleSave}
          onRetake={handleRetake}
          onAddMorePhotos={() => {
            setShowResultPanel(false);
            setCapturedPhoto(null);
          }}
          isSaving={isSaving}
          projectId={projectId}
          mode="manual"
          enableAutoSave={false}
          isAnalyzingAI={isAnalyzing}
          onRunAI={async () => {
            if (!capturedPhoto) return;
            const res = await analyzePhoto(capturedPhoto);
            if (res) {
              haptic.trigger('piece_complete');
              toast.success('Contre-avis IA généré');
            }
          }}
        />
      )}

      {/* Error toast handled by sonner */}
      
      {/* CSS for flash effect */}
      <style>{`
        #flash-overlay.flash-active {
          opacity: 0.8 !important;
        }
        
        .pt-safe {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
