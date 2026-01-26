import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ARMeasurement } from "@/components/mobile/ARMeasurement";

export const MobileCorrection = () => {
  const { blockId } = useParams<{ blockId: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [blockId]);

  const loadData = async () => {
    if (!blockId) return;

    try {
      // Load block
      const { data: blockData, error: blockError } = await supabase
        .from('detected_blocks')
        .select('*')
        .eq('id', blockId)
        .single();

      if (blockError) throw blockError;
      setBlock(blockData);

      // Load tasks + taxonomie DTC
      const [{ data: tasksData, error: tasksError }, ftRes, ctRes, scRes] = await Promise.all([
        supabase
          .from('extracted_tasks')
          .select('*')
          .eq('block_id', blockId),
        supabase.from('ft_familles').select('id, ft_code, ft_label'),
        supabase.from('ct_categories').select('id, ct_code, ct_label'),
        supabase.from('sc_sous_categories').select('id, sc_code, sc_label'),
      ]);

      if (tasksError) throw tasksError;

      const ftMap = new Map(ftRes.data?.map(ft => [ft.id, ft]) || []);
      const ctMap = new Map(ctRes.data?.map(ct => [ct.id, ct]) || []);
      const scMap = new Map(scRes.data?.map(sc => [sc.id, sc]) || []);

      const mappedTasks = (tasksData || []).map((t: any) => {
        const ft = t.family_id ? ftMap.get(t.family_id) : null;
        const ct = t.category_id ? ctMap.get(t.category_id) : null;
        const sc = t.subcategory_id ? scMap.get(t.subcategory_id) : null;
        return {
          ...t,
          task_families: ft ? { name: ft.ft_label, code: ft.ft_code } : null,
          task_categories: ct ? { name: ct.ct_label, code: ct.ct_code } : null,
          task_subcategories: sc ? { name: sc.sc_label, code: sc.sc_code } : null,
        };
      });

      setTasks(mappedTasks);

      // Load taxonomy (familles) DTC
      const familiesData = ftRes.data || [];
      setFamilies(familiesData as any);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Erreur lors du chargement");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Tâche mise à jour");
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('extracted_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Tâche supprimée");
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleAddTask = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from('extracted_tasks')
        .insert({
          block_id: blockId,
          user_id: user.id,
          title: "Nouvelle tâche",
          description: "",
        });

      if (error) throw error;
      toast.success("Tâche ajoutée");
      loadData();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleSaveBlock = async () => {
    if (!block) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('detected_blocks')
        .update({
          manual_label: block.manual_label,
          detected_room_type: block.detected_room_type,
        })
        .eq('id', blockId);

      if (error) throw error;
      toast.success("Modifications enregistrées");
      navigate(-1);
    } catch (error) {
      console.error('Error saving block:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
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

  if (!block) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto pb-safe">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Correction Bloc {block.block_number}</h1>
          </div>
          <Button
            onClick={handleSaveBlock}
            disabled={saving}
            size="icon"
          >
            <Save className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-20">
          {/* Block Info */}
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Informations du bloc</h2>
            <div className="space-y-4">
              <div>
                <Label>Nom personnalisé</Label>
                <Input
                  value={block.manual_label || ""}
                  onChange={(e) => setBlock({ ...block, manual_label: e.target.value })}
                  placeholder="Ex: Séjour futur Appart 2"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Type de pièce</Label>
                <Select
                  value={block.detected_room_type || "unknown"}
                  onValueChange={(value) => setBlock({ ...block, detected_room_type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="living_room">Séjour</SelectItem>
                    <SelectItem value="bedroom">Chambre</SelectItem>
                    <SelectItem value="kitchen">Cuisine</SelectItem>
                    <SelectItem value="bathroom">Salle de bain</SelectItem>
                    <SelectItem value="toilet">WC</SelectItem>
                    <SelectItem value="hallway">Couloir</SelectItem>
                    <SelectItem value="staircase">Escalier</SelectItem>
                    <SelectItem value="facade">Façade</SelectItem>
                    <SelectItem value="balcony">Balcon</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="cellar">Cave</SelectItem>
                    <SelectItem value="attic">Combles</SelectItem>
                    <SelectItem value="technical">Technique</SelectItem>
                    <SelectItem value="unknown">Zone non définie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* AR Measurements */}
          <ARMeasurement
            blockId={blockId}
            onMeasurementComplete={(measurement) => {
              setBlock({ 
                ...block, 
                volume_data: measurement 
              });
              toast.success("Mesures enregistrées dans le bloc");
            }}
          />

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Tâches ({tasks.length})</h2>
              <Button
                onClick={handleAddTask}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <Label>Titre</Label>
                      <Input
                        value={task.title}
                        onChange={(e) => handleUpdateTask(task.id, { title: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={task.description || ""}
                        onChange={(e) => handleUpdateTask(task.id, { description: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        placeholder="m², ml, unité..."
                        className="mt-2"
                      />
                    </div>
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
