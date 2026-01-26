import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface BlockCorrectionDialogProps {
  blockId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveComplete: () => void;
}

const ROOM_TYPES = [
  { value: 'kitchen', label: '🍳 Cuisine' },
  { value: 'bathroom', label: '🚿 Salle de bain' },
  { value: 'bedroom', label: '🛏️ Chambre' },
  { value: 'living_room', label: '🛋️ Séjour' },
  { value: 'hallway', label: '🚪 Couloir' },
  { value: 'entrance', label: '🏠 Entrée' },
  { value: 'staircase', label: '🪜 Escalier' },
  { value: 'basement', label: '⬇️ Sous-sol' },
  { value: 'attic', label: '⬆️ Combles' },
  { value: 'facade', label: '🏢 Façade' },
  { value: 'open_space', label: '🏗️ Plateau brut' },
  { value: 'garage', label: '🚗 Garage' },
  { value: 'terrace', label: '🌳 Terrasse' },
  { value: 'balcony', label: '🪴 Balcon' },
  { value: 'cellar', label: '🍷 Cave' },
  { value: 'storage', label: '📦 Rangement' },
  { value: 'unknown', label: '❓ Autre' },
];

export const BlockCorrectionDialog: React.FC<BlockCorrectionDialogProps> = ({
  blockId,
  open,
  onOpenChange,
  onSaveComplete
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualLabel, setManualLabel] = useState('');
  const [detectedRoomType, setDetectedRoomType] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (blockId && open) {
      fetchBlockData();
    }
  }, [blockId, open]);

  const fetchBlockData = async () => {
    if (!blockId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('detected_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (error) throw error;
      
      setManualLabel(data.manual_label || '');
      setDetectedRoomType(data.detected_room_type || 'unknown');
      setNotes(''); // Notes not stored yet, can be added to schema
    } catch (error) {
      console.error('Error fetching block:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du bloc',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!blockId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('detected_blocks')
        .update({
          manual_label: manualLabel || null,
          detected_room_type: detectedRoomType,
        })
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: '✅ Modifications enregistrées',
        description: 'Le bloc a été mis à jour avec succès',
      });

      onSaveComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les modifications',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Corriger les informations du bloc</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="roomType">Type de pièce détecté par l'IA</Label>
              <Select value={detectedRoomType} onValueChange={setDetectedRoomType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="manualLabel">
                Libellé personnalisé (optionnel)
                <span className="text-xs text-muted-foreground ml-2">
                  Ex: "Appartement 12", "Cage escalier B", "Façade avant"...
                </span>
              </Label>
              <Input
                id="manualLabel"
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="Entrez un libellé personnalisé..."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes complémentaires (à venir)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des notes sur cette zone..."
                rows={4}
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Les notes seront disponibles dans une prochaine version
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
