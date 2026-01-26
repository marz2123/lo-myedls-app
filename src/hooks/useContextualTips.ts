import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Tip {
  id: string;
  tip_type: string;
  context: string;
}

const tipDefinitions: Record<string, string> = {
  first_project: "🎯 Conseil: Commencez par remplir toutes les informations du bien pour une inspection complète !",
  before_task_extraction: "💡 Astuce: Utilisez l'audio pour extraire rapidement vos observations sur site !",
  after_first_task: "📝 Bon début ! Continuez à extraire toutes les tâches que vous observez.",
  photo_upload: "📸 Super ! Les photos aident à documenter visuellement les défauts détectés.",
  template_usage: "✨ Utilisez un template pour structurer vos inspections et ne rien oublier !",
  classification_reminder: "🏗️ N'oubliez pas de classifier vos tâches selon la structure DSC pour l'automatisation !",
  archive_suggestion: "📦 Pensez à archiver vos projets terminés pour mieux organiser votre liste.",
  dashboard_exploration: "📊 Consultez votre tableau de bord pour analyser vos tendances d'inspection !",
  pdf_import: "📄 Vous pouvez importer des rapports PDF de tiers pour extraire automatiquement les tâches !",
  myaladin_help: "🧞‍♂️ MyAladin peut vous aider à tout moment ! Cliquez sur le bouton pour poser des questions.",
};

export const useContextualTips = () => {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);

  const showTip = async (userId: string, tipType: string) => {
    // Check if tip was already shown
    const { data: existing } = await supabase
      .from('contextual_tips')
      .select('*')
      .eq('user_id', userId)
      .eq('tip_type', tipType)
      .single();

    if (existing) return; // Don't show again

    const context = tipDefinitions[tipType];
    if (!context) return;

    // Create tip record
    const { data: newTip } = await supabase
      .from('contextual_tips')
      .insert({
        user_id: userId,
        tip_type: tipType,
        context,
        shown: true,
        shown_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (newTip) {
      setCurrentTip(newTip as Tip);
    }
  };

  const dismissTip = async (tipId: string) => {
    await supabase
      .from('contextual_tips')
      .update({ dismissed: true })
      .eq('id', tipId);
    
    setCurrentTip(null);
  };

  return {
    currentTip,
    showTip,
    dismissTip,
    setCurrentTip,
  };
};
