import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CheckCircle2, AlertTriangle, MapPin, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CoverageBadgeProps {
  projectId: string;
  className?: string;
}

interface CoverageSummary {
  totalParties: number;
  coveredParties: number;
  totalLieux: number;
  coveredLieux: number;
  completionPercent: number;
}

export const CoverageBadge: React.FC<CoverageBadgeProps> = ({
  projectId,
  className,
}) => {
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoverage();
  }, [projectId]);

  const loadCoverage = async () => {
    try {
      // Get all parts for the project
      const { data: parts } = await supabase
        .from('property_parts')
        .select('id, name, part_type')
        .eq('project_id', projectId);

      // Get all locations for the project
      const { data: locations } = await supabase
        .from('property_locations')
        .select('id, name, part_id')
        .eq('project_id', projectId);

      // Get all sequences to determine what's been covered
      const { data: sequences } = await supabase
        .from('visit_sequences')
        .select('location_id, part_id, endroit_name')
        .eq('project_id', projectId)
        .eq('status', 'completed');

      const totalParties = parts?.length || 0;
      const totalLieux = locations?.length || 0;

      // Find covered items
      const coveredLocationIds = new Set(sequences?.map(s => s.location_id).filter(Boolean));
      const coveredPartIds = new Set(sequences?.map(s => s.part_id).filter(Boolean));

      // Count covered parties (by part_id match or location)
      const coveredParties = parts?.filter(p => 
        coveredPartIds.has(p.id) || 
        locations?.some(l => l.part_id === p.id && coveredLocationIds.has(l.id))
      ).length || 0;

      const coveredLieux = locations?.filter(l => coveredLocationIds.has(l.id)).length || 0;

      // Calculate completion
      const total = totalParties + totalLieux;
      const covered = coveredParties + coveredLieux;
      const completionPercent = total > 0 ? Math.round((covered / total) * 100) : 0;

      setCoverage({
        totalParties,
        coveredParties,
        totalLieux,
        coveredLieux,
        completionPercent,
      });
    } catch (error) {
      console.error('Error loading coverage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Badge variant="outline" className={cn("animate-pulse", className)}>
        <MapPin className="h-3 w-3 mr-1" />
        ...
      </Badge>
    );
  }

  if (!coverage || (coverage.totalParties === 0 && coverage.totalLieux === 0)) {
    return null;
  }

  const isComplete = coverage.completionPercent >= 100;
  const isAlmostComplete = coverage.completionPercent >= 80;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-7 px-2 gap-1.5 rounded-full",
            isComplete && "bg-green-500/10 text-green-600 hover:bg-green-500/20",
            isAlmostComplete && !isComplete && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
            !isAlmostComplete && "bg-muted",
            className
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-medium">
            Visite {coverage.completionPercent}%
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Couverture de visite</h4>
            <Badge 
              variant={isComplete ? 'default' : 'secondary'}
              className={cn(isComplete && 'bg-green-500')}
            >
              {coverage.completionPercent}%
            </Badge>
          </div>
          
          <Progress value={coverage.completionPercent} className="h-2" />
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Parties</span>
              <span className="font-medium">
                {coverage.coveredParties}/{coverage.totalParties}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lieux</span>
              <span className="font-medium">
                {coverage.coveredLieux}/{coverage.totalLieux}
              </span>
            </div>
          </div>

          {coverage.completionPercent < 100 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600">
                {coverage.totalParties - coverage.coveredParties} partie(s) et{' '}
                {coverage.totalLieux - coverage.coveredLieux} lieu(x) non visités
              </p>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-600">
                Visite complète !
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
