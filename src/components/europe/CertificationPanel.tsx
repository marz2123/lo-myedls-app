import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Shield, 
  CheckCircle2, 
  FileCheck,
  Hash,
  Calendar,
  User,
  Building,
  Loader2,
  Download,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEuropeanCompliance } from '@/hooks/useEuropeanCompliance';
import { useToast } from '@/hooks/use-toast';
import type { ComplianceResult, EUCertificate } from '@/types/europeanCompliance';
import { cn } from '@/lib/utils';

interface CertificationPanelProps {
  country: string;
  countryInfo?: { code: string; name: string; flag: string; languages: readonly string[] };
  complianceResult: ComplianceResult | null;
  edlId?: string;
  projectId?: string;
}

export const CertificationPanel: React.FC<CertificationPanelProps> = ({
  country,
  countryInfo,
  complianceResult,
  edlId,
  projectId
}) => {
  const [issuerName, setIssuerName] = useState('');
  const [issuerEmail, setIssuerEmail] = useState('');
  const [generatedCertificate, setGeneratedCertificate] = useState<EUCertificate | null>(null);
  
  const { isLoading, generateCertificate } = useEuropeanCompliance();
  const { toast } = useToast();

  const canGenerateCertificate = complianceResult && 
    complianceResult.compliance_score >= 70 && 
    issuerName.trim().length > 0;

  const handleGenerateCertificate = async () => {
    if (!complianceResult?.id || !issuerName) return;

    const cert = await generateCertificate(
      complianceResult.id,
      issuerName,
      {
        edlId,
        projectId,
        issuerEmail: issuerEmail || undefined,
        jurisdiction: countryInfo?.name
      }
    );

    if (cert) {
      setGeneratedCertificate(cert);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: 'Le texte a été copié dans le presse-papiers'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Certification Requirements */}
      {!generatedCertificate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certification EDL Européenne
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Check */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Score de conformité requis</span>
                <Badge variant="outline" className="font-mono">
                  Minimum 70%
                </Badge>
              </div>
              
              {complianceResult ? (
                <div className="flex items-center gap-3">
                  {complianceResult.compliance_score >= 70 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${complianceResult.compliance_score}%` }}
                        className={cn(
                          "h-full rounded-full",
                          complianceResult.compliance_score >= 70 
                            ? "bg-emerald-500" 
                            : "bg-red-500"
                        )}
                      />
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold",
                    complianceResult.compliance_score >= 70 
                      ? "text-emerald-500" 
                      : "text-red-500"
                  )}>
                    {complianceResult.compliance_score}%
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Lancez d'abord un audit de conformité
                </p>
              )}
            </div>

            {/* Issuer Information */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="issuerName">Nom du rédacteur *</Label>
                <Input
                  id="issuerName"
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="issuerEmail">Email (optionnel)</Label>
                <Input
                  id="issuerEmail"
                  type="email"
                  value={issuerEmail}
                  onChange={(e) => setIssuerEmail(e.target.value)}
                  placeholder="jean.dupont@example.com"
                />
              </div>
            </div>

            {/* Country Info */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{countryInfo?.flag}</span>
                <div>
                  <p className="text-sm font-medium">{countryInfo?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Juridiction du certificat
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateCertificate}
              disabled={isLoading || !canGenerateCertificate}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  Générer le Certificat Européen
                </>
              )}
            </Button>

            {!complianceResult && (
              <p className="text-xs text-center text-muted-foreground">
                Effectuez d'abord un audit de conformité
              </p>
            )}
            
            {complianceResult && complianceResult.compliance_score < 70 && (
              <p className="text-xs text-center text-red-500">
                Score insuffisant - Corrigez les problèmes détectés
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Certificate */}
      {generatedCertificate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-500" />
                  Certificat EDL Européen
                </CardTitle>
                <Badge className="bg-emerald-500 text-white">
                  Valide
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Certificate Number */}
              <div className="p-4 rounded-lg bg-background border-2 border-dashed border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Numéro de certificat</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCertificate.certificate_number)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
                  {generatedCertificate.certificate_number}
                </p>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Émetteur</span>
                  </div>
                  <p className="text-sm font-medium">{generatedCertificate.issuer_name}</p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Juridiction</span>
                  </div>
                  <p className="text-sm font-medium">
                    {countryInfo?.flag} {generatedCertificate.jurisdiction}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Émis le</span>
                  </div>
                  <p className="text-sm font-medium">
                    {formatDate(generatedCertificate.issued_at)}
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Score</span>
                  </div>
                  <p className="text-sm font-medium text-emerald-600">
                    {generatedCertificate.compliance_score}% conforme
                  </p>
                </div>
              </div>

              {/* Hash */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Hash cryptographique</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => copyToClipboard(generatedCertificate.hash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {generatedCertificate.hash}
                </p>
              </div>

              {/* Applied Norms */}
              {generatedCertificate.norms_applied && generatedCertificate.norms_applied.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Normes appliquées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedCertificate.norms_applied.map((norm, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {norm.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger PDF
                </Button>
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Vérifier
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
