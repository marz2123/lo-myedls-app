import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Languages, 
  ArrowRight, 
  Loader2, 
  FileText,
  CheckCircle2,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEuropeanCompliance } from '@/hooks/useEuropeanCompliance';
import { LANGUAGE_LABELS } from '@/types/europeanCompliance';
import type { EUCountryNorm } from '@/types/europeanCompliance';

interface TranslationPanelProps {
  country: string;
  countryInfo?: { code: string; name: string; flag: string; languages: readonly string[] };
  countryNorm?: EUCountryNorm;
  edlId?: string;
  projectId?: string;
  sessionId?: string;
  edlContent?: any;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  country,
  countryInfo,
  countryNorm,
  edlId,
  projectId,
  sessionId,
  edlContent
}) => {
  const [sourceLanguage, setSourceLanguage] = useState('fr');
  const [targetLanguage, setTargetLanguage] = useState(
    countryNorm?.default_language !== 'fr' ? countryNorm?.default_language || 'en' : 'en'
  );
  const [translationType, setTranslationType] = useState<'full' | 'summary' | 'tasks' | 'anomalies' | 'descriptions'>('full');
  const [translatedContent, setTranslatedContent] = useState<string>('');
  
  const { isLoading, translateEDL } = useEuropeanCompliance();

  const availableLanguages = countryNorm?.supported_languages || ['fr', 'en'];

  const handleTranslate = async () => {
    if (!edlContent) return;

    const content = {
      title: edlContent.title || 'État des Lieux',
      summary: edlContent.summary,
      descriptions: edlContent.descriptions || [],
      tasks: edlContent.tasks || [],
      anomalies: edlContent.anomalies || [],
      rooms: edlContent.rooms || []
    };

    const result = await translateEDL(
      sourceLanguage,
      targetLanguage,
      content,
      translationType,
      { edlId, projectId, sessionId }
    );

    if (result) {
      const translated = result.translated_content;
      if (typeof translated === 'string') {
        setTranslatedContent(translated);
      } else if (translated?.text) {
        setTranslatedContent(translated.text);
      } else {
        setTranslatedContent(JSON.stringify(translated, null, 2));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Translation Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Options de traduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Langue source</label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['fr', 'en', 'de', 'nl', 'it', 'es', 'pt'].map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Langue cible</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Translation Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de traduction</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'full', label: 'Complet' },
                { id: 'summary', label: 'Résumé' },
                { id: 'tasks', label: 'Tâches' },
                { id: 'anomalies', label: 'Anomalies' },
                { id: 'descriptions', label: 'Descriptions' }
              ].map(type => (
                <Button
                  key={type.id}
                  variant={translationType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTranslationType(type.id as typeof translationType)}
                  className="text-xs"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Translate Button */}
          <Button 
            onClick={handleTranslate} 
            disabled={isLoading || !edlContent || sourceLanguage === targetLanguage}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Traduction en cours...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                Traduire l'EDL
              </>
            )}
          </Button>

          {!edlContent && (
            <p className="text-xs text-center text-muted-foreground">
              Aucun contenu EDL disponible pour la traduction
            </p>
          )}
        </CardContent>
      </Card>

      {/* Translation Result */}
      {translatedContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Résultat de la traduction
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {LANGUAGE_LABELS[sourceLanguage]} → {LANGUAGE_LABELS[targetLanguage]}
                  </Badge>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={translatedContent}
                readOnly
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Bilingual/Trilingual Options */}
      {countryNorm && countryNorm.supported_languages.length > 2 && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Export multilingue</p>
                  <p className="text-xs text-muted-foreground">
                    Générer un PDF bilingue ou trilingue
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Bilingue
                </Button>
                {countryNorm.supported_languages.length >= 3 && (
                  <Button variant="outline" size="sm">
                    Trilingue
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
