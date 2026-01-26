import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mapillaryToken = Deno.env.get('MAPILLARY_ACCESS_TOKEN');
    const images: any[] = [];
    let source = '';

    // Try Mapillary first if token available
    if (mapillaryToken) {
      console.log('Fetching from Mapillary...');
      const bbox = `${lon - 0.001},${lat - 0.001},${lon + 0.001},${lat + 0.001}`;
      
      try {
        const response = await fetch(
          `https://graph.mapillary.com/images?access_token=${mapillaryToken}&fields=id,thumb_256_url,thumb_1024_url,thumb_2048_url,captured_at,compass_angle,geometry,is_pano&bbox=${bbox}&limit=10`,
          { 
            headers: { 'Authorization': `OAuth ${mapillaryToken}` },
            signal: AbortSignal.timeout(8000)
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            source = 'Mapillary';
            data.data.forEach((img: any) => {
              images.push({
                id: img.id,
                thumbnailUrl: img.thumb_256_url,
                fullUrl: img.thumb_1024_url || img.thumb_2048_url,
                capturedAt: img.captured_at,
                source: 'mapillary',
                coordinates: img.geometry?.coordinates || [lon, lat],
                isPanorama: img.is_pano,
                compassAngle: img.compass_angle,
              });
            });
            console.log(`Mapillary: ${images.length} images found`);
          }
        }
      } catch (e) {
        console.log('Mapillary fetch failed:', e);
      }
    }

    // Fallback to Panoramax if no Mapillary images
    if (images.length === 0) {
      console.log('Fetching from Panoramax...');
      try {
        const response = await fetch(
          `https://api.panoramax.xyz/api/search?lat=${lat}&lon=${lon}&radius=100&limit=10`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            source = 'Panoramax (IGN France)';
            data.features.forEach((feature: any) => {
              images.push({
                id: feature.id || `pm-${Date.now()}`,
                thumbnailUrl: feature.assets?.thumb?.href,
                fullUrl: feature.assets?.hd?.href || feature.assets?.sd?.href,
                capturedAt: feature.properties?.datetime ? new Date(feature.properties.datetime).getTime() : undefined,
                source: 'panoramax',
                coordinates: feature.geometry?.coordinates || [lon, lat],
                isPanorama: feature.properties?.type === '360',
              });
            });
            console.log(`Panoramax: ${images.length} images found`);
          }
        }
      } catch (e) {
        console.log('Panoramax fetch failed:', e);
      }
    }

    // Find closest image
    let closestImage = null;
    if (images.length > 0) {
      closestImage = images.reduce((closest, img) => {
        if (!closest) return img;
        const distCurrent = Math.sqrt(
          Math.pow(img.coordinates[0] - lon, 2) +
          Math.pow(img.coordinates[1] - lat, 2)
        );
        const distClosest = Math.sqrt(
          Math.pow(closest.coordinates[0] - lon, 2) +
          Math.pow(closest.coordinates[1] - lat, 2)
        );
        return distCurrent < distClosest ? img : closest;
      }, null);
    }

    // Generate viewer URL
    let viewerUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
    if (closestImage?.source === 'mapillary') {
      viewerUrl = `https://www.mapillary.com/app/?pKey=${closestImage.id}&focus=photo`;
    } else if (closestImage?.source === 'panoramax') {
      viewerUrl = `https://panoramax.fr/#focus=pic&pic=${closestImage.id}`;
    }

    return new Response(
      JSON.stringify({
        images,
        closestImage,
        viewerUrl,
        source: source || 'Aucune image trouvée',
        fallbackUsed: source !== 'Mapillary',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
