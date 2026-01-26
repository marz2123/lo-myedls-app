import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, BookOpen, Target, Flame, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserStats } from '@/hooks/useAcademy';

interface AcademyStatsProps {
  stats: UserStats | null;
  modulesCompleted: number;
  totalModules: number;
}

export const AcademyStats: React.FC<AcademyStatsProps> = ({ 
  stats, 
  modulesCompleted, 
  totalModules 
}) => {
  const xpForNextLevel = ((stats?.current_level || 1) * 500);
  const currentLevelXP = stats?.total_xp ? stats.total_xp % 500 : 0;
  const progressToNextLevel = (currentLevelXP / 500) * 100;

  const statItems = [
    {
      icon: Zap,
      label: 'XP Total',
      value: stats?.total_xp || 0,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      icon: Star,
      label: 'Niveau',
      value: stats?.current_level || 1,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      icon: BookOpen,
      label: 'Modules',
      value: `${modulesCompleted}/${totalModules}`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Target,
      label: 'Quiz Réussis',
      value: stats?.quizzes_passed || 0,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: Flame,
      label: 'Série',
      value: `${stats?.streak_days || 0}j`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Votre Progression</h3>
            <p className="text-sm text-muted-foreground">
              {xpForNextLevel - currentLevelXP} XP pour le niveau suivant
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Niveau {stats?.current_level || 1}</span>
            <span className="text-muted-foreground">Niveau {(stats?.current_level || 1) + 1}</span>
          </div>
          <Progress value={progressToNextLevel} className="h-3" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-xl ${item.bgColor} text-center`}
            >
              <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
              <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
