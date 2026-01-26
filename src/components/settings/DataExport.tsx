import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, Loader2 } from "lucide-react";

export const DataExport = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const exportAsJSON = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all user data
      const [projects, tasks, templates] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id),
        supabase.from('extracted_tasks').select('*').eq('user_id', user.id),
        supabase.from('custom_templates').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          exported_at: new Date().toISOString()
        },
        projects: projects.data || [],
        tasks: tasks.data || [],
        templates: templates.data || []
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myedls-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t('cancel') === 'Annuler' ? '✅ Export réussi' : '✅ Export successful',
        description: t('cancel') === 'Annuler'
          ? 'Vos données ont été exportées en JSON'
          : 'Your data has been exported as JSON'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Erreur' : '❌ Error',
        description: t('cancel') === 'Annuler'
          ? 'Impossible d\'exporter les données'
          : 'Failed to export data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAsCSV = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all tasks with project info
      const { data: tasks } = await supabase
        .from('extracted_tasks')
        .select(`
          *,
          projects!inner(address, property_type)
        `)
        .eq('user_id', user.id);

      if (!tasks || tasks.length === 0) {
        toast({
          title: t('cancel') === 'Annuler' ? 'ℹ️ Aucune donnée' : 'ℹ️ No data',
          description: t('cancel') === 'Annuler'
            ? 'Aucune tâche à exporter'
            : 'No tasks to export'
        });
        return;
      }

      // Create CSV content
      const headers = ['Project Address', 'Property Type', 'Task Title', 'Description', 'Location', 'Priority', 'Work Type', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...tasks.map(task => [
          `"${(task as any).projects?.address || ''}"`,
          `"${(task as any).projects?.property_type || ''}"`,
          `"${task.title}"`,
          `"${task.description || ''}"`,
          `"${task.location || ''}"`,
          `"${task.priority || ''}"`,
          `"${task.work_type || ''}"`,
          `"${task.created_at}"`
        ].join(','))
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myedls-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t('cancel') === 'Annuler' ? '✅ Export réussi' : '✅ Export successful',
        description: t('cancel') === 'Annuler'
          ? 'Vos tâches ont été exportées en CSV'
          : 'Your tasks have been exported as CSV'
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Erreur' : '❌ Error',
        description: t('cancel') === 'Annuler'
          ? 'Impossible d\'exporter les données'
          : 'Failed to export data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={exportAsJSON}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t('cancel') === 'Annuler' ? 'Exporter en JSON' : 'Export as JSON'}
        </Button>

        <Button
          onClick={exportAsCSV}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t('cancel') === 'Annuler' ? 'Exporter tâches CSV' : 'Export tasks as CSV'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('cancel') === 'Annuler'
          ? 'JSON inclut tous vos projets, tâches et templates. CSV inclut uniquement les tâches avec détails des projets.'
          : 'JSON includes all your projects, tasks and templates. CSV includes only tasks with project details.'}
      </p>
    </div>
  );
};
