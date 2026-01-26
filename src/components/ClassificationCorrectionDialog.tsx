import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain } from "lucide-react";

interface ClassificationCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  currentFamilyId?: string;
  currentCategoryId?: string;
  currentSubcategoryId?: string;
  onSuccess?: () => void;
}

interface Family {
  id: string;
  code: string;
  name: string;
  task_categories: Category[];
}

interface Category {
  id: string;
  code: string;
  name: string;
  task_subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  code: string;
  name: string;
}

export const ClassificationCorrectionDialog = ({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  taskDescription,
  currentFamilyId,
  currentCategoryId,
  currentSubcategoryId,
  onSuccess
}: ClassificationCorrectionDialogProps) => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(currentFamilyId || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(currentCategoryId || "");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(currentSubcategoryId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTaxonomy();
      setSelectedFamilyId(currentFamilyId || "");
      setSelectedCategoryId(currentCategoryId || "");
      setSelectedSubcategoryId(currentSubcategoryId || "");
    }
  }, [open, currentFamilyId, currentCategoryId, currentSubcategoryId]);

  const loadTaxonomy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_families')
        .select(`
          id,
          code,
          name,
          task_categories (
            id,
            code,
            name,
            task_subcategories (
              id,
              code,
              name
            )
          )
        `)
        .order('code');

      if (error) throw error;
      setFamilies(data || []);
    } catch (error) {
      console.error('Error loading taxonomy:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la nomenclature DSC",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFamily = families.find(f => f.id === selectedFamilyId);
  
  // Regex pour filtrer les placeholders: "Compléments XX", "Poste XX", "Complement XX"
  const placeholderPattern = /^(Compléments?|Complement|Poste)\s*\d*$/i;
  
  // Filtrer les catégories placeholder
  const filteredCategories = selectedFamily?.task_categories?.filter(c => 
    !placeholderPattern.test(c.name)
  ) || [];
  
  const selectedCategory = filteredCategories.find(c => c.id === selectedCategoryId);
  
  // Filtrer les sous-catégories placeholder
  const filteredSubcategories = selectedCategory?.task_subcategories?.filter(sc =>
    !placeholderPattern.test(sc.name)
  ) || [];

  const handleSaveCorrection = async () => {
    if (!selectedFamilyId || !selectedCategoryId || !selectedSubcategoryId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une famille, catégorie et sous-catégorie",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('correct-classification', {
        body: {
          taskId,
          familyId: selectedFamilyId,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId
        }
      });

      if (error) throw error;

      toast({
        title: "Classification corrigee et apprise",
        description: "Cette correction ameliorera les futures classifications automatiques",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving correction:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder la correction",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Corriger la classification DSC
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Tâche à classifier :</h4>
              <p className="font-medium">{taskTitle}</p>
              {taskDescription && (
                <p className="text-sm text-muted-foreground mt-1">{taskDescription}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="family">Famille DSC</Label>
                <Select value={selectedFamilyId} onValueChange={(value) => {
                  setSelectedFamilyId(value);
                  setSelectedCategoryId("");
                  setSelectedSubcategoryId("");
                }}>
                  <SelectTrigger id="family">
                    <SelectValue placeholder="Sélectionner une famille" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map(family => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.code} - {family.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFamily && filteredCategories.length > 0 && (
                <div>
                  <Label htmlFor="category">Catégorie DSC</Label>
                  <Select value={selectedCategoryId} onValueChange={(value) => {
                    setSelectedCategoryId(value);
                    setSelectedSubcategoryId("");
                  }}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedCategory && filteredSubcategories.length > 0 && (
                <div>
                  <Label htmlFor="subcategory">Sous-catégorie DSC</Label>
                  <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Sélectionner une sous-catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map(subcategory => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.code} - {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Annuler
              </Button>
              <Button onClick={handleSaveCorrection} disabled={isSaving || !selectedSubcategoryId}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Brain className="w-4 h-4 mr-2" />
                Corriger et apprendre
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
