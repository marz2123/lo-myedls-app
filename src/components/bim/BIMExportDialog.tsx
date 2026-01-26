import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Download,
  FileCode,
  Box,
  Smartphone
} from 'lucide-react';
import type { BIMExportOptions } from '@/types/bim';

interface BIMExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: BIMExportOptions) => void;
  modelId?: string;
}

const formatOptions = [
  { 
    value: 'ifc', 
    label: 'IFC', 
    description: 'Format BIM standard (Revit, ArchiCAD, Allplan)',
    icon: <FileCode className="h-5 w-5" />
  },
  { 
    value: 'gltf', 
    label: 'glTF', 
    description: 'Format web 3D optimisé',
    icon: <Box className="h-5 w-5" />
  },
  { 
    value: 'obj', 
    label: 'OBJ', 
    description: 'Format 3D universel',
    icon: <Box className="h-5 w-5" />
  },
  { 
    value: 'usdz', 
    label: 'USDZ', 
    description: 'Réalité augmentée iOS (ARKit)',
    icon: <Smartphone className="h-5 w-5" />
  },
];

export const BIMExportDialog: React.FC<BIMExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  modelId
}) => {
  const [options, setOptions] = useState<BIMExportOptions>({
    format: 'ifc',
    includeTextures: true,
    includeAnomalies: true,
    includeTasks: true,
    simplifyGeometry: false,
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!modelId) return;
    
    setIsExporting(true);
    try {
      await onExport(options);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter le modèle BIM
          </DialogTitle>
          <DialogDescription>
            Choisissez le format et les options d'export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Format d'export</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value) => setOptions(prev => ({ ...prev, format: value as any }))}
              className="grid grid-cols-2 gap-3"
            >
              {formatOptions.map(format => (
                <div key={format.value}>
                  <RadioGroupItem
                    value={format.value}
                    id={format.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={format.value}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    {format.icon}
                    <span className="mt-2 font-medium">{format.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {format.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Inclure les textures</Label>
                <p className="text-xs text-muted-foreground">
                  Matériaux et couleurs des surfaces
                </p>
              </div>
              <Switch
                checked={options.includeTextures}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeTextures: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Inclure les anomalies</Label>
                <p className="text-xs text-muted-foreground">
                  Métadonnées des défauts détectés
                </p>
              </div>
              <Switch
                checked={options.includeAnomalies}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAnomalies: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Inclure les tâches</Label>
                <p className="text-xs text-muted-foreground">
                  Liaison avec les tâches FT/CT/ST
                </p>
              </div>
              <Switch
                checked={options.includeTasks}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeTasks: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Simplifier la géométrie</Label>
                <p className="text-xs text-muted-foreground">
                  Réduire la taille du fichier
                </p>
              </div>
              <Switch
                checked={options.simplifyGeometry}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, simplifyGeometry: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !modelId}>
            {isExporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-pulse" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter {options.format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
