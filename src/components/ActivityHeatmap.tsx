import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface HeatmapData {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  hour: number; // 0-23
  count: number;
}

export const ActivityHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxCount, setMaxCount] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });
  const { t } = useLanguage();

  const isFrench = t('cancel') === 'Annuler';
  
  const daysOfWeek = isFrench 
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    loadHeatmapData();
  }, [dateRange]);

  const loadHeatmapData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Build query with date range filter
    let query = supabase
      .from('extracted_tasks')
      .select('created_at')
      .eq('user_id', user.id);

    if (dateRange?.from) {
      query = query.gte('created_at', dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: tasks } = await query;

    if (!tasks) {
      setLoading(false);
      return;
    }

    // Process tasks into heatmap data
    const activityMap: Record<string, number> = {};
    
    tasks.forEach(task => {
      const date = new Date(task.created_at);
      const day = date.getDay(); // 0-6
      const hour = date.getHours(); // 0-23
      const key = `${day}-${hour}`;
      activityMap[key] = (activityMap[key] || 0) + 1;
    });

    // Convert to array format
    const heatmapArray: HeatmapData[] = [];
    let max = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const count = activityMap[key] || 0;
        heatmapArray.push({ day, hour, count });
        if (count > max) max = count;
      }
    }

    setHeatmapData(heatmapArray);
    setMaxCount(max);
    setLoading(false);
  };

  const getIntensityColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30';
    const intensity = count / maxCount;
    
    if (intensity <= 0.2) return 'bg-primary/20';
    if (intensity <= 0.4) return 'bg-primary/40';
    if (intensity <= 0.6) return 'bg-primary/60';
    if (intensity <= 0.8) return 'bg-primary/80';
    return 'bg-primary';
  };

  const resetDateRange = () => {
    setDateRange({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(new Date()),
    });
  };

  const setPresetRange = (preset: '7d' | '30d' | '3m') => {
    const now = new Date();
    let from: Date;
    
    switch (preset) {
      case '7d':
        from = subDays(now, 7);
        break;
      case '30d':
        from = subDays(now, 30);
        break;
      case '3m':
        from = subMonths(now, 3);
        break;
    }
    
    setDateRange({ from, to: now });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isFrench ? 'Activité hebdomadaire' : 'Weekly Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>
              {isFrench ? 'Heatmap d\'activite' : 'Activity Heatmap'}
            </CardTitle>
            <CardDescription>
              {isFrench 
                ? 'Visualisez vos jours et heures les plus productifs'
                : 'Visualize your most productive days and hours'}
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('7d')}
              >
                {isFrench ? '7j' : '7d'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('30d')}
              >
                {isFrench ? '30j' : '30d'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetRange('3m')}
              >
                {isFrench ? '3m' : '3m'}
              </Button>
            </div>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal gap-2",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM yyyy", { locale: isFrench ? fr : undefined })} -{" "}
                        {format(dateRange.to, "dd MMM yyyy", { locale: isFrench ? fr : undefined })}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy", { locale: isFrench ? fr : undefined })
                    )
                  ) : (
                    <span>{isFrench ? 'Choisir une période' : 'Pick a date range'}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            
            {dateRange && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetDateRange}
                title={isFrench ? 'Réinitialiser' : 'Reset'}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hours header */}
            <div className="flex items-center mb-2">
              <div className="w-12 flex-shrink-0" /> {/* Spacer for day labels */}
              <div className="flex gap-[2px] flex-1">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-[10px] text-muted-foreground min-w-[16px]"
                  >
                    {hour % 3 === 0 ? hour : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap grid */}
            <div className="space-y-[2px]">
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="flex items-center gap-2">
                  <div className="w-12 text-xs text-muted-foreground text-right flex-shrink-0">
                    {daysOfWeek[day]}
                  </div>
                  <div className="flex gap-[2px] flex-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cellData = heatmapData.find(
                        d => d.day === day && d.hour === hour
                      );
                      const count = cellData?.count || 0;
                      
                      return (
                        <div
                          key={hour}
                          className={`flex-1 aspect-square rounded-sm transition-all hover:scale-110 hover:ring-2 hover:ring-primary min-w-[16px] ${getIntensityColor(count)}`}
                          title={`${daysOfWeek[day]} ${hour}h: ${count} ${isFrench ? 'tâche(s)' : 'task(s)'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
              <span>{isFrench ? 'Moins actif' : 'Less active'}</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-muted/30" />
                <div className="w-4 h-4 rounded-sm bg-primary/20" />
                <div className="w-4 h-4 rounded-sm bg-primary/40" />
                <div className="w-4 h-4 rounded-sm bg-primary/60" />
                <div className="w-4 h-4 rounded-sm bg-primary/80" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
              </div>
              <span>{isFrench ? 'Plus actif' : 'More active'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
