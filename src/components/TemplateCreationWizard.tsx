import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Lightbulb, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TemplateCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (templateContent: string, baseTemplate: string) => void;
}

const TEMPLATE_EXAMPLES = {
  simplified: `État général:
- Propreté: (bon/moyen/mauvais)
- Dégâts apparents: (oui/non)

Observations:
- Remarques générales: (description)`,
  
  detailed: `État général:
- Propreté globale: (bon/moyen/mauvais)
- État des murs: (bon/moyen/mauvais)
- État des sols: (bon/moyen/mauvais)
- Odeurs particulières: (oui/non)

Équipements:
- Chauffage fonctionnel: (oui/non)
- Eau chaude: (oui/non)

Observations:
- Remarques détaillées: (description)`,

  "very-detailed": `État général:
- Propreté globale: (bon/moyen/mauvais)
- État des murs: (bon/moyen/mauvais)
- État des plafonds: (bon/moyen/mauvais)
- État des sols: (bon/moyen/mauvais)
- Odeurs particulières: (oui/non)
- Humidité visible: (oui/non)

Équipements sanitaires:
- Lavabo état: (bon/moyen/mauvais)
- WC état: (bon/moyen/mauvais)
- Douche/baignoire état: (bon/moyen/mauvais)

Équipements électriques:
- Prises électriques: (nombre/état)
- Interrupteurs: (nombre/état)
- Tableau électrique accessible: (oui/non)

Menuiseries:
- Fenêtres état: (bon/moyen/mauvais)
- Portes état: (bon/moyen/mauvais)
- Volets état: (bon/moyen/mauvais)

Observations:
- Remarques détaillées: (description)`,

  exhaustive: `État général:
- Propreté globale: (bon/moyen/mauvais)
- État des murs: (bon/moyen/mauvais)
- État des plafonds: (bon/moyen/mauvais)
- État des sols: (bon/moyen/mauvais)
- Revêtement mural: (type/état)
- Revêtement sol: (type/état)
- Odeurs particulières: (oui/non/type)
- Humidité visible: (oui/non/localisation)
- Moisissures: (oui/non/localisation)

Équipements sanitaires:
- Lavabo état: (bon/moyen/mauvais)
- Lavabo robinetterie: (bon/moyen/mauvais)
- WC état: (bon/moyen/mauvais)
- WC chasse d'eau: (bon/moyen/mauvais)
- Douche/baignoire état: (bon/moyen/mauvais)
- Douche/baignoire robinetterie: (bon/moyen/mauvais)
- Ventilation salle de bain: (oui/non/état)

Équipements électriques:
- Prises électriques: (nombre/état)
- Interrupteurs: (nombre/état)
- Éclairage: (nombre/type/état)
- Tableau électrique accessible: (oui/non)
- Disjoncteurs conformes: (oui/non)

Équipements chauffage:
- Type chauffage: (collectif/individuel/type)
- Radiateurs nombre: (nombre)
- Radiateurs état: (bon/moyen/mauvais)
- Thermostat: (oui/non/état)

Menuiseries extérieures:
- Fenêtres nombre: (nombre)
- Fenêtres état: (bon/moyen/mauvais)
- Fenêtres vitrage: (simple/double/triple)
- Fenêtres étanchéité: (bon/moyen/mauvais)
- Volets nombre: (nombre)
- Volets type: (roulants/battants)
- Volets état: (bon/moyen/mauvais)

Menuiseries intérieures:
- Portes nombre: (nombre)
- Portes état: (bon/moyen/mauvais)
- Serrures état: (bon/moyen/mauvais)
- Poignées état: (bon/moyen/mauvais)

Observations:
- Remarques exhaustives: (description détaillée)
- Points d'attention: (liste)
- Travaux recommandés: (liste)`
};

export const TemplateCreationWizard = ({ open, onOpenChange, onComplete }: TemplateCreationWizardProps) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [baseTemplate, setBaseTemplate] = useState<string>("simplified");
  const [templateContent, setTemplateContent] = useState("");

  const steps = [
    {
      title: "Bienvenue dans l'assistant de création",
      description: "Je vais vous guider étape par étape pour créer votre premier template personnalisé.",
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Qu'est-ce qu'un template personnalisé ?</p>
                <p className="text-muted-foreground">
                  Un template personnalisé vous permet de définir exactement quelles informations vous souhaitez 
                  collecter lors de vos inspections. Vous pouvez créer des sections thématiques et des champs 
                  adaptés à vos besoins spécifiques.
                </p>
              </div>
            </div>
          </Card>
          <div className="space-y-2">
            <p className="font-medium">Avantages :</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Gagner du temps lors de vos inspections</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Standardiser vos processus d'inspection</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Adapter les champs à votre activité</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Réutiliser vos templates sur tous vos projets</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Choisissez votre template de base",
      description: "Sélectionnez le niveau de détail qui correspond le mieux à vos besoins. Vous pourrez le personnaliser ensuite.",
      content: (
        <div className="space-y-4">
          <RadioGroup value={baseTemplate} onValueChange={setBaseTemplate}>
            <div className="space-y-3">
              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Label htmlFor="simplified" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="simplified" id="simplified" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">Simplifié</p>
                    <p className="text-sm text-muted-foreground">
                      Template basique avec les informations essentielles (~5 champs)
                    </p>
                  </div>
                </Label>
              </Card>
              
              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Label htmlFor="detailed" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="detailed" id="detailed" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">Détaillé</p>
                    <p className="text-sm text-muted-foreground">
                      Template équilibré avec plusieurs sections (~10 champs)
                    </p>
                  </div>
                </Label>
              </Card>
              
              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Label htmlFor="very-detailed" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="very-detailed" id="very-detailed" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">Très détaillé</p>
                    <p className="text-sm text-muted-foreground">
                      Template complet pour inspections approfondies (~20 champs)
                    </p>
                  </div>
                </Label>
              </Card>
              
              <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Label htmlFor="exhaustive" className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="exhaustive" id="exhaustive" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">Exhaustif</p>
                    <p className="text-sm text-muted-foreground">
                      Template très détaillé pour inspections complètes (~40+ champs)
                    </p>
                  </div>
                </Label>
              </Card>
            </div>
          </RadioGroup>
          
          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground">
                Conseil : Commencez avec un template Détaillé si vous n'êtes pas sûr. 
                Vous pourrez toujours ajouter ou retirer des champs à l'étape suivante.
              </p>
            </div>
          </Card>
        </div>
      )
    },
    {
      title: "Comprendre la syntaxe",
      description: "Apprenez la structure simple pour créer vos sections et champs.",
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div>
                <p className="font-medium mb-2">Format de section :</p>
                <code className="block bg-background p-3 rounded text-sm">
                  Nom de la section:
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Le nom de la section se termine par deux points (:)
                </p>
              </div>
              
              <div>
                <p className="font-medium mb-2">Format de champ :</p>
                <code className="block bg-background p-3 rounded text-sm">
                  - Label du champ: (exemple ou type de valeur)
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Commence par un tiret (-), suivi du label, puis d'un exemple entre parenthèses
                </p>
              </div>
            </div>
          </Card>

          <div>
            <p className="font-medium mb-2">Exemple complet :</p>
            <Card className="p-4 bg-background">
              <pre className="text-sm whitespace-pre-wrap">
{`État général:
- Propreté: (bon/moyen/mauvais)
- État des murs: (bon/moyen/mauvais)

Équipements:
- Chauffage: (oui/non)
- Eau chaude: (oui/non)`}
              </pre>
            </Card>
          </div>

          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Points importants :</p>
                <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                  <li>Les sections organisent vos champs par thème</li>
                  <li>Chaque champ doit être dans une section</li>
                  <li>Les exemples entre parenthèses aident à la saisie</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      title: "Personnalisez votre template",
      description: "Modifiez le template de base selon vos besoins. Ajoutez, supprimez ou modifiez des sections et des champs.",
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Suggestions de personnalisation :</p>
                <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                  <li>Supprimez les sections qui ne vous concernent pas</li>
                  <li>Ajoutez des champs spécifiques à votre activité</li>
                  <li>Modifiez les exemples pour qu'ils correspondent à vos valeurs habituelles</li>
                  <li>Réorganisez les sections dans l'ordre qui vous convient</li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="template-edit">Éditez votre template :</Label>
            <Textarea
              id="template-edit"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Votre template apparaîtra ici..."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{templateContent.split('\n').length} lignes</span>
              <span>{templateContent.length} caractères</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Terminé !",
      description: "Votre template personnalisé est prêt. Vous pourrez le réutiliser sur tous vos projets.",
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="font-medium">Félicitations !</p>
                <p className="text-sm text-muted-foreground">
                  Votre template personnalisé a été créé avec succès. Il sera automatiquement sauvegardé 
                  et vous pourrez le réutiliser pour tous vos futurs projets du même type de bien.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <p className="font-medium">Aperçu de votre template :</p>
            <Card className="p-4 bg-muted/50 max-h-[200px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{templateContent || "Aucun contenu"}</pre>
            </Card>
          </div>

          <Card className="p-4 bg-muted/50 border-primary/20">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Prochaines étapes :</p>
                <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
                  <li>Votre template sera appliqué automatiquement au projet</li>
                  <li>Vous pourrez le modifier à tout moment</li>
                  <li>Il sera disponible pour vos prochains projets similaires</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep === 1) {
      // Load the selected base template
      setTemplateContent(TEMPLATE_EXAMPLES[baseTemplate as keyof typeof TEMPLATE_EXAMPLES]);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(templateContent, baseTemplate);
    onOpenChange(false);
    // Reset wizard
    setCurrentStep(0);
    setBaseTemplate("simplified");
    setTemplateContent("");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset wizard
    setCurrentStep(0);
    setBaseTemplate("simplified");
    setTemplateContent("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Assistant de création de template</DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                {index < currentStep ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : index === currentStep ? (
                  <Circle className="w-5 h-5 text-primary fill-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className={`h-1 flex-1 rounded ${
                  index < currentStep ? 'bg-primary' : 
                  index === currentStep ? 'bg-primary/30' : 
                  'bg-muted'
                }`} />
              </div>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{steps[currentStep].title}</h3>
              <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
            </div>
            <div>{steps[currentStep].content}</div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              Terminer et appliquer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};