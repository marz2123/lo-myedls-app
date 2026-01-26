import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MyAladinNotifications } from "@/components/settings/MyAladinNotifications";
import { DateTimeSettings } from "@/components/settings/DateTimeSettings";
import { AccountDataSettings } from "@/components/settings/AccountDataSettings";
import { InterfaceCustomization } from "@/components/settings/InterfaceCustomization";
import { SecuritySettingsPanel } from "@/components/security";
import { LibraryHome } from "@/modules/myhome/library";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, Settings as SettingsIcon, Bell, Clock, ShieldCheck, Globe, Paintbrush, Shield, BookOpen, Lock } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type SettingSection = 'profile' | 'language' | 'datetime' | 'notifications' | 'account' | 'interface' | 'library' | 'security' | null;

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [openSection, setOpenSection] = useState<SettingSection>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        
        // Check admin status
        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(hasAdminRole || false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (!user) return null;

  const settingsCards = [
    {
      id: 'profile' as SettingSection,
      icon: User,
      title: t('cancel') === 'Annuler' ? 'Profil utilisateur' : 'User Profile',
      description: t('cancel') === 'Annuler' ? 'Informations de votre compte' : 'Your account information',
      adminOnly: false,
    },
    {
      id: 'interface' as SettingSection,
      icon: Paintbrush,
      title: t('cancel') === 'Annuler' ? 'Personnalisation' : 'Customization',
      description: t('cancel') === 'Annuler' ? 'Logo et couleurs' : 'Logo and colors',
      adminOnly: false,
    },
    {
      id: 'language' as SettingSection,
      icon: Globe,
      title: t('cancel') === 'Annuler' ? 'Langue' : 'Language',
      description: t('cancel') === 'Annuler' ? 'Interface multilingue' : 'Multilingual interface',
      adminOnly: false,
    },
    {
      id: 'datetime' as SettingSection,
      icon: Clock,
      title: t('cancel') === 'Annuler' ? 'Date et heure' : 'Date & Time',
      description: t('cancel') === 'Annuler' ? 'Fuseau horaire et horloge' : 'Timezone and clock',
      adminOnly: false,
    },
    {
      id: 'notifications' as SettingSection,
      icon: Bell,
      title: t('cancel') === 'Annuler' ? 'Notifications MyAladin' : 'MyAladin Notifications',
      description: t('cancel') === 'Annuler' ? 'Conseils et alertes' : 'Tips and alerts',
      adminOnly: false,
    },
    {
      id: 'account' as SettingSection,
      icon: ShieldCheck,
      title: t('cancel') === 'Annuler' ? 'Compte et données' : 'Account & Data',
      description: t('cancel') === 'Annuler' ? 'Sécurité et export' : 'Security and export',
      adminOnly: false,
    },
    {
      id: 'security' as SettingSection,
      icon: Lock,
      title: t('cancel') === 'Annuler' ? 'Sécurité & Protection' : 'Security & Protection',
      description: t('cancel') === 'Annuler' ? 'Chiffrement et sauvegardes' : 'Encryption and backups',
      adminOnly: false,
    },
    {
      id: 'library' as SettingSection,
      icon: BookOpen,
      title: t('cancel') === 'Annuler' ? 'Bibliothèque' : 'Library',
      description: t('cancel') === 'Annuler' ? 'Base de connaissances MyHome' : 'MyHome knowledge base',
      adminOnly: false,
    },
  ];

  const adminCard = isAdmin ? {
    icon: Shield,
    title: t('cancel') === 'Annuler' ? 'Panel Admin' : 'Admin Panel',
    description: t('cancel') === 'Annuler' ? 'Tableau de bord administrateur' : 'Administrator dashboard',
    onClick: () => navigate('/admin'),
  } : null;

  return (
    <div className="min-h-screen bg-background overflow-y-auto pb-safe">
      <Navbar />
      <main className="pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {t('cancel') === 'Annuler' ? 'Paramètres' : 'Settings'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('cancel') === 'Annuler' 
                  ? 'Gérez vos préférences et paramètres de l\'application'
                  : 'Manage your preferences and application settings'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Settings Cards Grid - Apple Style */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" role="region" aria-label={t('cancel') === 'Annuler' ? 'Sections de paramètres' : 'Settings sections'}>
            {settingsCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  className="flex flex-col items-center justify-start p-4 sm:p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group animate-fade-in min-h-[140px] sm:min-h-[160px]"
                  onClick={() => setOpenSection(card.id)}
                  aria-label={`${t('cancel') === 'Annuler' ? 'Ouvrir' : 'Open'} ${card.title}`}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-foreground text-center leading-tight">
                    {card.title}
                  </span>
                  <span className="text-xs text-muted-foreground text-center leading-tight mt-1.5 line-clamp-2">
                    {card.description}
                  </span>
                </button>
              );
            })}
            
            {/* Admin Panel Button */}
            {adminCard && (
              <button
                type="button"
                className="flex flex-col items-center justify-start p-4 sm:p-5 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group animate-fade-in min-h-[140px] sm:min-h-[160px]"
                onClick={adminCard.onClick}
                aria-label={`${t('cancel') === 'Annuler' ? 'Ouvrir' : 'Open'} ${adminCard.title}`}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                  <adminCard.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm sm:text-base font-semibold text-foreground text-center leading-tight">
                  {adminCard.title}
                </span>
                <span className="text-xs text-muted-foreground text-center leading-tight mt-1.5 line-clamp-2">
                  {adminCard.description}
                </span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Profile Dialog */}
      <Dialog open={openSection === 'profile'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in" aria-describedby="profile-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Profil utilisateur' : 'User Profile'}
            </DialogTitle>
            <DialogDescription id="profile-description">
              {t('cancel') === 'Annuler'
                ? 'Informations de votre compte'
                : 'Your account information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t('cancel') === 'Annuler' ? 'Email' : 'Email'}
              </label>
              <p className="text-foreground mt-1">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t('cancel') === 'Annuler' ? 'ID Utilisateur' : 'User ID'}
              </label>
              <p className="text-foreground mt-1 font-mono text-xs break-all">{user.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interface Customization Dialog */}
      <Dialog open={openSection === 'interface'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto animate-scale-in" aria-describedby="interface-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Personnalisation de l\'interface' : 'Interface Customization'}
            </DialogTitle>
            <DialogDescription id="interface-description">
              {t('cancel') === 'Annuler'
                ? 'Personnalisez votre logo et vos couleurs'
                : 'Customize your logo and colors'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <InterfaceCustomization />
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={openSection === 'language'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-2xl animate-scale-in" aria-describedby="language-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Langue' : 'Language'}
            </DialogTitle>
            <DialogDescription id="language-description">
              {t('cancel') === 'Annuler'
                ? 'Choisissez votre langue préférée'
                : 'Choose your preferred language'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LanguageSelector />
          </div>
        </DialogContent>
      </Dialog>

      {/* Date & Time Dialog */}
      <Dialog open={openSection === 'datetime'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto animate-scale-in" aria-describedby="datetime-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Date et heure' : 'Date & Time'}
            </DialogTitle>
            <DialogDescription id="datetime-description">
              {t('cancel') === 'Annuler'
                ? 'Configurez votre fuseau horaire et l\'affichage de l\'horloge'
                : 'Configure your timezone and clock display'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <DateTimeSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openSection === 'notifications'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in" aria-describedby="notifications-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Notifications MyAladin' : 'MyAladin Notifications'}
            </DialogTitle>
            <DialogDescription id="notifications-description">
              {t('cancel') === 'Annuler'
                ? 'Gérez vos préférences de conseils et notifications'
                : 'Manage your tips and notification preferences'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <MyAladinNotifications />
          </div>
        </DialogContent>
      </Dialog>

      {/* Account & Data Dialog */}
      <Dialog open={openSection === 'account'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto animate-scale-in" aria-describedby="account-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Compte et données' : 'Account & Data'}
            </DialogTitle>
            <DialogDescription id="account-description">
              {t('cancel') === 'Annuler'
                ? 'Gérez la sécurité de votre compte et exportez vos données'
                : 'Manage your account security and export your data'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <AccountDataSettings />
          </div>
        </DialogContent>
      </Dialog>

      {/* Library Dialog */}
      <Dialog open={openSection === 'library'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-4xl h-[85vh] p-0 animate-scale-in" aria-describedby="library-description">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Bibliothèque MyHome' : 'MyHome Library'}
            </DialogTitle>
            <DialogDescription id="library-description">
              {t('cancel') === 'Annuler'
                ? 'Base de connaissances BTP & Immobilier'
                : 'Construction & Real Estate knowledge base'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <LibraryHome />
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Dialog */}
      <Dialog open={openSection === 'security'} onOpenChange={(open) => !open && setOpenSection(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] p-0 animate-scale-in" aria-describedby="security-description">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t('cancel') === 'Annuler' ? 'Sécurité & Protection' : 'Security & Protection'}
            </DialogTitle>
            <DialogDescription id="security-description">
              {t('cancel') === 'Annuler'
                ? 'Chiffrement, sauvegardes et protection des données'
                : 'Encryption, backups and data protection'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <SecuritySettingsPanel />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
