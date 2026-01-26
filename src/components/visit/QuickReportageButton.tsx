import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Mic,
  Camera,
  Video,
  ChevronRight,
  MapPin,
  Clock,
  Sparkles,
  Building2,
  Home,
  ArrowLeft,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ZoneProblemCapture } from './ZoneProblemCapture';
import { ZONE_TYPE_LABELS, type ZoneType } from '@/types/businessModel';

interface QuickReportageButtonProps {
  projectId: string;
  partiesCommunes: Array<{ id: string; name: string; type: string }>;
  partiesPrivatives: Array<{ id: string; name: string; type: string; numero?: string; pieces?: Array<{ id: string; type: string; name: string }> }>;
}

interface RecentLocation {
  locationId: string;
  locationName: string;
  endroitName?: string;
  zoneType: ZoneType;
  zoneName: string;
  partieType: 'commune' | 'privative';
  partieName: string;
  lieuName: string;
  timestamp: number;
}

const RECENT_LOCATIONS_KEY = 'myedls_recent_locations';
const MAX_RECENT = 5;

// Zones standardisées (cohérentes avec le modèle métier)
const makeZone = (id: ZoneType, emoji: string) => ({
  id,
  emoji,
  label: ZONE_TYPE_LABELS[id] || id,
});

type QuickZoneOption = { id: ZoneType; label: string; emoji: string };

const INTERIOR_ZONES: QuickZoneOption[] = [
  makeZone('murs', '🧱'),
  makeZone('sol', '🪨'),
  makeZone('plafond', '⬜'),
  makeZone('menuiseries', '🪟'),
  makeZone('electricite', '⚡'),
  makeZone('plomberie', '🚰'),
  makeZone('equipements', '🧰'),
];

const FACADE_ZONES: QuickZoneOption[] = [
  makeZone('facade', '🏢'),
  makeZone('menuiseries', '🪟'),
  makeZone('electricite', '⚡'),
  makeZone('equipements', '🧰'),
];

const TOITURE_ZONES: QuickZoneOption[] = [
  makeZone('toiture', '🏠'),
  makeZone('electricite', '⚡'),
  makeZone('equipements', '🧰'),
];

const PARKING_ZONES: QuickZoneOption[] = [
  makeZone('sol', '🪨'),
  makeZone('murs', '🧱'),
  makeZone('electricite', '⚡'),
  makeZone('equipements', '🧰'),
];

const EXTERIOR_ZONES: QuickZoneOption[] = [
  makeZone('sol', '🪨'),
  makeZone('murs', '🧱'),
  makeZone('electricite', '⚡'),
  makeZone('equipements', '🧰'),
];

const getQuickZonesForLieu = (input?: { type?: string; name?: string }): QuickZoneOption[] => {
  const raw = `${input?.type || ''} ${input?.name || ''}`.trim().toLowerCase();
  const t = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '');

  if (t.includes('facade') || t.includes('pignon') || t.includes('mur exter')) return FACADE_ZONES;
  if (t.includes('toiture') || t.includes('toit') || t.includes('terrasse')) return TOITURE_ZONES;
  if (t.includes('parking') || t.includes('garage') || t.includes('box')) return PARKING_ZONES;
  if (t.includes('jardin') || t.includes('cour') || t.includes('exterieur')) return EXTERIOR_ZONES;

  return INTERIOR_ZONES;
};

export const QuickReportageButton = ({
  projectId,
  partiesCommunes,
  partiesPrivatives,
}: QuickReportageButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [selectedRecent, setSelectedRecent] = useState<RecentLocation | null>(null);
  const [selectedQuickZone, setSelectedQuickZone] = useState<QuickZoneOption | null>(null);
  const [view, setView] = useState<'main' | 'select-location'>('main');
  
  // Selected state for manual selection
  const [selectedPartie, setSelectedPartie] = useState<'commune' | 'privative' | null>(null);
  const [selectedLieu, setSelectedLieu] = useState<{ id: string; name: string; type: string; pieces?: Array<{ id: string; type: string; name: string }> } | null>(null);
  const [selectedEndroit, setSelectedEndroit] = useState<{ id: string; type: string; name: string } | null>(null);

  // Load recent locations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${RECENT_LOCATIONS_KEY}_${projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentLocations(parsed.slice(0, MAX_RECENT));
      }
    } catch (e) {
      console.error('Error loading recent locations:', e);
    }
  }, [projectId]);

  // Save recent location
  const saveRecentLocation = (location: RecentLocation) => {
    const updated = [
      location,
      ...recentLocations.filter(
        (l) => !(l.locationId === location.locationId && l.zoneType === location.zoneType && l.endroitName === location.endroitName)
      ),
    ].slice(0, MAX_RECENT);
    setRecentLocations(updated);
    localStorage.setItem(`${RECENT_LOCATIONS_KEY}_${projectId}`, JSON.stringify(updated));
  };

  // Handle quick zone selection from recent
  const handleRecentSelect = (recent: RecentLocation) => {
    setSelectedRecent(recent);
    saveRecentLocation({ ...recent, timestamp: Date.now() });
    setShowCapture(true);
  };

  // Handle zone selection with location path
  const handleZoneSelect = (zone: QuickZoneOption) => {
    if (selectedLieu) {
      const partieType = selectedPartie!;
      const partieName = partieType === 'commune' ? 'Communes' : 'Privatives';

      setSelectedRecent({
        locationId: selectedLieu.id,
        locationName: selectedLieu.name,
        endroitName: selectedEndroit?.name,
        zoneType: zone.id,
        zoneName: zone.label,
        partieType,
        partieName,
        lieuName: selectedLieu.name,
        timestamp: Date.now(),
      });
      setSelectedQuickZone(zone);
      setShowCapture(true);
    }
  };

  // Handle capture complete
  const handleCaptureComplete = () => {
    if (selectedRecent) {
      saveRecentLocation({ ...selectedRecent, timestamp: Date.now() });
    }
    setShowCapture(false);
    setSelectedRecent(null);
    setSelectedQuickZone(null);
    setSelectedPartie(null);
    setSelectedLieu(null);
    setSelectedEndroit(null);
    setView('main');
    // Keep sheet open for quick successive captures
  };

  const handleClose = () => {
    setIsOpen(false);
    setView('main');
    setSelectedPartie(null);
    setSelectedLieu(null);
    setSelectedEndroit(null);
    setSelectedRecent(null);
    setSelectedQuickZone(null);
  };

  const getLieux = () => {
    if (selectedPartie === 'commune') {
      return partiesCommunes.map((p) => ({ ...p, pieces: [] }));
    }
    return partiesPrivatives;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <div className="relative">
          <Plus className="h-8 w-8" />
          <Zap className="h-3.5 w-3.5 absolute -top-1 -right-1 text-yellow-300" />
        </div>
      </button>

      {/* Quick Access Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] rounded-t-3xl p-0 flex flex-col overflow-hidden"
          hideCloseButton
        >
          <SheetHeader className="px-4 py-4 border-b bg-muted/50 flex-shrink-0">
            <div className="flex items-center">
              {view !== 'main' ? (
                <button
                  onClick={() => {
                    if (selectedEndroit) {
                      setSelectedEndroit(null);
                    } else if (selectedLieu) {
                      setSelectedLieu(null);
                    } else if (selectedPartie) {
                      setSelectedPartie(null);
                    } else {
                      setView('main');
                    }
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/80"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-10" />
              )}
              <div className="flex-1 text-center">
                <SheetTitle className="text-lg font-bold flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Capture Rapide
                </SheetTitle>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4 pb-20">
              
              {/* Main View */}
              {view === 'main' && !selectedPartie && (
                <>
                  {/* Recent Locations */}
                  {recentLocations.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Récents</span>
                      </div>
                      <div className="space-y-2">
                        {recentLocations.map((recent, i) => (
                          <button
                            key={`${recent.locationId}-${recent.zoneType}-${i}`}
                            onClick={() => handleRecentSelect(recent)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 active:scale-[0.98] transition-all"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                              {ZONE_TYPE_LABELS[recent.zoneType]?.charAt(0) || '📍'}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold">
                                {recent.zoneName} • {recent.endroitName || recent.locationName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {recent.partieType === 'commune' ? 'Communes' : 'Privatives'} › {recent.lieuName}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Location */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Nouvelle zone</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedPartie('commune')}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/5 border-2 border-blue-500/20 hover:bg-blue-500/10 active:scale-[0.98] transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-semibold">Communes</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {partiesCommunes.length} lieux
                        </Badge>
                      </button>

                      <button
                        onClick={() => setSelectedPartie('privative')}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/5 border-2 border-emerald-500/20 hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <Home className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-semibold">Privatives</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {partiesPrivatives.length} lieux
                        </Badge>
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 px-1 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Conseil terrain</span>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">💡 Astuce :</span> Utilisez le micro 🎤 pour dicter rapidement vos observations. L'IA corrige automatiquement le texte.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Lieu Selection */}
              {selectedPartie && !selectedLieu && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    Sélectionner un lieu
                  </p>
                  {getLieux().map((lieu) => (
                    <button
                      key={lieu.id}
                      onClick={() => setSelectedLieu(lieu as any)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 active:scale-[0.98] transition-all"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedPartie === 'commune' ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        {selectedPartie === 'commune' ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                      </div>
                      <span className="flex-1 text-left font-medium">{lieu.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Endroit Selection (if pieces exist) */}
              {selectedLieu && selectedLieu.pieces && selectedLieu.pieces.length > 0 && !selectedEndroit && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    Sélectionner un endroit dans {selectedLieu.name}
                  </p>
                  {/* Vue globale option */}
                  <button
                    onClick={() => setSelectedEndroit({ id: 'global', type: 'global', name: 'Vue globale' })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 active:scale-[0.98] transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      👁️
                    </div>
                    <span className="flex-1 text-left font-medium">Vue globale</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {selectedLieu.pieces.map((piece) => (
                    <button
                      key={piece.id}
                      onClick={() => setSelectedEndroit(piece)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 active:scale-[0.98] transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        📍
                      </div>
                      <span className="flex-1 text-left font-medium">{piece.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Zone Selection */}
              {selectedLieu && (selectedEndroit || !selectedLieu.pieces || selectedLieu.pieces.length === 0) && !showCapture && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-1">
                    Sélectionner une zone
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {getQuickZonesForLieu({ type: selectedLieu.type, name: selectedLieu.name }).map((zone) => (
                      <button
                        key={zone.id}
                        onClick={() => handleZoneSelect(zone)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:bg-primary/5 hover:border-primary/30 active:scale-[0.95] transition-all"
                      >
                        <span className="text-2xl">{zone.emoji}</span>
                        <span className="text-xs font-medium">{zone.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Problem Capture Dialog */}
      {showCapture && selectedRecent && (
        <ZoneProblemCapture
          open={showCapture}
          onOpenChange={setShowCapture}
          projectId={projectId}
          locationId={selectedRecent.locationId}
          locationName={selectedRecent.locationName}
          zoneType={selectedRecent.zoneType}
          partieType={selectedRecent.partieType}
          partieName={selectedRecent.partieName}
          lieuName={selectedRecent.lieuName}
          endroitName={selectedRecent.endroitName}
          onComplete={handleCaptureComplete}
        />
      )}
    </>
  );
};
