import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, HelpCircle, ChevronRight, 
  Trophy, RotateCcw, Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuizQuestion } from '@/hooks/useAcademy';
import confetti from 'canvas-confetti';

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizQuestion[];
  moduleName: string;
  onComplete: (score: number, totalPoints: number) => void;
}

export const QuizDialog: React.FC<QuizDialogProps> = ({
  open,
  onOpenChange,
  questions,
  moduleName,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setIsComplete(false);
    }
  }, [open]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    if (answer === currentQuestion.correct_answer) {
      setScore(prev => prev + currentQuestion.points);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      const finalScore = score + (selectedAnswer === currentQuestion.correct_answer ? currentQuestion.points : 0);
      onComplete(finalScore, totalPoints);
      
      if (finalScore >= totalPoints * 0.7) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsComplete(false);
  };

  if (!currentQuestion && !isComplete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Quiz : {moduleName}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-8"
            >
              <div className={`
                w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
                ${score >= totalPoints * 0.7 ? 'bg-green-500/10' : 'bg-orange-500/10'}
              `}>
                {score >= totalPoints * 0.7 ? (
                  <Trophy className="w-10 h-10 text-green-500" />
                ) : (
                  <RotateCcw className="w-10 h-10 text-orange-500" />
                )}
              </div>
              
              <h3 className="text-2xl font-bold mb-2">
                {score >= totalPoints * 0.7 ? 'Bravo ! 🎉' : 'Presque...'}
              </h3>
              
              <p className="text-muted-foreground mb-4">
                Score : {score} / {totalPoints} points
              </p>
              
              <div className="flex gap-3 justify-center">
                {score < totalPoints * 0.7 && (
                  <Button variant="outline" onClick={handleRetry}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)}>
                  {score >= totalPoints * 0.7 ? 'Continuer' : 'Fermer'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Question {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="text-primary font-medium">
                    {currentQuestion.points} pts
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {currentQuestion.question}
                </h4>
                
                {currentQuestion.image_url && (
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question" 
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}
                
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correct_answer;
                    
                    let bgClass = 'bg-muted/50 hover:bg-muted';
                    if (isAnswered) {
                      if (isCorrect) {
                        bgClass = 'bg-green-500/10 border-green-500';
                      } else if (isSelected && !isCorrect) {
                        bgClass = 'bg-red-500/10 border-red-500';
                      }
                    } else if (isSelected) {
                      bgClass = 'bg-primary/10 border-primary';
                    }
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(option)}
                        disabled={isAnswered}
                        className={`
                          w-full p-3 rounded-lg border text-left transition-all
                          ${bgClass}
                          ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                            ${isAnswered && isCorrect ? 'border-green-500 bg-green-500' : ''}
                            ${isAnswered && isSelected && !isCorrect ? 'border-red-500 bg-red-500' : ''}
                          `}>
                            {isAnswered && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                            {isAnswered && isSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAnswered && currentQuestion.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </motion.div>
              )}

              <Button 
                className="w-full" 
                onClick={handleNext}
                disabled={!isAnswered}
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    Question suivante
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'Voir les résultats'
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
