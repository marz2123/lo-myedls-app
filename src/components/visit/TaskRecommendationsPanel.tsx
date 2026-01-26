import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Plus, X } from "lucide-react";

interface TaskRecommendation {
  id: string;
  recommended_task_title: string;
  recommended_task_description: string;
  recommendation_reason: string;
  confidence_score: number;
  priority: string;
  estimated_cost_range: any;
  is_accepted: boolean;
}

interface TaskRecommendationsPanelProps {
  projectId: string;
  onTaskAdded?: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

export const TaskRecommendationsPanel = ({ projectId, onTaskAdded }: TaskRecommendationsPanelProps) => {
  const [recommendations, setRecommendations] = useState<TaskRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [projectId]);

  const loadRecommendations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('task_recommendations')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_accepted', false)
      .order('priority', { ascending: false })
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Error loading recommendations:', error);
    } else {
      setRecommendations((data || []) as TaskRecommendation[]);
    }
    setLoading(false);
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-task-recommendations', {
        body: { projectId }
      });

      if (error) throw error;

      toast.success('Recommandations générées avec succès');
      loadRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Erreur lors de la génération des recommandations');
    } finally {
      setGenerating(false);
    }
  };

  const acceptRecommendation = async (recommendationId: string) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create task from recommendation
    const { error: taskError } = await supabase
      .from('extracted_tasks')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: recommendation.recommended_task_title,
        description: recommendation.recommended_task_description,
        source_type: 'ai_recommendation',
        priority: recommendation.priority,
        detection_confidence: recommendation.confidence_score
      });

    if (taskError) {
      toast.error('Erreur lors de la création de la tâche');
      return;
    }

    // Mark recommendation as accepted
    const { error: updateError } = await supabase
      .from('task_recommendations')
      .update({
        is_accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq('id', recommendationId);

    if (updateError) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }

    toast.success('Tâche ajoutée depuis la recommandation');
    loadRecommendations();
    onTaskAdded?.();
  };

  const dismissRecommendation = async (recommendationId: string) => {
    const { error } = await supabase
      .from('task_recommendations')
      .delete()
      .eq('id', recommendationId);

    if (error) {
      toast.error('Erreur lors du rejet');
    } else {
      toast.success('Recommandation rejetée');
      loadRecommendations();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Recommandations IA ({recommendations.length})
          </CardTitle>
          <Button
            onClick={generateRecommendations}
            disabled={generating}
            size="sm"
            variant="outline"
          >
            {generating ? "Génération..." : "Générer"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="animate-pulse">Chargement...</div>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune recommandation disponible. Cliquez sur "Générer" pour obtenir des suggestions.
          </p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[rec.priority]}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{rec.recommended_task_title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rec.recommended_task_description}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Raison: {rec.recommendation_reason}</p>
                    <p>Cout estime: {rec.estimated_cost_range?.min || 0}EUR - {rec.estimated_cost_range?.max || 0}EUR</p>
                    <p>Confiance: {(rec.confidence_score * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptRecommendation(rec.id)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter cette tâche
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismissRecommendation(rec.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};