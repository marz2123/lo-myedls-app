import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface DSCRecommendation {
  family: { code: string; name: string };
  category: { code: string; name: string };
  subcategory: { code: string; name: string };
  confidence: number;
  reasoning: string;
  source: string;
}

interface DSCRecommendationsPanelProps {
  taskTitle: string;
  taskDescription?: string;
  onRecommendationApplied?: (family: any, category: any, subcategory: any) => void;
}

export function DSCRecommendationsPanel({
  taskTitle,
  taskDescription,
  onRecommendationApplied
}: DSCRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<DSCRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [patternsAnalyzed, setPatternsAnalyzed] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (taskTitle) {
      loadRecommendations();
    }
  }, [taskTitle, taskDescription]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-dsc-recommendations', {
        body: { taskTitle, taskDescription }
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);
      setPatternsAnalyzed(data.totalPatternsAnalyzed || 0);
    } catch (error) {
      console.error('Error loading DSC recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRecommendation = (recommendation: DSCRecommendation) => {
    onRecommendationApplied?.(
      recommendation.family,
      recommendation.category,
      recommendation.subcategory
    );
    toast.success(
      t('cancel') === 'Annuler'
        ? 'Recommandation DSC appliquée'
        : 'DSC recommendation applied'
    );
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          {t('cancel') === 'Annuler' 
            ? 'Recommandations DSC Personnalisées'
            : 'Personalized DSC Recommendations'}
        </CardTitle>
        <CardDescription>
          {t('cancel') === 'Annuler' 
            ? `Basées sur ${patternsAnalyzed} corrections précédentes`
            : `Based on ${patternsAnalyzed} previous corrections`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-background">
                      {rec.confidence.toFixed(0)}% confiance
                    </Badge>
                    <Badge variant="secondary">
                      {rec.source === 'user_learning' 
                        ? (t('cancel') === 'Annuler' ? 'Apprentissage' : 'Learning')
                        : rec.source}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {rec.family.name} / {rec.category.name} / {rec.subcategory.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rec.family.code}/{rec.category.code}/{rec.subcategory.code}
                    </p>
                  </div>
                  
                  <p className="text-xs text-muted-foreground italic">
                    {rec.reasoning}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyRecommendation(rec)}
                  className="gap-2 shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('cancel') === 'Annuler' ? 'Appliquer' : 'Apply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}