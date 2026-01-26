import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

export const MyAladinNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'low' | 'normal' | 'high'>('normal');
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('myaladin_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setTipsEnabled(data.contextual_tips_enabled);
        setFrequency(data.tip_frequency as 'low' | 'normal' | 'high');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newTipsEnabled: boolean, newFrequency: 'low' | 'normal' | 'high') => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('myaladin_preferences')
        .upsert({
          user_id: user.id,
          contextual_tips_enabled: newTipsEnabled,
          tip_frequency: newFrequency,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: t('cancel') === 'Annuler' ? '✅ Préférences sauvegardées' : '✅ Preferences saved',
        description: t('cancel') === 'Annuler' 
          ? 'Vos préférences de notification ont été mises à jour'
          : 'Your notification preferences have been updated'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('cancel') === 'Annuler' ? '❌ Erreur' : '❌ Error',
        description: t('cancel') === 'Annuler'
          ? 'Impossible de sauvegarder les préférences'
          : 'Failed to save preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTipsToggle = (checked: boolean) => {
    setTipsEnabled(checked);
    savePreferences(checked, frequency);
  };

  const handleFrequencyChange = (value: string) => {
    const newFrequency = value as 'low' | 'normal' | 'high';
    setFrequency(newFrequency);
    savePreferences(tipsEnabled, newFrequency);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tips Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="tips-enabled">
            {t('cancel') === 'Annuler' ? 'Conseils contextuels' : 'Contextual tips'}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('cancel') === 'Annuler'
              ? 'Recevoir des conseils de MyAladin pendant l\'utilisation'
              : 'Receive tips from MyAladin during usage'}
          </p>
        </div>
        <Switch
          id="tips-enabled"
          checked={tipsEnabled}
          onCheckedChange={handleTipsToggle}
          disabled={saving}
        />
      </div>

      {/* Frequency */}
      {tipsEnabled && (
        <div className="space-y-3">
          <Label>
            {t('cancel') === 'Annuler' ? 'Fréquence des conseils' : 'Tip frequency'}
          </Label>
          <RadioGroup value={frequency} onValueChange={handleFrequencyChange} disabled={saving}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="low" />
              <Label htmlFor="low" className="font-normal cursor-pointer">
                {t('cancel') === 'Annuler' ? 'Faible (1-2 par session)' : 'Low (1-2 per session)'}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="normal" />
              <Label htmlFor="normal" className="font-normal cursor-pointer">
                {t('cancel') === 'Annuler' ? 'Normal (3-5 par session)' : 'Normal (3-5 per session)'}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="high" />
              <Label htmlFor="high" className="font-normal cursor-pointer">
                {t('cancel') === 'Annuler' ? 'Élevée (6+ par session)' : 'High (6+ per session)'}
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
