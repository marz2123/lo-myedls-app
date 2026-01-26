import { useEffect } from 'react';
import { useEmbeddedMode } from '@/hooks/useEmbeddedMode';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { returnToHub, notifyReady, initParentMessaging } from '@/lib/parentMessaging';

interface EmbeddedWrapperProps {
  children: React.ReactNode;
}

export const EmbeddedWrapper = ({ children }: EmbeddedWrapperProps) => {
  const { isEmbedded } = useEmbeddedMode();

  // Initialize parent messaging (ping/pong) and notify ready
  useEffect(() => {
    if (isEmbedded) {
      initParentMessaging();
      notifyReady();
    }
  }, [isEmbedded]);

  const handleReturnToHub = () => {
    returnToHub();
  };

  if (!isEmbedded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Embedded header with return button */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReturnToHub}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Hub
        </Button>
      </div>
      
      {/* Content with top padding for header */}
      <div className="pt-12">
        {children}
      </div>
    </div>
  );
};
