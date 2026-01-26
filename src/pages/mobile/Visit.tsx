import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobileVisitRecorder } from "@/components/visit/MobileVisitRecorder";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const MobileVisit = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('edl_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error("Erreur lors du chargement du projet");
      navigate('/mobile');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitComplete = (sessionId: string) => {
    toast.success("Visite terminée et analysée");
    navigate(`/mobile/timeline/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 flex items-center gap-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/mobile')}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{project.address}</h1>
          <p className="text-sm text-muted-foreground">{project.property_type}</p>
        </div>
      </div>

      {/* Recorder */}
      <div className="flex-1">
        <MobileVisitRecorder
          projectId={projectId!}
          onVisitComplete={handleVisitComplete}
        />
      </div>
    </div>
  );
};
