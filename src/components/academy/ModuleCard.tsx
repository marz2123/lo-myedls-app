import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Clock, Play, CheckCircle2, Lock,
  GraduationCap, FileText, Video, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AcademyModule } from '@/hooks/useAcademy';

interface ModuleCardProps {
  module: AcademyModule;
  progress: number;
  isCompleted: boolean;
  onStart: (module: AcademyModule) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  quick_module: Sparkles,
  norms: FileText,
  video: Video,
  advanced: GraduationCap
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-600',
  intermediate: 'bg-yellow-500/10 text-yellow-600',
  advanced: 'bg-red-500/10 text-red-600'
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé'
};

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  progress,
  isCompleted,
  onStart
}) => {
  const Icon = categoryIcons[module.category] || BookOpen;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={`
        border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer
        hover:border-primary/30 transition-all duration-300
        ${isCompleted ? 'ring-2 ring-green-500/20' : ''}
      `}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`
              p-2.5 rounded-xl shrink-0
              ${isCompleted ? 'bg-green-500/10' : 'bg-primary/10'}
            `}>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Icon className="w-5 h-5 text-primary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">
                  {module.title}
                </h4>
                {isCompleted && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 shrink-0">
                    Terminé
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {module.description}
              </p>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className={difficultyColors[module.difficulty]}>
                  {difficultyLabels[module.difficulty]}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {module.duration_minutes} min
                </div>
              </div>
              
              {progress > 0 && progress < 100 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
              
              <Button 
                size="sm" 
                variant={isCompleted ? "outline" : "default"}
                className="w-full"
                onClick={() => onStart(module)}
              >
                {isCompleted ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Revoir
                  </>
                ) : progress > 0 ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Continuer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Commencer
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
