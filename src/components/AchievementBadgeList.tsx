import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTimezone } from "@/hooks/useTimezone";

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export const AchievementBadgeList = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('unlocked', { ascending: false })
      .order('progress', { ascending: false });

    if (!error && data) {
      setAchievements(data as Achievement[]);
    }
    setLoading(false);
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return <div className="text-center py-8">Chargement des badges...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center gap-4 mb-4">
          <Trophy className="h-8 w-8" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Vos accomplissements</h2>
            <p className="text-white/90">
              {unlockedCount} / {totalCount} badges débloqués
            </p>
          </div>
        </div>
        <Progress value={completionPercentage} className="h-3" />
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`p-4 transition-all ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                  : "bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl relative">
                  {achievement.icon}
                  {!achievement.unlocked && (
                    <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{achievement.achievement_name}</h3>
                    {achievement.unlocked && (
                      <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">
                        Débloqué
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {achievement.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Progression</span>
                      <span className="font-medium">
                        {achievement.progress} / {achievement.target}
                      </span>
                    </div>
                    <Progress
                      value={(achievement.progress / achievement.target) * 100}
                      className="h-2"
                    />
                  </div>
                  {achievement.unlocked && achievement.unlocked_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Débloqué le {formatDateTime(achievement.unlocked_at)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
