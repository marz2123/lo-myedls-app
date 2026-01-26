import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SmartTaskExtractor } from "@/components/extraction/SmartTaskExtractor";
import { QuickCaptureMode } from "@/components/extraction/QuickCaptureMode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";

const QuickExtraction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  if (!id) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/project/${id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au projet
          </Button>
          
          <Button
            onClick={() => setShowQuickCapture(true)}
            className="gap-2"
            variant="outline"
          >
            <Zap className="h-4 w-4" />
            Mode Capture Rapide
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Extraction de Tâches</h1>
            <p className="text-muted-foreground">
              Utilisez l'IA pour extraire automatiquement des tâches depuis du texte, des photos, des vidéos ou de l'audio
            </p>
          </div>

          <SmartTaskExtractor
            projectId={id}
            onTasksExtracted={() => {
              // Optionally refresh or navigate
            }}
          />
        </div>
      </div>

      <QuickCaptureMode
        open={showQuickCapture}
        onOpenChange={setShowQuickCapture}
        projectId={id}
        onTasksExtracted={() => {
          // Optionally refresh
        }}
      />
    </div>
  );
};

export default QuickExtraction;