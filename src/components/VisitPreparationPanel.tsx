import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Zone {
  name: string;
  type: string;
  spaces?: { name: string; type: string }[];
}

interface PredictiveTask {
  title: string;
  description: string;
  location_zone: string;
  location_space: string;
  priority: "low" | "medium" | "high";
  work_type: "renovation" | "new_build";
  source_document: string;
  confidence: number;
}

interface VisitPreparation {
  building_structure: {
    zones: Zone[];
  };
  predictive_tasks: PredictiveTask[];
}

interface VisitPreparationPanelProps {
  projectId: string;
  visitPreparation: VisitPreparation | null;
}

export const VisitPreparationPanel = ({ projectId, visitPreparation }: VisitPreparationPanelProps) => {
  const { toast } = useToast();

  if (!visitPreparation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Préparation de la visite
          </CardTitle>
          <CardDescription>
            Aucune préparation disponible. Uploadez des documents pour préparer automatiquement la visite.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAddTask = async (task: PredictiveTask) => {
    const { error } = await supabase.from("extracted_tasks").insert({
      project_id: projectId,
      title: task.title,
      description: task.description,
      area: task.location_zone,
      location: task.location_space,
      priority: task.priority,
      work_type: task.work_type,
      detection_confidence: task.confidence,
      source_type: "document_prediction"
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la tâche",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tâche ajoutée",
        description: "La tâche a été ajoutée au projet",
      });
    }
  };

  const priorityColors = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    high: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="space-y-6">
      {/* Building Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Structure du bâtiment détectée
          </CardTitle>
          <CardDescription>
            Structure préparée à partir des documents pour faciliter la localisation des tâches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visitPreparation.building_structure.zones.map((zone, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">{zone.name}</h4>
                <Badge variant="outline" className="text-xs">{zone.type}</Badge>
              </div>
              {zone.spaces && zone.spaces.length > 0 && (
                <div className="ml-6 space-y-2">
                  <p className="text-sm text-muted-foreground">Espaces détectés:</p>
                  <div className="flex flex-wrap gap-2">
                    {zone.spaces.map((space, spaceIdx) => (
                      <Badge key={spaceIdx} variant="secondary" className="text-xs">
                        {space.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Predictive Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Tâches pré-extraites ({visitPreparation.predictive_tasks.length})
          </CardTitle>
          <CardDescription>
            Tâches identifiées dans les documents avant la visite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visitPreparation.predictive_tasks.map((task, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold">{task.title}</h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={priorityColors[task.priority]}>
                      {task.priority === "high" ? "Haute" : task.priority === "medium" ? "Moyenne" : "Basse"}
                    </Badge>
                    <Badge variant="outline">{task.work_type === "renovation" ? "Rénovation" : "Neuf"}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      Confiance: {task.confidence}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{task.location_zone} • {task.location_space}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Source: {task.source_document}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAddTask(task)}
                  className="shrink-0"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
