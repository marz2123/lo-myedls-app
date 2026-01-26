import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ValidationIssue {
  id: string;
  type: 'completeness' | 'technical' | 'redaction' | 'info';
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  suggestion?: string;
  elementId?: string;
  elementType?: string;
  roomName?: string;
  autoFixable: boolean;
  status?: 'pending' | 'fixed' | 'ignored';
}

export interface ValidationResult {
  score: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  completenessIssues: ValidationIssue[];
  technicalIssues: ValidationIssue[];
  redactionIssues: ValidationIssue[];
  summary: {
    totalRooms: number;
    completedRooms: number;
    totalPhotos: number;
    totalAnomalies: number;
    totalTasks: number;
    missingDescriptions: number;
    missingPhotos: number;
  };
  readyForSignature: boolean;
}

export interface EDLData {
  rooms: any[];
  items: any[];
  photos: any[];
  anomalies: any[];
  tasks: any[];
  descriptions: any[];
}

export function useExpertReview() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  const validateEDL = useCallback(async (projectId: string, sessionId?: string) => {
    setIsValidating(true);
    try {
      // Fetch EDL data from various tables
      const [roomsRes, anomaliesRes, tasksRes, framesRes] = await Promise.all([
        supabase.from('property_locations').select('*').eq('project_id', projectId),
        supabase.from('detected_anomalies').select('*').eq('project_id', projectId),
        supabase.from('extracted_tasks').select('*').eq('project_id', projectId),
        sessionId ? supabase.from('extracted_frames').select('*').eq('visit_session_id', sessionId) : Promise.resolve({ data: [] })
      ]);

      const edlData: EDLData = {
        rooms: roomsRes.data || [],
        items: [],
        photos: framesRes.data || [],
        anomalies: anomaliesRes.data || [],
        tasks: tasksRes.data || [],
        descriptions: (tasksRes.data || []).map((t: any) => ({ id: t.id, text: t.description }))
      };

      const { data, error } = await supabase.functions.invoke('validate-edl', {
        body: { edlData, projectId, sessionId }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Add status to all issues
      const result: ValidationResult = {
        ...data,
        completenessIssues: (data.completenessIssues || []).map((i: ValidationIssue) => ({ ...i, status: 'pending' })),
        technicalIssues: (data.technicalIssues || []).map((i: ValidationIssue) => ({ ...i, status: 'pending' })),
        redactionIssues: (data.redactionIssues || []).map((i: ValidationIssue) => ({ ...i, status: 'pending' }))
      };

      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erreur lors de la validation');
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const applyFix = useCallback(async (issue: ValidationIssue) => {
    if (!issue.autoFixable || !issue.suggestion) {
      toast.error('Cette correction ne peut pas être appliquée automatiquement');
      return false;
    }

    setIsApplyingFix(true);
    try {
      // Apply fix based on issue type
      if (issue.type === 'redaction' && issue.elementId) {
        await supabase
          .from('extracted_tasks')
          .update({ description: issue.suggestion })
          .eq('id', issue.elementId);
      }

      // Update issue status
      setValidationResult(prev => {
        if (!prev) return prev;
        const updateIssues = (issues: ValidationIssue[]) =>
          issues.map(i => i.id === issue.id ? { ...i, status: 'fixed' as const } : i);

        return {
          ...prev,
          completenessIssues: updateIssues(prev.completenessIssues),
          technicalIssues: updateIssues(prev.technicalIssues),
          redactionIssues: updateIssues(prev.redactionIssues)
        };
      });

      toast.success('Correction appliquée');
      return true;
    } catch (error) {
      console.error('Apply fix error:', error);
      toast.error('Erreur lors de la correction');
      return false;
    } finally {
      setIsApplyingFix(false);
    }
  }, []);

  const ignoreIssue = useCallback((issueId: string) => {
    setValidationResult(prev => {
      if (!prev) return prev;
      const updateIssues = (issues: ValidationIssue[]) =>
        issues.map(i => i.id === issueId ? { ...i, status: 'ignored' as const } : i);

      return {
        ...prev,
        completenessIssues: updateIssues(prev.completenessIssues),
        technicalIssues: updateIssues(prev.technicalIssues),
        redactionIssues: updateIssues(prev.redactionIssues)
      };
    });
    toast.info('Problème ignoré');
  }, []);

  const applyAllFixes = useCallback(async () => {
    if (!validationResult) return;

    const fixableIssues = [
      ...validationResult.completenessIssues,
      ...validationResult.technicalIssues,
      ...validationResult.redactionIssues
    ].filter(i => i.autoFixable && i.status === 'pending');

    for (const issue of fixableIssues) {
      await applyFix(issue);
    }

    toast.success(`${fixableIssues.length} corrections appliquées`);
  }, [validationResult, applyFix]);

  const getActiveIssuesCount = useCallback(() => {
    if (!validationResult) return 0;
    return [
      ...validationResult.completenessIssues,
      ...validationResult.technicalIssues,
      ...validationResult.redactionIssues
    ].filter(i => i.status === 'pending').length;
  }, [validationResult]);

  const canSign = useCallback(() => {
    if (!validationResult) return false;
    const activeIssues = [
      ...validationResult.completenessIssues,
      ...validationResult.technicalIssues
    ].filter(i => i.status === 'pending' && i.severity !== 'info');
    return activeIssues.length === 0;
  }, [validationResult]);

  return {
    validationResult,
    isValidating,
    isApplyingFix,
    validateEDL,
    applyFix,
    ignoreIssue,
    applyAllFixes,
    getActiveIssuesCount,
    canSign
  };
}
