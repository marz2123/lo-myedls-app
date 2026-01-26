import React, { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Video, 
  Camera, 
  FileText, 
  MapPin, 
  Trash2, 
  Building2,
  Home,
  X,
  ChevronRight,
  Play,
  Layers,
  Clock,
  ZoomIn,
  ChevronDown,
  ArrowLeft,
  Edit2,
  AlertTriangle,
  Navigation,
  Sparkles,
  CheckSquare,
  Unlink,
  Clapperboard,
  Footprints
} from 'lucide-react';
import { SequenceLocationAssigner } from './SequenceLocationAssigner';
import { BatchLocationAssigner } from './BatchLocationAssigner';
import { QuickLocationButtons } from './QuickLocationButtons';
import { AILocationSuggestion } from './AILocationSuggestion';
import { useRecentLocations } from '@/hooks/useRecentLocations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MediaLightbox } from '@/components/ui/media-lightbox';
import { useVisitSequencesFiltering } from '@/hooks/useVisitSequencesFiltering';
import { VisitSequencesFilterBar } from './VisitSequencesFilterBar';
import { AddNoteDialog } from './reportage-hub/AddNoteDialog';
import { Share, Download, MessageSquarePlus, CheckSquare, Square, Trash2 as Trash2Icon, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VisitSequence {
  id: string;
  project_id: string;
  location_id: string | null;
  zone_id: string | null;
  zone_type: string | null;
  description: string | null;
  video_url: string | null;
  photos: string[] | null;
  created_at: string;
  location_name?: string;
  location_type?: string;
  zone_name?: string;
  endroit_name?: string | null;
  partie_name?: string | null;
  part_id?: string | null;
  capture_mode?: string | null;
}

interface VisitSequencesListProps {
  projectId: string;
  onSelectSequence?: (sequenceId: string) => void;
  onNavigateToReportage?: (locationId: string, endroitName?: string | null, zoneType?: string | null, description?: string | null, sequenceId?: string | null) => void;
}

const ZONE_TYPE_LABELS: Record<string, string> = {
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

export const VisitSequencesList: React.FC<VisitSequencesListProps> = ({
  projectId,
  onSelectSequence,
  onNavigateToReportage
}) => {
  const { toast } = useToast();
  const [sequences, setSequences] = useState<VisitSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSequenceId, setDeleteSequenceId] = useState<string | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<VisitSequence | null>(null);
  const [locationAssignerSequence, setLocationAssignerSequence] = useState<VisitSequence | null>(null);
  const [showBatchAssigner, setShowBatchAssigner] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState<string | null>(null);
  
  // Structure data for AI suggestions
  const [parts, setParts] = useState<{ id: string; name: string; part_type: 'commune' | 'privative' }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; location_type: string; part_id: string }[]>([]);
  
  // Recent locations for quick access
  const { recentLocations, applyQuickLocation } = useRecentLocations(projectId);
  
  // Media viewer - enhanced with navigation
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [viewerMediaItems, setViewerMediaItems] = useState<Array<{ url: string; type: 'photo' | 'video' }>>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  
  // Transcription editing
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState('');
  
  // Description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  
  // Notes a posteriori
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  
  // Selection multiple
  const [selectedSequences, setSelectedSequences] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    fetchSequences();
    fetchStructure();
  }, [projectId]);

  // Initialize editing states when sequence is selected
  useEffect(() => {
    if (selectedSequence) {
      setEditedTranscription(selectedSequence.transcription || '');
      setEditedDescription(selectedSequence.description || '');
      setEditingTranscription(false);
      setEditingDescription(false);
    }
  }, [selectedSequence]);

  const fetchStructure = async () => {
    try {
      const [partsRes, locsRes] = await Promise.all([
        supabase.from('property_parts').select('id, name, part_type').eq('project_id', projectId),
        supabase.from('property_locations').select('id, name, location_type, part_id').eq('project_id', projectId)
      ]);
      setParts((partsRes.data || []) as any);
      setLocations((locsRes.data || []) as any);
    } catch (e) {
      console.error('Error loading structure:', e);
    }
  };

  const fetchSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_sequences')
        .select(`
          *,
          property_locations(name, location_type, part_id, property_parts(name))
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((seq: any) => ({
        ...seq,
        location_name: seq.property_locations?.name,
        location_type: seq.property_locations?.location_type,
        partie_name: seq.property_locations?.property_parts?.name,
        endroit_name: seq.endroit_name,
        photos: seq.photos || [],
        part_id: seq.part_id,
        capture_mode: seq.capture_mode,
        created_at: seq.created_at,
        user_condition: seq.user_condition,
        detected_condition: seq.detected_condition,
      }));

      setSequences(formattedData);
    } catch (error) {
      console.error('Error fetching sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    try {
      const { error } = await supabase.from('visit_sequences').delete().eq('id', sequenceId);

      if (error) throw error;

      await fetchSequences();
      setSelectedSequence(null);

      toast({
        title: '✅ Séquence supprimée',
        description: 'La séquence a été supprimée avec succès',
      });
    } catch (error) {
      console.error('Error deleting sequence:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la séquence',
        variant: 'destructive',
      });
    } finally {
      setDeleteSequenceId(null);
    }
  };

  const handleSaveTranscription = async () => {
    if (!selectedSequence) return;
    
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({ transcription: editedTranscription })
        .eq('id', selectedSequence.id);

      if (error) throw error;

      await fetchSequences();
      setEditingTranscription(false);
      
      // Update selected sequence
      setSelectedSequence({ ...selectedSequence, transcription: editedTranscription });

      toast({
        title: '✅ Transcription mise à jour',
        description: 'La transcription a été enregistrée',
      });
    } catch (error) {
      console.error('Error updating transcription:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la transcription',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedSequence) return;
    
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .update({ description: editedDescription })
        .eq('id', selectedSequence.id);

      if (error) throw error;

      await fetchSequences();
      setEditingDescription(false);
      
      // Update selected sequence
      setSelectedSequence({ ...selectedSequence, description: editedDescription });

      toast({
        title: '✅ Description mise à jour',
        description: 'La description a été enregistrée',
      });
    } catch (error) {
      console.error('Error updating description:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la description',
        variant: 'destructive',
      });
    }
  };

  const handleShareSequence = async (sequence: VisitSequence) => {
    try {
      const { Share } = await import('@capacitor/share');
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const shareText = [
          sequence.location_name || sequence.endroit_name || 'Séquence',
          sequence.description ? `\n${sequence.description}` : '',
          sequence.transcription ? `\nTranscription: ${sequence.transcription}` : '',
        ].filter(Boolean).join('\n');
        
        await Share.share({
          title: 'Séquence MyEDLS',
          text: shareText,
          url: sequence.video_url || sequence.photos?.[0] || '',
          dialogTitle: 'Partager la séquence',
        });
      } else {
        // Web fallback
        if (navigator.share) {
          await navigator.share({
            title: 'Séquence MyEDLS',
            text: sequence.description || sequence.transcription || '',
            url: sequence.video_url || sequence.photos?.[0] || '',
          });
        } else {
          await navigator.clipboard.writeText(sequence.video_url || sequence.photos?.[0] || '');
          toast.success('URL copiée dans le presse-papiers');
        }
      }
    } catch (error) {
      console.error('Error sharing sequence:', error);
      toast.error('Erreur lors du partage');
    }
  };

  const handleExportSequence = async (sequence: VisitSequence) => {
    try {
      // Export video if available
      if (sequence.video_url) {
        const response = await fetch(sequence.video_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequence-${sequence.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Vidéo téléchargée');
      } else if (sequence.photos && sequence.photos.length > 0) {
        // Export first photo
        const response = await fetch(sequence.photos[0]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sequence-${sequence.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Photo téléchargée');
      }
    } catch (error) {
      console.error('Error exporting sequence:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleExportSequencesCSV = async () => {
    try {
      const sequencesToExport = filteredSequences.length > 0 ? filteredSequences : sequences;
      
      if (sequencesToExport.length === 0) {
        toast.error('Aucune séquence à exporter');
        return;
      }

      // Headers CSV
      const headers = [
        'ID',
        'Date de création',
        'Partie',
        'Lieu',
        'Endroit',
        'Zone',
        'Description',
        'Transcription',
        'Mode de capture',
        'Vidéo URL',
        'Nombre de photos',
        'État utilisateur',
        'État détecté',
        'Localisé',
        'Orpheline'
      ];

      // Rows
      const rows = sequencesToExport.map(seq => {
        const escapeCSV = (value: any) => {
          if (value === null || value === undefined) return '';
          const str = String(value).replace(/"/g, '""');
          return `"${str}"`;
        };

        return [
          escapeCSV(seq.id),
          escapeCSV(formatDate(seq.created_at)),
          escapeCSV(seq.partie_name || ''),
          escapeCSV(seq.location_name || ''),
          escapeCSV(seq.endroit_name || ''),
          escapeCSV(seq.zone_type ? ZONE_TYPE_LABELS[seq.zone_type] || seq.zone_type : ''),
          escapeCSV(seq.description || ''),
          escapeCSV(seq.transcription || ''),
          escapeCSV(seq.capture_mode === 'freeform' ? 'À la volée' : seq.capture_mode === 'step_by_step' ? 'Pas à pas' : ''),
          escapeCSV(seq.video_url || ''),
          escapeCSV(seq.photos?.length || 0),
          escapeCSV(seq.user_condition || ''),
          escapeCSV(seq.detected_condition || ''),
          escapeCSV(isSequenceLocalized(seq) ? 'Oui' : 'Non'),
          escapeCSV(isSequenceOrphaned(seq) ? 'Oui' : 'Non'),
        ].join(',');
      });

      // Create CSV content with BOM for Excel compatibility
      const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sequences_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${sequencesToExport.length} séquence(s) exportée(s) en CSV`);
    } catch (error) {
      console.error('Error exporting sequences CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const toggleSequenceSelection = (sequenceId: string) => {
    setSelectedSequences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sequenceId)) {
        newSet.delete(sequenceId);
      } else {
        newSet.add(sequenceId);
      }
      return newSet;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedSequences.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('visit_sequences')
        .delete()
        .in('id', Array.from(selectedSequences));

      if (error) throw error;

      await fetchSequences();
      setSelectedSequences(new Set());
      setIsSelectionMode(false);

      toast({
        title: '✅ Séquences supprimées',
        description: `${selectedSequences.size} séquence(s) supprimée(s)`,
      });
    } catch (error) {
      console.error('Error deleting sequences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les séquences',
        variant: 'destructive',
      });
    }
  };

  // Helper to check if sequence is fully localized
  const isSequenceLocalized = (seq: VisitSequence) => {
    return !!(seq.location_id && seq.endroit_name && seq.zone_type);
  };

  // Helper to check if sequence location exists in project structure
  const isSequenceOrphaned = (seq: VisitSequence) => {
    if (seq.location_id) {
      const locationExists = locations.some((loc) => loc.id === seq.location_id);
      if (!locationExists) return true;
    }
    if (seq.part_id) {
      const partExists = parts.some((p) => p.id === seq.part_id);
      if (!partExists) return true;
    }
    return false;
  };

  // Helper to determine if location is commune or privative
  const isCommune = (locationType: string | undefined) => locationType === 'commune';
  const isPrivative = (locationType: string | undefined) => !!(locationType && locationType !== 'commune');

  // Filters + coherent UX
  const {
    state: filters,
    actions: filterActions,
    options: filterOptions,
    stats,
    filteredSequences,
  } = useVisitSequencesFiltering<VisitSequence>({
    sequences,
    locations,
    parts,
    isSequenceLocalized,
    isSequenceOrphaned,
    isCommune,
    isPrivative,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openMediaViewer = (type: 'photo' | 'video', url: string, index?: number, allUrls?: string[]) => {
    console.log('[MediaViewer] openMediaViewer', { type, url, index, allUrlsCount: allUrls?.length ?? 0 });
    toast({
      title: "Ouverture du média…",
      description: type === 'video' ? 'Vidéo' : 'Photo',
    });

    if (allUrls && allUrls.length > 0) {
      // Open with all photos for navigation
      setViewerMediaItems(allUrls.map(u => ({ url: u, type: 'photo' as const })));
      setViewerInitialIndex(index ? index - 1 : 0);
    } else {
      // Single item
      setViewerMediaItems([{ url, type }]);
      setViewerInitialIndex(0);
    }
    setMediaViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sequences.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="font-medium text-foreground">Aucune séquence</p>
        <p className="text-sm text-muted-foreground mt-1">
          Créez votre première séquence via le reportage
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b gap-2">
          <VisitSequencesFilterBar
            state={filters}
            actions={filterActions}
            options={filterOptions}
            stats={stats}
            canBatch={stats.unlocalized > 1}
            onOpenBatch={() => setShowBatchAssigner(true)}
            zoneLabel={(z) => ZONE_TYPE_LABELS[z] || z}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleExportSequencesCSV}
              title="Exporter en CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) {
                  setSelectedSequences(new Set());
                }
              }}
            >
              {isSelectionMode ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  Annuler
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  Sélectionner
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Liste des séquences */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filteredSequences.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground/60">Aucun résultat</p>
              </div>
            ) : (
              filteredSequences.map((sequence) => {
                const zoneLabel = sequence.zone_type ? ZONE_TYPE_LABELS[sequence.zone_type] || sequence.zone_type : null;
                const hasPhotos = sequence.photos && sequence.photos.length > 0;
                const hasVideo = !!sequence.video_url;
                const mediaCount = (hasVideo ? 1 : 0) + (sequence.photos?.length || 0);
                const isUnlocalized = !isSequenceLocalized(sequence);
                const isOrphaned = isSequenceOrphaned(sequence);
                
                const isSelected = selectedSequences.has(sequence.id);
                
                return (
                  <div
                    key={sequence.id}
                    className={cn(
                      "w-full bg-card/50 backdrop-blur-sm rounded-xl p-3 border transition-all duration-150",
                      isSelected && "ring-2 ring-primary bg-primary/5",
                      isOrphaned || isUnlocalized ? 'border-border/60' : 'border-transparent hover:border-border/40'
                    )}
                  >
                    <div className="flex gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSequenceSelection(sequence.id);
                          }}
                          className="shrink-0 w-5 h-5 rounded border-2 border-border flex items-center justify-center hover:border-primary transition-colors mt-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary fill-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!isSelectionMode) {
                            setSelectedSequence(sequence);
                            setEditedTranscription(sequence.transcription || '');
                            setEditedDescription(sequence.description || '');
                            setEditingTranscription(false);
                            setEditingDescription(false);
                          }
                        }}
                        className={cn(
                          "flex-1 text-left",
                          isSelectionMode && "pointer-events-none"
                        )}
                      >
                        <div className="flex gap-3">
                      {/* Thumbnail */}
                      {(hasPhotos || hasVideo) && (
                        <div 
                          className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasVideo) {
                              openMediaViewer('video', sequence.video_url!);
                            } else if (hasPhotos) {
                              openMediaViewer('photo', sequence.photos![0], 1, sequence.photos!);
                            }
                          }}
                        >
                          {hasVideo ? (
                            <div className="relative w-full h-full">
                              <video
                                src={sequence.video_url!}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="w-4 h-4 text-white" fill="white" />
                              </div>
                            </div>
                          ) : (
                            <img src={sequence.photos![0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {sequence.location_name || sequence.endroit_name || 'Sans lieu'}
                          </span>
                          {(isOrphaned || isUnlocalized) && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          )}
                        </div>

                        {/* Breadcrumb */}
                        <p className="text-[11px] text-muted-foreground/70 truncate mb-1.5">
                          {[
                            sequence.partie_name || (isCommune(sequence.location_type) ? 'Commune' : 'Privative'),
                            sequence.endroit_name,
                            zoneLabel
                          ].filter(Boolean).join(' › ')}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                          <span>{formatDate(sequence.created_at)}</span>
                          {mediaCount > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Camera className="w-2.5 h-2.5" />
                              {mediaCount}
                            </span>
                          )}
                          {sequence.capture_mode && (
                            <span className="flex items-center gap-0.5">
                              {sequence.capture_mode === 'freeform' ? (
                                <Clapperboard className="w-2.5 h-2.5" />
                              ) : (
                                <Footprints className="w-2.5 h-2.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                        <ChevronRight className="shrink-0 w-4 h-4 text-muted-foreground/30 self-center" />
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Media Viewer Modal - Enhanced Lightbox */}
      <MediaLightbox
        items={viewerMediaItems}
        initialIndex={viewerInitialIndex}
        open={mediaViewerOpen}
        onOpenChange={setMediaViewerOpen}
      />

      {/* Sequence Detail - Apple Sheet */}
      {selectedSequence && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSequence(null)}
          />
          
          {/* Bottom Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[80vh] flex flex-col"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/20" />
            </div>
            
            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {selectedSequence.location_name || selectedSequence.endroit_name || 'Sans lieu'}
                </h3>
                <p className="text-xs text-muted-foreground/60 truncate">
                  {[
                    selectedSequence.partie_name || (isCommune(selectedSequence.location_type) ? 'Commune' : 'Privative'),
                    selectedSequence.endroit_name,
                    selectedSequence.zone_type ? ZONE_TYPE_LABELS[selectedSequence.zone_type] : null
                  ].filter(Boolean).join(' › ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSequence(null)}
                className="shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
              {/* Transcription - Editable */}
              {selectedSequence.transcription && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Transcription</label>
                    {editingTranscription && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveTranscription}
                          className="h-7 text-xs"
                        >
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTranscription(false);
                            setEditedTranscription(selectedSequence.transcription || '');
                          }}
                          className="h-7 text-xs"
                        >
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingTranscription ? (
                    <Textarea
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      className="min-h-[100px] text-sm"
                      placeholder="Transcription..."
                    />
                  ) : (
                    <div className="relative group">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {selectedSequence.transcription}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTranscription(true);
                          setEditedTranscription(selectedSequence.transcription || '');
                        }}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Modifier
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Description - Editable */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  {editingDescription && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveDescription}
                        className="h-7 text-xs"
                      >
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingDescription(false);
                          setEditedDescription(selectedSequence.description || '');
                        }}
                        className="h-7 text-xs"
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
                {editingDescription ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[80px] text-sm"
                    placeholder="Description de la séquence..."
                  />
                ) : (
                  <div className="relative group">
                    {selectedSequence.description ? (
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {selectedSequence.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 italic">Aucune description</p>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingDescription(true);
                        setEditedDescription(selectedSequence.description || '');
                      }}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {selectedSequence.description ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Media Grid */}
              {(selectedSequence.video_url || (selectedSequence.photos && selectedSequence.photos.length > 0)) && (
                <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                  {selectedSequence.video_url && (
                    <button
                      onClick={() => openMediaViewer('video', selectedSequence.video_url!)}
                      className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-black relative"
                    >
                      <video 
                        src={selectedSequence.video_url} 
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white" fill="white" />
                      </div>
                    </button>
                  )}
                  {selectedSequence.photos?.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => openMediaViewer('photo', url, idx + 1, selectedSequence.photos!)}
                      className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata - Compact */}
              <div className="space-y-2 text-xs border-t border-border/20 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground/60">Date</span>
                  <span>{formatDate(selectedSequence.created_at)}</span>
                </div>
                {selectedSequence.capture_mode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/60">Mode</span>
                    <span className="flex items-center gap-1">
                      {selectedSequence.capture_mode === 'freeform' ? (
                        <>
                          <Clapperboard className="w-3 h-3" />
                          À la volée
                        </>
                      ) : (
                        <>
                          <Footprints className="w-3 h-3" />
                          Pas à pas
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 py-3 border-t border-border/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                {!isSequenceLocalized(selectedSequence) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => {
                      setLocationAssignerSequence(selectedSequence);
                      setSelectedSequence(null);
                    }}
                  >
                    Localiser
                  </Button>
                )}
                {onNavigateToReportage && selectedSequence.location_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => {
                      onNavigateToReportage(
                        selectedSequence.location_id!,
                        selectedSequence.endroit_name,
                        selectedSequence.zone_type,
                        selectedSequence.description,
                        selectedSequence.id
                      );
                      setSelectedSequence(null);
                    }}
                  >
                    Modifier
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowAddNoteDialog(true)}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Note
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleShareSequence(selectedSequence)}
                >
                  <Share className="w-3.5 h-3.5" />
                  Partager
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleExportSequence(selectedSequence)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Exporter
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground/60 hover:text-destructive"
                onClick={() => setDeleteSequenceId(selectedSequence.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSequenceId} onOpenChange={() => setDeleteSequenceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette séquence ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La séquence et tous ses médias seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSequenceId && handleDeleteSequence(deleteSequenceId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Location Assigner Sheet */}
      <Sheet open={!!locationAssignerSequence} onOpenChange={() => setLocationAssignerSequence(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          {locationAssignerSequence && (
            <SequenceLocationAssigner
              projectId={projectId}
              sequenceId={locationAssignerSequence.id}
              currentDescription={locationAssignerSequence.description}
              onComplete={() => {
                setLocationAssignerSequence(null);
                fetchSequences();
              }}
              onCancel={() => setLocationAssignerSequence(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Batch Location Assigner Sheet */}
      <Sheet open={showBatchAssigner} onOpenChange={setShowBatchAssigner}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
          <BatchLocationAssigner
            projectId={projectId}
            sequences={sequences.filter(s => !isSequenceLocalized(s))}
            onComplete={() => {
              setShowBatchAssigner(false);
              fetchSequences();
            }}
            onCancel={() => setShowBatchAssigner(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Add Note Dialog */}
      {selectedSequence && (
        <AddNoteDialog
          open={showAddNoteDialog}
          onOpenChange={setShowAddNoteDialog}
          projectId={projectId}
          linkedItemId={selectedSequence.id}
          linkedItemType="sequence"
          onSuccess={() => {
            setShowAddNoteDialog(false);
            toast.success('Note ajoutée avec succès');
          }}
        />
      )}

      {/* Selection Mode Actions Bar */}
      {isSelectionMode && selectedSequences.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 safe-area-bottom shadow-lg">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <span className="text-sm font-medium">
              {selectedSequences.size} séquence{selectedSequences.size > 1 ? 's' : ''} sélectionnée{selectedSequences.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs gap-1.5"
                onClick={() => {
                  const selected = Array.from(selectedSequences);
                  setShowBatchAssigner(true);
                }}
              >
                <Navigation className="w-3.5 h-3.5" />
                Localiser
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 text-xs gap-1.5"
                onClick={() => {
                  if (confirm(`Supprimer ${selectedSequences.size} séquence(s) ?`)) {
                    handleBatchDelete();
                  }
                }}
              >
                <Trash2Icon className="w-3.5 h-3.5" />
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
