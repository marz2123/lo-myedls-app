import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, AlertCircle, Clock, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface PredictedTask {
  title: string;
  description: string;
  area?: string;
  location?: string;
  priority: "low" | "medium" | "high";
  work_type: "renovation" | "new_build";
  confidence: number;
  reasoning: string;
}

interface TaskPredictionPanelProps {
  projectId: string;
  propertyType: string;
  address: string;
  numberOfUnits?: number;
  onTaskAdded?: () => void;
}

export function TaskPredictionPanel({
  projectId,
  propertyType,
  address,
  numberOfUnits,
  onTaskAdded,
}: TaskPredictionPanelProps) {
  const [predictions, setPredictions] = useState<PredictedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<number>>(new Set());
  const { t } = useLanguage();

  const priorityConfig = {
    low: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock, label: t('priorityLow') },
    medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertCircle, label: t('priorityMedium') },
    high: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle, label: t('priorityHigh') },
  };

  const typeConfig = {
    renovation: { color: "bg-accent/10 text-accent border-accent/20", label: t('renovation') },
    new_build: { color: "bg-primary/10 text-primary border-primary/20", label: t('newBuild') },
  };

  const generatePredictions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-tasks', {
        body: {
          projectId,
          propertyType,
          address,
          numberOfUnits,
        }
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      toast.success(
        t('cancel') === 'Annuler' 
          ? `${data.predictions?.length || 0} tâches prédites générées` 
          : `${data.predictions?.length || 0} predicted tasks generated`
      );
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast.error(
        t('cancel') === 'Annuler' 
          ? "Erreur lors de la génération des prédictions" 
          : "Error generating predictions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const recordFeedback = async (prediction: PredictedTask, accepted: boolean, index: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('task_prediction_feedback')
        .insert([{
          user_id: user.id,
          project_id: projectId,
          predicted_task_data: prediction as any,
          accepted,
          feedback_score: prediction.confidence
        }]);

      if (error) throw error;

      setFeedbackGiven(prev => new Set(prev).add(index));
      toast.success(accepted ? "Merci pour votre retour positif !" : "Merci, nous améliorerons les prédictions");
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  };

  const addTaskFromPrediction = async (prediction: PredictedTask, index: number) => {
    setIsAdding(index);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('extracted_tasks')
        .insert({
          title: prediction.title,
          description: prediction.description,
          area: prediction.area,
          location: prediction.location,
          priority: prediction.priority,
          work_type: prediction.work_type,
          project_id: projectId,
          user_id: user.id,
          source_type: 'ai_prediction',
        });

      if (error) throw error;

      // Record positive feedback when task is added
      await recordFeedback(prediction, true, index);

      toast.success(
        t('cancel') === 'Annuler' 
          ? "Tâche ajoutée avec succès" 
          : "Task added successfully"
      );
      onTaskAdded?.();
      
      // Remove the prediction from the list
      setPredictions(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(
        t('cancel') === 'Annuler' 
          ? "Erreur lors de l'ajout de la tâche" 
          : "Error adding task"
      );
    } finally {
      setIsAdding(null);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-orange-100 text-orange-800 border-orange-200";
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Suggestions prédictives' : 'Predictive Suggestions'}
            </CardTitle>
            <CardDescription>
              {t('cancel') === 'Annuler' 
                ? 'Prochaines tâches probables basées sur votre historique' 
                : 'Likely next tasks based on your history'}
            </CardDescription>
          </div>
          <Button
            onClick={generatePredictions}
            disabled={isLoading}
            size="sm"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('cancel') === 'Annuler' ? 'Analyse...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('cancel') === 'Annuler' ? 'Prédire' : 'Predict'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {predictions.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            {predictions.map((prediction, index) => {
              const PriorityIcon = priorityConfig[prediction.priority].icon;
              
              return (
                <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{prediction.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{prediction.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!feedbackGiven.has(index) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => recordFeedback(prediction, false, index)}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => recordFeedback(prediction, true, index)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => addTaskFromPrediction(prediction, index)}
                          disabled={isAdding === index}
                        >
                          {isAdding === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="mr-1 h-4 w-4" />
                              {t('cancel') === 'Annuler' ? 'Ajouter' : 'Add'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline" className={getConfidenceBadgeColor(prediction.confidence)}>
                        {prediction.confidence}% {t('cancel') === 'Annuler' ? 'confiance' : 'confidence'}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig[prediction.priority].color}>
                        <PriorityIcon className="w-3 h-3 mr-1" />
                        {priorityConfig[prediction.priority].label}
                      </Badge>
                      <Badge variant="outline" className={typeConfig[prediction.work_type].color}>
                        {typeConfig[prediction.work_type].label}
                      </Badge>
                      {prediction.area && (
                        <Badge variant="outline" className="bg-muted">
                          📍 {prediction.area}
                        </Badge>
                      )}
                      {prediction.location && (
                        <Badge variant="outline" className="bg-muted">
                          🏠 {prediction.location}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground italic">
                      💡 {prediction.reasoning}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
