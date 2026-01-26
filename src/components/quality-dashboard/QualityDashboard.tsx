import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEdlQuality, QualityMetric, QualityRecommendation } from '@/hooks/useEdlQuality';
import { QualityScoreCard } from './QualityScoreCard';
import { QualityHeatmap } from './QualityHeatmap';
import { ElementDetailsPanel } from './ElementDetailsPanel';
import { SystemicErrorsPanel } from './SystemicErrorsPanel';
import { RecommendationsPanel } from './RecommendationsPanel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface QualityDashboardProps {
  projectId: string;
}

export function QualityDashboard({ projectId }: QualityDashboardProps) {
  const navigate = useNavigate();
  const {
    qualityScore,
    metrics,
    recommendations,
    systemicErrors,
    loading,
    analyzing,
    error,
    analyzeEDL,
    applyRecommendation,
    dismissRecommendation
  } = useEdlQuality(projectId);

  const [selectedMetric, setSelectedMetric] = useState<QualityMetric | null>(null);

  const handleApplyRecommendation = async (id: string) => {
    await applyRecommendation(id);
    toast.success('Recommandation appliquée');
  };

  const handleDismissRecommendation = async (id: string) => {
    await dismissRecommendation(id);
    toast.info('Recommandation ignorée');
  };

  const handleViewItem = (rec: QualityRecommendation) => {
    // Navigate to the affected item
    if (rec.affected_item_type === 'location') {
      toast.info(`Navigation vers: ${rec.title}`);
    } else if (rec.affected_item_type === 'anomaly') {
      toast.info(`Voir anomalie: ${rec.title}`);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div 
        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Dashboard Qualité EDL</h1>
                <p className="text-sm text-muted-foreground">Audit IA avancé</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row: Score Card + Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <QualityScoreCard 
              qualityScore={qualityScore}
              analyzing={analyzing}
              onAnalyze={analyzeEDL}
            />
          </motion.div>

          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <QualityHeatmap 
              metrics={metrics}
              onSelectMetric={setSelectedMetric}
            />
          </motion.div>
        </div>

        {/* Middle Row: Element Details + Systemic Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ElementDetailsPanel 
              selectedMetric={selectedMetric}
              onClose={() => setSelectedMetric(null)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SystemicErrorsPanel errors={systemicErrors} />
          </motion.div>
        </div>

        {/* Bottom Row: Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RecommendationsPanel 
            recommendations={recommendations}
            onApply={handleApplyRecommendation}
            onDismiss={handleDismissRecommendation}
            onViewItem={handleViewItem}
          />
        </motion.div>
      </div>
    </div>
  );
}
