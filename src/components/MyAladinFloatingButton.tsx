import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { MyAladinChat } from "./MyAladinChat";
import { AchievementNotification } from "./AchievementNotification";
import { ContextualTip } from "./ContextualTip";
import { useAchievements } from "@/hooks/useAchievements";
import { useContextualTips } from "@/hooks/useContextualTips";
import { useAppMode } from "@/contexts/AppModeContext";
import { supabase } from "@/integrations/supabase/client";

export const MyAladinFloatingButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { newAchievement, setNewAchievement, initializeAchievements } = useAchievements();
  const { currentTip, dismissTip, setCurrentTip } = useContextualTips();
  const { appMode } = useAppMode();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await initializeAchievements(user.id);
      }
    };
    initUser();
  }, []);

  // Only show in aladin mode
  if (appMode !== 'aladin') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-24 z-[9999]">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 animate-pulse hover:animate-none relative"
          size="icon"
          aria-label="Ouvrir MyAladin"
        >
          <span className="text-2xl">🧞‍♂️</span>
          {currentTip && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500 items-center justify-center">
                <Bell className="h-3 w-3 text-white" />
              </span>
            </span>
          )}
        </Button>
      </div>

      <MyAladinChat
        open={isOpen}
        onOpenChange={setIsOpen}
      />

      <AchievementNotification
        achievement={newAchievement}
        onDismiss={() => setNewAchievement(null)}
      />

      <ContextualTip
        tip={currentTip}
        onDismiss={() => currentTip && dismissTip(currentTip.id)}
      />
    </>
  );
};
