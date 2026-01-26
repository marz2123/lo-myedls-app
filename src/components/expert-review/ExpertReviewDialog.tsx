import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ExpertReviewMode } from './ExpertReviewMode';

interface ExpertReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sessionId?: string;
  onValidated?: () => void;
}

export const ExpertReviewDialog: React.FC<ExpertReviewDialogProps> = ({
  isOpen,
  onClose,
  projectId,
  sessionId,
  onValidated
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <ExpertReviewMode
          projectId={projectId}
          sessionId={sessionId}
          onClose={onClose}
          onValidated={onValidated}
        />
      </SheetContent>
    </Sheet>
  );
};

export default ExpertReviewDialog;
