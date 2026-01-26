import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MessageSquare, Camera, FileText, Mic, LogOut, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Snowfall, ChristmasLights } from "@/components/SeasonalDecorations";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModeSelectorProps {
  onSelectClassic: () => void;
  onSelectMyAladin: () => void;
  onLogout?: () => void;
}

export function ModeSelector({
  onSelectClassic,
  onSelectMyAladin,
  onLogout,
}: ModeSelectorProps) {
  const { t } = useLanguage();
  const [hoveredMode, setHoveredMode] = useState<"classic" | "aladin" | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900/20 via-background to-blue-900/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Seasonal Decorations */}
      <Snowfall />
      <ChristmasLights />
      
      {/* Winter background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-ornament">🎄</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-ornament" style={{ animationDelay: '0.5s' }}>🎁</div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-20 animate-ornament" style={{ animationDelay: '1s' }}>⭐</div>
        <div className="absolute bottom-20 right-10 text-6xl opacity-20 animate-ornament" style={{ animationDelay: '1.5s' }}>🦌</div>
      </div>

      {onLogout && (
        <button
          onClick={onLogout}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all duration-200 active:scale-95 z-10"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}

      <div className="text-center mb-12 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-3xl animate-ornament">🎅</span>
          <div className="relative">
            <h1 className="text-4xl md:text-5xl font-bold festive-text">
              MyEDLS
            </h1>
            <img 
              src="/images/santa-hat.png" 
              alt=""
              className="absolute -top-8 -right-4 w-14 h-14 transform rotate-12 drop-shadow-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <span className="text-3xl animate-ornament" style={{ animationDelay: '0.5s' }}>🎄</span>
        </div>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          ❄️ Choisissez votre expérience ❄️
        </p>
        <p className="text-sm text-primary/80 mt-2 font-medium">
          🎁 Joyeuses Fêtes ! Happy Holidays! 🎁
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full relative z-10">
        <Card
          className={`p-8 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-xl ${
            hoveredMode === "classic"
              ? "scale-[1.02] border-primary shadow-xl"
              : "border-border"
          }`}
          onMouseEnter={() => setHoveredMode("classic")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={onSelectClassic}
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative pt-4">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-10 h-10 text-secondary-foreground" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Expérience Classique
              </h2>
              <p className="text-muted-foreground">
                Navigation manuelle avec assistance IA
              </p>
            </div>

            <div className="space-y-3 text-left w-full">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileText className="w-5 h-5 text-primary" />
                <span>Créez et gérez vos EDLs manuellement</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Camera className="w-5 h-5 text-primary" />
                <span>Extraction de tâches par photos/vidéos</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span>MyAladin disponible en assistant</span>
              </div>
            </div>

            <Button className="w-full mt-4" size="lg">
              Commencer
            </Button>
          </div>
        </Card>

        <Card
          className={`p-8 cursor-pointer transition-all duration-300 border-2 hover:border-primary hover:shadow-xl relative overflow-hidden ${
            hoveredMode === "aladin"
              ? "scale-[1.02] border-primary shadow-xl"
              : "border-border"
          }`}
          onMouseEnter={() => setHoveredMode("aladin")}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => setShowComingSoon(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

          <div className="relative flex flex-col items-center text-center space-y-6">
            <div className="relative pt-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <span className="text-5xl">🧞‍♂️</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-foreground">MyAladin</h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  100% IA
                </span>
              </div>
              <p className="text-muted-foreground">
                Expérience conversationnelle guidée par IA
              </p>
            </div>

            <div className="space-y-3 text-left w-full">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span>Dialoguez naturellement avec l'IA</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mic className="w-5 h-5 text-primary" />
                <span>Dictez vos observations vocalement</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileText className="w-5 h-5 text-primary" />
                <span>Rapport EDL généré automatiquement</span>
              </div>
            </div>

            <Button
              className="w-full mt-4 bg-primary hover:bg-primary/90"
              size="lg"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Essayer MyAladin
            </Button>
          </div>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground mt-8 text-center relative z-10">
        Vous pourrez changer de mode a tout moment
      </p>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-primary/20 via-background to-primary/10 border-primary/30 overflow-hidden" hideCloseButton>
          <DialogTitle className="sr-only">MyAladin Coming Soon</DialogTitle>
          
          <button
            onClick={() => setShowComingSoon(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center justify-center py-8 relative">
            {/* Lamp */}
            <div className="relative">
              <div className="text-6xl animate-[bounce_2s_ease-in-out_infinite]">
                🪔
              </div>
              
              {/* Magic sparkles */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="text-2xl animate-ping">✨</span>
              </div>
              <div className="absolute -top-2 -left-4">
                <span className="text-lg animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</span>
              </div>
              <div className="absolute -top-2 -right-4">
                <span className="text-lg animate-pulse" style={{ animationDelay: '0.6s' }}>⭐</span>
              </div>
            </div>

            {/* Genie emerging animation */}
            <div className="relative mt-4 animate-[scale-in_0.5s_ease-out_forwards]">
              <div 
                className="text-8xl"
                style={{
                  animation: 'float 3s ease-in-out infinite, genie-appear 0.8s ease-out forwards',
                }}
              >
                🧞‍♂️
              </div>
              
              {/* Magic smoke effect */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary/30 rounded-full blur-lg animate-pulse" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>

            {/* Speech bubble */}
            <div 
              className="relative mt-6 bg-card border border-border rounded-2xl px-6 py-4 shadow-lg animate-[fade-in_0.6s_ease-out_0.4s_forwards] opacity-0"
            >
              {/* Bubble tail */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-border" />
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-card" />
              
              <p className="text-lg font-medium text-center text-foreground">
                ✨ Bientôt ton vœu sera exaucé ✨
              </p>
            </div>

            {/* Coming Soon text */}
            <div 
              className="mt-8 animate-[fade-in_0.6s_ease-out_0.8s_forwards] opacity-0"
            >
              <div className="relative">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Coming Soon
                </h2>
                <div className="absolute inset-0 bg-primary/20 blur-xl -z-10 animate-pulse" />
              </div>
              <p className="text-muted-foreground text-center mt-2 text-sm">
                L'expérience 100% IA arrive bientôt
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes genie-appear {
          0% { 
            opacity: 0; 
            transform: scale(0.3) translateY(40px);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1) translateY(-5px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
