import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Clock, Play, CheckCircle2, ChevronRight,
  FileText, Video, Sparkles, HelpCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AcademyModule, QuizQuestion } from '@/hooks/useAcademy';
import { QuizDialog } from './QuizDialog';

interface ModuleViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: AcademyModule | null;
  progress: number;
  quizQuestions: QuizQuestion[];
  onComplete: (moduleId: string, score?: number) => void;
}

export const ModuleViewerDialog: React.FC<ModuleViewerDialogProps> = ({
  open,
  onOpenChange,
  module,
  progress,
  quizQuestions,
  onComplete
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [showQuiz, setShowQuiz] = useState(false);
  const [readProgress, setReadProgress] = useState(progress);

  if (!module) return null;

  const content = module.content as Record<string, string[]>;
  const contentKeys = Object.keys(content);

  const handleMarkComplete = () => {
    setReadProgress(100);
    onComplete(module.id);
  };

  const handleQuizComplete = (score: number, total: number) => {
    const percentage = Math.round((score / total) * 100);
    if (percentage >= 70) {
      onComplete(module.id, score);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{module.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {module.duration_minutes} min
                  </Badge>
                  {readProgress >= 100 && (
                    <Badge className="bg-green-500/10 text-green-600 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Terminé
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contenu
              </TabsTrigger>
              {module.video_url && (
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Vidéo
                </TabsTrigger>
              )}
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Quiz
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <div className="space-y-6">
                <p className="text-muted-foreground">{module.description}</p>
                
                {contentKeys.map((key, idx) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 rounded-xl bg-muted/50"
                  >
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </h4>
                    <ul className="space-y-2">
                      {(content[key] || []).map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}

                {readProgress < 100 && (
                  <Button onClick={handleMarkComplete} className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marquer comme terminé
                  </Button>
                )}
              </div>
            </TabsContent>

            {module.video_url && (
              <TabsContent value="video" className="mt-4">
                <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Vidéo tutoriel à venir
                    </p>
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="quiz" className="mt-4">
              <div className="text-center py-8">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Quiz : {module.title}</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {quizQuestions.length} questions • Score minimum 70% pour valider
                </p>
                <Button 
                  onClick={() => setShowQuiz(true)}
                  disabled={quizQuestions.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {quizQuestions.length > 0 ? 'Commencer le quiz' : 'Quiz non disponible'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <QuizDialog
        open={showQuiz}
        onOpenChange={setShowQuiz}
        questions={quizQuestions}
        moduleName={module.title}
        onComplete={handleQuizComplete}
      />
    </>
  );
};
