import { cn } from '@/lib/utils';

interface SimpleHintProps {
  text: string;
  className?: string;
}

/**
 * SimpleHint - Ultra-short contextual hint (1 line max)
 * 
 * Replaces long explanations with concise guidance
 */
export const SimpleHint = ({ text, className }: SimpleHintProps) => {
  return (
    <p className={cn(
      "text-center text-white/70 text-sm",
      "max-w-xs mx-auto truncate",
      className
    )}>
      {text}
    </p>
  );
};
