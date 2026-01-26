import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { AchievementBadgeList } from "@/components/AchievementBadgeList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserLevel } from "@/hooks/useUserLevel";

const Achievements = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { userLevel, loading: levelLoading } = useUserLevel();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCheckingAuth(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (checkingAuth || levelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 overflow-y-auto pb-safe">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('cancel') === 'Annuler' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold">
                {t('cancel') === 'Annuler' ? 'Mes Accomplissements' : 'My Achievements'}
              </h1>
              <p className="text-muted-foreground">
                {t('cancel') === 'Annuler' 
                  ? 'Débloquez des badges en utilisant l\'application'
                  : 'Unlock badges by using the application'}
              </p>
            </div>
          </div>

          {userLevel && (
            <Card className={`p-6 bg-gradient-to-r ${userLevel.color} text-white border-none mb-8`}>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{userLevel.icon}</span>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {t('cancel') === 'Annuler' ? 'Niveau' : 'Level'} {userLevel.level}
                  </h2>
                  <p className="text-white/90">
                    {userLevel.points} {t('cancel') === 'Annuler' ? 'points' : 'points'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {userLevel.levelNumber < 5 
                      ? (t('cancel') === 'Annuler' ? 'Progression vers le niveau suivant' : 'Progress to next level')
                      : (t('cancel') === 'Annuler' ? 'Niveau maximum atteint !' : 'Maximum level reached!')}
                  </span>
                  <span className="font-medium">
                    {userLevel.points} / {userLevel.nextLevelPoints}
                  </span>
                </div>
                <Progress value={userLevel.progress} className="h-3 bg-white/30" />
                {userLevel.levelNumber < 5 && (
                  <p className="text-xs text-white/80 mt-2">
                    {t('cancel') === 'Annuler' 
                      ? `Encore ${userLevel.nextLevelPoints - userLevel.points} points pour atteindre le niveau suivant !`
                      : `${userLevel.nextLevelPoints - userLevel.points} more points to reach the next level!`}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        <AchievementBadgeList />
      </div>
    </div>
  );
};

export default Achievements;
