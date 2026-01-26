import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MissingItemsViewer } from './MissingItemsViewer';
import { useMissingItems } from '@/hooks/useMissingItems';

interface MagicButtonProps {
  projectId: string;
  variant?: 'floating' | 'inline' | 'compact';
  className?: string;
}

export function MagicButton({ 
  projectId, 
  variant = 'floating',
  className 
}: MagicButtonProps) {
  const [open, setOpen] = useState(false);
  const { summary, scanMissingItems } = useMissingItems(projectId);

  const handleClick = () => {
    if (!summary) {
      scanMissingItems();
    }
    setOpen(true);
  };

  const missingCount = summary?.totalMissing || 0;
  const hasBlocking = (summary?.totalBlocking || 0) > 0;

  if (variant === 'floating') {
    return (
      <>
        <motion.div
          className={cn(
            "fixed bottom-6 right-6 z-50 safe-area-bottom",
            className
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <Button
            size="lg"
            onClick={handleClick}
            className={cn(
              "h-14 rounded-full shadow-xl px-5 gap-2 relative",
              hasBlocking
                ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                : "bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90",
              "text-white font-medium"
            )}
          >
            {hasBlocking ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Tout ce qui manque
            {missingCount > 0 && (
              <Badge 
                className={cn(
                  "absolute -top-2 -right-2 h-6 min-w-6 flex items-center justify-center",
                  hasBlocking ? "bg-red-600" : "bg-orange-500"
                )}
              >
                {missingCount}
              </Badge>
            )}
          </Button>
        </motion.div>

        <MissingItemsViewer
          open={open}
          onOpenChange={setOpen}
          projectId={projectId}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className={cn("gap-2 relative", className)}
        >
          <Sparkles className="h-4 w-4" />
          Manquants
          {missingCount > 0 && (
            <Badge 
              variant="destructive"
              className="h-5 min-w-5 text-xs"
            >
              {missingCount}
            </Badge>
          )}
        </Button>

        <MissingItemsViewer
          open={open}
          onOpenChange={setOpen}
          projectId={projectId}
        />
      </>
    );
  }

  // Inline variant
  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        className={cn(
          "w-full justify-between h-auto py-4 px-4 rounded-xl",
          hasBlocking && "border-red-300 bg-red-50/50",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            hasBlocking ? "bg-red-100" : "bg-primary/10"
          )}>
            {hasBlocking ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="text-left">
            <p className="font-medium">Tout ce qui manque</p>
            <p className="text-xs text-muted-foreground">
              {missingCount === 0 
                ? "Aucun élément manquant"
                : `${missingCount} élément${missingCount > 1 ? 's' : ''} à compléter`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {missingCount > 0 && (
            <Badge variant={hasBlocking ? "destructive" : "secondary"}>
              {missingCount}
            </Badge>
          )}
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </Button>

      <MissingItemsViewer
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
      />
    </>
  );
}
