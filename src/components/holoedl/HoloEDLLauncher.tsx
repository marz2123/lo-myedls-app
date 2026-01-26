import React from 'react';
import { Glasses, Sparkles, Ruler, Navigation, Eye, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HoloEDLLauncherProps {
  onLaunch: () => void;
  isSupported: boolean;
  className?: string;
}

const FEATURES = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: 'Vision AR',
    description: 'Anomalies en hologrammes 3D'
  },
  {
    icon: <Ruler className="h-5 w-5" />,
    title: 'Mesures AR',
    description: 'Distances et surfaces automatiques'
  },
  {
    icon: <Navigation className="h-5 w-5" />,
    title: 'Guidage',
    description: 'Chemin lumineux pièce par pièce'
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'BIM Overlay',
    description: 'Digital Twin superposé au réel'
  }
];

export function HoloEDLLauncher({ onLaunch, isSupported, className }: HoloEDLLauncherProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Glasses className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              HoloEDL
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AR
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Inspection en Réalité Augmentée
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature, index) => (
            <div 
              key={index}
              className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
            >
              <div className="text-primary">{feature.icon}</div>
              <div>
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={onLaunch}
          disabled={!isSupported}
        >
          <Glasses className="h-5 w-5" />
          {isSupported ? 'Activer HoloEDL' : 'AR non disponible'}
        </Button>
        
        {!isSupported && (
          <p className="text-xs text-center text-muted-foreground">
            Votre appareil ne supporte pas la réalité augmentée
          </p>
        )}
      </CardContent>
    </Card>
  );
}
