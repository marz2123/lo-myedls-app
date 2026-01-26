import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { blockId } = await req.json();

    if (!blockId) {
      throw new Error('blockId is required');
    }

    // Fetch block data
    const { data: block, error: blockError } = await supabase
      .from('detected_blocks')
      .select('*, visit_session_id')
      .eq('id', blockId)
      .single();

    if (blockError || !block) {
      throw new Error('Block not found');
    }

    // Verify ownership via visit session
    const { data: session, error: sessionError } = await supabase
      .from('visit_sessions')
      .select('user_id')
      .eq('id', block.visit_session_id)
      .single();

    if (sessionError || session.user_id !== user.id) {
      throw new Error('Unauthorized access to block');
    }

    const volumeData = block.volume_data || {};
    const width = volumeData.width || 4;
    const height = volumeData.height || 2.7;
    const depth = volumeData.depth || 4;
    const detectedObjects = volumeData.detectedObjects || [];

    // Generate OBJ format
    const objContent = generateOBJ(width, height, depth, detectedObjects);
    
    // Generate GLB format (basic geometry as JSON, would need proper binary GLB encoder)
    const glbContent = generateGLB(width, height, depth, detectedObjects);
    
    // Generate USDZ format (text-based USD for now, Apple format)
    const usdzContent = generateUSDZ(width, height, depth, detectedObjects);

    // Upload files to storage
    const blockPath = `${user.id}/${blockId}`;
    
    const [objUpload, glbUpload, usdzUpload] = await Promise.all([
      supabase.storage
        .from('3d-models')
        .upload(`${blockPath}/room.obj`, new Blob([objContent], { type: 'text/plain' }), {
          upsert: true,
          contentType: 'text/plain'
        }),
      supabase.storage
        .from('3d-models')
        .upload(`${blockPath}/room.glb`, new Blob([glbContent], { type: 'model/gltf-binary' }), {
          upsert: true,
          contentType: 'model/gltf-binary'
        }),
      supabase.storage
        .from('3d-models')
        .upload(`${blockPath}/room.usdz`, new Blob([usdzContent], { type: 'model/vnd.usdz+zip' }), {
          upsert: true,
          contentType: 'model/vnd.usdz+zip'
        })
    ]);

    if (objUpload.error || glbUpload.error || usdzUpload.error) {
      console.error('Upload errors:', { objUpload, glbUpload, usdzUpload });
      throw new Error('Failed to upload 3D models');
    }

    // Get public URLs
    const { data: { publicUrl: objUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(`${blockPath}/room.obj`);
    
    const { data: { publicUrl: glbUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(`${blockPath}/room.glb`);
    
    const { data: { publicUrl: usdzUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(`${blockPath}/room.usdz`);

    const modelUrls = {
      obj: objUrl,
      glb: glbUrl,
      usdz: usdzUrl
    };

    // Update block with model URLs
    await supabase
      .from('detected_blocks')
      .update({ model_3d_urls: modelUrls })
      .eq('id', blockId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        modelUrls,
        dimensions: { width, height, depth },
        objectsCount: detectedObjects.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error generating 3D model:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

/**
 * Generate OBJ file format (Wavefront OBJ)
 * Simple room box with floor, walls, ceiling
 */
function generateOBJ(width: number, height: number, depth: number, objects: any[]): string {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  let obj = `# Room 3D Model\n`;
  obj += `# Dimensions: ${width}m x ${height}m x ${depth}m\n\n`;
  
  // Room vertices (box)
  obj += `# Room box vertices\n`;
  obj += `v -${hw} 0 -${hd}\n`;    // 1: bottom front-left
  obj += `v ${hw} 0 -${hd}\n`;     // 2: bottom front-right
  obj += `v ${hw} 0 ${hd}\n`;      // 3: bottom back-right
  obj += `v -${hw} 0 ${hd}\n`;     // 4: bottom back-left
  obj += `v -${hw} ${height} -${hd}\n`;  // 5: top front-left
  obj += `v ${hw} ${height} -${hd}\n`;   // 6: top front-right
  obj += `v ${hw} ${height} ${hd}\n`;    // 7: top back-right
  obj += `v -${hw} ${height} ${hd}\n`;   // 8: top back-left
  
  obj += `\n# Room faces\n`;
  // Floor
  obj += `f 1 2 3 4\n`;
  // Ceiling
  obj += `f 5 8 7 6\n`;
  // Walls
  obj += `f 1 5 6 2\n`; // Front wall
  obj += `f 2 6 7 3\n`; // Right wall
  obj += `f 3 7 8 4\n`; // Back wall
  obj += `f 4 8 5 1\n`; // Left wall

  // Add detected objects as simple boxes
  let vertexOffset = 8;
  objects.forEach((obj_data, idx) => {
    const pos = obj_data.position || { x: 0, y: 1, z: 0 };
    const dim = obj_data.dimensions || { width: 0.5, height: 1 };
    const w = dim.width / 2;
    const h = dim.height / 2;
    const d = 0.1; // thin depth for objects

    obj += `\n# Object ${idx + 1}: ${obj_data.type}\n`;
    const px = pos.x - hw;
    const py = pos.y;
    const pz = pos.z - hd;

    // 8 vertices for object box
    obj += `v ${px - w} ${py - h} ${pz - d}\n`;
    obj += `v ${px + w} ${py - h} ${pz - d}\n`;
    obj += `v ${px + w} ${py + h} ${pz - d}\n`;
    obj += `v ${px - w} ${py + h} ${pz - d}\n`;
    obj += `v ${px - w} ${py - h} ${pz + d}\n`;
    obj += `v ${px + w} ${py - h} ${pz + d}\n`;
    obj += `v ${px + w} ${py + h} ${pz + d}\n`;
    obj += `v ${px - w} ${py + h} ${pz + d}\n`;

    // Faces for object box
    const v = vertexOffset + 1;
    obj += `f ${v} ${v+1} ${v+2} ${v+3}\n`;
    obj += `f ${v+4} ${v+7} ${v+6} ${v+5}\n`;
    obj += `f ${v} ${v+4} ${v+5} ${v+1}\n`;
    obj += `f ${v+1} ${v+5} ${v+6} ${v+2}\n`;
    obj += `f ${v+2} ${v+6} ${v+7} ${v+3}\n`;
    obj += `f ${v+3} ${v+7} ${v+4} ${v}\n`;

    vertexOffset += 8;
  });

  return obj;
}

/**
 * Generate GLB file format (simplified JSON representation)
 * In production, would use a proper GLB encoder library
 */
function generateGLB(width: number, height: number, depth: number, objects: any[]): string {
  // Simplified glTF JSON (not binary GLB, but JSON for demonstration)
  const gltf = {
    asset: { version: "2.0", generator: "MyEDLS Room Generator" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        name: "Room",
        mesh: 0,
        extras: {
          dimensions: { width, height, depth },
          objects: objects.map(o => ({
            type: o.type,
            position: o.position,
            confidence: o.confidence
          }))
        }
      }
    ],
    meshes: [
      {
        name: "RoomBox",
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            mode: 4
          }
        ]
      }
    ]
  };

  return JSON.stringify(gltf, null, 2);
}

/**
 * Generate USDZ file format (text-based USD)
 * Apple's AR Quick Look format
 */
function generateUSDZ(width: number, height: number, depth: number, objects: any[]): string {
  const hw = width / 2;
  const hd = depth / 2;

  let usd = `#usda 1.0\n`;
  usd += `(\n`;
  usd += `    defaultPrim = "Room"\n`;
  usd += `    metersPerUnit = 1\n`;
  usd += `    upAxis = "Y"\n`;
  usd += `)\n\n`;
  
  usd += `def Xform "Room" (\n`;
  usd += `    kind = "component"\n`;
  usd += `)\n`;
  usd += `{\n`;
  usd += `    def Mesh "RoomBox"\n`;
  usd += `    {\n`;
  usd += `        float3[] extent = [(-${hw}, 0, -${hd}), (${hw}, ${height}, ${hd})]\n`;
  usd += `        int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]\n`;
  usd += `        int[] faceVertexIndices = [0,1,2,3, 4,7,6,5, 0,4,5,1, 1,5,6,2, 2,6,7,3, 3,7,4,0]\n`;
  usd += `        point3f[] points = [\n`;
  usd += `            (-${hw}, 0, -${hd}), (${hw}, 0, -${hd}), (${hw}, 0, ${hd}), (-${hw}, 0, ${hd}),\n`;
  usd += `            (-${hw}, ${height}, -${hd}), (${hw}, ${height}, -${hd}), (${hw}, ${height}, ${hd}), (-${hw}, ${height}, ${hd})\n`;
  usd += `        ]\n`;
  usd += `    }\n`;

  // Add objects
  objects.forEach((obj, idx) => {
    const pos = obj.position || { x: 0, y: 1, z: 0 };
    const px = pos.x - hw;
    const py = pos.y;
    const pz = pos.z - hd;

    usd += `\n    def Cube "Object_${idx}"\n`;
    usd += `    {\n`;
    usd += `        double3 xformOp:translate = (${px}, ${py}, ${pz})\n`;
    usd += `        uniform token[] xformOpOrder = ["xformOp:translate"]\n`;
    usd += `    }\n`;
  });

  usd += `}\n`;

  return usd;
}
