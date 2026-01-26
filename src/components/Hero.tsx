import { ClipboardList, FolderOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/hero-construction.jpg";
import { Snowfall } from "@/components/SeasonalDecorations";

interface HeroProps {
  onStartInspection: () => void;
  onViewProjects: () => void;
  onChangeMode?: () => void;
}

export const Hero = ({ onStartInspection, onViewProjects, onChangeMode }: HeroProps) => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Seasonal Snow Effect - reduced z-index to avoid overlap */}
      <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
        <Snowfall />
      </div>

      {/* Change Mode Button */}
      {onChangeMode && (
        <Button
          onClick={onChangeMode}
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 z-20 text-white/80 hover:text-white hover:bg-white/20 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('cancel') === 'Annuler' ? 'Changer de mode' : 'Change mode'}</span>
        </Button>
      )}
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Construction blueprints and tools" 
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* Winter-themed overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/95 via-primary/85 to-blue-900/90" />
      </div>

      {/* Decorative winter elements - positioned lower to avoid navbar */}
      <div className="absolute top-28 left-4 sm:left-10 text-3xl sm:text-4xl opacity-20 animate-ornament z-[2]">🎄</div>
      <div className="absolute top-40 right-4 sm:right-16 text-2xl sm:text-3xl opacity-20 animate-ornament z-[2]" style={{ animationDelay: '0.5s' }}>⭐</div>
      <div className="absolute bottom-32 left-4 sm:left-16 text-2xl sm:text-3xl opacity-20 animate-ornament z-[2]" style={{ animationDelay: '1s' }}>🎁</div>
      <div className="absolute bottom-20 right-4 sm:right-10 text-3xl sm:text-4xl opacity-20 animate-ornament z-[2]" style={{ animationDelay: '1.5s' }}>❄️</div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16 text-center animate-fade-in">
        {/* Seasonal greeting - inline with title */}
        <p className="text-white/80 text-xs sm:text-sm mb-3 font-medium">
          🎄 Joyeuses Fêtes ! Happy Holidays! 🎅
        </p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight relative" role="heading" aria-level={1}>
            {t('appTitle')}
            <img 
              src="/images/santa-hat.png" 
              alt=""
              className="absolute -top-5 sm:-top-7 -right-4 sm:-right-6 w-8 h-8 sm:w-12 sm:h-12 transform rotate-12 drop-shadow-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </h1>
        </div>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-3 sm:mb-4 max-w-3xl mx-auto px-2">
          {t('appDescription')}
        </p>
        <p className="text-sm sm:text-base lg:text-lg text-white/80 mb-8 sm:mb-10 lg:mb-12 max-w-2xl mx-auto px-2">
          {t('appSubtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 px-2">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-center w-full max-w-2xl">
            <Button 
              onClick={onStartInspection}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto shadow-xl hover:shadow-2xl transition-all duration-300 w-full sm:w-auto hover-scale"
              aria-label={t('cancel') === 'Annuler' ? 'Créer un nouveau rapport d\'état des lieux' : 'Create a new inspection report'}
            >
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" aria-hidden="true" />
              {t('cancel') === 'Annuler' ? 'Nouveau EDL' : 'New Report'}
            </Button>
            
            <Button 
              onClick={onViewProjects}
              size="lg"
              variant="outline"
              className="bg-white/10 text-white border-2 border-white hover:bg-white/20 font-semibold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto shadow-xl hover:shadow-2xl transition-all duration-300 w-full sm:w-auto hover-scale"
              aria-label={t('cancel') === 'Annuler' ? 'Voir mes rapports en cours' : 'View my reports'}
            >
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" aria-hidden="true" />
              {t('cancel') === 'Annuler' ? 'Mes EDLs en cours' : 'My Reports'}
            </Button>
          </div>
          
          <p className="text-white/70 text-xs sm:text-sm max-w-md px-2">
            {t('cancel') === 'Annuler' 
              ? 'Photos, vidéos, descriptions vocales ou écrites - Tous les formats pour documenter votre visite' 
              : 'Photos, videos, voice or written descriptions - All formats to document your visit'}
          </p>
        </div>
      </div>
    </section>
  );
};