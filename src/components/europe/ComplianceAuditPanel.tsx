import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  Loader2,
  FileSearch,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ComplianceResult, EUCountryNorm, ComplianceIssue } from '@/types/europeanCompliance';

interface ComplianceAuditPanelProps {
  country: string;
  countryInfo?: { code: string; name: string; flag: string; languages: readonly string[] };
  countryNorm?: EUCountryNorm;
  complianceResult: ComplianceResult | null;
  isLoading: boolean;
  onCheckCompliance: () => void;
  hasContent: boolean;
}

export const ComplianceAuditPanel: React.FC<ComplianceAuditPanelProps> = ({
  country,
  countryInfo,
  countryNorm,
  complianceResult,
  isLoading,
  onCheckCompliance,
  hasContent
}) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Legal References */}
      {countryNorm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Normes applicables - {countryInfo?.flag} {countryInfo?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {countryNorm.legal_references.map((ref, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <Badge variant="outline" className="font-mono text-xs">
                  {ref.code}
                </Badge>
                <span className="text-sm">{ref.name}</span>
              </div>
            ))}
            
            {countryNorm.registration_required && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600">
                      Enregistrement obligatoire
                    </p>
                    <p className="text-xs text-amber-600/80">
                      L'EDL doit mentionner un numéro d'enregistrement officiel
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Button */}
      {!complianceResult && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-full bg-primary/10">
                <FileSearch className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Audit de Conformité</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vérifiez la conformité de votre EDL aux normes {countryInfo?.name}
                </p>
              </div>
              <Button 
                onClick={onCheckCompliance} 
                disabled={isLoading || !hasContent}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Lancer l'audit
                  </>
                )}
              </Button>
              {!hasContent && (
                <p className="text-xs text-muted-foreground">
                  Aucun contenu EDL disponible pour l'analyse
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Results */}
      {complianceResult && (
        <>
          {/* Score Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Score de Conformité</h3>
                  <p className="text-sm text-muted-foreground">
                    {complianceResult.status === 'compliant' && 'EDL conforme aux normes'}
                    {complianceResult.status === 'partial' && 'Corrections recommandées'}
                    {complianceResult.status === 'non_compliant' && 'Corrections requises'}
                  </p>
                </div>
                <div className={cn("text-4xl font-bold", getScoreColor(complianceResult.compliance_score))}>
                  {complianceResult.compliance_score}%
                </div>
              </div>
              
              <Progress 
                value={complianceResult.compliance_score} 
                className="h-3"
                style={{
                  '--progress-background': getProgressColor(complianceResult.compliance_score).replace('bg-', '')
                } as React.CSSProperties}
              />
              
              <div className="flex items-center justify-between mt-4 text-sm">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {complianceResult.issues.filter(i => i.severity === 'high').length} critiques
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {complianceResult.issues.filter(i => i.severity === 'medium').length} avertissements
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={onCheckCompliance} disabled={isLoading}>
                  Relancer l'audit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          {complianceResult.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problèmes détectés ({complianceResult.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complianceResult.issues.map((issue, idx) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{issue.message}</span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getSeverityBadge(issue.severity))}
                          >
                            {issue.severity === 'high' ? 'Critique' : 
                             issue.severity === 'medium' ? 'Attention' : 'Info'}
                          </Badge>
                        </div>
                        {issue.suggestion && (
                          <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/50">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              {issue.suggestion}
                            </p>
                          </div>
                        )}
                        {issue.norm_reference && (
                          <p className="text-xs text-muted-foreground">
                            Référence: {issue.norm_reference}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Corrections */}
          {complianceResult.corrections.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Corrections suggérées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {complianceResult.corrections.map((correction, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 line-through">
                          Original
                        </Badge>
                        <span className="text-sm text-muted-foreground">{correction.original}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500">
                          Corrigé
                        </Badge>
                        <span className="text-sm">{correction.corrected}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
