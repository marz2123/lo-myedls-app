import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Snowfall, ChristmasLights } from "@/components/SeasonalDecorations";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    let hasResolved = false;

    // Timeout très court (2 secondes) pour éviter le freeze
    timeoutId = setTimeout(() => {
      if (isMounted && !hasResolved) {
        console.warn('[Auth] Auth check timeout (2s) - déblocage immédiat');
        hasResolved = true;
        setCheckingAuth(false);
      }
    }, 2000);

    // Check if user is already logged in avec race condition
    const sessionPromise = supabase.auth.getSession();
    
    Promise.race([
      sessionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1500)
      )
    ])
      .then((result: any) => {
        if (hasResolved || !isMounted) return;
        hasResolved = true;
        clearTimeout(timeoutId);

        const { data: { session }, error } = result;

        if (error) {
          console.error('[Auth] Error getting session:', error);
          setCheckingAuth(false);
          return;
        }

        if (session) {
          navigate("/");
        }
        setCheckingAuth(false);
      })
      .catch((error) => {
        if (hasResolved || !isMounted) return;
        hasResolved = true;
        clearTimeout(timeoutId);
        console.error('[Auth] Failed to get session (network/timeout):', error.message);
        setCheckingAuth(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => {
      isMounted = false;
      hasResolved = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
        description: t('cancel') === 'Annuler' 
          ? "Veuillez remplir tous les champs" 
          : "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: t('cancel') === 'Annuler' ? "Erreur de connexion" : "Login error",
            description: t('cancel') === 'Annuler' 
              ? "Email ou mot de passe incorrect" 
              : "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t('cancel') === 'Annuler' ? "Connexion reussie" : "Login successful",
          description: t('cancel') === 'Annuler' 
            ? "Bienvenue !" 
            : "Welcome!",
        });
      }
    } catch (error) {
      toast({
        title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
        description: t('cancel') === 'Annuler' 
          ? "Une erreur est survenue" 
          : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
        description: t('cancel') === 'Annuler' 
          ? "Veuillez remplir tous les champs" 
          : "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
        description: t('cancel') === 'Annuler' 
          ? "Le mot de passe doit contenir au moins 6 caractères" 
          : "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: t('cancel') === 'Annuler' ? "Compte existant" : "Account exists",
            description: t('cancel') === 'Annuler' 
              ? "Ce compte existe déjà. Veuillez vous connecter." 
              : "This account already exists. Please login.",
            variant: "destructive",
          });
        } else {
          toast({
            title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t('cancel') === 'Annuler' ? "Compte cree" : "Account created",
          description: t('cancel') === 'Annuler' 
            ? "Vous pouvez maintenant vous connecter" 
            : "You can now login",
        });
      }
    } catch (error) {
      toast({
        title: t('cancel') === 'Annuler' ? "Erreur" : "Error",
        description: t('cancel') === 'Annuler' 
          ? "Une erreur est survenue" 
          : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 gap-4 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Vérification de la session...
        </p>
        <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
          Si cette page reste affichée, vérifiez votre connexion Internet
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCheckingAuth(false);
          }}
          className="mt-4"
        >
          Continuer sans vérification
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-900/10 via-background to-blue-900/10 p-4 relative overflow-y-auto pb-safe">
      {/* Seasonal Decorations */}
      <Snowfall />
      <ChristmasLights />
      
      {/* Winter decorative elements */}
      <div className="absolute top-20 left-10 text-5xl opacity-20 animate-ornament pointer-events-none">🎄</div>
      <div className="absolute top-32 right-20 text-4xl opacity-20 animate-ornament pointer-events-none" style={{ animationDelay: '0.5s' }}>⭐</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-20 animate-ornament pointer-events-none" style={{ animationDelay: '1s' }}>🎁</div>
      <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-ornament pointer-events-none" style={{ animationDelay: '1.5s' }}>❄️</div>
      
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-2 relative z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
              <Building2 className="w-8 h-8 text-primary" />
              <img 
                src="/images/santa-hat.png" 
                alt=""
                className="absolute -top-4 -right-2 w-8 h-8 transform rotate-12"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold festive-text">MyEDLs</CardTitle>
            <CardDescription className="text-base mt-2">
              {t('cancel') === 'Annuler' 
                ? "Gestion intelligente de vos etats des lieux pour un projet"
                : 'Smart management of your property inspections for a project'}
            </CardDescription>
            <p className="text-xs text-primary/80 mt-2 font-medium">
              🎄 Joyeuses Fêtes ! Happy Holidays! 🎅
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="pb-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">
                {t('cancel') === 'Annuler' ? 'Connexion' : 'Login'}
              </TabsTrigger>
              <TabsTrigger value="signup">
                {t('cancel') === 'Annuler' ? 'Inscription' : 'Sign up'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">
                    {t('cancel') === 'Annuler' ? 'Mot de passe' : 'Password'}
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('cancel') === 'Annuler' ? 'Connexion...' : 'Logging in...'}
                    </>
                  ) : (
                    t('cancel') === 'Annuler' ? 'Se connecter' : 'Login'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    {t('cancel') === 'Annuler' ? 'Mot de passe' : 'Password'}
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('cancel') === 'Annuler' 
                      ? 'Minimum 6 caractères'
                      : 'Minimum 6 characters'}
                  </p>
                </div>
                
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('cancel') === 'Annuler' ? 'Création...' : 'Creating...'}
                    </>
                  ) : (
                    t('cancel') === 'Annuler' ? 'Créer un compte' : 'Create account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
