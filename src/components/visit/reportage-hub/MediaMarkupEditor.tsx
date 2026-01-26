import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Circle, Rect, Line, IText, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { 
  X, Pencil, ArrowRight, Circle as CircleIcon, Square, 
  Highlighter, Type, Undo, Redo, Trash2, Save, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tool = 'select' | 'pen' | 'arrow' | 'circle' | 'rectangle' | 'highlighter' | 'text';

interface MediaMarkupEditorProps {
  imageUrl: string;
  mediaId: string;
  mediaType: 'frame' | 'sequence';
  projectId: string;
  onClose: () => void;
  onSaved?: (annotatedUrl: string) => void;
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Black', value: '#171717' },
  { name: 'White', value: '#ffffff' },
];

export const MediaMarkupEditor: React.FC<MediaMarkupEditorProps> = ({
  imageUrl,
  mediaId,
  mediaType,
  projectId,
  onClose,
  onSaved
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize canvas with image
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    
    // Load image using FabricImage for v6
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Calculate canvas size to fit container while maintaining aspect ratio
      const maxWidth = container.clientWidth - 32;
      const maxHeight = container.clientHeight - 120;
      const imgWidth = img.width || 800;
      const imgHeight = img.height || 600;
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      const canvasWidth = imgWidth * ratio;
      const canvasHeight = imgHeight * ratio;

      const canvas = new FabricCanvas(canvasRef.current!, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#f5f5f5',
      });

      // Scale and set as background
      img.scaleToWidth(canvasWidth);
      img.scaleToHeight(canvasHeight);
      img.set({
        selectable: false,
        evented: false,
      });
      canvas.add(img);
      canvas.sendObjectToBack(img);

      // Initialize drawing brush
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;

      // Save initial state
      const initialState = JSON.stringify(canvas.toJSON());
      setHistory([initialState]);
      setHistoryIndex(0);

      // Track object modifications for history
      canvas.on('object:added', () => saveToHistory(canvas));
      canvas.on('object:modified', () => saveToHistory(canvas));
      canvas.on('object:removed', () => saveToHistory(canvas));

      setFabricCanvas(canvas);
      setImageLoaded(true);
    }).catch(() => {
      toast.error("Impossible de charger l'image");
      onClose();
    });

    return () => {
      fabricCanvas?.dispose();
    };
  }, [imageUrl]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'pen' || activeTool === 'highlighter';
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeTool === 'highlighter' 
        ? `${activeColor}80` // 50% opacity for highlighter
        : activeColor;
      fabricCanvas.freeDrawingBrush.width = activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth;
    }
  }, [activeTool, activeColor, strokeWidth, fabricCanvas]);

  const saveToHistory = useCallback((canvas: FabricCanvas) => {
    const state = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const handleUndo = () => {
    if (!fabricCanvas || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const handleRedo = () => {
    if (!fabricCanvas || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const handleClearAll = () => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach(obj => {
      fabricCanvas.remove(obj);
    });
    fabricCanvas.renderAll();
  };

  const handleToolClick = (tool: Tool) => {
    if (!fabricCanvas) return;
    setActiveTool(tool);

    if (tool === 'select') {
      fabricCanvas.isDrawingMode = false;
      return;
    }

    const center = fabricCanvas.getCenter();

    if (tool === 'arrow') {
      // Create arrow using line with arrowhead
      const arrow = new Line([center.left - 50, center.top, center.left + 50, center.top], {
        stroke: activeColor,
        strokeWidth: strokeWidth,
        selectable: true,
      });
      fabricCanvas.add(arrow);
      
      // Add arrowhead
      const arrowHead = new Circle({
        left: center.left + 45,
        top: center.top - 8,
        radius: 8,
        fill: activeColor,
        selectable: false,
      });
      fabricCanvas.add(arrowHead);
    } else if (tool === 'circle') {
      const circle = new Circle({
        left: center.left - 40,
        top: center.top - 40,
        radius: 40,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
      fabricCanvas.add(circle);
    } else if (tool === 'rectangle') {
      const rect = new Rect({
        left: center.left - 50,
        top: center.top - 30,
        width: 100,
        height: 60,
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: strokeWidth,
      });
      fabricCanvas.add(rect);
    } else if (tool === 'text') {
      const text = new IText('Texte', {
        left: center.left - 30,
        top: center.top - 15,
        fontSize: 24,
        fill: activeColor,
        fontFamily: 'sans-serif',
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      text.enterEditing();
    }

    fabricCanvas.renderAll();
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;
    setSaving(true);

    try {
      // Export canvas as data URL
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.9,
        multiplier: 2, // Higher resolution
      });

      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Generate filename
      const timestamp = Date.now();
      const filename = `annotated_${mediaId}_${timestamp}.png`;
      const filePath = `${projectId}/${filename}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('visit-frames')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('visit-frames')
        .getPublicUrl(filePath);

      // Update the original media record to link annotated version
      if (mediaType === 'frame') {
        await supabase
          .from('extracted_frames')
          .update({ 
            analysis_result: supabase.rpc ? undefined : { 
              annotated_url: publicUrl,
              annotated_at: new Date().toISOString()
            }
          })
          .eq('id', mediaId);
      }

      toast.success('Annotation sauvegardée !');
      onSaved?.(publicUrl);
      onClose();
    } catch (error) {
      console.error('Error saving annotation:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const tools = [
    { id: 'select' as Tool, icon: <X className="h-5 w-5" />, label: 'Sélectionner' },
    { id: 'pen' as Tool, icon: <Pencil className="h-5 w-5" />, label: 'Crayon' },
    { id: 'highlighter' as Tool, icon: <Highlighter className="h-5 w-5" />, label: 'Surligneur' },
    { id: 'arrow' as Tool, icon: <ArrowRight className="h-5 w-5" />, label: 'Flèche' },
    { id: 'circle' as Tool, icon: <CircleIcon className="h-5 w-5" />, label: 'Cercle' },
    { id: 'rectangle' as Tool, icon: <Square className="h-5 w-5" />, label: 'Rectangle' },
    { id: 'text' as Tool, icon: <Type className="h-5 w-5" />, label: 'Texte' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/10 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-white font-semibold">Annoter l'image</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="text-white hover:bg-white/20 disabled:opacity-30"
          >
            <Undo className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="text-white hover:bg-white/20 disabled:opacity-30"
          >
            <Redo className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearAll}
            className="text-white hover:bg-white/20"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
      >
        {!imageLoaded && (
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement de l'image...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className={cn(
            "rounded-lg shadow-2xl",
            !imageLoaded && "hidden"
          )}
        />
      </div>

      {/* Bottom Toolbar */}
      <div className="bg-background/10 backdrop-blur-sm border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-center gap-6">
          {/* Tools */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant="ghost"
                size="icon"
                onClick={() => handleToolClick(tool.id)}
                className={cn(
                  "h-10 w-10 rounded-lg transition-all",
                  activeTool === tool.id 
                    ? "bg-white text-black" 
                    : "text-white hover:bg-white/20"
                )}
                title={tool.label}
              >
                {tool.icon}
              </Button>
            ))}
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1.5">
            {COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setActiveColor(color.value)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  activeColor === color.value 
                    ? "border-white scale-110" 
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
            <span className="text-xs text-white/70">Épaisseur:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 accent-white"
            />
            <span className="text-xs text-white w-4">{strokeWidth}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
