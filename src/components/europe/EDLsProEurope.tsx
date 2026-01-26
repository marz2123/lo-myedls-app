import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileCheck, 
  Languages,
  Shield,
  ChevronRight,
  Loader2,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEuropeanCompliance } from '@/hooks/useEuropeanCompliance';
import { CountrySelector } from './CountrySelector';
import { ComplianceAuditPanel } from './ComplianceAuditPanel';
import { TranslationPanel } from './TranslationPanel';
import { CertificationPanel } from './CertificationPanel';
import { SUPPORTED_COUNTRIES } from '@/types/europeanCompliance';

interface EDLsProEuropeProps {
  edlId?: string;
  projectId?: string;
  sessionId?: string;
  edlContent?: any;
  onClose?: () => void;
}

export const EDLsProEurope: React.FC<EDLsProEuropeProps> = ({
  edlId,
  projectId,
  sessionId,
  edlContent,
  onClose
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('FR');
  const [activeTab, setActiveTab] = useState<string>('compliance');
  
  const {
    isLoading,
    countryNorms,
    complianceResult,
    fetchCountryNorms,
    checkCompliance
  } = useEuropeanCompliance();

  useEffect(() => {
    fetchCountryNorms();
  }, [fetchCountryNorms]);

  const selectedCountryInfo = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry);
  const selectedNorm = countryNorms.find(n => n.country_code === selectedCountry);

  const handleCheckCompliance = async () => {
    if (!edlContent) return;
    await checkCompliance(selectedCountry, edlContent, {
      edlId,
      projectId,
      sessionId
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'compliant': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'partial': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'non_compliant': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Globe2 className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">EDLs Pro Europe</h2>
            <p className="text-sm text-muted-foreground">Conformité normative européenne</p>
          </div>
        </div>
        
        {complianceResult && (
          <Badge variant="outline" className={`${getStatusColor(complianceResult.status)} px-3 py-1`}>
            {getStatusIcon(complianceResult.status)}
            <span className="ml-2">{complianceResult.compliance_score}%</span>
          </Badge>
        )}
      </div>

      {/* Country Selector */}
      <div className="px-6 py-4 border-b bg-muted/30">
        <CountrySelector
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
          countryNorms={countryNorms}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/50">
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Conformité</span>
          </TabsTrigger>
          <TabsTrigger value="translation" className="gap-2">
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">Traduction</span>
          </TabsTrigger>
          <TabsTrigger value="certification" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Certification</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-6 py-4">
          <AnimatePresence mode="wait">
            <TabsContent value="compliance" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ComplianceAuditPanel
                  country={selectedCountry}
                  countryInfo={selectedCountryInfo}
                  countryNorm={selectedNorm}
                  complianceResult={complianceResult}
                  isLoading={isLoading}
                  onCheckCompliance={handleCheckCompliance}
                  hasContent={!!edlContent}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="translation" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TranslationPanel
                  country={selectedCountry}
                  countryInfo={selectedCountryInfo}
                  countryNorm={selectedNorm}
                  edlId={edlId}
                  projectId={projectId}
                  sessionId={sessionId}
                  edlContent={edlContent}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="certification" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CertificationPanel
                  country={selectedCountry}
                  countryInfo={selectedCountryInfo}
                  complianceResult={complianceResult}
                  edlId={edlId}
                  projectId={projectId}
                />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
