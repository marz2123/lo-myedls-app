import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle2, AlertTriangle, AlertCircle, Info,
  Loader2, Sparkles, FileCheck, PenLine, Award, ArrowLeft,
  RefreshCw, Check, X, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useExpertReview, ValidationIssue } from '@/hooks/useExpertReview';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpertReviewModeProps {
  projectId: string;
  sessionId?: string;
  onClose: () => void;
  onValidated?: () => void;
}

export const ExpertReviewMode: React.FC<ExpertReviewModeProps> = ({
  projectId,
  sessionId,
  onClose,
  onValidated
}) => {
  const {
    validationResult,
    isValidating,
    isApplyingFix,
    validateEDL,
    applyFix,
    ignoreIssue,
    applyAllFixes,
    getActiveIssuesCount,
    canSign
  } = useExpertReview();

  const [activeTab, setActiveTab] = useState('completeness');
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    validateEDL(projectId, sessionId);
  }, [projectId, sessionId, validateEDL]);

  const handleValidateEDL = () => {
    setIsValidated(true);
    toast.success('EDL validé et prêt pour signature');
    onValidated?.();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critique</Badge>;
      case 'warning': return <Badge className="bg-amber-500">Attention</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  const renderIssueCard = (issue: ValidationIssue) => (
    <Card 
      key={issue.id} 
      className={cn(
        "transition-all",
        issue.status === 'fixed' && "opacity-50 bg-green-50 dark:bg-green-950/20",
        issue.status === 'ignored' && "opacity-40"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {getSeverityIcon(issue.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{issue.title}</h4>
              {getSeverityBadge(issue.severity)}
              {issue.status === 'fixed' && (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Check className="h-3 w-3 mr-1" /> Corrigé
                </Badge>
              )}
              {issue.status === 'ignored' && (
                <Badge variant="outline">Ignoré</Badge>
              )}
            </div>
            {issue.roomName && (
              <p className="text-sm text-muted-foreground mt-1">
                📍 {issue.roomName}
              </p>
            )}
            <p className="text-sm mt-2">{issue.description}</p>
            {issue.suggestion && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Suggestion IA :</p>
                <p className="text-sm">{issue.suggestion}</p>
              </div>
            )}
            {issue.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                {issue.autoFixable && issue.suggestion && (
                  <Button 
                    size="sm" 
                    onClick={() => applyFix(issue)}
                    disabled={isApplyingFix}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Appliquer
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => ignoreIssue(issue.id)}
                >
                  Ignorer
                </Button>
                {issue.elementId && (
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="h-4 w-4" />
                    Voir
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isValidating && !validationResult) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Shield className="h-16 w-16 text-primary animate-pulse" />
          <Loader2 className="h-8 w-8 absolute -bottom-1 -right-1 animate-spin text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">Analyse en cours...</h3>
          <p className="text-muted-foreground">Vérification de la complétude et cohérence</p>
        </div>
        <Progress value={33} className="w-64" />
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <p className="text-muted-foreground">Erreur lors de l'analyse</p>
        <Button onClick={() => validateEDL(projectId, sessionId)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Contrôle Expert
              </h1>
              <p className="text-sm text-muted-foreground">
                Validation qualité avant signature
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateEDL(projectId, sessionId)}
              disabled={isValidating}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isValidating && "animate-spin")} />
              Rescanner
            </Button>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <Card className={cn(
              "p-3",
              validationResult.score >= 80 ? "bg-green-50 dark:bg-green-950/30" :
              validationResult.score >= 50 ? "bg-amber-50 dark:bg-amber-950/30" :
              "bg-red-50 dark:bg-red-950/30"
            )}>
              <div className="text-center">
                <p className="text-3xl font-bold">{validationResult.score}</p>
                <p className="text-xs text-muted-foreground">Score Qualité</p>
              </div>
            </Card>
            <Card className="p-3 bg-destructive/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{validationResult.criticalIssues}</p>
                <p className="text-xs text-muted-foreground">Critiques</p>
              </div>
            </Card>
            <Card className="p-3 bg-amber-500/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{validationResult.warningIssues}</p>
                <p className="text-xs text-muted-foreground">Alertes</p>
              </div>
            </Card>
            <Card className="p-3 bg-blue-500/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{validationResult.infoIssues}</p>
                <p className="text-xs text-muted-foreground">Suggestions</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="completeness" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Complétude</span>
              {validationResult.completenessIssues.filter(i => i.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {validationResult.completenessIssues.filter(i => i.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="technical" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Technique</span>
              {validationResult.technicalIssues.filter(i => i.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {validationResult.technicalIssues.filter(i => i.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="redaction" className="gap-2">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Rédaction</span>
              {validationResult.redactionIssues.filter(i => i.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {validationResult.redactionIssues.filter(i => i.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Synthèse</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completeness">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Checklist de Complétude</h3>
                {validationResult.completenessIssues.some(i => i.autoFixable && i.status === 'pending') && (
                  <Button size="sm" onClick={applyAllFixes}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-corriger tout
                  </Button>
                )}
              </div>
              {validationResult.completenessIssues.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="font-medium">Aucun problème de complétude détecté</p>
                  <p className="text-sm text-muted-foreground">L'EDL est complet</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {validationResult.completenessIssues.map(renderIssueCard)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="technical">
            <div className="space-y-4">
              <h3 className="font-semibold">Cohérence Technique</h3>
              {validationResult.technicalIssues.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="font-medium">Aucune incohérence technique</p>
                  <p className="text-sm text-muted-foreground">Photos, descriptions et états sont cohérents</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {validationResult.technicalIssues.map(renderIssueCard)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="redaction">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Cohérence Rédactionnelle</h3>
                {validationResult.redactionIssues.some(i => i.status === 'pending') && (
                  <Button size="sm" onClick={applyAllFixes}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Appliquer toutes les suggestions
                  </Button>
                )}
              </div>
              {validationResult.redactionIssues.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="font-medium">Rédaction professionnelle</p>
                  <p className="text-sm text-muted-foreground">Toutes les descriptions sont conformes</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {validationResult.redactionIssues.map(renderIssueCard)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-6">
              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Synthèse EDL</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-bold">{validationResult.summary.totalRooms}</p>
                      <p className="text-xs text-muted-foreground">Pièces</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-bold">{validationResult.summary.totalPhotos}</p>
                      <p className="text-xs text-muted-foreground">Photos</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-bold">{validationResult.summary.totalAnomalies}</p>
                      <p className="text-xs text-muted-foreground">Anomalies</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-xl">
                      <p className="text-2xl font-bold">{validationResult.summary.totalTasks}</p>
                      <p className="text-xs text-muted-foreground">Tâches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Status */}
              <Card className={cn(
                canSign() ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {canSign() ? (
                      <CheckCircle2 className="h-12 w-12 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-12 w-12 text-amber-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {canSign() ? "Prêt pour signature" : "Corrections requises"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {canSign() 
                          ? "L'EDL a passé tous les contrôles qualité"
                          : `${getActiveIssuesCount()} problème(s) en attente`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {!canSign() && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={applyAllFixes}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Corriger automatiquement les problèmes restants
                  </Button>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canSign() || isValidated}
                  onClick={handleValidateEDL}
                >
                  {isValidated ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      EDL Validé
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-5 w-5 mr-2" />
                      Valider et autoriser signature
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpertReviewMode;
