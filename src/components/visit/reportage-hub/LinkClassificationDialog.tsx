import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Link2, Search, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClassificationItem {
  id: string;
  familyCode: string;
  familyName: string;
  categoryCode: string;
  categoryName: string;
  subcategoryCode: string;
  subcategoryName: string;
}

interface LinkClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  problemId?: string;
  sequenceId?: string;
  itemTitle?: string;
  onSuccess: () => void;
}

export const LinkClassificationDialog: React.FC<LinkClassificationDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  problemId,
  sequenceId,
  itemTitle,
  onSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classifications, setClassifications] = useState<ClassificationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadClassifications();
    }
  }, [open]);

  const loadClassifications = async () => {
    setIsLoading(true);
    try {
      // Load subcategories with their parent categories and families
      const { data: subcategories, error } = await supabase
        .from('task_subcategories')
        .select(`
          id, code, name,
          task_categories!inner (
            id, code, name,
            task_families!inner (
              id, code, name
            )
          )
        `)
        .limit(500);

      if (error) throw error;

      const items: ClassificationItem[] = (subcategories || []).map((sc: any) => ({
        id: sc.id,
        familyCode: sc.task_categories.task_families.code,
        familyName: sc.task_categories.task_families.name,
        categoryCode: sc.task_categories.code,
        categoryName: sc.task_categories.name,
        subcategoryCode: sc.code,
        subcategoryName: sc.name,
      }));

      setClassifications(items);
    } catch (error) {
      console.error('Error loading classifications:', error);
      toast.error('Erreur chargement classifications');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClassifications = useMemo(() => {
    if (!searchQuery.trim()) return classifications.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return classifications
      .filter(c => 
        c.familyCode.toLowerCase().includes(query) ||
        c.familyName.toLowerCase().includes(query) ||
        c.categoryCode.toLowerCase().includes(query) ||
        c.categoryName.toLowerCase().includes(query) ||
        c.subcategoryCode.toLowerCase().includes(query) ||
        c.subcategoryName.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [classifications, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedId) {
      toast.error('Sélectionnez une classification');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const selected = classifications.find(c => c.id === selectedId);
      if (!selected) throw new Error('Classification not found');

      // Get family and category IDs
      const { data: subcategory } = await supabase
        .from('task_subcategories')
        .select(`
          id,
          task_categories!inner (
            id,
            task_families!inner (
              id
            )
          )
        `)
        .eq('id', selectedId)
        .single();

      if (!subcategory) throw new Error('Subcategory not found');

      // If we have a problemId, create a problem_task
      if (problemId) {
        const { error } = await supabase
          .from('problem_tasks')
          .insert({
            project_id: projectId,
            problem_id: problemId,
            title: itemTitle || `Tâche ${selected.subcategoryCode}`,
            family_id: subcategory.task_categories.task_families.id,
            category_id: subcategory.task_categories.id,
            subcategory_id: subcategory.id,
          });

        if (error) throw error;
      } else {
        // Create an extracted_task linked to the sequence
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('extracted_tasks')
          .insert({
            project_id: projectId,
            visit_session_id: sequenceId || null,
            user_id: user?.id,
            title: itemTitle || `Tâche ${selected.subcategoryCode}`,
            family_id: subcategory.task_categories.task_families.id,
            category_id: subcategory.task_categories.id,
            subcategory_id: subcategory.id,
            source_type: 'manual',
          });

        if (error) throw error;
      }

      toast.success('Classification liée');
      setSearchQuery('');
      setSelectedId(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error linking classification:', error);
      toast.error('Erreur lors du lien');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Lier une classification FT/CT/ST
          </DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez une classification DSC
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par code ou nom..."
            className="pl-10 rounded-xl"
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClassifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune classification trouvée
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {filteredClassifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all",
                    selectedId === item.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5">
                      {item.familyCode}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5">
                      {item.categoryCode}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5">
                      {item.subcategoryCode}
                    </Badge>
                    {selectedId === item.id && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-sm truncate">{item.subcategoryName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.familyName} › {item.categoryName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedId || isSubmitting}
            className="rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Lier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
