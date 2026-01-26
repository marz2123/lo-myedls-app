import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectVersion {
  id: string;
  version_number: number;
  snapshot_data: any;
  change_description: string | null;
  created_at: string;
}

interface ProjectVersionHistoryProps {
  projectId: string;
}

export const ProjectVersionHistory = ({ projectId }: ProjectVersionHistoryProps) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error loading versions:', error);
      toast.error('Erreur lors du chargement de l\'historique');
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  };

  const createVersion = async (description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current project state
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      toast.error('Erreur lors de la création de la version');
      return;
    }

    // Get current tasks
    const { data: tasks } = await supabase
      .from('extracted_tasks')
      .select('*')
      .eq('project_id', projectId);

    // Get current version number
    const { data: lastVersion } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersionNumber = (lastVersion?.version_number || 0) + 1;

    const { error } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectId,
        version_number: newVersionNumber,
        snapshot_data: {
          project,
          tasks,
          timestamp: new Date().toISOString()
        },
        change_description: description || `Version ${newVersionNumber}`,
        created_by: user.id
      });

    if (error) {
      console.error('Error creating version:', error);
      toast.error('Erreur lors de la création de la version');
    } else {
      toast.success('Version créée avec succès');
      loadVersions();
    }
  };

  const restoreVersion = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    const confirmed = confirm(`Voulez-vous vraiment restaurer la version ${version.version_number}? Les données actuelles seront écrasées.`);
    if (!confirmed) return;

    // First, create a backup of current state
    await createVersion('Sauvegarde avant restauration');

    // Restore project data
    const { project } = version.snapshot_data;
    const { error: projectError } = await supabase
      .from('projects')
      .update(project)
      .eq('id', projectId);

    if (projectError) {
      toast.error('Erreur lors de la restauration');
      return;
    }

    toast.success(`Version ${version.version_number} restaurée`);
    window.location.reload();
  };

  if (loading) {
    return <div className="animate-pulse">Chargement de l'historique...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des Versions
          </CardTitle>
          <Button onClick={() => createVersion()} size="sm">
            Créer une version
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune version sauvegardée</p>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="p-3 border rounded-lg flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge>Version {version.version_number}</Badge>
                  <span className="text-sm font-medium">
                    {version.change_description}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => restoreVersion(version.id)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};