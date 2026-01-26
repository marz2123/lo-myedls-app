import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { PredictiveForecast } from '@/types/predictive';

interface ForecastChartProps {
  forecast: PredictiveForecast | null;
  isLoading?: boolean;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Projection de Dégradation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Generate chart data from forecast
  const chartData = forecast ? [
    { 
      name: 'Aujourd\'hui', 
      score: 100 - (forecast.next_6months?.expected_degradation || 0) / 2,
      cost: 0
    },
    { 
      name: '6 mois', 
      score: forecast.next_6months?.projected_score || 85,
      cost: forecast.next_6months?.estimated_maintenance_cost || 0
    },
    { 
      name: '12 mois', 
      score: forecast.next_12months?.projected_score || 80,
      cost: forecast.next_12months?.estimated_maintenance_cost || 0
    },
    { 
      name: '24 mois', 
      score: forecast.next_24months?.projected_score || 72,
      cost: forecast.next_24months?.estimated_maintenance_cost || 0
    },
    { 
      name: '5 ans', 
      score: forecast.next_5years?.projected_score || 60,
      cost: forecast.next_5years?.estimated_maintenance_cost || 0
    }
  ] : [
    { name: 'Aujourd\'hui', score: 85, cost: 0 },
    { name: '6 mois', score: 82, cost: 500 },
    { name: '12 mois', score: 78, cost: 1200 },
    { name: '24 mois', score: 72, cost: 3500 },
    { name: '5 ans', score: 60, cost: 8000 }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            Score: <span className="font-medium">{payload[0].value}%</span>
          </p>
          {payload[0].payload.cost > 0 && (
            <p className="text-sm text-muted-foreground">
              Coût cumulé: {payload[0].payload.cost.toLocaleString()}€
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Projection de l'État du Bien
          </CardTitle>
          {forecast && (
            <Badge variant="outline">
              Confiance: {Math.round(forecast.confidence_score || 75)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Danger zone reference */}
              <ReferenceLine 
                y={60} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5" 
                label={{ 
                  value: 'Zone à risque', 
                  fill: 'hsl(var(--destructive))',
                  fontSize: 10,
                  position: 'right'
                }} 
              />
              
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast Insights */}
        {forecast && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {forecast.recommendations?.slice(0, 2).map((rec, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{rec.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
                <p className="text-xs mt-1">
                  Délai: {rec.recommended_timeframe} | 
                  Coût: {rec.estimated_cost.toLocaleString()}€
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
