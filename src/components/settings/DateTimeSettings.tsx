import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Maximize2, Minimize2, Globe } from "lucide-react";
import { useClockDisplay, ClockDisplayMode } from "@/hooks/useClockDisplay";
import { Separator } from "@/components/ui/separator";

const timezones = [
  { value: "Pacific/Honolulu", label: "(GMT-10:00) Hawaii" },
  { value: "America/Anchorage", label: "(GMT-09:00) Alaska" },
  { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time" },
  { value: "America/Denver", label: "(GMT-07:00) Mountain Time" },
  { value: "America/Chicago", label: "(GMT-06:00) Central Time" },
  { value: "America/New_York", label: "(GMT-05:00) Eastern Time" },
  { value: "America/Sao_Paulo", label: "(GMT-03:00) Brasilia" },
  { value: "Atlantic/Azores", label: "(GMT-01:00) Azores" },
  { value: "Europe/London", label: "(GMT+00:00) London" },
  { value: "Europe/Paris", label: "(GMT+01:00) Paris, Berlin, Rome" },
  { value: "Europe/Athens", label: "(GMT+02:00) Athens, Cairo" },
  { value: "Europe/Moscow", label: "(GMT+03:00) Moscow, Istanbul" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Dubai, Abu Dhabi" },
  { value: "Asia/Karachi", label: "(GMT+05:00) Islamabad, Karachi" },
  { value: "Asia/Kolkata", label: "(GMT+05:30) Mumbai, New Delhi" },
  { value: "Asia/Dhaka", label: "(GMT+06:00) Dhaka" },
  { value: "Asia/Bangkok", label: "(GMT+07:00) Bangkok, Hanoi" },
  { value: "Asia/Shanghai", label: "(GMT+08:00) Beijing, Shanghai" },
  { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo, Seoul" },
  { value: "Australia/Sydney", label: "(GMT+10:00) Sydney, Melbourne" },
  { value: "Pacific/Auckland", label: "(GMT+12:00) Auckland" },
];

export const DateTimeSettings = () => {
  const [timezone, setTimezone] = useState("Europe/Paris");
  const { clockMode, updateClockMode } = useClockDisplay();
  const [selectedMode, setSelectedMode] = useState<ClockDisplayMode>(clockMode);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTimezone();
  }, []);

  useEffect(() => {
    setSelectedMode(clockMode);
  }, [clockMode]);

  const loadTimezone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('myaladin_preferences')
      .select('timezone')
      .eq('user_id', user.id)
      .single();

    if (data?.timezone) {
      setTimezone(data.timezone);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('myaladin_preferences')
      .upsert({
        user_id: user.id,
        timezone: timezone,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } else {
      await updateClockMode(selectedMode);
      toast({
        title: "Succès",
        description: "Paramètres de date et heure mis à jour",
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Timezone Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Fuseau horaire</h3>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="timezone">Sélectionnez votre fuseau horaire</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Choisir un fuseau horaire" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Clock Display Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Affichage de l'horloge</h3>
        </div>
        
        <div className="space-y-4">
          <Label>Mode d'affichage dans la barre de navigation</Label>
          <RadioGroup value={selectedMode} onValueChange={(value) => setSelectedMode(value as ClockDisplayMode)}>
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="compact" id="compact" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="compact" className="flex items-center gap-2 cursor-pointer">
                  <Minimize2 className="h-4 w-4" />
                  <span className="font-medium">Compact</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Affiche uniquement l'heure (HH:MM)
                </p>
                <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border w-fit">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">14:32</span>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="extended" id="extended" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="extended" className="flex items-center gap-2 cursor-pointer">
                  <Maximize2 className="h-4 w-4" />
                  <span className="font-medium">Étendu</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Affiche la date et l'heure complètes avec secondes
                </p>
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border w-fit">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Lun 24 Nov</span>
                    <span className="text-xs text-muted-foreground">14:32:45</span>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </div>
  );
};
