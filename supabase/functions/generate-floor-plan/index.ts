import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blockId } = await req.json();
    
    if (!blockId) {
      throw new Error('Block ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch block data
    const { data: block, error: blockError } = await supabase
      .from('detected_blocks')
      .select('volume_data')
      .eq('id', blockId)
      .single();

    if (blockError || !block?.volume_data) {
      throw new Error('Block not found or has no volume data');
    }

    const volumeData = block.volume_data as any;
    const measurements = volumeData.measurements || {};
    const floorPlan = measurements.floorPlan;

    if (!floorPlan) {
      throw new Error('No floor plan data available');
    }

    // Generate SVG floor plan
    const svg = generateSVGFloorPlan(floorPlan, measurements);
    
    // Upload SVG to storage
    const fileName = `floor-plan-${blockId}-${Date.now()}.svg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(fileName, new Blob([svg], { type: 'image/svg+xml' }), {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload floor plan: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(fileName);

    // Update block with floor plan URL
    const updatedUrls = {
      ...(volumeData.model_3d_urls || {}),
      floorPlan: publicUrl
    };

    await supabase
      .from('detected_blocks')
      .update({ 
        volume_data: {
          ...volumeData,
          model_3d_urls: updatedUrls
        }
      })
      .eq('id', blockId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        floorPlanUrl: publicUrl,
        dimensions: floorPlan.dimensions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating floor plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateSVGFloorPlan(floorPlan: any, measurements: any): string {
  const { walls, doors, windows, dimensions, scale } = floorPlan;
  const width = dimensions.width * scale;
  const height = dimensions.depth * scale;
  const padding = 50;
  
  const svgWidth = width + padding * 2;
  const svgHeight = height + padding * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .wall { fill: none; stroke: #000; stroke-width: 8; }
      .door { fill: none; stroke: #8B4513; stroke-width: 4; }
      .window { fill: #87CEEB; stroke: #4682B4; stroke-width: 2; opacity: 0.6; }
      .dimension { fill: none; stroke: #666; stroke-width: 1; stroke-dasharray: 5,5; }
      .text { font-family: Arial; font-size: 14px; fill: #333; }
      .material { font-size: 12px; fill: #666; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect x="${padding}" y="${padding}" width="${width}" height="${height}" fill="#f5f5f5" stroke="#ccc" stroke-width="1"/>
  
  <!-- Walls -->`;

  // Draw walls
  walls.forEach((wall: any) => {
    const x1 = wall.start.x * scale + padding;
    const y1 = wall.start.y * scale + padding;
    const x2 = wall.end.x * scale + padding;
    const y2 = wall.end.y * scale + padding;
    svg += `\n  <line class="wall" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  });

  // Draw doors
  doors.forEach((door: any) => {
    const x = door.position.x * scale + padding;
    const y = door.position.y * scale + padding;
    const doorWidth = door.width * scale;
    svg += `\n  <line class="door" x1="${x}" y1="${y}" x2="${x + doorWidth}" y2="${y}"/>`;
    svg += `\n  <path class="door" d="M ${x} ${y} Q ${x + doorWidth/2} ${y - doorWidth/2}, ${x + doorWidth} ${y}"/>`;
  });

  // Draw windows
  windows.forEach((window: any) => {
    const x = window.position.x * scale + padding - (window.width * scale / 2);
    const y = window.position.y * scale + padding;
    const windowWidth = window.width * scale;
    const windowHeight = 10;
    svg += `\n  <rect class="window" x="${x}" y="${y - windowHeight/2}" width="${windowWidth}" height="${windowHeight}" rx="2"/>`;
  });

  // Add dimensions
  svg += `\n  <!-- Dimensions -->`;
  svg += `\n  <line class="dimension" x1="${padding}" y1="${padding - 20}" x2="${padding + width}" y2="${padding - 20}"/>`;
  svg += `\n  <text class="text" x="${padding + width/2}" y="${padding - 25}" text-anchor="middle">${dimensions.width.toFixed(2)} m</text>`;
  
  svg += `\n  <line class="dimension" x1="${padding - 20}" y1="${padding}" x2="${padding - 20}" y2="${padding + height}"/>`;
  svg += `\n  <text class="text" x="${padding - 25}" y="${padding + height/2}" text-anchor="middle" transform="rotate(-90 ${padding - 25} ${padding + height/2})">${dimensions.depth.toFixed(2)} m</text>`;

  // Add measurements info
  svg += `\n  <!-- Measurements -->`;
  svg += `\n  <text class="text" x="${padding}" y="${svgHeight - 30}">Surface: ${measurements.area?.toFixed(2) || 'N/A'} m²</text>`;
  svg += `\n  <text class="text" x="${padding}" y="${svgHeight - 10}">Volume: ${measurements.volume?.toFixed(2) || 'N/A'} m³</text>`;

  // Add materials info if available
  if (measurements.materials && measurements.materials.length > 0) {
    svg += `\n  <!-- Materials -->`;
    let yOffset = padding + 20;
    measurements.materials.forEach((material: any, index: number) => {
      svg += `\n  <text class="material" x="${padding + width + 10}" y="${yOffset}">• ${material.type}: ${material.area.toFixed(1)} m² (${material.location})</text>`;
      yOffset += 15;
    });
  }

  // Add scale reference
  svg += `\n  <!-- Scale -->`;
  svg += `\n  <line class="dimension" x1="${padding}" y1="${svgHeight - 50}" x2="${padding + scale}" y2="${svgHeight - 50}"/>`;
  svg += `\n  <text class="material" x="${padding + scale/2}" y="${svgHeight - 55}" text-anchor="middle">1 m</text>`;

  svg += `\n</svg>`;

  return svg;
}
