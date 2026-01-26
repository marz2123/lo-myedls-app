import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AutopilotCapture, 
  AutopilotReport, 
  MyAladinAutopilot, 
  getAladinMessage, 
  getAladinVariant 
} from '@/components/autopilot';
import { useAutopilot } from '@/hooks/useAutopilot';
import { toast } from 'sonner';

const AutopilotPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'capture' | 'report'>('capture');
  const [isRecording, setIsRecording] = useState(false);

  const {
    session,
    segments,
    isProcessing,
    progress,
    startRecording,
    stopRecording,
    validateEDL,
    loadProjectSessions
  } = useAutopilot(projectId || '');

  useEffect(() => {
    if (projectId) {
      loadProjectSessions();
    }
  }, [projectId, loadProjectSessions]);

  // Switch to report tab when analysis is complete
  useEffect(() => {
    if (session?.status === 'ready' || session?.status === 'validated') {
      setActiveTab('report');
    }
  }, [session?.status]);

  const handleStartRecording = async () => {
    const stream = await startRecording();
    if (stream) {
      setIsRecording(true);
    }
    return stream;
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopRecording();
  };

  const handleValidate = async () => {
    await validateEDL();
  };

  const handleEdit = () => {
    toast.info('Mode édition à venir...');
  };

  const handleExportPDF = () => {
    toast.info('Export PDF à venir...');
  };

  const handleExpertReview = () => {
    navigate(`/project/${projectId}/deep-consistency`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/project/${projectId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Autopilot</h1>
                  <p className="text-xs text-muted-foreground">EDL automatique par IA</p>
                </div>
              </div>
            </div>

            <Button variant="ghost" size="icon">
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {/* MyAladin Assistant */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <MyAladinAutopilot
            message={getAladinMessage(progress.phase, progress.currentRoom)}
            isActive={true}
            variant={getAladinVariant(progress.phase)}
          />
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="capture" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="h-4 w-4 mr-2" />
              Capture
            </TabsTrigger>
            <TabsTrigger 
              value="report" 
              disabled={!session || session.status === 'recording'}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Rapport
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="capture" className="mt-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Instructions Card */}
                {!isRecording && progress.phase === 'idle' && (
                  <Card className="mb-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        Comment utiliser l'Autopilot
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-primary">1.</span>
                          Appuyez sur "Démarrer Autopilot"
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-primary">2.</span>
                          Filmez chaque pièce lentement (30-60 secondes par pièce)
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-primary">3.</span>
                          L'IA détecte automatiquement les transitions de pièces
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-primary">4.</span>
                          Appuyez sur "Arrêter et Analyser" quand vous avez terminé
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-primary">5.</span>
                          L'IA génère automatiquement l'EDL complet
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Capture Component */}
                <AutopilotCapture
                  isRecording={isRecording}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  progress={progress}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="report" className="mt-0">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {session && (session.status === 'ready' || session.status === 'validated') ? (
                  <AutopilotReport
                    session={session}
                    segments={segments}
                    onValidate={handleValidate}
                    onEdit={handleEdit}
                    onExportPDF={handleExportPDF}
                    onExpertReview={handleExpertReview}
                  />
                ) : (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Aucun rapport disponible. Effectuez d'abord une capture Autopilot.
                    </p>
                  </Card>
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
};

export default AutopilotPage;
