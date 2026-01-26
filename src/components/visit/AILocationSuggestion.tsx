import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Loader2, 
  Check, 
  ChevronRight,
  Building2,
  Home,
  MapPin,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PropertyPart {
  id: string;
  name: string;
  part_type: 'commune' | 'privative';
}

interface PropertyLocation {
  id: string;
  name: string;
  location_type: string;
  part_id: string;
}

interface AISuggestion {
  part_type: string;
  location_name: string;
  endroit: string;
  zone_type: string;
  reasoning: string;
}

interface AILocationSuggestionProps {
  projectId: string;
  sequenceId: string;
  description: string | null;
  parts: PropertyPart[];
  locations: PropertyLocation[];
  onApply: () => void;
  onManual: () => void;
}

const ZONE_LABELS: Record<string, string> = {
  'mur': 'Mur',
  'sol': 'Sol',
  'plafond': 'Plafond',
  'equipements': 'Équipements',
  'menuiseries': 'Menuiseries',
  'sanitaires': 'Sanitaires',
  'electricite': 'Électricité',
  'revetement': 'Revêtement',
  'toiture': 'Toiture',
  'gouttieres': 'Gouttières',
  'autre': 'Autre',
};

export const AILocationSuggestion: React.FC<AILocationSuggestionProps> = ({
  projectId,
  sequenceId,
  description,
  parts,
  locations,
  onApply,
  onManual
}) => {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = async () => {
    if (!description || description.length < 10) {
      setError("Description trop courte pour l'analyse IA");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-sequence-location', {
        body: {
          sequenceDescription: description,
          projectStructure: {
            parts: parts.map(p => ({ id: p.id, name: p.name, part_type: p.part_type })),
            locations: locations.map(l => ({ id: l.id, name: l.name, location_type: l.location_type, part_id: l.part_id }))
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.suggestions?.length > 0) {
        setSuggestion(data.suggestions[0]);
        setConfidence(data.confidence || 0.7);
      } else {
        setError("L'IA n'a pas pu déterminer la localisation");
      }
    } catch (err) {
      console.error('AI suggestion error:', err);
      setError("Erreur lors de l'analyse IA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (description && parts.length > 0) {
      fetchSuggestion();
    }
  }, []);

  const applySuggestion = async () => {
    if (!suggestion) return;

    setApplying(true);
    try {
      // Find matching part and location
      const matchedPart = parts.find(p => 
        p.name.toLowerCase().includes(suggestion.location_name.toLowerCase()) ||
        p.part_type === suggestion.part_type
      );

      const matchedLocation = locations.find(l => 
        l.name.toLowerCase().includes(suggestion.location_name.toLowerCase())
      ) || locations.find(l => l.part_id === matchedPart?.id);

      if (!matchedLocation) {
        toast.error("Impossible de trouver le lieu correspondant");
        return;
      }

      const { error } = await supabase
        .from('visit_sequences')
        .update({
          part_id: matchedPart?.id,
          location_id: matchedLocation.id,
          endroit_name: suggestion.endroit,
          zone_type: suggestion.zone_type,
        })
        .eq('id', sequenceId);

      if (error) throw error;

      toast.success('Localisation appliquée !');
      onApply();
    } catch (err) {
      console.error('Apply error:', err);
      toast.error("Erreur lors de l'application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
          <div>
            <p className="font-medium text-sm">Analyse IA en cours...</p>
            <p className="text-xs text-muted-foreground">Détection de la localisation probable</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{error}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchSuggestion}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <Button className="w-full" variant="outline" onClick={onManual}>
          <MapPin className="w-4 h-4 mr-2" />
          Localiser manuellement
        </Button>
      </div>
    );
  }

  if (!suggestion) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-500/30">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="font-semibold text-sm">Suggestion IA</span>
        <Badge 
          className={`text-[10px] px-1.5 ${
            confidence > 0.8 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : confidence > 0.6 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {Math.round(confidence * 100)}% confiance
        </Badge>
      </div>

      {/* Suggestion */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <Badge className={`text-xs px-2 py-0.5 ${
          suggestion.part_type === 'commune'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        }`}>
          {suggestion.part_type === 'commune' ? (
            <Building2 className="w-3 h-3 mr-1" />
          ) : (
            <Home className="w-3 h-3 mr-1" />
          )}
          {suggestion.location_name}
        </Badge>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <Badge className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/30">
          {suggestion.endroit}
        </Badge>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <Badge className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30">
          {ZONE_LABELS[suggestion.zone_type] || suggestion.zone_type}
        </Badge>
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {suggestion.reasoning}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1 h-10 rounded-xl bg-violet-500 hover:bg-violet-600"
          disabled={applying}
          onClick={applySuggestion}
        >
          {applying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Appliquer
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-10 rounded-xl"
          onClick={onManual}
        >
          Modifier
        </Button>
      </div>
    </div>
  );
};
