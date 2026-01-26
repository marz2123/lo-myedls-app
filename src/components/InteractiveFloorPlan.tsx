import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Maximize2, Minimize2, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface InteractiveFloorPlanProps {
  onZoneSelect: (zone: string) => void;
  selectedZone?: string;
  propertyType?: string;
  numberOfFloors?: number;
}

interface Zone {
  id: string;
  label: string;
  labelEn: string;
  path: string;
  center: { x: number; y: number };
}

export const InteractiveFloorPlan = ({
  onZoneSelect,
  selectedZone,
  propertyType = "apartment",
  numberOfFloors = 1,
}: InteractiveFloorPlanProps) => {
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0);

  const isBuilding = propertyType === "building" && numberOfFloors > 1;

  // Generate zones based on property type and floor
  const getZonesForFloor = (floor: number): Zone[] => {
    if (propertyType === "building" && numberOfFloors > 1) {
      // Building with multiple floors
      if (floor === 0) {
        // Ground floor - common areas
        return [
          {
            id: "entree-principale",
            label: "Entrée principale",
            labelEn: "Main entrance",
            path: "M 250 50 L 350 50 L 350 150 L 250 150 Z",
            center: { x: 300, y: 100 },
          },
          {
            id: "hall",
            label: "Hall",
            labelEn: "Hall",
            path: "M 150 150 L 450 150 L 450 300 L 150 300 Z",
            center: { x: 300, y: 225 },
          },
          {
            id: "escalier",
            label: "Cage d'escalier",
            labelEn: "Stairwell",
            path: "M 250 300 L 350 300 L 350 450 L 250 450 Z",
            center: { x: 300, y: 375 },
          },
          {
            id: "local-velos",
            label: "Local vélos",
            labelEn: "Bike storage",
            path: "M 50 300 L 150 300 L 150 450 L 50 450 Z",
            center: { x: 100, y: 375 },
          },
          {
            id: "local-poubelles",
            label: "Local poubelles",
            labelEn: "Trash room",
            path: "M 450 300 L 550 300 L 550 450 L 450 450 Z",
            center: { x: 500, y: 375 },
          },
        ];
      } else {
        // Upper floor - apartments
        return [
          {
            id: `palier-etage-${floor}`,
            label: `Palier étage ${floor}`,
            labelEn: `Floor ${floor} landing`,
            path: "M 250 50 L 350 50 L 350 200 L 250 200 Z",
            center: { x: 300, y: 125 },
          },
          {
            id: `appt-${floor}-1`,
            label: `Appartement ${floor}A`,
            labelEn: `Apartment ${floor}A`,
            path: "M 50 200 L 250 200 L 250 400 L 50 400 Z",
            center: { x: 150, y: 300 },
          },
          {
            id: `appt-${floor}-2`,
            label: `Appartement ${floor}B`,
            labelEn: `Apartment ${floor}B`,
            path: "M 350 200 L 550 200 L 550 400 L 350 400 Z",
            center: { x: 450, y: 300 },
          },
          {
            id: `appt-${floor}-3`,
            label: `Appartement ${floor}C`,
            labelEn: `Apartment ${floor}C`,
            path: "M 50 400 L 250 400 L 250 600 L 50 600 Z",
            center: { x: 150, y: 500 },
          },
          {
            id: `appt-${floor}-4`,
            label: `Appartement ${floor}D`,
            labelEn: `Apartment ${floor}D`,
            path: "M 350 400 L 550 400 L 550 600 L 350 600 Z",
            center: { x: 450, y: 500 },
          },
        ];
      }
    }

    // Default apartment/house layout
    return [
      {
        id: "facade-avant",
        label: "Façade avant",
        labelEn: "Front facade",
        path: "M 50 50 L 550 50 L 550 150 L 50 150 Z",
        center: { x: 300, y: 100 },
      },
      {
        id: "entree",
        label: "Entrée",
        labelEn: "Entrance",
        path: "M 250 150 L 350 150 L 350 250 L 250 250 Z",
        center: { x: 300, y: 200 },
      },
      {
        id: "salon",
        label: "Salon",
        labelEn: "Living room",
        path: "M 50 150 L 250 150 L 250 400 L 50 400 Z",
        center: { x: 150, y: 275 },
      },
      {
        id: "cuisine",
        label: "Cuisine",
        labelEn: "Kitchen",
        path: "M 350 150 L 550 150 L 550 300 L 350 300 Z",
        center: { x: 450, y: 225 },
      },
      {
        id: "couloir",
        label: "Couloir",
        labelEn: "Hallway",
        path: "M 250 250 L 350 250 L 350 500 L 250 500 Z",
        center: { x: 300, y: 375 },
      },
      {
        id: "salle-de-bain",
        label: "Salle de bain",
        labelEn: "Bathroom",
        path: "M 350 300 L 550 300 L 550 450 L 350 450 Z",
        center: { x: 450, y: 375 },
      },
      {
        id: "chambre-1",
        label: "Chambre 1",
        labelEn: "Bedroom 1",
        path: "M 50 400 L 250 400 L 250 550 L 50 550 Z",
        center: { x: 150, y: 475 },
      },
      {
        id: "chambre-2",
        label: "Chambre 2",
        labelEn: "Bedroom 2",
        path: "M 350 450 L 550 450 L 550 550 L 350 550 Z",
        center: { x: 450, y: 500 },
      },
      {
        id: "facade-arriere",
        label: "Façade arrière",
        labelEn: "Back facade",
        path: "M 50 550 L 550 550 L 550 600 L 50 600 Z",
        center: { x: 300, y: 575 },
      },
    ];
  };

  const zones = getZonesForFloor(currentFloor);

  const handleZoneClick = (zone: Zone) => {
    const label = isFrench ? zone.label : zone.labelEn;
    onZoneSelect(label);
  };

  const getZoneFillColor = (zoneId: string) => {
    if (selectedZone && zones.find(z => z.id === zoneId && (isFrench ? z.label : z.labelEn) === selectedZone)) {
      return "hsl(var(--primary))";
    }
    if (hoveredZone === zoneId) {
      return "hsl(var(--primary) / 0.3)";
    }
    return "hsl(var(--muted))";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <h4 className="text-sm font-medium">
              {isFrench ? 'Plan interactif' : 'Interactive Floor Plan'}
            </h4>
            {isBuilding && (
              <p className="text-xs text-muted-foreground">
                {isFrench
                  ? `Étage ${currentFloor} / ${numberOfFloors - 1}`
                  : `Floor ${currentFloor} / ${numberOfFloors - 1}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {isBuilding && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentFloor(Math.max(0, currentFloor - 1))}
                disabled={currentFloor === 0}
                className="h-8 px-2"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentFloor(Math.min(numberOfFloors - 1, currentFloor + 1))
                }
                disabled={currentFloor === numberOfFloors - 1}
                className="h-8 px-2"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-background/50 p-4 overflow-x-auto">
        <svg
          viewBox="0 0 600 650"
          className={`w-full transition-all duration-300 ${
            isExpanded ? "h-[500px]" : "h-[300px]"
          }`}
          style={{ maxWidth: "100%" }}
        >
          {/* Grid background */}
          <defs>
            <pattern
              id="grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="600" height="650" fill="url(#grid)" />

          {/* Zones */}
          {zones.map((zone) => (
            <g key={zone.id}>
              <path
                d={zone.path}
                fill={getZoneFillColor(zone.id)}
                stroke="hsl(var(--border))"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => handleZoneClick(zone)}
              />
              <text
                x={zone.center.x}
                y={zone.center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none select-none text-xs font-medium"
                fill="hsl(var(--foreground))"
              >
                {isFrench ? zone.label : zone.labelEn}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {selectedZone && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isFrench ? 'Zone sélectionnée :' : 'Selected zone:'}
          </p>
          <Badge variant="default" className="text-xs">
            {selectedZone}
          </Badge>
        </div>
      )}
    </div>
  );
};
