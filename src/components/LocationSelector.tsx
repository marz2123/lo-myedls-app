import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Home, Building2, DoorOpen, X, Map, Upload, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { InteractiveFloorPlan } from "./InteractiveFloorPlan";
import { CustomFloorPlanUploader } from "./CustomFloorPlanUploader";
import { getLocationSuggestions } from "@/utils/locationSuggestions";

interface BuildingComposition {
  type: 'building' | 'house';
  commonAreas: string[];
  apartments: { name: string; rooms?: string[] }[];
  basements: string[];
  parking: string[];
  gardens: string[];
  others: string[];
}

interface LocationSelectorProps {
  generalLocation: string;
  roomLocation: string;
  onGeneralLocationChange: (value: string) => void;
  onRoomLocationChange: (value: string) => void;
  propertyType?: string;
  numberOfUnits?: number;
  projectId?: string;
  buildingComposition?: BuildingComposition | null;
}

export const LocationSelector = ({
  generalLocation,
  roomLocation,
  onGeneralLocationChange,
  onRoomLocationChange,
  propertyType = "apartment",
  numberOfUnits,
  projectId,
  buildingComposition,
}: LocationSelectorProps) => {
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  // Get contextual suggestions based on property type
  const suggestions = getLocationSuggestions(propertyType, isFrench);
  const generalSuggestions = suggestions.general;
  const roomSuggestions = suggestions.rooms;

  // Build zones from building composition
  const compositionZones = useMemo(() => {
    if (!buildingComposition) return null;
    
    const zones: { category: string; items: string[]; color: string }[] = [];
    
    if (buildingComposition.commonAreas?.length > 0) {
      zones.push({
        category: isFrench ? 'Parties communes' : 'Common Areas',
        items: buildingComposition.commonAreas,
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      });
    }
    
    if (buildingComposition.apartments?.length > 0) {
      zones.push({
        category: isFrench ? 'Logements' : 'Units',
        items: buildingComposition.apartments.map(apt => typeof apt === 'string' ? apt : apt.name),
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      });
    }
    
    if (buildingComposition.basements?.length > 0) {
      zones.push({
        category: isFrench ? 'Caves / Sous-sol' : 'Basements',
        items: buildingComposition.basements,
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      });
    }
    
    if (buildingComposition.parking?.length > 0) {
      zones.push({
        category: isFrench ? 'Parking' : 'Parking',
        items: buildingComposition.parking,
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
      });
    }
    
    if (buildingComposition.gardens?.length > 0) {
      zones.push({
        category: isFrench ? 'Extérieurs' : 'Outdoors',
        items: buildingComposition.gardens,
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      });
    }
    
    if (buildingComposition.others?.length > 0) {
      zones.push({
        category: isFrench ? 'Autres' : 'Others',
        items: buildingComposition.others,
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      });
    }
    
    return zones.length > 0 ? zones : null;
  }, [buildingComposition, isFrench]);

  // Check if building composition has content
  const hasComposition = compositionZones && compositionZones.length > 0;

  return (
    <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-accent/5 border border-primary/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-base">
          {isFrench ? 'Localisation de la visite' : 'Visit Location'}
        </h4>
      </div>

      <Tabs defaultValue={hasComposition ? "composition" : "quick"} className="w-full">
        <TabsList className={`grid w-full ${hasComposition ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {hasComposition && (
            <TabsTrigger value="composition" className="text-xs sm:text-sm">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {isFrench ? 'Structure' : 'Structure'}
            </TabsTrigger>
          )}
          <TabsTrigger value="quick" className="text-xs sm:text-sm">
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            {isFrench ? 'Rapide' : 'Quick'}
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs sm:text-sm">
            <Map className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            {isFrench ? 'Plan' : 'Plan'}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm">
            <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            {isFrench ? 'Perso' : 'Custom'}
          </TabsTrigger>
        </TabsList>

        {/* Building Composition Tab */}
        {hasComposition && (
          <TabsContent value="composition" className="space-y-4 mt-4">
            <div className="space-y-4">
              {compositionZones!.map((zone, zoneIdx) => (
                <div key={zoneIdx} className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {zone.category}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {zone.items.map((item, itemIdx) => (
                      <Button
                        key={itemIdx}
                        type="button"
                        variant={generalLocation === item ? "default" : "outline"}
                        size="sm"
                        onClick={() => onGeneralLocationChange(item)}
                        className={`text-xs h-8 ${generalLocation !== item ? zone.color : ''}`}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Location Section for Composition */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="composition-room-location" className="text-sm font-medium">
                  {isFrench ? 'Pièce spécifique' : 'Specific room'}
                  <span className="text-muted-foreground ml-1 font-normal text-xs">
                    ({isFrench ? 'optionnel' : 'optional'})
                  </span>
                </Label>
              </div>

              <div className="flex flex-wrap gap-2">
                {roomSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant={roomLocation === suggestion ? "default" : "outline"}
                    size="sm"
                    onClick={() => onRoomLocationChange(suggestion)}
                    className="text-xs h-8"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Input
                  id="composition-room-location"
                  type="text"
                  placeholder={isFrench 
                    ? 'Ou saisir une pièce personnalisée...'
                    : 'Or enter custom room...'}
                  value={roomLocation}
                  onChange={(e) => onRoomLocationChange(e.target.value)}
                  className="text-sm"
                />
                {roomLocation && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRoomLocationChange("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="quick" className="space-y-4 mt-4">

      {/* General Location Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="general-location" className="text-sm font-medium">
            {isFrench ? 'Zone générale' : 'General area'}
            <span className="text-muted-foreground ml-1 font-normal text-xs">
              ({isFrench ? 'optionnel' : 'optional'})
            </span>
          </Label>
        </div>

        {/* Quick selection buttons for general location */}
        <div className="flex flex-wrap gap-2">
          {generalSuggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant={generalLocation === suggestion ? "default" : "outline"}
              size="sm"
              onClick={() => onGeneralLocationChange(suggestion)}
              className="text-xs h-8"
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {/* Custom input for general location */}
        <div className="relative">
          <Input
            id="general-location"
            type="text"
            placeholder={isFrench 
              ? 'Ou saisir une zone personnalisée...'
              : 'Or enter custom area...'}
            value={generalLocation}
            onChange={(e) => onGeneralLocationChange(e.target.value)}
            className="text-sm"
          />
          {generalLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onGeneralLocationChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Room Location Section */}
      <div className="space-y-3 pt-2 border-t border-primary/10">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="room-location" className="text-sm font-medium">
            {isFrench ? 'Pièce spécifique' : 'Specific room'}
            <span className="text-muted-foreground ml-1 font-normal text-xs">
              ({isFrench ? 'optionnel' : 'optional'})
            </span>
          </Label>
        </div>

        {/* Quick selection buttons for rooms */}
        <div className="flex flex-wrap gap-2">
          {roomSuggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant={roomLocation === suggestion ? "default" : "outline"}
              size="sm"
              onClick={() => onRoomLocationChange(suggestion)}
              className="text-xs h-8"
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {/* Custom input for room */}
        <div className="relative">
          <Input
            id="room-location"
            type="text"
            placeholder={isFrench 
              ? 'Ou saisir une pièce personnalisée...'
              : 'Or enter custom room...'}
            value={roomLocation}
            onChange={(e) => onRoomLocationChange(e.target.value)}
            className="text-sm"
          />
          {roomLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRoomLocationChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

        </TabsContent>

        <TabsContent value="plan" className="space-y-4 mt-4">
          <InteractiveFloorPlan
            onZoneSelect={(zone) => {
              onGeneralLocationChange(zone);
            }}
            selectedZone={generalLocation}
            propertyType={propertyType}
            numberOfFloors={numberOfUnits}
          />
          
          {/* Room Location Section */}
          <div className="space-y-3 pt-2 border-t border-primary/10">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="plan-room-location" className="text-sm font-medium">
                {isFrench ? 'Pièce spécifique' : 'Specific room'}
                <span className="text-muted-foreground ml-1 font-normal text-xs">
                  ({isFrench ? 'optionnel' : 'optional'})
                </span>
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              {roomSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant={roomLocation === suggestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRoomLocationChange(suggestion)}
                  className="text-xs h-8"
                >
                  {suggestion}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Input
                id="plan-room-location"
                type="text"
                placeholder={isFrench 
                  ? 'Ou saisir une pièce personnalisée...'
                  : 'Or enter custom room...'}
                value={roomLocation}
                onChange={(e) => onRoomLocationChange(e.target.value)}
                className="text-sm"
              />
              {roomLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRoomLocationChange("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
          {projectId ? (
            <CustomFloorPlanUploader
              projectId={projectId}
              onZoneSelect={(zone) => {
                onGeneralLocationChange(zone);
              }}
              selectedZone={generalLocation}
            />
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <p className="text-sm">
                {isFrench
                  ? "Sauvegardez d'abord le projet pour utiliser les plans personnalisés"
                  : "Save the project first to use custom floor plans"}
              </p>
            </div>
          )}

          {/* Room Location Section */}
          <div className="space-y-3 pt-2 border-t border-primary/10">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="custom-room-location" className="text-sm font-medium">
                {isFrench ? 'Pièce spécifique' : 'Specific room'}
                <span className="text-muted-foreground ml-1 font-normal text-xs">
                  ({isFrench ? 'optionnel' : 'optional'})
                </span>
              </Label>
            </div>

            <div className="flex flex-wrap gap-2">
              {roomSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant={roomLocation === suggestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRoomLocationChange(suggestion)}
                  className="text-xs h-8"
                >
                  {suggestion}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Input
                id="custom-room-location"
                type="text"
                placeholder={isFrench 
                  ? 'Ou saisir une pièce personnalisée...'
                  : 'Or enter custom room...'}
                value={roomLocation}
                onChange={(e) => onRoomLocationChange(e.target.value)}
                className="text-sm"
              />
              {roomLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRoomLocationChange("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Current selection display */}
      {(generalLocation || roomLocation) && (
        <div className="pt-3 border-t border-primary/10">
          <div className="flex items-start gap-2">
            <Home className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">
                {isFrench ? 'Localisation sélectionnée :' : 'Selected location:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {generalLocation && (
                  <Badge variant="secondary" className="text-xs">
                    {generalLocation}
                  </Badge>
                )}
                {roomLocation && (
                  <Badge variant="secondary" className="text-xs">
                    🚪 {roomLocation}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
