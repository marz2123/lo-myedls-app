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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MarkAsProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sequenceId?: string;
  locationId?: string;
  initialTitle?: string;
  initialDescription?: string;
  onSuccess: () => void;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Faible', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'medium', label: 'Moyen', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'high', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-300' },
];

const URGENCY_OPTIONS = [
  { value: 'normale', label: 'Normale' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critique', label: 'Critique' },
];

export const MarkAsProblemDialog: React.FC<MarkAsProblemDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  sequenceId,
  locationId,
  initialTitle = '',
  initialDescription = '',
  onSuccess
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [severity, setSeverity] = useState('medium');
  const [urgency, setUrgency] = useState('normale');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('identified_problems')
        .insert({
          project_id: projectId,
          sequence_id: sequenceId || null,
          location_id: locationId || null,
          title: title.trim(),
          description: description.trim() || null,
          severity,
          urgence: urgency,
          is_confirmed: true,
          ai_detected: false,
        });

      if (error) throw error;

      toast.success('Problème identifié');
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setUrgency('normale');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating problem:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Identifiez un problème détecté lors de la visite
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre du problème *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fissure mur salon"
              className="rounded-xl"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails supplémentaires..."
              className="min-h-[80px] rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Gravité</Label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeverity(option.value)}
                  className="flex-1"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-full justify-center py-2 cursor-pointer transition-all",
                      severity === option.value
                        ? option.color
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Urgence</Label>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setUrgency(option.value)}
                  className="flex-1"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-full justify-center py-2 cursor-pointer transition-all",
                      urgency === option.value
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
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
            disabled={!title.trim() || isSubmitting}
            className="rounded-xl bg-amber-500 hover:bg-amber-600"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Signaler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
