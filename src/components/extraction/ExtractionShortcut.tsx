import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Camera, FileText } from "lucide-react";

interface ExtractionShortcutProps {
  projectId: string;
}

export const ExtractionShortcut = ({ projectId }: ExtractionShortcutProps) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Extraction Intelligente</h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez des tâches facilement avec l'IA
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => navigate(`/extract/${projectId}`)}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Texte</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-3 gap-1"
            onClick={() => navigate(`/extract/${projectId}`)}
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Photo</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-3 gap-1 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
            onClick={() => navigate(`/extract/${projectId}`)}
          >
            <Zap className="h-5 w-5 text-yellow-600" />
            <span className="text-xs">Rapide</span>
          </Button>
        </div>

        <Button
          onClick={() => navigate(`/extract/${projectId}`)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ouvrir l'extracteur IA
        </Button>
      </CardContent>
    </Card>
  );
};