import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, TrendingDown, FolderOpen, CheckSquare, FileText, Award } from "lucide-react";
import { format, startOfMonth, subMonths, subDays, startOfYear, subYears } from "date-fns";

type Period = '7d' | '30d' | '6m' | '1y' | 'all';

interface MonthlyStats {
  month: string;
  projects: number;
  tasks: number;
  projectsChange?: number;
  tasksChange?: number;
}

interface PropertyTypeDistribution {
  name: string;
  value: number;
  color: string;
}

interface Stats {
  totalProjects: number;
  totalTasks: number;
  totalTemplates: number;
  unlockedBadges: number;
  monthlyData: MonthlyStats[];
  propertyDistribution: PropertyTypeDistribution[];
}

export const PersonalStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('6m');
  const { t } = useLanguage();

  const COLORS = {
    building: 'hsl(var(--chart-1))',
    house: 'hsl(var(--chart-2))',
    apartment: 'hsl(var(--chart-3))',
    commercial: 'hsl(var(--chart-4))'
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return { start: subDays(now, 7), months: 0 };
      case '30d':
        return { start: subDays(now, 30), months: 0 };
      case '6m':
        return { start: subMonths(now, 6), months: 6 };
      case '1y':
        return { start: subYears(now, 1), months: 12 };
      case 'all':
        return { start: new Date(0), months: 12 }; // All time, but show last 12 months
      default:
        return { start: subMonths(now, 6), months: 6 };
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, months } = getDateRange();

      // Get total counts (filtered by period for non-"all")
      const baseQuery = period === 'all' 
        ? {} 
        : { gte: { created_at: start.toISOString() } };

      const [projectsResult, tasksResult, templatesResult, achievementsResult] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('extracted_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('custom_templates').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_achievements').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('unlocked', true)
      ]);

      // Get property type distribution
      const { data: projectsByType } = await supabase
        .from('projects')
        .select('property_type')
        .eq('user_id', user.id);

      const propertyTypeLabels: Record<string, string> = {
        building: t('cancel') === 'Annuler' ? 'Immeuble' : 'Building',
        house: t('cancel') === 'Annuler' ? 'Maison' : 'House',
        apartment: t('cancel') === 'Annuler' ? 'Appartement' : 'Apartment',
        commercial: t('cancel') === 'Annuler' ? 'Commercial' : 'Commercial',
      };

      const distribution = (projectsByType || []).reduce((acc, project) => {
        const type = project.property_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const propertyDistribution: PropertyTypeDistribution[] = Object.entries(distribution).map(([type, count]) => ({
        name: propertyTypeLabels[type] || type,
        value: count,
        color: COLORS[type as keyof typeof COLORS] || 'hsl(var(--primary))'
      }));

      // Get monthly data
      const monthsToShow = months || 6;
      const monthlyData: MonthlyStats[] = [];
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
        
        const [projectsInMonth, tasksInMonth] = await Promise.all([
          supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', monthEnd.toISOString()),
          supabase
            .from('extracted_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', monthStart.toISOString())
            .lt('created_at', monthEnd.toISOString())
        ]);

        monthlyData.push({
          month: format(monthStart, 'MMM'),
          projects: projectsInMonth.count || 0,
          tasks: tasksInMonth.count || 0
        });
      }

      // Calculate month-over-month changes
      for (let i = 1; i < monthlyData.length; i++) {
        const current = monthlyData[i];
        const previous = monthlyData[i - 1];
        
        current.projectsChange = previous.projects === 0 
          ? 0 
          : ((current.projects - previous.projects) / previous.projects) * 100;
        
        current.tasksChange = previous.tasks === 0 
          ? 0 
          : ((current.tasks - previous.tasks) / previous.tasks) * 100;
      }

      setStats({
        totalProjects: projectsResult.count || 0,
        totalTasks: tasksResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        unlockedBadges: achievementsResult.count || 0,
        monthlyData,
        propertyDistribution
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const periodLabels: Record<Period, string> = {
    '7d': t('cancel') === 'Annuler' ? '7 jours' : '7 days',
    '30d': t('cancel') === 'Annuler' ? '30 jours' : '30 days',
    '6m': t('cancel') === 'Annuler' ? '6 mois' : '6 months',
    '1y': t('cancel') === 'Annuler' ? '1 an' : '1 year',
    'all': t('cancel') === 'Annuler' ? 'Tout' : 'All time'
  };

  const lastMonth = stats.monthlyData[stats.monthlyData.length - 1];
  const hasChanges = lastMonth && (lastMonth.projectsChange !== undefined || lastMonth.tasksChange !== undefined);

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {(['7d', '30d', '6m', '1y', 'all'] as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('cancel') === 'Annuler' ? 'Projets totaux' : 'Total Projects'}
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {t('cancel') === 'Annuler' ? 'EDLs créés' : 'Created EDLs'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('cancel') === 'Annuler' ? 'Tâches extraites' : 'Extracted Tasks'}
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {t('cancel') === 'Annuler' ? 'Tâches détectées' : 'Detected tasks'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('cancel') === 'Annuler' ? 'Templates créés' : 'Created Templates'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTemplates}</div>
            <p className="text-xs text-muted-foreground">
              {t('cancel') === 'Annuler' ? 'Templates personnalisés' : 'Custom templates'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('cancel') === 'Annuler' ? 'Badges débloqués' : 'Unlocked Badges'}
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unlockedBadges}</div>
            <p className="text-xs text-muted-foreground">
              {t('cancel') === 'Annuler' ? 'Accomplissements' : 'Achievements'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison */}
      {hasChanges && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('cancel') === 'Annuler' ? 'Évolution récente' : 'Recent Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Projets ce mois' : 'Projects this month'}
                  </p>
                  <p className="text-2xl font-bold">{lastMonth.projects}</p>
                </div>
                {lastMonth.projectsChange !== undefined && lastMonth.projectsChange !== 0 && (
                  <div className={`flex items-center gap-1 ${lastMonth.projectsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {lastMonth.projectsChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(lastMonth.projectsChange).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Tâches ce mois' : 'Tasks this month'}
                  </p>
                  <p className="text-2xl font-bold">{lastMonth.tasks}</p>
                </div>
                {lastMonth.tasksChange !== undefined && lastMonth.tasksChange !== 0 && (
                  <div className={`flex items-center gap-1 ${lastMonth.tasksChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {lastMonth.tasksChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(lastMonth.tasksChange).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Type Distribution */}
      {stats.propertyDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('cancel') === 'Annuler' ? 'Répartition par type de bien' : 'Property Type Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.propertyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {stats.propertyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Projects Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle>
              {t('cancel') === 'Annuler' ? 'Projets créés par mois' : 'Projects Created per Month'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="projects" 
                fill="hsl(var(--primary))" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Tasks Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle>
              {t('cancel') === 'Annuler' ? 'Tâches extraites par mois' : 'Tasks Extracted per Month'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="tasks" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
