import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, X, Lightbulb, ChevronRight } from "lucide-react";
import { MyAladinChat } from "./MyAladinChat";
import { AchievementNotification } from "./AchievementNotification";
import { useAchievements } from "@/hooks/useAchievements";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAppMode } from "@/contexts/AppModeContext";

interface CoachTip {
  id: string;
  message: string;
  action?: string;
  context: string;
}

const COACH_TIPS: Record<string, CoachTip[]> = {
  '/': [
    { id: 'welcome', message: "Bienvenue ! Commencez par créer un nouveau projet EDL ou consultez vos projets existants.", context: 'home' },
    { id: 'tip-photos', message: "Astuce : Prenez beaucoup de photos lors de vos visites, l'IA les analysera automatiquement !", context: 'home' },
  ],
  '/project': [
    { id: 'project-docs', message: "Ajoutez des documents (plans, diagnostics) pour que l'IA prépare mieux vos tâches.", context: 'project', action: "Ajouter des documents" },
    { id: 'project-visit', message: "Prêt pour la visite ? Démarrez une session d'enregistrement vidéo/audio.", context: 'project', action: "Démarrer une visite" },
    { id: 'project-extract', message: "Vous pouvez extraire des tâches depuis des photos, texte ou audio.", context: 'project' },
  ],
  '/dashboard': [
    { id: 'dashboard-stats', message: "Consultez vos statistiques pour identifier vos heures les plus productives.", context: 'dashboard' },
  ],
  '/settings': [
    { id: 'settings-timezone', message: "N'oubliez pas de configurer votre fuseau horaire pour des timestamps précis.", context: 'settings' },
  ],
};

export const CoachFloatingButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCoachTip, setShowCoachTip] = useState(false);
  const [currentCoachTip, setCurrentCoachTip] = useState<CoachTip | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const { newAchievement, setNewAchievement, initializeAchievements } = useAchievements();
  const location = useLocation();
  const { appMode } = useAppMode();
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await initializeAchievements(user.id);
        // Load dismissed tips from localStorage
        const stored = localStorage.getItem(`coach-dismissed-${user.id}`);
        if (stored) {
          setDismissedTips(JSON.parse(stored));
        }
      }
    };
    initUser();
  }, []);

  // Show contextual coach tips based on current route
  useEffect(() => {
    if (appMode !== 'classic') return;
    
    // Clear previous timeout
    if (tipTimeoutRef.current) {
      clearTimeout(tipTimeoutRef.current);
    }

    // Find tips for current route
    const routeKey = Object.keys(COACH_TIPS).find(key => 
      location.pathname === key || location.pathname.startsWith(key + '/')
    );
    
    if (routeKey) {
      const tips = COACH_TIPS[routeKey].filter(tip => !dismissedTips.includes(tip.id));
      
      if (tips.length > 0) {
        // Show tip after a short delay
        tipTimeoutRef.current = setTimeout(() => {
          const randomTip = tips[Math.floor(Math.random() * tips.length)];
          setCurrentCoachTip(randomTip);
          setShowCoachTip(true);
          
          // Auto-hide after 10 seconds
          setTimeout(() => {
            setShowCoachTip(false);
          }, 10000);
        }, 3000);
      }
    }

    return () => {
      if (tipTimeoutRef.current) {
        clearTimeout(tipTimeoutRef.current);
      }
    };
  }, [location.pathname, dismissedTips, appMode]);

  const handleDismissTip = async () => {
    if (currentCoachTip) {
      const newDismissed = [...dismissedTips, currentCoachTip.id];
      setDismissedTips(newDismissed);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`coach-dismissed-${user.id}`, JSON.stringify(newDismissed));
      }
    }
    setShowCoachTip(false);
    setCurrentCoachTip(null);
  };

  // Don't render in MyAladin mode
  if (appMode === 'aladin') {
    return null;
  }

  return (
    <>
      {/* Coach Tip Bubble */}
      {showCoachTip && currentCoachTip && (
        <div className="fixed bottom-24 right-6 z-[9998] animate-in slide-in-from-right-5 fade-in duration-300">
          <Card className="p-4 max-w-xs shadow-lg border-primary/20 bg-gradient-to-br from-card to-primary/5 relative">
            <div className="flex items-start gap-3 pr-8">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground mb-2">{currentCoachTip.message}</p>
                {currentCoachTip.action && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-primary text-xs"
                    onClick={() => {
                      setShowCoachTip(false);
                      setIsOpen(true);
                    }}
                  >
                    {currentCoachTip.action}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
              <button
                type="button"
                className="absolute -top-3 -right-3 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-lg border-2 border-background cursor-pointer z-[100]"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDismissTip();
                }}
                style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 relative group"
          size="icon"
          aria-label="Ouvrir MyAladin Coach"
        >
          <Lightbulb className="w-6 h-6 text-white" />
          {(showCoachTip || newAchievement) && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500 items-center justify-center">
                <Bell className="h-3 w-3 text-white" />
              </span>
            </span>
          )}
        </Button>
        
        {/* Coach label */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs bg-card border px-2 py-1 rounded-full shadow-sm text-muted-foreground">
            Coach IA
          </span>
        </div>
      </div>

      <MyAladinChat
        open={isOpen}
        onOpenChange={setIsOpen}
      />

      <AchievementNotification
        achievement={newAchievement}
        onDismiss={() => setNewAchievement(null)}
      />
    </>
  );
};
