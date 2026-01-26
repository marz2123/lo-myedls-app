import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  family_id: string;
  category_id: string;
  subcategory_id: string;
  confidence: number;
  source: string;
}

interface ClassificationSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  suggestions: Suggestion[];
  taxonomyData: {
    families: any[];
    categories: any[];
    subcategories: any[];
  };
  onUpdate: () => void;
}

export function ClassificationSuggestions({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  suggestions,
  taxonomyData,
  onUpdate
}: ClassificationSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(0);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplySuggestion = async () => {
    const suggestion = suggestions[selectedSuggestion];
    setIsApplying(true);

    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .update({
          family_id: suggestion.family_id,
          category_id: suggestion.category_id,
          subcategory_id: suggestion.subcategory_id
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success("Classification appliquée avec succès");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error("Erreur lors de l'application de la suggestion");
    } finally {
      setIsApplying(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    if (confidence >= 0.6) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'learning':
        return 'Apprentissage';
      case 'exact':
        return 'Correspondance exacte';
      case 'fuzzy':
        return 'Correspondance floue';
      default:
        return 'Base';
    }
  };

  const getTaxonomyInfo = (suggestion: Suggestion) => {
    const family = taxonomyData.families.find(f => f.id === suggestion.family_id);
    const category = taxonomyData.categories.find(c => c.id === suggestion.category_id);
    const subcategory = taxonomyData.subcategories.find(s => s.id === suggestion.subcategory_id);

    return {
      family: family ? `${family.code} - ${family.name}` : 'Non trouvé',
      category: category ? `${category.code} - ${category.name}` : 'Non trouvé',
      subcategory: subcategory ? `${subcategory.code} - ${subcategory.name}` : 'Non trouvé'
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Suggestions de classification
          </DialogTitle>
          <DialogDescription>
            Tâche : <span className="font-medium text-foreground">{taskTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const taxonomyInfo = getTaxonomyInfo(suggestion);
              const isSelected = selectedSuggestion === index;

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedSuggestion(index)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                      <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
                        {Math.round(suggestion.confidence * 100)}% confiance
                      </Badge>
                      <Badge variant="secondary">
                        {getSourceLabel(suggestion.source)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Famille :</span>{' '}
                      <span className="text-foreground">{taxonomyInfo.family}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Catégorie :</span>{' '}
                      <span className="text-foreground">{taxonomyInfo.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Sous-catégorie :</span>{' '}
                      <span className="text-foreground">{taxonomyInfo.subcategory}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleApplySuggestion} disabled={isApplying}>
            {isApplying ? "Application..." : "Appliquer cette classification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
