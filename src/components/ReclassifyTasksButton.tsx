import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReclassifyTasksButtonProps {
  projectId: string;
  onSuccess?: () => void;
}

export function ReclassifyTasksButton({ projectId, onSuccess }: ReclassifyTasksButtonProps) {
  const [isReclassifying, setIsReclassifying] = useState(false);
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  const handleReclassify = async () => {
    setIsReclassifying(true);
    
    try {
      // Find tasks with incomplete classification
      const { data: incompleteTasks, error: fetchError } = await supabase
        .from('extracted_tasks')
        .select('id')
        .eq('project_id', projectId)
        .or('category_id.is.null,subcategory_id.is.null');

      if (fetchError) throw fetchError;

      if (!incompleteTasks || incompleteTasks.length === 0) {
        toast.info(isFrench 
          ? 'Toutes les tâches sont déjà classifiées' 
          : 'All tasks are already classified');
        return;
      }

      console.log(`Found ${incompleteTasks.length} tasks to reclassify`);

      // Call reclassify edge function
      const { data, error } = await supabase.functions.invoke('reclassify-tasks', {
        body: { taskIds: incompleteTasks.map(t => t.id) }
      });

      if (error) throw error;

      console.log('Reclassification result:', data);

      toast.success(isFrench 
        ? `${data.reclassified || 0} tâche(s) re-classifiée(s) avec l'IA` 
        : `${data.reclassified || 0} task(s) reclassified with AI`);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error reclassifying tasks:', error);
      toast.error(isFrench 
        ? 'Erreur lors de la reclassification' 
        : 'Error during reclassification');
    } finally {
      setIsReclassifying(false);
    }
  };

  return (
    <Button
      onClick={handleReclassify}
      disabled={isReclassifying}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isReclassifying ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {isFrench 
        ? isReclassifying ? 'Reclassification IA...' : 'Re-classifier avec IA' 
        : isReclassifying ? 'AI Reclassifying...' : 'Reclassify with AI'}
    </Button>
  );
}
