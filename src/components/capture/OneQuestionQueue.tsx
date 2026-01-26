import { useState, useCallback, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QueuedQuestion {
  id: string;
  title: string;
  description?: string;
  options: Array<{
    label: string;
    value: string;
    variant?: 'default' | 'outline' | 'destructive';
    primary?: boolean;
  }>;
  onAnswer: (value: string) => void;
}

interface OneQuestionQueueProps {
  questions: QueuedQuestion[];
  onQuestionAnswered: (questionId: string, answer: string) => void;
  className?: string;
}

/**
 * OneQuestionQueue - Enforces "1 question at a time" rule
 * 
 * Queues multiple confirmations and presents them one by one
 * Never shows more than one question simultaneously
 */
export const OneQuestionQueue = ({
  questions,
  onQuestionAnswered,
  className,
}: OneQuestionQueueProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get current question
  const currentQuestion = questions[currentIndex];
  const hasQuestions = questions.length > 0;
  const remainingCount = questions.length - currentIndex - 1;

  // Handle answer
  const handleAnswer = useCallback((value: string) => {
    if (currentQuestion) {
      currentQuestion.onAnswer(value);
      onQuestionAnswered(currentQuestion.id, value);
      
      // Move to next question or close
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
      }
    }
  }, [currentQuestion, currentIndex, questions.length, onQuestionAnswered]);

  // Reset when questions change
  useEffect(() => {
    if (questions.length === 0) {
      setCurrentIndex(0);
    }
  }, [questions.length]);

  if (!hasQuestions || !currentQuestion) {
    return null;
  }

  return (
    <AlertDialog open={hasQuestions}>
      <AlertDialogContent className={cn("max-w-sm mx-4 rounded-2xl", className)}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-lg">
            {currentQuestion.title}
          </AlertDialogTitle>
          {currentQuestion.description && (
            <AlertDialogDescription className="text-center">
              {currentQuestion.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          {currentQuestion.options.map((option) => (
            <Button
              key={option.value}
              variant={option.variant || (option.primary ? 'default' : 'outline')}
              onClick={() => handleAnswer(option.value)}
              className={cn(
                "w-full",
                option.primary ? "h-14 text-lg font-semibold" : "h-12"
              )}
            >
              {option.label}
            </Button>
          ))}
        </AlertDialogFooter>

        {/* Progress indicator for multiple questions */}
        {remainingCount > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            {remainingCount} question{remainingCount > 1 ? 's' : ''} restante{remainingCount > 1 ? 's' : ''}
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Hook to manage question queue
 */
export function useQuestionQueue() {
  const [questions, setQuestions] = useState<QueuedQuestion[]>([]);

  const addQuestion = useCallback((question: QueuedQuestion) => {
    setQuestions(prev => [...prev, question]);
  }, []);

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  }, []);

  const clearQuestions = useCallback(() => {
    setQuestions([]);
  }, []);

  const handleQuestionAnswered = useCallback((questionId: string, _answer: string) => {
    removeQuestion(questionId);
  }, [removeQuestion]);

  return {
    questions,
    addQuestion,
    removeQuestion,
    clearQuestions,
    handleQuestionAnswered,
  };
}
