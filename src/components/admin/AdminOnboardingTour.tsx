import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, FlaskConical, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  title: string;
  description: string;
  content: string[];
  icon: React.ElementType;
  color: string;
}

export function AdminOnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has completed the admin tour
    const tourCompleted = localStorage.getItem(`admin_tour_completed_${user.id}`);
    if (!tourCompleted) {
      setIsOpen(true);
    } else {
      setHasCompletedTour(true);
    }
  };

  const tourSteps: TourStep[] = [
    {
      title: t('cancel') === 'Annuler' ? 'Bienvenue dans l\'Admin' : 'Welcome to Admin',
      description: t('cancel') === 'Annuler' 
        ? 'Decouvrez les outils puissants de gestion et d\'optimisation' 
        : 'Discover powerful management and optimization tools',
      content: [
        t('cancel') === 'Annuler' 
          ? 'Interface admin complete avec 3 panels dedies'
          : 'Complete admin interface with 3 dedicated panels',
        t('cancel') === 'Annuler'
          ? 'Metriques en temps reel et analytics detaillees'
          : 'Real-time metrics and detailed analytics',
        t('cancel') === 'Annuler'
          ? 'Optimisation automatique avec A/B testing'
          : 'Automatic optimization with A/B testing',
        t('cancel') === 'Annuler'
          ? 'Rollback automatique pour securiser les changements'
          : 'Automatic rollback to secure changes',
      ],
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      title: t('cancel') === 'Annuler' ? 'Admin DSC' : 'DSC Admin',
      description: t('cancel') === 'Annuler' 
        ? 'Revision et correction des classifications automatiques'
        : 'Review and correct automatic classifications',
      content: [
        t('cancel') === 'Annuler'
          ? 'Filtrer les taches par niveau de confiance (faible, moyenne, haute)'
          : 'Filter tasks by confidence level (low, medium, high)',
        t('cancel') === 'Annuler'
          ? 'Corriger manuellement les classifications DSC incorrectes'
          : 'Manually correct incorrect DSC classifications',
        t('cancel') === 'Annuler'
          ? 'Systeme d\'apprentissage : vos corrections ameliorent l\'IA'
          : 'Learning system: your corrections improve the AI',
        t('cancel') === 'Annuler'
          ? 'Statistiques de qualite par famille DSC'
          : 'Quality statistics by DSC family',
      ],
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      title: t('cancel') === 'Annuler' ? 'Analytics Predictions' : 'Prediction Analytics',
      description: t('cancel') === 'Annuler'
        ? 'Metriques de performance et qualite des predictions'
        : 'Performance metrics and prediction quality',
      content: [
        t('cancel') === 'Annuler'
          ? 'Taux d\'acceptation global des suggestions IA'
          : 'Overall acceptance rate of AI suggestions',
        t('cancel') === 'Annuler'
          ? 'Score de confiance moyenne des predictions'
          : 'Average confidence score of predictions',
        t('cancel') === 'Annuler'
          ? 'Taux de rejet et raisons de refus'
          : 'Rejection rate and refusal reasons',
        t('cancel') === 'Annuler'
          ? 'Performance par type de travaux (electricite, plomberie, etc.)'
          : 'Performance by work type (electrical, plumbing, etc.)',
        t('cancel') === 'Annuler'
          ? 'Evolution des metriques dans le temps'
          : 'Metrics evolution over time',
      ],
      icon: BarChart3,
      color: 'text-purple-500',
    },
    {
      title: t('cancel') === 'Annuler' ? 'A/B Testing' : 'A/B Testing',
      description: t('cancel') === 'Annuler'
        ? 'Optimisation automatique des strategies de prediction'
        : 'Automatic optimization of prediction strategies',
      content: [
        t('cancel') === 'Annuler'
          ? 'Test de plusieurs strategies de prediction simultanement'
          : 'Test multiple prediction strategies simultaneously',
        t('cancel') === 'Annuler'
          ? 'Metriques comparatives : taux acceptation, confiance, utilisateurs'
          : 'Comparative metrics: acceptance rate, confidence, users',
        t('cancel') === 'Annuler'
          ? 'Optimisation automatique : selection de la meilleure strategie'
          : 'Automatic optimization: select the best strategy',
        t('cancel') === 'Annuler'
          ? 'Rollback automatique si degradation >15% detectee'
          : 'Automatic rollback if >15% degradation detected',
        t('cancel') === 'Annuler'
          ? 'Surveillance continue toutes les 5 minutes'
          : 'Continuous monitoring every 5 minutes',
        t('cancel') === 'Annuler'
          ? 'Reassignation automatique des utilisateurs vers meilleures strategies'
          : 'Automatic user reassignment to best strategies',
      ],
      icon: FlaskConical,
      color: 'text-orange-500',
    },
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`admin_tour_completed_${user.id}`, 'true');
      setHasCompletedTour(true);
    }
    setIsOpen(false);
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const step = tourSteps[currentStep];
  const Icon = step.icon;

  return (
    <>
      {hasCompletedTour && (
        <Button
          variant="outline"
          size="sm"
          onClick={restartTour}
          className="fixed bottom-4 right-4 z-50"
        >
          {t('cancel') === 'Annuler' ? '🎓 Relancer le guide' : '🎓 Restart guide'}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={`w-6 h-6 ${step.color}`} />
              {step.title}
            </DialogTitle>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />
            
            <div className="text-sm text-muted-foreground text-center">
              {t('cancel') === 'Annuler' ? 'Étape' : 'Step'} {currentStep + 1} / {tourSteps.length}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('cancel') === 'Annuler' ? 'Fonctionnalités clés' : 'Key Features'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {step.content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('cancel') === 'Annuler' ? 'Précédent' : 'Previous'}
            </Button>

            {currentStep === tourSteps.length - 1 ? (
              <Button onClick={handleComplete}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('cancel') === 'Annuler' ? 'Terminer' : 'Finish'}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {t('cancel') === 'Annuler' ? 'Suivant' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
