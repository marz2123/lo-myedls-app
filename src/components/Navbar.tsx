import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, BarChart3, Home, Trophy, Settings, CheckCircle, BookOpen } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { CurrentDateTime } from "./CurrentDateTime";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useStructureStatus } from "@/hooks/useStructureStatus";

export const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isStructureImported } = useStructureStatus();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      });
    } else {
      toast({
        title: "✅ Déconnexion",
        description: "À bientôt !",
      });
      navigate("/auth");
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-all duration-300" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <h1 
                className="text-lg sm:text-xl lg:text-2xl font-bold text-primary cursor-pointer hover:opacity-80 transition-all duration-200"
                onClick={() => navigate("/")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/")}
                aria-label={t('cancel') === 'Annuler' ? 'Aller à l\'accueil' : 'Go to home'}
              >
                {t('appTitle')}
              </h1>
              {user && (
                <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2" role="menubar">
                  <Button
                    variant={location.pathname === "/" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/")}
                    className="gap-1 sm:gap-2 transition-all duration-200 px-2 sm:px-3"
                    aria-label={t('cancel') === 'Annuler' ? 'Aller à l\'accueil' : 'Go to home'}
                    aria-current={location.pathname === "/" ? "page" : undefined}
                  >
                    <Home className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:inline">
                      {t('cancel') === 'Annuler' ? 'Accueil' : 'Home'}
                    </span>
                  </Button>
                <Button
                  variant={location.pathname === "/settings" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="gap-1 sm:gap-2 relative transition-all duration-200 px-2 sm:px-3"
                  aria-label={t('cancel') === 'Annuler' ? 'Aller aux paramètres' : 'Go to settings'}
                  aria-current={location.pathname === "/settings" ? "page" : undefined}
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden lg:inline">
                    {t('cancel') === 'Annuler' ? 'Paramètres' : 'Settings'}
                  </span>
                  {isStructureImported && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-green-500 hover:bg-green-600 border-0"
                    >
                      <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                    </Badge>
                  )}
                </Button>
                  <Button
                    variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="gap-1 sm:gap-2 transition-all duration-200 px-2 sm:px-3"
                    aria-label={t('cancel') === 'Annuler' ? 'Aller au tableau de bord' : 'Go to dashboard'}
                    aria-current={location.pathname === "/dashboard" ? "page" : undefined}
                  >
                    <BarChart3 className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:inline">
                      {t('cancel') === 'Annuler' ? 'Tableau de bord' : 'Dashboard'}
                    </span>
                  </Button>
                  <Button
                    variant={location.pathname === "/library" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/library")}
                    className="gap-1 sm:gap-2 transition-all duration-200 px-2 sm:px-3"
                    aria-label={t('cancel') === 'Annuler' ? 'Ouvrir la bibliothèque' : 'Open library'}
                    aria-current={location.pathname === "/library" ? "page" : undefined}
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:inline">
                      {t('cancel') === 'Annuler' ? 'Bibliothèque' : 'Library'}
                    </span>
                  </Button>
                  <Button
                    variant={location.pathname === "/achievements" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/achievements")}
                    className="gap-1 sm:gap-2 transition-all duration-200 px-2 sm:px-3"
                    aria-label={t('cancel') === 'Annuler' ? 'Voir les badges' : 'View badges'}
                    aria-current={location.pathname === "/achievements" ? "page" : undefined}
                  >
                    <Trophy className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:inline">
                      {t('cancel') === 'Annuler' ? 'Badges' : 'Badges'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 sm:gap-2 lg:gap-4">
              {user && <CurrentDateTime />}
              <ThemeToggle />
              <LanguageSelector />
              {user && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1 sm:gap-2 transition-all duration-200 hover-scale px-2 sm:px-3"
                  aria-label={t('cancel') === 'Annuler' ? 'Se déconnecter' : 'Logout'}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden lg:inline">
                    {t('cancel') === 'Annuler' ? 'Déconnexion' : 'Logout'}
                  </span>
                </Button>
              )}
            </div>
        </div>
      </div>
    </nav>
    </>
  );
};
