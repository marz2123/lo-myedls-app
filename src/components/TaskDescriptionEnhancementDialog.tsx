import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  enhancement: string;
}

interface TaskDescriptionEnhancementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    area?: string | null;
    task_families?: { name: string } | null;
    task_categories?: { name: string } | null;
    task_subcategories?: { name: string } | null;
  };
  onUpdate: () => void;
}

export function TaskDescriptionEnhancementDialog({
  open,
  onOpenChange,
  task,
  onUpdate,
}: TaskDescriptionEnhancementDialogProps) {
  const [description, setDescription] = useState(task.description || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-task-description', {
        body: {
          taskTitle: task.title,
          taskDescription: task.description,
          familyName: task.task_families?.name,
          categoryName: task.task_categories?.name,
          subcategoryName: task.task_subcategories?.name,
          location: task.location,
          area: task.area,
        }
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      toast.success("Suggestions générées avec succès");
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error("Erreur lors de la génération des suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySuggestions = () => {
    const selectedTexts = suggestions
      .filter((_, index) => selectedSuggestions.has(index))
      .map(s => s.enhancement);
    
    if (selectedTexts.length > 0) {
      const currentDesc = description.trim();
      const newDesc = currentDesc 
        ? `${currentDesc}\n\n${selectedTexts.join('\n\n')}`
        : selectedTexts.join('\n\n');
      setDescription(newDesc);
      setSelectedSuggestions(new Set());
      toast.success(`${selectedTexts.length} suggestion(s) appliquée(s)`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .update({ description })
        .eq('id', task.id);

      if (error) throw error;

      toast.success("Description enrichie avec succès");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving description:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enrichir la description de la tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Tâche: {task.title}</h3>
            <div className="flex gap-2 mb-4">
              {task.task_families && (
                <Badge variant="outline">{task.task_families.name}</Badge>
              )}
              {task.task_categories && (
                <Badge variant="outline">{task.task_categories.name}</Badge>
              )}
              {task.task_subcategories && (
                <Badge variant="outline">{task.task_subcategories.name}</Badge>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description actuelle</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Entrez la description de la tâche..."
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateSuggestions}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer des suggestions IA
                </>
              )}
            </Button>
            {selectedSuggestions.size > 0 && (
              <Button onClick={applySuggestions} variant="default">
                <Check className="mr-2 h-4 w-4" />
                Appliquer ({selectedSuggestions.size})
              </Button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Suggestions d'enrichissement</h4>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSuggestions.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleSuggestion(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm mb-1">{suggestion.title}</h5>
                      <p className="text-sm text-muted-foreground">{suggestion.enhancement}</p>
                    </div>
                    {selectedSuggestions.has(index) ? (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-muted rounded flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
}
