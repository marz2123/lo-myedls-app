import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  linkedItemId?: string;
  linkedItemType?: 'sequence' | 'media' | 'note';
  onSuccess: () => void;
}

export const AddNoteDialog: React.FC<AddNoteDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  linkedItemId,
  linkedItemType,
  onSuccess
}) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Create note with reference to linked item
      const observations = linkedItemId 
        ? `[Lié à ${linkedItemType} ${linkedItemId.slice(0, 8)}]\n\n${note.trim()}`
        : note.trim();

      const { error } = await supabase
        .from('daily_logs')
        .insert({
          project_id: projectId,
          user_id: user.id,
          observations,
          log_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast.success('Note ajoutée');
      setNote('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Ajouter une note
          </DialogTitle>
          <DialogDescription>
            Ajoutez une observation liée à cet élément
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Votre observation..."
            className="min-h-[120px] rounded-xl"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!note.trim() || isSubmitting}
            className="rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
