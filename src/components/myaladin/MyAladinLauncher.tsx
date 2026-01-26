import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Mic, MicOff, Loader2 } from "lucide-react";
import { useAppMode } from "@/contexts/AppModeContext";
import { toast } from "sonner";

interface MyAladinLauncherProps {
  variant?: 'button' | 'card' | 'fab';
  className?: string;
}

export const MyAladinLauncher = ({ variant = 'button', className = '' }: MyAladinLauncherProps) => {
  const { setAppMode } = useAppMode();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const launchMyAladin = () => {
    setAppMode('aladin');
    toast.success("MyAladin activé", {
      description: "Dites 'Créer un EDL' pour commencer",
      icon: <Sparkles className="w-4 h-4" />
    });
  };

  const startVoiceActivation = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Reconnaissance vocale non supportée");
      launchMyAladin();
      return;
    }

    setIsListening(true);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setIsListening(false);
      setIsProcessing(true);

      // Check for EDL triggers
      const edlTriggers = ['créer un edl', 'creer un edl', 'nouveau edl', 'démarrer edl', 'lancer edl'];
      const isEDLCommand = edlTriggers.some(trigger => transcript.includes(trigger));

      if (isEDLCommand) {
        toast.success("Commande reconnue: Créer un EDL", {
          icon: <Sparkles className="w-4 h-4" />
        });
      }

      // Always launch MyAladin on voice activation
      setTimeout(() => {
        setIsProcessing(false);
        launchMyAladin();
      }, 500);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Erreur de reconnaissance vocale");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      toast.info("À l'écoute...", {
        description: "Dites 'Créer un EDL' ou autre commande"
      });
    } catch (error) {
      setIsListening(false);
      toast.error("Impossible de démarrer l'écoute");
    }
  };

  if (variant === 'fab') {
    return (
      <Button
        onClick={launchMyAladin}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-primary via-accent to-primary hover:scale-110 transition-all duration-300 ${className}`}
        size="icon"
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border-2 border-primary/30 p-6 ${className}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">MyAladin</h3>
              <p className="text-sm text-muted-foreground">Assistant IA conversationnel</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Une phrase = Un EDL complet. Filmez, parlez, MyAladin s'occupe du reste.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={launchMyAladin}
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              Lancer MyAladin
            </Button>
            <Button
              onClick={startVoiceActivation}
              variant="outline"
              size="icon"
              disabled={isListening || isProcessing}
              className="border-primary/50 hover:bg-primary/10"
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-pulse text-destructive" />
              ) : isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button 
        onClick={launchMyAladin}
        className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
      >
        <Sparkles className="w-4 h-4" />
        Lancer MyAladin
      </Button>
      <Button
        onClick={startVoiceActivation}
        variant="outline"
        size="icon"
        disabled={isListening || isProcessing}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 animate-pulse text-destructive" />
        ) : isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};
