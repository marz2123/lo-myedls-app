import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, 
  Cloud,
  Sun,
  CloudRain,
  Loader2,
  Plus,
  Save,
  CheckCircle2,
  Zap,
  Building2,
  AlertTriangle,
  ImagePlus
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BureauDailyLogProps {
  projectId: string;
}

interface DailyLog {
  id?: string;
  log_date: string;
  weather?: string;
  companies_present: string[];
  tasks_completed: string[];
  observations?: string;
  problems_encountered?: string;
  urgent_needs?: string;
  photo_urls: string[];
  ai_summary?: string;
  ai_risks?: string;
  ai_suggestions?: string;
  is_validated: boolean;
}

const WEATHER_OPTIONS = [
  { value: 'ensoleille', label: 'Ensoleillé', icon: Sun },
  { value: 'nuageux', label: 'Nuageux', icon: Cloud },
  { value: 'pluvieux', label: 'Pluvieux', icon: CloudRain },
];

export function BureauDailyLog({ projectId }: BureauDailyLogProps) {
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  const [log, setLog] = useState<DailyLog>({
    log_date: format(new Date(), 'yyyy-MM-dd'),
    weather: '',
    companies_present: [],
    tasks_completed: [],
    observations: '',
    problems_encountered: '',
    urgent_needs: '',
    photo_urls: [],
    is_validated: false,
  });

  const [newCompany, setNewCompany] = useState("");
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    loadLog();
  }, [projectId, selectedDate]);

  const loadLog = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('log_date', dateStr)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setLog({
          id: data.id,
          log_date: data.log_date,
          weather: data.weather || '',
          companies_present: data.companies_present || [],
          tasks_completed: data.tasks_completed || [],
          observations: data.observations || '',
          problems_encountered: data.problems_encountered || '',
          urgent_needs: data.urgent_needs || '',
          photo_urls: (data.photo_urls as string[]) || [],
          ai_summary: data.ai_summary || '',
          ai_risks: data.ai_risks || '',
          ai_suggestions: data.ai_suggestions || '',
          is_validated: data.is_validated || false,
        });
      } else {
        // Reset to empty log for new date
        setLog({
          log_date: dateStr,
          weather: '',
          companies_present: [],
          tasks_completed: [],
          observations: '',
          problems_encountered: '',
          urgent_needs: '',
          photo_urls: [],
          is_validated: false,
        });
      }
    } catch (error) {
      console.error('Error loading daily log:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLog = async (validate = false) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const logData = {
        project_id: projectId,
        user_id: user.id,
        log_date: format(selectedDate, 'yyyy-MM-dd'),
        weather: log.weather,
        companies_present: log.companies_present,
        tasks_completed: log.tasks_completed,
        observations: log.observations,
        problems_encountered: log.problems_encountered,
        urgent_needs: log.urgent_needs,
        photo_urls: log.photo_urls,
        ai_summary: log.ai_summary,
        ai_risks: log.ai_risks,
        ai_suggestions: log.ai_suggestions,
        is_validated: validate,
        validated_at: validate ? new Date().toISOString() : null,
        validated_by: validate ? user.id : null,
      };

      if (log.id) {
        const { error } = await supabase
          .from('daily_logs')
          .update(logData)
          .eq('id', log.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert(logData)
          .select()
          .single();
        if (error) throw error;
        setLog(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: validate ? "Journal validé" : "Journal sauvegardé",
        description: validate 
          ? "Le journal du jour a été validé et clôturé"
          : "Les modifications ont été enregistrées",
      });

      if (validate) {
        setLog(prev => ({ ...prev, is_validated: true }));
      }
    } catch (error) {
      console.error('Error saving daily log:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le journal",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateAISummary = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('myaladin-orchestrator', {
        body: {
          action: 'generate_daily_summary',
          projectId,
          context: {
            date: format(selectedDate, 'dd MMMM yyyy', { locale: fr }),
            weather: log.weather,
            companies: log.companies_present,
            tasksCompleted: log.tasks_completed,
            observations: log.observations,
            problems: log.problems_encountered,
            urgentNeeds: log.urgent_needs,
          }
        }
      });

      if (error) throw error;

      setLog(prev => ({
        ...prev,
        ai_summary: data?.summary || '',
        ai_risks: data?.risks || '',
        ai_suggestions: data?.suggestions || '',
      }));

      toast({
        title: "Analyse IA générée",
        description: "La synthèse du jour a été créée par MyAladin",
      });
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la synthèse IA",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const addCompany = () => {
    if (newCompany.trim()) {
      setLog(prev => ({
        ...prev,
        companies_present: [...prev.companies_present, newCompany.trim()]
      }));
      setNewCompany("");
    }
  };

  const removeCompany = (index: number) => {
    setLog(prev => ({
      ...prev,
      companies_present: prev.companies_present.filter((_, i) => i !== index)
    }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setLog(prev => ({
        ...prev,
        tasks_completed: [...prev.tasks_completed, newTask.trim()]
      }));
      setNewTask("");
    }
  };

  const removeTask = (index: number) => {
    setLog(prev => ({
      ...prev,
      tasks_completed: prev.tasks_completed.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {log.is_validated && (
            <Badge className="bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Validé
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => saveLog(false)}
            disabled={saving || log.is_validated}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button 
            onClick={() => saveLog(true)}
            disabled={saving || log.is_validated}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Valider la journée
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Weather */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Météo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {WEATHER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={log.weather === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLog(prev => ({ ...prev, weather: option.value }))}
                      disabled={log.is_validated}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Companies Present */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Entreprises présentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'entreprise"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                  disabled={log.is_validated}
                />
                <Button onClick={addCompany} disabled={log.is_validated}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {log.companies_present.map((company, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => !log.is_validated && removeCompany(index)}
                  >
                    {company}
                    {!log.is_validated && <span className="ml-1">×</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Completed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tâches effectuées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Description de la tâche"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  disabled={log.is_validated}
                />
                <Button onClick={addTask} disabled={log.is_validated}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1">
                {log.tasks_completed.map((task, index) => (
                  <li 
                    key={index}
                    className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded cursor-pointer"
                    onClick={() => !log.is_validated && removeTask(index)}
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {task}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Observations & Problems */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Notes générales</Label>
                <Textarea
                  placeholder="Observations du jour..."
                  value={log.observations}
                  onChange={(e) => setLog(prev => ({ ...prev, observations: e.target.value }))}
                  disabled={log.is_validated}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Problèmes rencontrés
                </Label>
                <Textarea
                  placeholder="Difficultés, blocages, incidents..."
                  value={log.problems_encountered}
                  onChange={(e) => setLog(prev => ({ ...prev, problems_encountered: e.target.value }))}
                  disabled={log.is_validated}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Besoins urgents</Label>
                <Textarea
                  placeholder="Achats, commandes, décisions..."
                  value={log.urgent_needs}
                  onChange={(e) => setLog(prev => ({ ...prev, urgent_needs: e.target.value }))}
                  disabled={log.is_validated}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - AI Analysis */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Analyse IA
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateAISummary}
                  disabled={generatingAI || log.is_validated}
                >
                  {generatingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Générer"
                  )}
                </Button>
              </div>
              <CardDescription>
                Synthèse, risques et suggestions générés par MyAladin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {log.ai_summary ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Synthèse du jour</Label>
                    <p className="text-sm p-3 bg-muted/50 rounded-lg">{log.ai_summary}</p>
                  </div>
                  {log.ai_risks && (
                    <div className="space-y-2">
                      <Label className="text-xs text-amber-600">Risques potentiels</Label>
                      <p className="text-sm p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        {log.ai_risks}
                      </p>
                    </div>
                  )}
                  {log.ai_suggestions && (
                    <div className="space-y-2">
                      <Label className="text-xs text-blue-600">Suggestions</Label>
                      <p className="text-sm p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        {log.ai_suggestions}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Cliquez sur "Générer" pour créer la synthèse IA
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Photos du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {log.photo_urls.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune photo ajoutée
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" disabled={log.is_validated}>
                    Ajouter des photos
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {log.photo_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
