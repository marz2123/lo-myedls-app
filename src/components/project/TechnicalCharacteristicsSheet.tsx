import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Droplets, Zap, Flame, Wifi, Phone, Wind, 
  Building2, Gauge, ArrowDown, ArrowUp, Compass,
  Mail, Settings, Thermometer, CircleDot, Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TechnicalCharacteristics {
  // Arrivées
  arrivals: {
    coldWater: { enabled: boolean; pressure?: string };
    electricity: { enabled: boolean; power?: string; connectionType?: string };
    gas: { enabled: boolean; type?: string };
    fuel: { enabled: boolean; tankCapacity?: string };
    fiber: { enabled: boolean };
    phoneDsl: { enabled: boolean };
  };
  // Évacuations
  evacuations: {
    wasteWater: { enabled: boolean };
    rainWater: { enabled: boolean };
    greyWater: { enabled: boolean };
    vmc: { enabled: boolean; type?: 'naturelle' | 'simple_flux' | 'double_flux' };
    chimney: { enabled: boolean; count?: number };
    smokeExtraction: { enabled: boolean };
  };
  // Équipements collectifs
  collectiveEquipment: {
    antennas: { enabled: boolean };
    mailboxes: { enabled: boolean; count?: number };
    electricalRoom: { enabled: boolean };
    gasRoom: { enabled: boolean };
    collectiveMeters: {
      water: boolean;
      electricity: boolean;
      gas: boolean;
      heating: boolean;
    };
    elevator: { enabled: boolean; brand?: string; year?: string };
  };
  // Périmètre & Dimensions
  perimeterDimensions: {
    facadeCount: number;
    insulatedWalls: boolean;
    sharedWalls: boolean;
    exposures: { north: boolean; south: boolean; east: boolean; west: boolean };
    totalHeight?: string;
    levels?: string;
    totalSurface?: string;
    commonAreasSurface?: string;
  };
}

const DEFAULT_CHARACTERISTICS: TechnicalCharacteristics = {
  arrivals: {
    coldWater: { enabled: false },
    electricity: { enabled: false },
    gas: { enabled: false },
    fuel: { enabled: false },
    fiber: { enabled: false },
    phoneDsl: { enabled: false },
  },
  evacuations: {
    wasteWater: { enabled: false },
    rainWater: { enabled: false },
    greyWater: { enabled: false },
    vmc: { enabled: false },
    chimney: { enabled: false },
    smokeExtraction: { enabled: false },
  },
  collectiveEquipment: {
    antennas: { enabled: false },
    mailboxes: { enabled: false },
    electricalRoom: { enabled: false },
    gasRoom: { enabled: false },
    collectiveMeters: {
      water: false,
      electricity: false,
      gas: false,
      heating: false,
    },
    elevator: { enabled: false },
  },
  perimeterDimensions: {
    facadeCount: 1,
    insulatedWalls: false,
    sharedWalls: false,
    exposures: { north: false, south: false, east: false, west: false },
  },
};

interface TechnicalCharacteristicsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TechnicalCharacteristics;
  onChange: (value: TechnicalCharacteristics) => void;
}

interface ToggleRowProps {
  icon: React.ElementType;
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
  iconColor?: string;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ 
  icon: Icon, 
  label, 
  enabled, 
  onToggle, 
  children,
  iconColor = 'text-primary'
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl bg-muted flex items-center justify-center")}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
    {enabled && children && (
      <div className="pl-12 space-y-3 animate-in slide-in-from-top-2 duration-200">
        {children}
      </div>
    )}
  </div>
);

export const TechnicalCharacteristicsSheet: React.FC<TechnicalCharacteristicsSheetProps> = ({
  open,
  onOpenChange,
  value,
  onChange,
}) => {
  const data = { ...DEFAULT_CHARACTERISTICS, ...value };

  const updateArrivals = (key: keyof typeof data.arrivals, updates: Partial<typeof data.arrivals[typeof key]>) => {
    onChange({
      ...data,
      arrivals: {
        ...data.arrivals,
        [key]: { ...data.arrivals[key], ...updates },
      },
    });
  };

  const updateEvacuations = (key: keyof typeof data.evacuations, updates: Partial<typeof data.evacuations[typeof key]>) => {
    onChange({
      ...data,
      evacuations: {
        ...data.evacuations,
        [key]: { ...data.evacuations[key], ...updates },
      },
    });
  };

  const updateCollectiveEquipment = (key: keyof Omit<typeof data.collectiveEquipment, 'collectiveMeters'>, updates: Partial<typeof data.collectiveEquipment[typeof key]>) => {
    onChange({
      ...data,
      collectiveEquipment: {
        ...data.collectiveEquipment,
        [key]: { ...data.collectiveEquipment[key], ...updates },
      },
    });
  };

  const updateCollectiveMeters = (key: keyof typeof data.collectiveEquipment.collectiveMeters, enabled: boolean) => {
    onChange({
      ...data,
      collectiveEquipment: {
        ...data.collectiveEquipment,
        collectiveMeters: {
          ...data.collectiveEquipment.collectiveMeters,
          [key]: enabled,
        },
      },
    });
  };

  const updatePerimeter = (updates: Partial<typeof data.perimeterDimensions>) => {
    onChange({
      ...data,
      perimeterDimensions: { ...data.perimeterDimensions, ...updates },
    });
  };

  const updateExposures = (key: keyof typeof data.perimeterDimensions.exposures, enabled: boolean) => {
    onChange({
      ...data,
      perimeterDimensions: {
        ...data.perimeterDimensions,
        exposures: { ...data.perimeterDimensions.exposures, [key]: enabled },
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <SheetHeader className="px-6 pb-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Caractéristiques techniques
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6 pb-24">
            {/* Section 1: Arrivées */}
            <Card className="border-0 shadow-sm bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-blue-500" />
                  Arrivées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 divide-y divide-border/50">
                <ToggleRow
                  icon={Droplets}
                  label="Eau froide"
                  iconColor="text-blue-500"
                  enabled={data.arrivals.coldWater.enabled}
                  onToggle={(enabled) => updateArrivals('coldWater', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pression (bars)</Label>
                    <Input
                      placeholder="Ex: 3"
                      value={data.arrivals.coldWater.pressure || ''}
                      onChange={(e) => updateArrivals('coldWater', { pressure: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Zap}
                  label="Électricité"
                  iconColor="text-yellow-500"
                  enabled={data.arrivals.electricity.enabled}
                  onToggle={(enabled) => updateArrivals('electricity', { enabled })}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Puissance (kVA)</Label>
                      <Input
                        placeholder="Ex: 36"
                        value={data.arrivals.electricity.power || ''}
                        onChange={(e) => updateArrivals('electricity', { power: e.target.value })}
                        className="h-10 rounded-xl bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Type raccordement</Label>
                      <Select
                        value={data.arrivals.electricity.connectionType || ''}
                        onValueChange={(v) => updateArrivals('electricity', { connectionType: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mono">Monophasé</SelectItem>
                          <SelectItem value="tri">Triphasé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Flame}
                  label="Gaz"
                  iconColor="text-orange-500"
                  enabled={data.arrivals.gas.enabled}
                  onToggle={(enabled) => updateArrivals('gas', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select
                      value={data.arrivals.gas.type || ''}
                      onValueChange={(v) => updateArrivals('gas', { type: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ville">Gaz de ville</SelectItem>
                        <SelectItem value="citerne">Citerne (propane)</SelectItem>
                        <SelectItem value="bouteille">Bouteilles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Thermometer}
                  label="Fuel"
                  iconColor="text-amber-700"
                  enabled={data.arrivals.fuel.enabled}
                  onToggle={(enabled) => updateArrivals('fuel', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Capacité cuve (L)</Label>
                    <Input
                      placeholder="Ex: 2000"
                      value={data.arrivals.fuel.tankCapacity || ''}
                      onChange={(e) => updateArrivals('fuel', { tankCapacity: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Wifi}
                  label="Fibre optique"
                  iconColor="text-green-500"
                  enabled={data.arrivals.fiber.enabled}
                  onToggle={(enabled) => updateArrivals('fiber', { enabled })}
                />

                <ToggleRow
                  icon={Phone}
                  label="Téléphone / ADSL"
                  iconColor="text-slate-500"
                  enabled={data.arrivals.phoneDsl.enabled}
                  onToggle={(enabled) => updateArrivals('phoneDsl', { enabled })}
                />
              </CardContent>
            </Card>

            {/* Section 2: Évacuations */}
            <Card className="border-0 shadow-sm bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUp className="w-4 h-4 text-emerald-500" />
                  Évacuations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 divide-y divide-border/50">
                <ToggleRow
                  icon={Droplets}
                  label="Eaux Usées (EU)"
                  iconColor="text-brown-500"
                  enabled={data.evacuations.wasteWater.enabled}
                  onToggle={(enabled) => updateEvacuations('wasteWater', { enabled })}
                />

                <ToggleRow
                  icon={Droplets}
                  label="Eaux Vannes (EV)"
                  iconColor="text-amber-600"
                  enabled={data.evacuations.greyWater.enabled}
                  onToggle={(enabled) => updateEvacuations('greyWater', { enabled })}
                />

                <ToggleRow
                  icon={Droplets}
                  label="Eaux Pluviales (EP)"
                  iconColor="text-sky-500"
                  enabled={data.evacuations.rainWater.enabled}
                  onToggle={(enabled) => updateEvacuations('rainWater', { enabled })}
                />

                <ToggleRow
                  icon={Wind}
                  label="VMC"
                  iconColor="text-cyan-500"
                  enabled={data.evacuations.vmc.enabled}
                  onToggle={(enabled) => updateEvacuations('vmc', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Type VMC</Label>
                    <Select
                      value={data.evacuations.vmc.type || ''}
                      onValueChange={(v) => updateEvacuations('vmc', { type: v as any })}
                    >
                      <SelectTrigger className="h-10 rounded-xl bg-muted/50">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="naturelle">Naturelle</SelectItem>
                        <SelectItem value="simple_flux">Simple flux</SelectItem>
                        <SelectItem value="double_flux">Double flux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Flame}
                  label="Conduit de fumée / Cheminée"
                  iconColor="text-red-500"
                  enabled={data.evacuations.chimney.enabled}
                  onToggle={(enabled) => updateEvacuations('chimney', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nombre de conduits</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 2"
                      value={data.evacuations.chimney.count || ''}
                      onChange={(e) => updateEvacuations('chimney', { count: parseInt(e.target.value) || undefined })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Wind}
                  label="Désenfumage / Exutoire"
                  iconColor="text-slate-500"
                  enabled={data.evacuations.smokeExtraction.enabled}
                  onToggle={(enabled) => updateEvacuations('smokeExtraction', { enabled })}
                />
              </CardContent>
            </Card>

            {/* Section 3: Équipements collectifs */}
            <Card className="border-0 shadow-sm bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-violet-500" />
                  Équipements collectifs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 divide-y divide-border/50">
                <ToggleRow
                  icon={CircleDot}
                  label="Antennes / Paraboles"
                  iconColor="text-slate-500"
                  enabled={data.collectiveEquipment.antennas.enabled}
                  onToggle={(enabled) => updateCollectiveEquipment('antennas', { enabled })}
                />

                <ToggleRow
                  icon={Mail}
                  label="Boîtes aux lettres"
                  iconColor="text-blue-500"
                  enabled={data.collectiveEquipment.mailboxes.enabled}
                  onToggle={(enabled) => updateCollectiveEquipment('mailboxes', { enabled })}
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 12"
                      value={data.collectiveEquipment.mailboxes.count || ''}
                      onChange={(e) => updateCollectiveEquipment('mailboxes', { count: parseInt(e.target.value) || undefined })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </ToggleRow>

                <ToggleRow
                  icon={Zap}
                  label="Local technique électricité"
                  iconColor="text-yellow-500"
                  enabled={data.collectiveEquipment.electricalRoom.enabled}
                  onToggle={(enabled) => updateCollectiveEquipment('electricalRoom', { enabled })}
                />

                <ToggleRow
                  icon={Flame}
                  label="Local technique gaz"
                  iconColor="text-orange-500"
                  enabled={data.collectiveEquipment.gasRoom.enabled}
                  onToggle={(enabled) => updateCollectiveEquipment('gasRoom', { enabled })}
                />

                {/* Compteurs collectifs */}
                <div className="py-3 space-y-3">
                  <Label className="text-sm font-medium">Compteurs collectifs</Label>
                  <div className="grid grid-cols-2 gap-3 pl-3">
                    {[
                      { key: 'water' as const, label: 'Eau', icon: Droplets, color: 'text-blue-500' },
                      { key: 'electricity' as const, label: 'Électricité', icon: Zap, color: 'text-yellow-500' },
                      { key: 'gas' as const, label: 'Gaz', icon: Flame, color: 'text-orange-500' },
                      { key: 'heating' as const, label: 'Chauffage', icon: Thermometer, color: 'text-red-500' },
                    ].map(({ key, label, icon: Icon, color }) => (
                      <div key={key} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                        <Checkbox
                          id={`meter-${key}`}
                          checked={data.collectiveEquipment.collectiveMeters[key]}
                          onCheckedChange={(checked) => updateCollectiveMeters(key, !!checked)}
                        />
                        <Icon className={cn("w-4 h-4", color)} />
                        <Label htmlFor={`meter-${key}`} className="text-sm cursor-pointer">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <ToggleRow
                  icon={ArrowUp}
                  label="Ascenseur"
                  iconColor="text-indigo-500"
                  enabled={data.collectiveEquipment.elevator.enabled}
                  onToggle={(enabled) => updateCollectiveEquipment('elevator', { enabled })}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Marque</Label>
                      <Input
                        placeholder="Ex: Otis"
                        value={data.collectiveEquipment.elevator.brand || ''}
                        onChange={(e) => updateCollectiveEquipment('elevator', { brand: e.target.value })}
                        className="h-10 rounded-xl bg-muted/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Année</Label>
                      <Input
                        placeholder="Ex: 2015"
                        value={data.collectiveEquipment.elevator.year || ''}
                        onChange={(e) => updateCollectiveEquipment('elevator', { year: e.target.value })}
                        className="h-10 rounded-xl bg-muted/50"
                      />
                    </div>
                  </div>
                </ToggleRow>
              </CardContent>
            </Card>

            {/* Section 4: Périmètre & Dimensions */}
            <Card className="border-0 shadow-sm bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-rose-500" />
                  Périmètre & Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nombre de façades */}
                <div className="space-y-2">
                  <Label className="text-sm">Nombre de façades</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updatePerimeter({ facadeCount: num })}
                        className={cn(
                          "flex-1 h-11 rounded-xl font-medium text-sm transition-all",
                          data.perimeterDimensions.facadeCount === num
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Murs isolés & Mitoyenneté */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <Label className="text-sm">Murs isolés</Label>
                    <Switch
                      checked={data.perimeterDimensions.insulatedWalls}
                      onCheckedChange={(checked) => updatePerimeter({ insulatedWalls: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <Label className="text-sm">Mitoyenneté</Label>
                    <Switch
                      checked={data.perimeterDimensions.sharedWalls}
                      onCheckedChange={(checked) => updatePerimeter({ sharedWalls: checked })}
                    />
                  </div>
                </div>

                {/* Expositions */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-muted-foreground" />
                    Expositions
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'north' as const, label: 'Nord', emoji: '⬆️' },
                      { key: 'south' as const, label: 'Sud', emoji: '⬇️' },
                      { key: 'east' as const, label: 'Est', emoji: '➡️' },
                      { key: 'west' as const, label: 'Ouest', emoji: '⬅️' },
                    ].map(({ key, label, emoji }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateExposures(key, !data.perimeterDimensions.exposures[key])}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                          data.perimeterDimensions.exposures[key]
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        <span className="text-lg">{emoji}</span>
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Hauteur totale (m)</Label>
                    <Input
                      placeholder="Ex: 15"
                      value={data.perimeterDimensions.totalHeight || ''}
                      onChange={(e) => updatePerimeter({ totalHeight: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nombre de niveaux</Label>
                    <Input
                      placeholder="Ex: R+4"
                      value={data.perimeterDimensions.levels || ''}
                      onChange={(e) => updatePerimeter({ levels: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Surface totale (m²)</Label>
                    <Input
                      placeholder="Facultatif"
                      value={data.perimeterDimensions.totalSurface || ''}
                      onChange={(e) => updatePerimeter({ totalSurface: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Surface PC (m²)</Label>
                    <Input
                      placeholder="Facultatif"
                      value={data.perimeterDimensions.commonAreasSurface || ''}
                      onChange={(e) => updatePerimeter({ commonAreasSurface: e.target.value })}
                      className="h-10 rounded-xl bg-muted/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-background flex-shrink-0">
          <Button 
            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg"
            onClick={() => onOpenChange(false)}
          >
            Valider
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TechnicalCharacteristicsSheet;
