import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SmartTimeline } from "@/components/visit/SmartTimeline";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

export const MobileTimeline = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select(`
          *,
          projects (
            id,
            address,
            property_type
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error("Erreur lors du chargement");
      navigate('/mobile');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    navigate(`/mobile/export/${sessionId}`);
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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/mobile')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {session.projects?.address || 'Projet'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(session.started_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Smart Timeline */}
      <div className="flex-1">
        {session.project_id && (
          <SmartTimeline
            projectId={session.project_id}
            onEditItem={(type, id) => {
              if (type === 'problem') {
                navigate(`/mobile/block/${id}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
