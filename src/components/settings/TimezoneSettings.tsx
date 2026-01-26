import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";

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

export const TimezoneSettings = () => {
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTimezone();
  }, []);

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
        description: "Impossible de sauvegarder le fuseau horaire",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Fuseau horaire mis à jour",
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
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

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};
